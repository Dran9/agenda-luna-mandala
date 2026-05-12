const { toDate } = require("../utils/dates");
const { ValidationError } = require("./errors");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const STATUS_FILTERS = new Set(["all", "active", "inactive"]);
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

class AdminTherapistsError extends Error {
  constructor({
    message = "No se pudo completar la operacion admin terapeutas",
    code = "ADMIN_THERAPISTS_ERROR",
    status = 400,
    details = {}
  } = {}) {
    super(message);
    this.name = "AdminTherapistsError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function toIso(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toISOString();
}

function parseAdminCenterId(adminSession) {
  const parsed = Number.parseInt(adminSession?.centerId, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseLimit(rawLimit) {
  if (rawLimit === undefined || rawLimit === null || rawLimit === "") {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw new ValidationError("limit invalido", {
      field: "limit",
      min: 1,
      max: MAX_LIMIT
    });
  }

  return parsed;
}

function normalizeSearch(rawQuery) {
  return String(rawQuery || "").trim();
}

function normalizeStatus(rawStatus) {
  const normalized = String(rawStatus || "all").trim().toLowerCase();
  if (!STATUS_FILTERS.has(normalized)) {
    throw new ValidationError("status invalido", {
      field: "status",
      allowed: Array.from(STATUS_FILTERS)
    });
  }

  return normalized;
}

function parseTherapistId(rawValue) {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("therapistId invalido", {
      field: "therapistId",
      value: rawValue
    });
  }

  return parsed;
}

function splitServiceNames(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split("||")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function mapBaseTherapistRow(row) {
  return {
    id: Number(row.id),
    slug: row.slug,
    fullName: row.fullName,
    displayName: row.displayName || row.fullName,
    phone: row.phone || null,
    telegramChatId: row.telegramChatId || null,
    isActive: Number(row.isActive) === 1,
    createdAt: toIso(row.createdAt),
    services: splitServiceNames(row.serviceNames)
  };
}

function buildWeeklyScheduleSummary(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const weekday = Number(row.weekday);
    const key = `${weekday}|${row.startTime}|${row.endTime}`;
    grouped.set(key, {
      weekday,
      dayLabel: DAY_LABELS[weekday] || `Dia ${weekday}`,
      startTime: row.startTime,
      endTime: row.endTime,
      slotMinutes: Number(row.slotMinutes || 60),
      isActive: Number(row.isActive) === 1
    });
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.weekday !== right.weekday) return left.weekday - right.weekday;
    return String(left.startTime).localeCompare(String(right.startTime));
  });
}

async function resolveCenter({ connection, tenantSlug, adminSession }) {
  const normalizedTenant = typeof tenantSlug === "string" ? tenantSlug.trim() : "";
  const adminCenterId = parseAdminCenterId(adminSession);

  if (adminCenterId) {
    const centerParams = [adminCenterId];
    let centerSql = `SELECT
      id,
      slug,
      name,
      timezone
     FROM centers
     WHERE id = ?
       AND is_active = 1`;

    if (normalizedTenant) {
      centerSql += " AND slug = ?";
      centerParams.push(normalizedTenant);
    }

    centerSql += " LIMIT 1";

    const [rows] = await connection.query(centerSql, centerParams);

    if (rows.length === 0) {
      throw new AdminTherapistsError({
        status: 403,
        code: "ADMIN_CENTER_SCOPE_FORBIDDEN",
        message: "El admin no tiene acceso a ese centro"
      });
    }

    return {
      id: Number(rows[0].id),
      slug: rows[0].slug,
      displayName: rows[0].name,
      timezone: rows[0].timezone
    };
  }

  throw new ValidationError("Sesion admin sin centerId", {
    field: "adminSession.centerId"
  });
}

async function loadTherapistSchedulesByIds({ connection, centerId, therapistIds }) {
  if (!therapistIds.length) {
    return new Map();
  }

  const inClause = `(${therapistIds.map(() => "?").join(", ")})`;
  const [rows] = await connection.query(
    `SELECT
      resource_id AS therapistId,
      weekday,
      start_time AS startTime,
      end_time AS endTime,
      slot_minutes AS slotMinutes,
      is_active AS isActive
     FROM resource_schedules
     WHERE center_id = ?
       AND resource_type = 'therapist'
       AND resource_id IN ${inClause}
     ORDER BY resource_id ASC, weekday ASC, start_time ASC`,
    [centerId, ...therapistIds]
  );

  const map = new Map();

  for (const row of rows) {
    const therapistId = Number(row.therapistId);
    if (!map.has(therapistId)) {
      map.set(therapistId, []);
    }
    map.get(therapistId).push(row);
  }

  return map;
}

