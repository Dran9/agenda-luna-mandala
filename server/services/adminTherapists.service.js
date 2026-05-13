const { toDate } = require("../utils/dates");
const { ValidationError } = require("./errors");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const STATUS_FILTERS = new Set(["all", "active", "inactive"]);
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
/**
 * Placeholder estructural para una futura bandera real de admision.
 * En v1 se mantiene constante hasta definir origen en DB o regla derivada.
 */
const DEFAULT_ACCEPTS_NEW = true;

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

function toStatusMeta(isActiveRaw) {
  const status = Number(isActiveRaw) === 1 ? "ACTIVE" : "INACTIVE";
  return {
    status,
    statusLabel: status === "ACTIVE" ? "Activo" : "Inactivo"
  };
}

function compactTime(value) {
  if (!value) {
    return "--:--";
  }

  const raw = String(value).trim();
  const match = raw.match(/^(\d{2}:\d{2})/);
  if (match) {
    return match[1];
  }

  return raw;
}

function mapBaseTherapistRow(row) {
  const statusMeta = toStatusMeta(row.isActive);
  const displayName = row.displayName || row.fullName;
  const contactSummary = row.phone ? String(row.phone).trim() : "-";

  return {
    id: Number(row.id),
    slug: row.slug,
    fullName: row.fullName,
    displayName,
    phone: row.phone || null,
    telegramChatId: row.telegramChatId || null,
    isActive: Number(row.isActive) === 1,
    status: statusMeta.status,
    statusLabel: statusMeta.statusLabel,
    contactSummary: contactSummary || "-",
    createdAt: toIso(row.createdAt),
    compatibleRoomsCount: 0,
    acceptsNew: DEFAULT_ACCEPTS_NEW,
    services: [],
    servicesCount: 0
  };
}

function buildWeeklyScheduleSummary(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const weekday = Number(row.weekday);
    const key = `${weekday}|${row.startTime}|${row.endTime}`;
    const statusMeta = toStatusMeta(row.isActive);
    grouped.set(key, {
      weekday,
      dayLabel: DAY_LABELS[weekday] || `Dia ${weekday}`,
      startTime: row.startTime,
      endTime: row.endTime,
      slotMinutes: Number(row.slotMinutes || 60),
      isActive: Number(row.isActive) === 1,
      status: statusMeta.status,
      statusLabel: statusMeta.statusLabel
    });
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.weekday !== right.weekday) return left.weekday - right.weekday;
    return String(left.startTime).localeCompare(String(right.startTime));
  });
}

