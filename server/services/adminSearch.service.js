const { formatDateTimeForDbLocal, getLocalDateKey, toDate } = require("../utils/dates");
const { ValidationError } = require("./errors");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const ALLOWED_TYPES = new Set(["all", "clients", "appointments", "cases", "rooms"]);
const CASE_STATUSES = new Set(["pending", "no_show", "cancelled"]);
const DEFAULT_DB_OFFSET = process.env.DB_TIMEZONE || "-04:00";

function parseAdminCenterId(adminSession) {
  const parsed = Number.parseInt(adminSession?.centerId, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeQuery(rawQuery) {
  return String(rawQuery || "").trim();
}

function normalizeType(rawType) {
  const normalized = String(rawType || "all").trim().toLowerCase();

  if (!ALLOWED_TYPES.has(normalized)) {
    throw new ValidationError("type invalido", {
      field: "type",
      allowed: Array.from(ALLOWED_TYPES)
    });
  }

  return normalized;
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

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (char) => `\\${char}`);
}

function buildLikeTerm(rawQuery) {
  return `%${escapeLike(rawQuery.toLowerCase())}%`;
}

async function resolveCenter({ connection, adminSession }) {
  const adminCenterId = parseAdminCenterId(adminSession);

  if (!adminCenterId) {
    throw new ValidationError("Sesion admin sin centerId", {
      field: "adminSession.centerId"
    });
  }

  const [rows] = await connection.query(
    `SELECT
      id,
      slug,
      name,
      timezone
     FROM centers
     WHERE id = ?
       AND is_active = 1
     LIMIT 1`,
    [adminCenterId]
  );

  if (rows.length === 0) {
    throw new ValidationError("Centro admin no disponible", {
      field: "adminSession.centerId"
    });
  }

  return {
    id: Number(rows[0].id),
    slug: rows[0].slug,
    displayName: rows[0].name,
    timezone: rows[0].timezone
  };
}

function clientResultId(clientId) {
  return `client:${clientId}`;
}

function appointmentResultId(appointmentId) {
  return `appointment:${appointmentId}`;
}

function roomResultId(roomId) {
  return `room:${roomId}`;
}

function caseResultId(appointmentId) {
  return `case:${appointmentId}`;
}

function buildClientResult(row) {
  const onboardingComplete = Number(row.onboardingComplete || 0) === 1;
  const next = row.nextAppointmentStartsAt
    ? {
        appointmentId: row.nextAppointmentId === null ? null : Number(row.nextAppointmentId),
        startsAt: toIso(row.nextAppointmentStartsAt),
        publicCode: row.nextAppointmentPublicCode || null
      }
    : null;

  const subtitleParts = [];
  if (row.whatsapp) {
    subtitleParts.push(row.whatsapp);
  }
  subtitleParts.push(onboardingComplete ? "Onboarding completo" : "Onboarding incompleto");

  return {
    id: clientResultId(row.id),
    type: "client",
    entityId: Number(row.id),
    title: row.fullName || row.whatsapp || `Cliente ${row.id}`,
    subtitle: subtitleParts.join(" · "),
    meta: row.whatsapp || "",
    extras: {
      whatsapp: row.whatsapp || null,
      onboardingComplete,
      nextAppointment: next
    },
    action: {
      kind: "openClient",
      clientId: Number(row.id)
    }
  };
}

const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No show"
};

