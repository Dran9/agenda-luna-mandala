const { toDate } = require("../utils/dates");
const { ValidationError } = require("./errors");

class AdminResourcesError extends Error {
  constructor({
    message = "No se pudo completar la operacion admin recursos",
    code = "ADMIN_RESOURCES_ERROR",
    status = 400,
    details = {}
  } = {}) {
    super(message);
    this.name = "AdminResourcesError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function parseAdminCenterId(adminSession) {
  const parsed = Number.parseInt(adminSession?.centerId, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeResourceType(rawValue) {
  const normalized = String(rawValue || "all").trim().toLowerCase();
  const allowed = new Set(["all", "therapist", "room"]);
  if (!allowed.has(normalized)) {
    throw new ValidationError("resourceType invalido", {
      field: "resourceType",
      allowed: Array.from(allowed)
    });
  }

  return normalized;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

async function resolveCenter({ connection, tenantSlug, adminSession }) {
  const normalizedTenant = typeof tenantSlug === "string" ? tenantSlug.trim() : "";
  const adminCenterId = parseAdminCenterId(adminSession);

  if (!adminCenterId) {
    throw new ValidationError("Sesion admin sin centerId", {
      field: "adminSession.centerId"
    });
  }

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
    throw new AdminResourcesError({
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

async function listAdminResources({
  connection,
  adminSession,
  tenantSlug,
  resourceType,
  now = new Date()
}) {
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const normalizedResourceType = normalizeResourceType(resourceType);
  const nowDate = toDate(now);

  const [serviceRows, roomRows, compatibilityRows] = await Promise.all([
    connection.query(
      `SELECT
        id,
        slug,
        name,
        duration_minutes AS durationMinutes,
        price_amount AS priceAmount,
        currency_code AS currencyCode,
        is_active AS isActive
       FROM services
       WHERE center_id = ?
       ORDER BY is_active DESC, name ASC, id ASC`,
      [center.id]
    ),
    connection.query(
      `SELECT
        id,
        slug,
        name,
        capacity,
        is_active AS isActive
       FROM rooms
       WHERE center_id = ?
       ORDER BY is_active DESC, name ASC, id ASC`,
      [center.id]
    ),
    connection.query(
      `SELECT
        sr.service_id AS serviceId,
        s.name AS serviceName,
        sr.room_id AS roomId,
        r.name AS roomName,
        sr.is_active AS isActive
       FROM service_rooms sr
       INNER JOIN services s
         ON s.center_id = sr.center_id
        AND s.id = sr.service_id
       INNER JOIN rooms r
         ON r.center_id = sr.center_id
        AND r.id = sr.room_id
       WHERE sr.center_id = ?
       ORDER BY s.name ASC, r.name ASC`,
      [center.id]
    )
  ]);

  const scheduleWhere = ["rs.center_id = ?"];
  const scheduleParams = [center.id];

  if (normalizedResourceType !== "all") {
    scheduleWhere.push("rs.resource_type = ?");
    scheduleParams.push(normalizedResourceType);
  }

  const [scheduleRows] = await connection.query(
    `SELECT
      rs.id,
      rs.resource_type AS resourceType,
      rs.resource_id AS resourceId,
      rs.weekday,
      rs.start_time AS startTime,
      rs.end_time AS endTime,
      rs.slot_minutes AS slotMinutes,
      rs.valid_from AS validFrom,
      rs.valid_to AS validTo,
      rs.is_active AS isActive,
      COALESCE(
        CASE WHEN rs.resource_type = 'therapist' THEN t.display_name END,
        CASE WHEN rs.resource_type = 'therapist' THEN t.full_name END,
        CASE WHEN rs.resource_type = 'room' THEN r.name END
      ) AS resourceName
     FROM resource_schedules rs
     LEFT JOIN therapists t
       ON rs.resource_type = 'therapist'
      AND t.center_id = rs.center_id
      AND t.id = rs.resource_id
     LEFT JOIN rooms r
       ON rs.resource_type = 'room'
      AND r.center_id = rs.center_id
      AND r.id = rs.resource_id
     WHERE ${scheduleWhere.join(" AND ")}
     ORDER BY rs.resource_type ASC, resourceName ASC, rs.weekday ASC, rs.start_time ASC, rs.id ASC`,
    scheduleParams
  );

  const services = serviceRows[0].map((row) => ({
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    durationMinutes: Number(row.durationMinutes || 0),
    priceAmount: Number(row.priceAmount || 0),
    currencyCode: row.currencyCode,
    isActive: Number(row.isActive) === 1
  }));

  const rooms = roomRows[0].map((row) => ({
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    capacity: Number(row.capacity || 1),
    isActive: Number(row.isActive) === 1
  }));

  const serviceRoomCompatibilities = compatibilityRows[0].map((row) => ({
    serviceId: Number(row.serviceId),
    serviceName: row.serviceName,
    roomId: Number(row.roomId),
    roomName: row.roomName,
    isActive: Number(row.isActive) === 1
  }));

  const resourceSchedules = scheduleRows.map((row) => ({
    id: Number(row.id),
    resourceType: row.resourceType,
    resourceId: Number(row.resourceId),
    resourceName: row.resourceName || null,
    weekday: Number(row.weekday),
    dayLabel: DAY_LABELS[Number(row.weekday)] || `Dia ${row.weekday}`,
    startTime: row.startTime,
    endTime: row.endTime,
    slotMinutes: Number(row.slotMinutes || 60),
    validFrom: row.validFrom ? String(row.validFrom).slice(0, 10) : null,
    validTo: row.validTo ? String(row.validTo).slice(0, 10) : null,
    isActive: Number(row.isActive) === 1
  }));

  return {
    generatedAt: nowDate.toISOString(),
    center,
    filters: {
      resourceType: normalizedResourceType
    },
    services,
    rooms,
    serviceRoomCompatibilities,
    resourceSchedules
  };
}

module.exports = {
  AdminResourcesError,
  listAdminResources
};
