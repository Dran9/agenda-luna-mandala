const { toDate } = require("../utils/dates");
const { ValidationError } = require("./errors");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_HISTORY_LIMIT = 50;
const DEFAULT_PAYMENTS_LIMIT = 50;
const ONBOARDING_FILTERS = new Set(["all", "complete", "incomplete"]);

const ONBOARDING_COMPLETE_SQL = `
  CASE
    WHEN TRIM(COALESCE(c.first_name, '')) <> ''
     AND TRIM(COALESCE(c.last_name, '')) <> ''
     AND TRIM(COALESCE(c.city, '')) <> ''
     AND TRIM(COALESCE(c.source, '')) <> ''
     AND c.age BETWEEN 18 AND 75
     AND c.onboarding_completed_at IS NOT NULL
    THEN 1
    ELSE 0
  END`;

class AdminClientsError extends Error {
  constructor({
    message = "No se pudo completar la operacion admin clientes",
    code = "ADMIN_CLIENTS_ERROR",
    status = 400,
    details = {}
  } = {}) {
    super(message);
    this.name = "AdminClientsError";
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

function normalizeOnboardingFilter(rawFilter) {
  const normalized = String(rawFilter || "all").trim().toLowerCase();

  if (!ONBOARDING_FILTERS.has(normalized)) {
    throw new ValidationError("onboarding invalido", {
      field: "onboarding",
      allowed: Array.from(ONBOARDING_FILTERS)
    });
  }

  return normalized;
}

function parseClientId(rawValue) {
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("clientId invalido", {
      field: "clientId",
      value: rawValue
    });
  }

  return parsed;
}

function parseAdminCenterId(adminSession) {
  const parsed = Number.parseInt(adminSession?.centerId, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function mapAppointmentSummary(row) {
  return {
    id: Number(row.id),
    publicCode: row.publicCode,
    status: row.status,
    startsAt: toIso(row.startsAt),
    endsAt: toIso(row.endsAt),
    serviceName: row.serviceName,
    therapistName: row.therapistName,
    roomName: row.roomName
  };
}

function mapClientRow(row) {
  return {
    id: Number(row.id),
    fullName: row.fullName,
    firstName: row.firstName,
    lastName: row.lastName,
    whatsapp: row.whatsapp,
    age: row.age === null ? null : Number(row.age),
    city: row.city,
    source: row.source,
    onboardingCompletedAt: toIso(row.onboardingCompletedAt),
    onboardingComplete: Number(row.onboardingComplete || 0) === 1,
    createdAt: toIso(row.createdAt)
  };
}

function mapPaymentRow(row) {
  return {
    id: Number(row.id),
    status: row.status,
    amount: Number(row.amount || 0),
    currencyCode: row.currencyCode,
    method: row.method,
    notes: row.notes,
    reviewedAt: toIso(row.reviewedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    appointment: {
      id: Number(row.appointmentId),
      publicCode: row.publicCode,
      status: row.appointmentStatus,
      startsAt: toIso(row.startsAt)
    }
  };
}

function mapStatsRow(row) {
  return {
    totalAppointments: Number(row.totalAppointments || 0),
    pendingCount: Number(row.pendingCount || 0),
    confirmedCount: Number(row.confirmedCount || 0),
    completedCount: Number(row.completedCount || 0),
    cancelledCount: Number(row.cancelledCount || 0),
    noShowCount: Number(row.noShowCount || 0)
  };
}

function emptyStats() {
  return {
    totalAppointments: 0,
    pendingCount: 0,
    confirmedCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    noShowCount: 0
  };
}

function makeInClausePlaceholders(values) {
  return values.map(() => "?").join(", ");
}

function pickFirstByClientId(rows) {
  const map = new Map();

  for (const row of rows) {
    const clientId = Number(row.clientId);

    if (!map.has(clientId)) {
      map.set(clientId, mapAppointmentSummary(row));
    }
  }

  return map;
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
      throw new AdminClientsError({
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

  if (normalizedTenant) {
    const [rows] = await connection.query(
      `SELECT
        id,
        slug,
        name,
        timezone
       FROM centers
       WHERE slug = ?
         AND is_active = 1
       LIMIT 1`,
      [normalizedTenant]
    );

    if (rows.length === 0) {
      throw new ValidationError("tenantSlug no encontrado", {
        field: "tenantSlug"
      });
    }

    return {
      id: Number(rows[0].id),
      slug: rows[0].slug,
      displayName: rows[0].name,
      timezone: rows[0].timezone
    };
  }

  const [rows] = await connection.query(
    `SELECT
      id,
      slug,
      name,
      timezone
     FROM centers
     WHERE is_active = 1
     ORDER BY id ASC
     LIMIT 1`
  );

  if (rows.length === 0) {
    throw new ValidationError("No hay centro activo configurado", {
      field: "center"
    });
  }

  return {
    id: Number(rows[0].id),
    slug: rows[0].slug,
    displayName: rows[0].name,
    timezone: rows[0].timezone
  };
}

async function getClientsStatsByIds({ connection, centerId, clientIds }) {
  if (!clientIds.length) {
    return new Map();
  }

  const placeholders = makeInClausePlaceholders(clientIds);
  const [rows] = await connection.query(
    `SELECT
      client_id AS clientId,
      COUNT(*) AS totalAppointments,
      SUM(status = 'pending') AS pendingCount,
      SUM(status = 'confirmed') AS confirmedCount,
      SUM(status = 'completed') AS completedCount,
      SUM(status = 'cancelled') AS cancelledCount,
      SUM(status = 'no_show') AS noShowCount
     FROM appointments
     WHERE center_id = ?
       AND client_id IN (${placeholders})
     GROUP BY client_id`,
    [centerId, ...clientIds]
  );

  const map = new Map();

  for (const row of rows) {
    map.set(Number(row.clientId), mapStatsRow(row));
  }

  return map;
}

async function getNextAppointmentsByClientIds({ connection, centerId, clientIds, nowDate }) {
  if (!clientIds.length) {
    return new Map();
  }

  const placeholders = makeInClausePlaceholders(clientIds);
  const [rows] = await connection.query(
    `SELECT
      a.client_id AS clientId,
      a.id,
      a.public_code AS publicCode,
      a.status,
      a.starts_at AS startsAt,
      a.ends_at AS endsAt,
      s.name AS serviceName,
      COALESCE(t.display_name, t.full_name) AS therapistName,
      r.name AS roomName
     FROM appointments a
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN therapists t ON t.id = a.therapist_id
     INNER JOIN rooms r ON r.id = a.room_id
     WHERE a.center_id = ?
       AND a.client_id IN (${placeholders})
       AND a.starts_at >= ?
       AND a.status IN ('pending', 'confirmed')
     ORDER BY a.client_id ASC, a.starts_at ASC, a.id ASC`,
    [centerId, ...clientIds, nowDate]
  );

  return pickFirstByClientId(rows);
}

async function getLastAppointmentsByClientIds({ connection, centerId, clientIds, nowDate }) {
  if (!clientIds.length) {
    return new Map();
  }

  const placeholders = makeInClausePlaceholders(clientIds);
  const [rows] = await connection.query(
    `SELECT
      a.client_id AS clientId,
      a.id,
      a.public_code AS publicCode,
      a.status,
      a.starts_at AS startsAt,
      a.ends_at AS endsAt,
      s.name AS serviceName,
      COALESCE(t.display_name, t.full_name) AS therapistName,
      r.name AS roomName
     FROM appointments a
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN therapists t ON t.id = a.therapist_id
     INNER JOIN rooms r ON r.id = a.room_id
     WHERE a.center_id = ?
       AND a.client_id IN (${placeholders})
       AND a.starts_at <= ?
     ORDER BY a.client_id ASC, a.starts_at DESC, a.id DESC`,
    [centerId, ...clientIds, nowDate]
  );

  return pickFirstByClientId(rows);
}

async function listAdminClients({
  connection,
  adminSession,
  tenantSlug,
  q,
  onboarding,
  limit,
  now = new Date()
}) {
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const searchQuery = normalizeSearch(q);
  const onboardingFilter = normalizeOnboardingFilter(onboarding);
  const rowLimit = parseLimit(limit);
  const nowDate = toDate(now);

  const whereSql = ["c.center_id = ?", "c.is_active = 1"];
  const params = [center.id];

  if (searchQuery) {
    const qLike = `%${searchQuery.toLowerCase()}%`;
    whereSql.push(
      "(LOWER(c.full_name) LIKE ? OR LOWER(COALESCE(c.first_name, '')) LIKE ? OR LOWER(COALESCE(c.last_name, '')) LIKE ? OR LOWER(c.whatsapp_e164) LIKE ?)"
    );
    params.push(qLike, qLike, qLike, qLike);
  }

  if (onboardingFilter === "complete") {
    whereSql.push(`(${ONBOARDING_COMPLETE_SQL}) = 1`);
  } else if (onboardingFilter === "incomplete") {
    whereSql.push(`(${ONBOARDING_COMPLETE_SQL}) = 0`);
  }

  const [clientRows] = await connection.query(
    `SELECT
      c.id,
      c.full_name AS fullName,
      c.first_name AS firstName,
      c.last_name AS lastName,
      c.whatsapp_e164 AS whatsapp,
      c.age,
      c.city,
      c.source,
      c.onboarding_completed_at AS onboardingCompletedAt,
      c.created_at AS createdAt,
      (${ONBOARDING_COMPLETE_SQL}) AS onboardingComplete
     FROM clients c
     WHERE ${whereSql.join(" AND ")}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ?`,
    [...params, rowLimit]
  );

  const clients = clientRows.map(mapClientRow);
  const clientIds = clients.map((client) => client.id);

  const [statsByClient, nextByClient, lastByClient] = await Promise.all([
    getClientsStatsByIds({ connection, centerId: center.id, clientIds }),
    getNextAppointmentsByClientIds({ connection, centerId: center.id, clientIds, nowDate }),
    getLastAppointmentsByClientIds({ connection, centerId: center.id, clientIds, nowDate })
  ]);

  const enrichedClients = clients.map((client) => ({
    ...client,
    stats: statsByClient.get(client.id) || emptyStats(),
    nextAppointment: nextByClient.get(client.id) || null,
    lastAppointment: lastByClient.get(client.id) || null
  }));

  return {
    generatedAt: nowDate.toISOString(),
    center,
    filters: {
      q: searchQuery,
      onboarding: onboardingFilter,
      limit: rowLimit
    },
    clients: enrichedClients
  };
}

async function getAdminClientDetail({
  connection,
  adminSession,
  tenantSlug,
  clientId,
  now = new Date()
}) {
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const resolvedClientId = parseClientId(clientId);
  const nowDate = toDate(now);

  const [clientRows] = await connection.query(
    `SELECT
      c.id,
      c.full_name AS fullName,
      c.first_name AS firstName,
      c.last_name AS lastName,
      c.whatsapp_e164 AS whatsapp,
      c.age,
      c.city,
      c.source,
      c.onboarding_completed_at AS onboardingCompletedAt,
      c.created_at AS createdAt,
      (${ONBOARDING_COMPLETE_SQL}) AS onboardingComplete
     FROM clients c
     WHERE c.center_id = ?
       AND c.id = ?
       AND c.is_active = 1
     LIMIT 1`,
    [center.id, resolvedClientId]
  );

  if (clientRows.length === 0) {
    throw new AdminClientsError({
      status: 404,
      code: "CLIENT_NOT_FOUND",
      message: "Cliente no encontrado"
    });
  }

  const client = mapClientRow(clientRows[0]);

  const statsByClient = await getClientsStatsByIds({
    connection,
    centerId: center.id,
    clientIds: [client.id]
  });
  const nextByClient = await getNextAppointmentsByClientIds({
    connection,
    centerId: center.id,
    clientIds: [client.id],
    nowDate
  });
  const lastByClient = await getLastAppointmentsByClientIds({
    connection,
    centerId: center.id,
    clientIds: [client.id],
    nowDate
  });

  const [historyRows] = await connection.query(
    `SELECT
      a.id,
      a.public_code AS publicCode,
      a.status,
      a.starts_at AS startsAt,
      a.ends_at AS endsAt,
      s.name AS serviceName,
      COALESCE(t.display_name, t.full_name) AS therapistName,
      r.name AS roomName
     FROM appointments a
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN therapists t ON t.id = a.therapist_id
     INNER JOIN rooms r ON r.id = a.room_id
     WHERE a.center_id = ?
       AND a.client_id = ?
     ORDER BY a.starts_at DESC, a.id DESC
     LIMIT ?`,
    [center.id, client.id, DEFAULT_HISTORY_LIMIT]
  );

  const [paymentRows] = await connection.query(
    `SELECT
      p.id,
      p.status,
      p.amount,
      p.currency_code AS currencyCode,
      p.method,
      p.reviewed_at AS reviewedAt,
      p.notes,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      a.id AS appointmentId,
      a.public_code AS publicCode,
      a.status AS appointmentStatus,
      a.starts_at AS startsAt
     FROM payments p
     INNER JOIN appointments a ON a.id = p.appointment_id
     WHERE p.center_id = ?
       AND a.center_id = ?
       AND a.client_id = ?
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT ?`,
    [center.id, center.id, client.id, DEFAULT_PAYMENTS_LIMIT]
  );

  return {
    generatedAt: nowDate.toISOString(),
    center,
    client: {
      ...client,
      stats: statsByClient.get(client.id) || emptyStats(),
      nextAppointment: nextByClient.get(client.id) || null,
      lastAppointment: lastByClient.get(client.id) || null
    },
    appointmentsHistory: historyRows.map(mapAppointmentSummary),
    payments: paymentRows.map(mapPaymentRow)
  };
}

module.exports = {
  AdminClientsError,
  listAdminClients,
  getAdminClientDetail
};