function buildSchedulesByDay(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const weekday = Number(row.weekday);
    const dayLabel = DAY_LABELS[weekday] || `Dia ${weekday}`;
    const slotMinutes = Number(row.slotMinutes || 60);
    const startLabel = compactTime(row.startTime);
    const endLabel = compactTime(row.endTime);
    const timeRange = `${startLabel}-${endLabel}`;
    const statusMeta = toStatusMeta(row.isActive);
    const key = `${timeRange}|${slotMinutes}|${statusMeta.status}`;
    const existing = grouped.get(key) || {
      timeRange,
      slotMinutes,
      status: statusMeta.status,
      statusLabel: statusMeta.statusLabel,
      days: [],
      weekdays: []
    };

    if (!existing.weekdays.includes(weekday)) {
      existing.weekdays.push(weekday);
      existing.days.push(dayLabel);
    }

    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map((entry) => {
      const sortedPairs = entry.weekdays
        .map((weekday, index) => ({
          weekday,
          dayLabel: entry.days[index]
        }))
        .sort((left, right) => left.weekday - right.weekday);
      const days = sortedPairs.map((pair) => pair.dayLabel);

      return {
        timeRange: entry.timeRange,
        days,
        daysLabel: days.join(", "),
        slotMinutes: entry.slotMinutes,
        status: entry.status,
        statusLabel: entry.statusLabel,
        _firstWeekday: sortedPairs[0]?.weekday ?? 99
      };
    })
    .sort((left, right) => {
      if (left._firstWeekday !== right._firstWeekday) {
        return left._firstWeekday - right._firstWeekday;
      }

      if (left.timeRange !== right.timeRange) {
        return String(left.timeRange).localeCompare(String(right.timeRange));
      }

      if (left.status !== right.status) {
        return left.status === "ACTIVE" ? -1 : 1;
      }

      return left.slotMinutes - right.slotMinutes;
    })
    .map((entry) => {
      const { _firstWeekday, ...cleaned } = entry;
      return cleaned;
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

async function loadTherapistServicesByIds({ connection, centerId, therapistIds }) {
  if (!therapistIds.length) {
    return new Map();
  }

  const inClause = `(${therapistIds.map(() => "?").join(", ")})`;
  const [rows] = await connection.query(
    `SELECT
      ts.therapist_id AS therapistId,
      s.id AS serviceId,
      s.name AS serviceName
     FROM therapist_services ts
     INNER JOIN services s
       ON s.center_id = ts.center_id
      AND s.id = ts.service_id
     WHERE ts.center_id = ?
       AND ts.therapist_id IN ${inClause}
       AND ts.is_active = 1
       AND s.is_active = 1
     ORDER BY ts.therapist_id ASC, s.name ASC, s.id ASC`,
    [centerId, ...therapistIds]
  );

  const map = new Map();

  for (const row of rows) {
    const therapistId = Number(row.therapistId);
    if (!map.has(therapistId)) {
      map.set(therapistId, []);
    }

    map.get(therapistId).push({
      id: Number(row.serviceId),
      name: row.serviceName
    });
  }

  return map;
}

async function loadTherapistCompatibleRoomsCountByIds({ connection, centerId, therapistIds }) {
  if (!therapistIds.length) {
    return new Map();
  }

  const inClause = `(${therapistIds.map(() => "?").join(", ")})`;
  const [rows] = await connection.query(
    `SELECT
      ts.therapist_id AS therapistId,
      COUNT(DISTINCT r.id) AS compatibleRoomsCount
     FROM therapist_services ts
     INNER JOIN services s
       ON s.center_id = ts.center_id
      AND s.id = ts.service_id
     INNER JOIN service_rooms sr
       ON sr.center_id = ts.center_id
      AND sr.service_id = ts.service_id
     INNER JOIN rooms r
       ON r.center_id = sr.center_id
      AND r.id = sr.room_id
     WHERE ts.center_id = ?
       AND ts.therapist_id IN ${inClause}
       AND ts.is_active = 1
       AND s.is_active = 1
       AND sr.is_active = 1
       AND r.is_active = 1
     GROUP BY ts.therapist_id`,
    [centerId, ...therapistIds]
  );

  const map = new Map();

  for (const row of rows) {
    map.set(Number(row.therapistId), Number(row.compatibleRoomsCount || 0));
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
      t.created_at AS createdAt
     FROM therapists t
     WHERE ${whereSql.join(" AND ")}
     ORDER BY t.is_active DESC, COALESCE(t.display_name, t.full_name) ASC, t.id ASC
     LIMIT ?`,
    [...params, rowLimit]
  );

  const therapists = rows.map(mapBaseTherapistRow);
  const therapistIds = therapists.map((entry) => entry.id);
  const [servicesByTherapist, schedulesByTherapist, compatibleRoomsCountByTherapist] = await Promise.all([
    loadTherapistServicesByIds({
      connection,
      centerId: center.id,
      therapistIds
    }),
    loadTherapistSchedulesByIds({
      connection,
      centerId: center.id,
      therapistIds
    }),
    loadTherapistCompatibleRoomsCountByIds({
      connection,
      centerId: center.id,
      therapistIds
    })
  ]);

  const hydrated = therapists.map((therapist) => ({
    ...therapist,
    services: servicesByTherapist.get(therapist.id) || [],
    servicesCount: (servicesByTherapist.get(therapist.id) || []).length,
    compatibleRoomsCount: compatibleRoomsCountByTherapist.get(therapist.id) || 0,
    acceptsNew: DEFAULT_ACCEPTS_NEW,
    schedules: buildWeeklyScheduleSummary(schedulesByTherapist.get(therapist.id) || []),
    schedulesByDay: buildSchedulesByDay(schedulesByTherapist.get(therapist.id) || [])
  }));

  const summary = {
    total: hydrated.length,
    active: hydrated.filter((entry) => entry.status === "ACTIVE").length,
    inactive: hydrated.filter((entry) => entry.status === "INACTIVE").length
  };

  return {
    generatedAt: nowDate.toISOString(),
    center,
    filters: {
      q: searchQuery,
      status: statusFilter,
      limit: rowLimit
    },
    summary,
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

  const [[serviceRows], [scheduleRows], [compatibleRoomRows]] = await Promise.all([
    connection.query(
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
    ),
    connection.query(
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
    ),
    connection.query(
      `SELECT
        COUNT(DISTINCT r.id) AS compatibleRoomsCount
       FROM therapist_services ts
       INNER JOIN services s
         ON s.center_id = ts.center_id
        AND s.id = ts.service_id
       INNER JOIN service_rooms sr
         ON sr.center_id = ts.center_id
        AND sr.service_id = ts.service_id
       INNER JOIN rooms r
         ON r.center_id = sr.center_id
        AND r.id = sr.room_id
       WHERE ts.center_id = ?
         AND ts.therapist_id = ?
         AND ts.is_active = 1
         AND s.is_active = 1
         AND sr.is_active = 1
         AND r.is_active = 1`,
      [center.id, resolvedTherapistId]
    )
  ]);
  const compatibleRoomsCount = Number(compatibleRoomRows[0]?.compatibleRoomsCount || 0);

  const therapistStatusMeta = toStatusMeta(therapistRows[0].isActive);
  const therapist = {
    id: Number(therapistRows[0].id),
    slug: therapistRows[0].slug,
    fullName: therapistRows[0].fullName,
    displayName: therapistRows[0].displayName || therapistRows[0].fullName,
    phone: therapistRows[0].phone || null,
    telegramChatId: therapistRows[0].telegramChatId || null,
    isActive: Number(therapistRows[0].isActive) === 1,
    status: therapistStatusMeta.status,
    statusLabel: therapistStatusMeta.statusLabel,
    compatibleRoomsCount,
    acceptsNew: DEFAULT_ACCEPTS_NEW,
    createdAt: toIso(therapistRows[0].createdAt)
  };

  return {
    generatedAt: nowDate.toISOString(),
    center,
    therapist,
    services: serviceRows.map((row) => {
      const serviceStatusMeta = toStatusMeta(row.relationIsActive);
      return {
        id: Number(row.id),
        slug: row.slug,
        name: row.name,
        durationMinutes: Number(row.durationMinutes || 0),
        isActive: Number(row.isActive) === 1,
        relationIsActive: Number(row.relationIsActive) === 1,
        relationStatus: serviceStatusMeta.status,
        statusLabel: serviceStatusMeta.statusLabel,
        priority: Number(row.priority || 0)
      };
    }),
    schedules: scheduleRows.map((row) => {
      const statusMeta = toStatusMeta(row.isActive);
      return {
        id: Number(row.id),
        weekday: Number(row.weekday),
        dayLabel: DAY_LABELS[Number(row.weekday)] || `Dia ${row.weekday}`,
        startTime: row.startTime,
        endTime: row.endTime,
        slotMinutes: Number(row.slotMinutes || 60),
        validFrom: row.validFrom ? String(row.validFrom).slice(0, 10) : null,
        validTo: row.validTo ? String(row.validTo).slice(0, 10) : null,
        isActive: Number(row.isActive) === 1,
        status: statusMeta.status,
        statusLabel: statusMeta.statusLabel
      };
    })
  };
}

module.exports = {
  AdminTherapistsError,
  listAdminTherapists,
  getAdminTherapistDetail
};