function formatAppointmentTitle(row) {
  const startsAt = row.startsAt ? new Date(row.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return row.publicCode || `Cita ${row.id}`;
  }

  const month = String(startsAt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(startsAt.getUTCDate()).padStart(2, "0");
  const clientLabel = row.clientName || row.clientPhone || "Sin cliente";
  return `${day}/${month} · ${clientLabel}`;
}

function buildAppointmentResult(row) {
  const subtitleParts = [];
  if (row.serviceName) subtitleParts.push(row.serviceName);
  if (row.therapistName) subtitleParts.push(row.therapistName);
  if (row.roomName) subtitleParts.push(`Sala ${row.roomName}`);
  if (row.status) subtitleParts.push(STATUS_LABELS[row.status] || row.status);

  return {
    id: appointmentResultId(row.id),
    type: "appointment",
    entityId: Number(row.id),
    title: formatAppointmentTitle(row),
    subtitle: subtitleParts.join(" · "),
    meta: row.publicCode || "",
    extras: {
      startsAt: toIso(row.startsAt),
      endsAt: toIso(row.endsAt),
      status: row.status,
      publicCode: row.publicCode || null,
      client: row.clientId
        ? {
            id: Number(row.clientId),
            fullName: row.clientName || null,
            whatsapp: row.clientPhone || null
          }
        : null,
      service: row.serviceId ? { id: Number(row.serviceId), name: row.serviceName || null } : null,
      therapist: row.therapistId
        ? { id: Number(row.therapistId), name: row.therapistName || null }
        : null,
      room: row.roomId ? { id: Number(row.roomId), name: row.roomName || null } : null
    },
    action: {
      kind: "openAppointment",
      appointmentId: Number(row.id)
    }
  };
}

const CASE_REASONS = {
  pending: "Pendiente de confirmar",
  no_show: "Cliente no se presento",
  cancelled: "Cancelada"
};

function buildCaseResult(row) {
  const base = buildAppointmentResult(row);

  return {
    ...base,
    id: caseResultId(row.id),
    type: "case",
    extras: {
      ...base.extras,
      reason: CASE_REASONS[row.status] || row.status
    }
  };
}

function buildRoomResult(row) {
  const subtitleParts = [];
  const todayCount = Number(row.todayCount || 0);
  subtitleParts.push(`${todayCount} cita${todayCount === 1 ? "" : "s"} hoy`);

  if (row.nextStartsAt) {
    subtitleParts.push(`Proxima ${toIso(row.nextStartsAt)}`);
  } else {
    subtitleParts.push("Sin proxima cita");
  }

  return {
    id: roomResultId(row.id),
    type: "room",
    entityId: Number(row.id),
    title: row.name || `Sala ${row.id}`,
    subtitle: subtitleParts.join(" · "),
    meta: "",
    extras: {
      todayCount,
      nextStartsAt: toIso(row.nextStartsAt),
      nextPublicCode: row.nextPublicCode || null
    },
    action: {
      kind: "openRooms",
      roomId: Number(row.id)
    }
  };
}

async function searchClients({ connection, centerId, query, limit }) {
  const params = [centerId];
  let whereExtra = "";

  if (query) {
    const like = buildLikeTerm(query);
    whereExtra = `AND (
      LOWER(c.full_name) LIKE ? ESCAPE '\\\\'
      OR LOWER(COALESCE(c.first_name, '')) LIKE ? ESCAPE '\\\\'
      OR LOWER(COALESCE(c.last_name, '')) LIKE ? ESCAPE '\\\\'
      OR LOWER(c.whatsapp_e164) LIKE ? ESCAPE '\\\\'
    )`;
    params.push(like, like, like, like);
  }

  const sql = `SELECT
      c.id,
      c.full_name AS fullName,
      c.whatsapp_e164 AS whatsapp,
      CASE
        WHEN TRIM(COALESCE(c.first_name, '')) <> ''
         AND TRIM(COALESCE(c.last_name, '')) <> ''
         AND TRIM(COALESCE(c.city, '')) <> ''
         AND TRIM(COALESCE(c.source, '')) <> ''
         AND c.age BETWEEN 18 AND 75
         AND c.onboarding_completed_at IS NOT NULL
        THEN 1
        ELSE 0
      END AS onboardingComplete,
      next_a.id AS nextAppointmentId,
      next_a.starts_at AS nextAppointmentStartsAt,
      next_a.public_code AS nextAppointmentPublicCode
     FROM clients c
     LEFT JOIN (
       SELECT
         ax.client_id,
         ax.id,
         ax.starts_at,
         ax.public_code
       FROM appointments ax
       INNER JOIN (
         SELECT
           client_id,
           MIN(starts_at) AS minStartsAt
         FROM appointments
         WHERE center_id = ?
           AND status IN ('pending', 'confirmed')
         GROUP BY client_id
       ) ax_min
         ON ax_min.client_id = ax.client_id
        AND ax_min.minStartsAt = ax.starts_at
       WHERE ax.center_id = ?
         AND ax.status IN ('pending', 'confirmed')
     ) next_a
       ON next_a.client_id = c.id
     WHERE c.center_id = ?
       AND c.is_active = 1
       ${whereExtra}
     ORDER BY
       CASE WHEN next_a.starts_at IS NULL THEN 1 ELSE 0 END,
       next_a.starts_at ASC,
       c.created_at DESC,
       c.id DESC
     LIMIT ?`;

  const [rows] = await connection.query(sql, [centerId, centerId, ...params, limit]);
  return rows.map(buildClientResult);
}

function appointmentSelectColumns() {
  return `a.id,
      a.public_code AS publicCode,
      a.status,
      a.starts_at AS startsAt,
      a.ends_at AS endsAt,
      c.id AS clientId,
      c.full_name AS clientName,
      c.whatsapp_e164 AS clientPhone,
      s.id AS serviceId,
      s.name AS serviceName,
      t.id AS therapistId,
      COALESCE(t.display_name, t.full_name) AS therapistName,
      r.id AS roomId,
      r.name AS roomName`;
}

async function searchAppointments({ connection, centerId, query, limit, nowDb }) {
  const params = [centerId];
  let whereExtra;
  let orderSql;

  if (query) {
    const like = buildLikeTerm(query);
    whereExtra = `AND (
      LOWER(a.public_code) LIKE ? ESCAPE '\\\\'
      OR LOWER(c.full_name) LIKE ? ESCAPE '\\\\'
      OR LOWER(c.whatsapp_e164) LIKE ? ESCAPE '\\\\'
      OR LOWER(s.name) LIKE ? ESCAPE '\\\\'
      OR LOWER(COALESCE(t.display_name, t.full_name)) LIKE ? ESCAPE '\\\\'
      OR LOWER(r.name) LIKE ? ESCAPE '\\\\'
    )`;
    params.push(like, like, like, like, like, like);
    orderSql = "ORDER BY a.starts_at ASC, a.id ASC";
  } else {
    whereExtra = `AND a.starts_at >= ? AND a.status IN ('pending', 'confirmed')`;
    params.push(nowDb);
    orderSql = "ORDER BY a.starts_at ASC, a.id ASC";
  }

  const sql = `SELECT
      ${appointmentSelectColumns()}
     FROM appointments a
     INNER JOIN clients c ON c.id = a.client_id
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN therapists t ON t.id = a.therapist_id
     INNER JOIN rooms r ON r.id = a.room_id
     WHERE a.center_id = ?
       ${whereExtra}
     ${orderSql}
     LIMIT ?`;

  const [rows] = await connection.query(sql, [...params, limit]);
  return rows.map(buildAppointmentResult);
}

async function searchCases({ connection, centerId, query, limit, nowDb }) {
  const params = [centerId];
  let whereExtra;
  let orderSql = "ORDER BY a.starts_at DESC, a.id DESC";

  if (query) {
    const like = buildLikeTerm(query);
    whereExtra = `AND a.status IN ('pending', 'no_show', 'cancelled')
      AND (
        LOWER(a.public_code) LIKE ? ESCAPE '\\\\'
        OR LOWER(c.full_name) LIKE ? ESCAPE '\\\\'
        OR LOWER(c.whatsapp_e164) LIKE ? ESCAPE '\\\\'
        OR LOWER(s.name) LIKE ? ESCAPE '\\\\'
        OR LOWER(COALESCE(t.display_name, t.full_name)) LIKE ? ESCAPE '\\\\'
        OR LOWER(r.name) LIKE ? ESCAPE '\\\\'
      )`;
    params.push(like, like, like, like, like, like);
  } else {
    whereExtra = `AND a.status IN ('pending', 'no_show', 'cancelled')
      AND a.starts_at >= DATE_SUB(?, INTERVAL 14 DAY)`;
    params.push(nowDb);
  }

  const sql = `SELECT
      ${appointmentSelectColumns()}
     FROM appointments a
     INNER JOIN clients c ON c.id = a.client_id
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN therapists t ON t.id = a.therapist_id
     INNER JOIN rooms r ON r.id = a.room_id
     WHERE a.center_id = ?
       ${whereExtra}
     ${orderSql}
     LIMIT ?`;

  const [rows] = await connection.query(sql, [...params, limit]);
  return rows
    .filter((row) => CASE_STATUSES.has(row.status))
    .map(buildCaseResult);
}

async function searchRooms({ connection, centerId, query, limit, nowDate, dayKey }) {
  const params = [centerId];
  let whereExtra = "";

  if (query) {
    const like = buildLikeTerm(query);
    whereExtra = `AND LOWER(r.name) LIKE ? ESCAPE '\\\\'`;
    params.push(like);
  }

  const dayStart = `${dayKey} 00:00:00`;
  const dayEnd = `${dayKey} 23:59:59`;
  const nowDb = formatDateTimeForDbLocal(nowDate, DEFAULT_DB_OFFSET);

  const sql = `SELECT
      r.id,
      r.name,
      (
        SELECT COUNT(*)
        FROM appointments ax
        WHERE ax.center_id = r.center_id
          AND ax.room_id = r.id
          AND ax.status IN ('pending', 'confirmed', 'completed')
          AND ax.starts_at >= ?
          AND ax.starts_at <= ?
      ) AS todayCount,
      (
        SELECT ax.starts_at
        FROM appointments ax
        WHERE ax.center_id = r.center_id
          AND ax.room_id = r.id
          AND ax.status IN ('pending', 'confirmed')
          AND ax.starts_at >= ?
        ORDER BY ax.starts_at ASC
        LIMIT 1
      ) AS nextStartsAt,
      (
        SELECT ax.public_code
        FROM appointments ax
        WHERE ax.center_id = r.center_id
          AND ax.room_id = r.id
          AND ax.status IN ('pending', 'confirmed')
          AND ax.starts_at >= ?
        ORDER BY ax.starts_at ASC
        LIMIT 1
      ) AS nextPublicCode
     FROM rooms r
     WHERE r.center_id = ?
       AND r.is_active = 1
       ${whereExtra}
     ORDER BY r.name ASC, r.id ASC
     LIMIT ?`;

  const [rows] = await connection.query(sql, [
    dayStart,
    dayEnd,
    nowDb,
    nowDb,
    ...params,
    limit
  ]);

  return rows.map(buildRoomResult);
}

function flattenGroups(groups, type) {
  if (type === "all") {
    const merged = [];
    merged.push(...groups.appointments);
    merged.push(...groups.cases);
    merged.push(...groups.clients);
    merged.push(...groups.rooms);
    return merged;
  }

  return groups[type] || [];
}

async function searchAdmin({
  connection,
  adminSession,
  q,
  type,
  limit,
  now = new Date()
}) {
  const center = await resolveCenter({ connection, adminSession });
  const normalizedQuery = normalizeQuery(q);
  const normalizedType = normalizeType(type);
  const rowLimit = parseLimit(limit);
  const nowDate = toDate(now);
  const nowDb = formatDateTimeForDbLocal(nowDate, DEFAULT_DB_OFFSET);
  const dayKey = getLocalDateKey(nowDate, DEFAULT_DB_OFFSET);

  const groups = {
    clients: [],
    appointments: [],
    cases: [],
    rooms: []
  };

  const wantsClients = normalizedType === "all" || normalizedType === "clients";
  const wantsAppointments = normalizedType === "all" || normalizedType === "appointments";
  const wantsCases = normalizedType === "all" || normalizedType === "cases";
  const wantsRooms = normalizedType === "all" || normalizedType === "rooms";

  if (wantsClients) {
    groups.clients = await searchClients({
      connection,
      centerId: center.id,
      query: normalizedQuery,
      limit: rowLimit
    });
  }

  if (wantsAppointments) {
    groups.appointments = await searchAppointments({
      connection,
      centerId: center.id,
      query: normalizedQuery,
      limit: rowLimit,
      nowDb
    });
  }

  if (wantsCases) {
    groups.cases = await searchCases({
      connection,
      centerId: center.id,
      query: normalizedQuery,
      limit: rowLimit,
      nowDb
    });
  }

  if (wantsRooms) {
    groups.rooms = await searchRooms({
      connection,
      centerId: center.id,
      query: normalizedQuery,
      limit: rowLimit,
      nowDate,
      dayKey
    });
  }

  return {
    generatedAt: nowDate.toISOString(),
    center,
    query: {
      q: normalizedQuery,
      type: normalizedType,
      limit: rowLimit
    },
    results: flattenGroups(groups, normalizedType),
    groups
  };
}

module.exports = {
  ALLOWED_TYPES,
  searchAdmin,
  parseLimit,
  normalizeType,
  normalizeQuery
};
