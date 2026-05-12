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
const RESOURCE_TYPE_LABELS = {
  therapist: "Terapeuta",
  room: "Sala"
};

function toStatusMeta(isActiveRaw) {
  const status = Number(isActiveRaw) === 1 ? "ACTIVE" : "INACTIVE";
  return {
    status,
    statusLabel: status === "ACTIVE" ? "Activo" : "Inactivo"
  };
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function toTimeLabel(value) {
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

function toDayLabel(weekday) {
  const dayNumber = Number(weekday);
  return DAY_LABELS[dayNumber] || `Dia ${dayNumber}`;
}

function toPriceLabel(amount, currencyCode) {
  const normalizedAmount = toSafeNumber(amount, 0);
  const normalizedCurrency = String(currencyCode || "BOB").toUpperCase();
  const amountLabel = Number.isInteger(normalizedAmount)
    ? String(normalizedAmount)
    : normalizedAmount.toFixed(2).replace(/\.?0+$/, "");

  return `${amountLabel} ${normalizedCurrency}`;
}

function toCapacityLabel(capacity) {
  const normalizedCapacity = Math.max(0, Math.trunc(toSafeNumber(capacity, 0)));
  return normalizedCapacity === 1
    ? "1 persona"
    : `${normalizedCapacity} personas`;
}

function toIsoDateLabel(value) {
  if (!value) {
    return null;
  }

  return String(value).slice(0, 10);
}

function toValidityLabel(validFrom, validTo) {
  if (validFrom && validTo) {
    return `${validFrom} a ${validTo}`;
  }

  if (validFrom) {
    return `Desde ${validFrom}`;
  }

  if (validTo) {
    return `Hasta ${validTo}`;
  }

  return "Sin vigencia";
}

function toResourceTypeLabel(resourceTypeRaw) {
  const normalizedType = String(resourceTypeRaw || "").trim().toLowerCase();
  return RESOURCE_TYPE_LABELS[normalizedType] || "Recurso";
}

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

  const [[serviceRows], [roomRows], [compatibilityRows]] = await Promise.all([
    connection.query(
      `SELECT
        id,
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
       ORDER BY sr.is_active DESC, s.name ASC, r.name ASC`,
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
     ORDER BY rs.is_active DESC,
              CASE
                WHEN rs.resource_type = 'therapist' THEN 0
                WHEN rs.resource_type = 'room' THEN 1
                ELSE 2
              END ASC,
              resourceName ASC,
              rs.weekday ASC,
              rs.start_time ASC,
              rs.id ASC`,
    scheduleParams
  );

  const activeCompatibilityByServiceId = new Map();
  const activeCompatibilityByRoomId = new Map();

  for (const row of compatibilityRows) {
    const isActive = Number(row.isActive) === 1;
    if (!isActive) {
      continue;
    }

    const serviceId = Number(row.serviceId);
    const roomId = Number(row.roomId);

    activeCompatibilityByServiceId.set(
      serviceId,
      (activeCompatibilityByServiceId.get(serviceId) || 0) + 1
    );
    activeCompatibilityByRoomId.set(
      roomId,
      (activeCompatibilityByRoomId.get(roomId) || 0) + 1
    );
  }

  const services = serviceRows.map((row) => {
    const durationMinutes = Math.max(0, Math.trunc(toSafeNumber(row.durationMinutes, 0)));
    const priceAmount = toSafeNumber(row.priceAmount, 0);
    const statusMeta = toStatusMeta(row.isActive);

    return {
      id: Number(row.id),
      name: row.name || `Servicio ${row.id}`,
      durationMinutes,
      durationLabel: `${durationMinutes} min`,
      priceAmount,
      priceLabel: toPriceLabel(priceAmount, row.currencyCode),
      status: statusMeta.status,
      statusLabel: statusMeta.statusLabel,
      compatibleRoomsCount: activeCompatibilityByServiceId.get(Number(row.id)) || 0
    };
  });

  const rooms = roomRows.map((row) => {
    const capacity = Math.max(0, Math.trunc(toSafeNumber(row.capacity, 0)));
    const statusMeta = toStatusMeta(row.isActive);

    return {
      id: Number(row.id),
      name: row.name || `Sala ${row.id}`,
      capacity,
      capacityLabel: toCapacityLabel(capacity),
      status: statusMeta.status,
      statusLabel: statusMeta.statusLabel,
      compatibleServicesCount: activeCompatibilityByRoomId.get(Number(row.id)) || 0
    };
  });

  const compatibilities = compatibilityRows.map((row) => {
    const statusMeta = toStatusMeta(row.isActive);
    const serviceId = Number(row.serviceId);
    const roomId = Number(row.roomId);

    return {
      id: `${serviceId}-${roomId}`,
      serviceId,
      serviceLabel: row.serviceName || `Servicio ${serviceId}`,
      roomId,
      roomLabel: row.roomName || `Sala ${roomId}`,
      status: statusMeta.status,
      statusLabel: statusMeta.statusLabel
    };
  });

  const schedules = scheduleRows.map((row) => {
    const statusMeta = toStatusMeta(row.isActive);
    const weekday = Number(row.weekday);
    const slotMinutes = Math.max(1, Math.trunc(toSafeNumber(row.slotMinutes, 60)));
    const startLabel = toTimeLabel(row.startTime);
    const endLabel = toTimeLabel(row.endTime);
    const validFrom = toIsoDateLabel(row.validFrom);
    const validTo = toIsoDateLabel(row.validTo);
    const resourceType = String(row.resourceType || "").toLowerCase();
    const resourceId = Number(row.resourceId);

    return {
      id: Number(row.id),
      resourceType,
      resourceTypeLabel: toResourceTypeLabel(resourceType),
      resourceId,
      resourceLabel: row.resourceName || `${toResourceTypeLabel(resourceType)} ${resourceId}`,
      weekday,
      dayLabel: toDayLabel(weekday),
      timeRangeLabel: `${startLabel} - ${endLabel}`,
      slotMinutes,
      slotLabel: `${slotMinutes} min`,
      validityLabel: toValidityLabel(validFrom, validTo),
      status: statusMeta.status,
      statusLabel: statusMeta.statusLabel
    };
  });

  return {
    generatedAt: nowDate.toISOString(),
    center,
    settings: {
      services,
      rooms,
      compatibilities,
      schedules
    },
    summary: {
      servicesTotal: services.length,
      roomsTotal: rooms.length,
      compatibilitiesTotal: compatibilities.length,
      schedulesTotal: schedules.length
    }
  };
}

module.exports = {
  AdminResourcesError,
  listAdminResources
};