async function listAdminTherapists({
  connection,
  adminSession,
  tenantSlug,
  q,
  status,
  limit,
  now = new Date()
}) {
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const searchQuery = normalizeSearch(q);
  const statusFilter = normalizeStatus(status);
  const rowLimit = parseLimit(limit);
  const nowDate = toDate(now);

  const whereSql = ["t.center_id = ?"];
  const params = [center.id];

  if (statusFilter === "active") {
    whereSql.push("t.is_active = 1");
  } else if (statusFilter === "inactive") {
    whereSql.push("t.is_active = 0");
  }

  if (searchQuery) {
    const qLike = `%${searchQuery.toLowerCase()}%`;
    whereSql.push(
      "(LOWER(t.full_name) LIKE ? OR LOWER(COALESCE(t.display_name, '')) LIKE ? OR LOWER(COALESCE(t.phone, '')) LIKE ?)"
    );
    params.push(qLike, qLike, qLike);
  }

  const [rows] = await connection.query(
    `SELECT
      t.id,
      t.slug,
      t.full_name AS fullName,
      t.display_name AS displayName,
      t.phone,
      t.telegram_chat_id AS telegramChatId,
      t.is_active AS isActive,
      t.created_at AS createdAt,
      GROUP_CONCAT(
        DISTINCT CASE WHEN ts.is_active = 1 AND s.is_active = 1 THEN s.name END
        ORDER BY s.name SEPARATOR '||'
      ) AS serviceNames
     FROM therapists t
     LEFT JOIN therapist_services ts
       ON ts.center_id = t.center_id
      AND ts.therapist_id = t.id
     LEFT JOIN services s
       ON s.center_id = ts.center_id
      AND s.id = ts.service_id
     WHERE ${whereSql.join(" AND ")}
     GROUP BY t.id
     ORDER BY t.is_active DESC, COALESCE(t.display_name, t.full_name) ASC, t.id ASC
     LIMIT ?`,
    [...params, rowLimit]
  );

  const therapists = rows.map(mapBaseTherapistRow);
  const therapistIds = therapists.map((entry) => entry.id);
  const schedulesByTherapist = await loadTherapistSchedulesByIds({
    connection,
    centerId: center.id,
    therapistIds
  });

  const hydrated = therapists.map((therapist) => ({
    ...therapist,
    schedules: buildWeeklyScheduleSummary(schedulesByTherapist.get(therapist.id) || [])
  }));

  return {
    generatedAt: nowDate.toISOString(),
    center,
    filters: {
      q: searchQuery,
      status: statusFilter,
      limit: rowLimit
    },
    therapists: hydrated
  };
}

async function getAdminTherapistDetail({
  connection,
  adminSession,
  tenantSlug,
  therapistId,
  now = new Date()
}) {
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const resolvedTherapistId = parseTherapistId(therapistId);
  const nowDate = toDate(now);

  const [therapistRows] = await connection.query(
    `SELECT
      id,
      slug,
      full_name AS fullName,
      display_name AS displayName,
      phone,
      telegram_chat_id AS telegramChatId,
      is_active AS isActive,
      created_at AS createdAt
     FROM therapists
     WHERE center_id = ?
       AND id = ?
     LIMIT 1`,
    [center.id, resolvedTherapistId]
  );

  if (therapistRows.length === 0) {
    throw new AdminTherapistsError({
      status: 404,
      code: "THERAPIST_NOT_FOUND",
      message: "Terapeuta no encontrado"
    });
  }

  const [serviceRows] = await connection.query(
    `SELECT
      s.id,
      s.slug,
      s.name,
      s.duration_minutes AS durationMinutes,
      s.is_active AS isActive,
      ts.priority,
      ts.is_active AS relationIsActive
     FROM therapist_services ts
     INNER JOIN services s
       ON s.center_id = ts.center_id
      AND s.id = ts.service_id
     WHERE ts.center_id = ?
       AND ts.therapist_id = ?
     ORDER BY ts.is_active DESC, s.is_active DESC, s.name ASC`,
    [center.id, resolvedTherapistId]
  );

  const [scheduleRows] = await connection.query(
    `SELECT
      id,
      weekday,
      start_time AS startTime,
      end_time AS endTime,
      slot_minutes AS slotMinutes,
      valid_from AS validFrom,
      valid_to AS validTo,
      is_active AS isActive
     FROM resource_schedules
     WHERE center_id = ?
       AND resource_type = 'therapist'
       AND resource_id = ?
     ORDER BY weekday ASC, start_time ASC, id ASC`,
    [center.id, resolvedTherapistId]
  );

  const therapist = {
    id: Number(therapistRows[0].id),
    slug: therapistRows[0].slug,
    fullName: therapistRows[0].fullName,
    displayName: therapistRows[0].displayName || therapistRows[0].fullName,
    phone: therapistRows[0].phone || null,
    telegramChatId: therapistRows[0].telegramChatId || null,
    isActive: Number(therapistRows[0].isActive) === 1,
    createdAt: toIso(therapistRows[0].createdAt)
  };

  return {
    generatedAt: nowDate.toISOString(),
    center,
    therapist,
    services: serviceRows.map((row) => ({
      id: Number(row.id),
      slug: row.slug,
      name: row.name,
      durationMinutes: Number(row.durationMinutes || 0),
      isActive: Number(row.isActive) === 1,
      relationIsActive: Number(row.relationIsActive) === 1,
      priority: Number(row.priority || 0)
    })),
    schedules: scheduleRows.map((row) => ({
      id: Number(row.id),
      weekday: Number(row.weekday),
      dayLabel: DAY_LABELS[Number(row.weekday)] || `Dia ${row.weekday}`,
      startTime: row.startTime,
      endTime: row.endTime,
      slotMinutes: Number(row.slotMinutes || 60),
      validFrom: row.validFrom ? String(row.validFrom).slice(0, 10) : null,
      validTo: row.validTo ? String(row.validTo).slice(0, 10) : null,
      isActive: Number(row.isActive) === 1
    }))
  };
}

module.exports = {
  AdminTherapistsError,
  listAdminTherapists,
  getAdminTherapistDetail
};
