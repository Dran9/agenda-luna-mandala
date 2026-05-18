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
const ROOM_FEATURE_LABELS = {
  camilla: "Camilla",
  mesa: "Mesa"
};
const ROOM_FEATURE_KEYS = new Set(Object.keys(ROOM_FEATURE_LABELS));
let serviceRoomRequirementsTableExists = null;

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

function featureKeyToViewModel(featureKey) {
  const key = String(featureKey || "").trim();
  return key ? { key, label: ROOM_FEATURE_LABELS[key] || key } : null;
}

async function hasServiceRoomRequirementsTable(connection) {
  if (typeof serviceRoomRequirementsTableExists === "boolean") {
    return serviceRoomRequirementsTableExists;
  }

  const [rows] = await connection.query(
    `SELECT COUNT(*) AS tableCount
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'service_room_requirements'`
  );

  serviceRoomRequirementsTableExists = Number(rows[0]?.tableCount || 0) > 0;
  return serviceRoomRequirementsTableExists;
}

function resetServiceRoomRequirementsSchemaCache() {
  serviceRoomRequirementsTableExists = null;
}

async function loadServiceRoomRequirements(connection, centerId) {
  if (!(await hasServiceRoomRequirementsTable(connection))) {
    return [];
  }

  const [rows] = await connection.query(
    `SELECT
      service_id AS serviceId,
      feature_key AS featureKey
     FROM service_room_requirements
     WHERE center_id = ?
       AND is_active = 1
     ORDER BY service_id ASC, feature_key ASC`,
    [centerId]
  );

  return rows;
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

async function fetchAdminResourcesBase({ connection, centerId, resourceType }) {
  const scheduleWhere = ["rs.center_id = ?"];
  const scheduleParams = [centerId];

  if (resourceType !== "all") {
    scheduleWhere.push("rs.resource_type = ?");
    scheduleParams.push(resourceType);
  }

  const [resultSets] = await connection.query(
    `/* admin_resources_base:services */
     SELECT
      id,
      name,
      duration_minutes AS durationMinutes,
      price_amount AS priceAmount,
      currency_code AS currencyCode,
      is_active AS isActive
     FROM services
     WHERE center_id = ?
     ORDER BY is_active DESC, name ASC, id ASC;
     /* admin_resources_base:rooms */
     SELECT
      id,
      name,
      capacity,
      is_active AS isActive
     FROM rooms
     WHERE center_id = ?
     ORDER BY is_active DESC, name ASC, id ASC;
     /* admin_resources_base:compatibilities */
     SELECT
      sr.service_id AS serviceId,
      s.name AS serviceName,
      s.is_active AS serviceIsActive,
      sr.room_id AS roomId,
      r.name AS roomName,
      r.is_active AS roomIsActive,
      sr.is_active AS isActive
     FROM service_rooms sr
     INNER JOIN services s
       ON s.center_id = sr.center_id
      AND s.id = sr.service_id
     INNER JOIN rooms r
       ON r.center_id = sr.center_id
      AND r.id = sr.room_id
     WHERE sr.center_id = ?
     ORDER BY sr.is_active DESC, s.name ASC, r.name ASC;
     /* admin_resources_base:features */
     SELECT
      room_id AS roomId,
      feature_key AS featureKey
     FROM room_features
     WHERE center_id = ?
     ORDER BY room_id ASC, feature_key ASC;
     /* admin_resources_base:schedules */
     SELECT
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
              rs.id ASC;
     /* admin_resources_base:therapist_services */
     SELECT
      ts.service_id AS serviceId,
      t.id AS therapistId,
      COALESCE(t.display_name, t.full_name) AS therapistName,
      ts.is_active AS isActive,
      t.is_active AS therapistIsActive,
      s.is_active AS serviceIsActive
     FROM therapist_services ts
     INNER JOIN therapists t
       ON t.center_id = ts.center_id
      AND t.id = ts.therapist_id
     INNER JOIN services s
       ON s.center_id = ts.center_id
      AND s.id = ts.service_id
     WHERE ts.center_id = ?
     ORDER BY ts.is_active DESC, t.is_active DESC, therapistName ASC, t.id ASC`,
    [centerId, centerId, centerId, centerId, ...scheduleParams, centerId]
  );

  const [
    serviceRows = [],
    roomRows = [],
    compatibilityRows = [],
    featureRows = [],
    scheduleRows = [],
    therapistServiceRows = []
  ] = resultSets || [];

  return {
    serviceRows,
    roomRows,
    compatibilityRows,
    featureRows,
    scheduleRows,
    therapistServiceRows
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

  const {
    serviceRows,
    roomRows,
    compatibilityRows,
    featureRows,
    scheduleRows,
    therapistServiceRows
  } = await fetchAdminResourcesBase({
    connection,
    centerId: center.id,
    resourceType: normalizedResourceType
  });
  const requirementRows = await loadServiceRoomRequirements(connection, center.id);

  const activeCompatibilityByServiceId = new Map();
  const activeRoomsByServiceId = new Map();
  const activeCompatibilityByRoomId = new Map();
  const activeTherapistsByServiceId = new Map();
  const featuresByRoomId = new Map();

  for (const row of featureRows) {
    const roomId = Number(row.roomId);
    const featureKey = String(row.featureKey || "").trim();
    if (!roomId || !featureKey) {
      continue;
    }

    if (!featuresByRoomId.has(roomId)) {
      featuresByRoomId.set(roomId, []);
    }
    featuresByRoomId.get(roomId).push(featureKey);
  }

  const requiredFeaturesByServiceId = new Map();
  for (const row of requirementRows) {
    const serviceId = Number(row.serviceId);
    const feature = featureKeyToViewModel(row.featureKey);
    if (!serviceId || !feature) {
      continue;
    }

    if (!requiredFeaturesByServiceId.has(serviceId)) {
      requiredFeaturesByServiceId.set(serviceId, []);
    }
    requiredFeaturesByServiceId.get(serviceId).push(feature);
  }

  for (const row of compatibilityRows) {
    const isActive = Number(row.isActive) === 1 &&
      Number(row.serviceIsActive) === 1 &&
      Number(row.roomIsActive) === 1;
    if (!isActive) {
      continue;
    }

    const serviceId = Number(row.serviceId);
    const roomId = Number(row.roomId);

    activeCompatibilityByServiceId.set(
      serviceId,
      (activeCompatibilityByServiceId.get(serviceId) || 0) + 1
    );
    if (!activeRoomsByServiceId.has(serviceId)) {
      activeRoomsByServiceId.set(serviceId, []);
    }
    activeRoomsByServiceId.get(serviceId).push({
      id: roomId,
      name: row.roomName || `Sala ${roomId}`
    });
    activeCompatibilityByRoomId.set(
      roomId,
      (activeCompatibilityByRoomId.get(roomId) || 0) + 1
    );
  }

  for (const row of therapistServiceRows) {
    const isActive = Number(row.isActive) === 1 &&
      Number(row.therapistIsActive) === 1 &&
      Number(row.serviceIsActive) === 1;
    if (!isActive) {
      continue;
    }

    const serviceId = Number(row.serviceId);
    const therapistId = Number(row.therapistId);
    if (!serviceId || !therapistId) {
      continue;
    }

    if (!activeTherapistsByServiceId.has(serviceId)) {
      activeTherapistsByServiceId.set(serviceId, []);
    }
    activeTherapistsByServiceId.get(serviceId).push({
      id: therapistId,
      name: row.therapistName || `Terapeuta ${therapistId}`
    });
  }

  const services = serviceRows.map((row) => {
    const durationMinutes = Math.max(0, Math.trunc(toSafeNumber(row.durationMinutes, 0)));
    const priceAmount = toSafeNumber(row.priceAmount, 0);
    const statusMeta = toStatusMeta(row.isActive);
    const requiredFeatures = requiredFeaturesByServiceId.get(Number(row.id)) || [];
    const compatibleRooms = activeRoomsByServiceId.get(Number(row.id)) || [];
    const activeTherapists = activeTherapistsByServiceId.get(Number(row.id)) || [];

    return {
      id: Number(row.id),
      name: row.name || `Servicio ${row.id}`,
      durationMinutes,
      durationLabel: `${durationMinutes} min`,
      priceAmount,
      priceLabel: toPriceLabel(priceAmount, row.currencyCode),
      status: statusMeta.status,
      statusLabel: statusMeta.statusLabel,
      compatibleRoomsCount: compatibleRooms.length,
      compatibleRooms,
      compatibleRoomsLabel: compatibleRooms.length
        ? compatibleRooms.map((room) => room.name).join(", ")
        : "Sin salas activas",
      activeTherapistsCount: activeTherapists.length,
      activeTherapists,
      activeTherapistsLabel: activeTherapists.length
        ? activeTherapists.map((therapist) => therapist.name).join(", ")
        : "Sin terapeutas activos",
      requiredFeatures,
      requiredFeatureKeys: requiredFeatures.map((feature) => feature.key),
      requiredFeaturesLabel: requiredFeatures.length
        ? requiredFeatures.map((feature) => feature.label).join(", ")
        : "Solo sillas"
    };
  });

  const rooms = roomRows.map((row) => {
    const capacity = Math.max(0, Math.trunc(toSafeNumber(row.capacity, 0)));
    const statusMeta = toStatusMeta(row.isActive);
    const roomId = Number(row.id);
    const featureKeys = featuresByRoomId.get(roomId) || [];
    const features = featureKeys.map(featureKeyToViewModel).filter(Boolean);

    return {
      id: roomId,
      name: row.name || `Sala ${roomId}`,
      capacity,
      capacityLabel: toCapacityLabel(capacity),
      status: statusMeta.status,
      statusLabel: statusMeta.statusLabel,
      compatibleServicesCount: activeCompatibilityByRoomId.get(roomId) || 0,
      features,
      featureKeys,
      featuresLabel: features.length ? features.map((feature) => feature.label).join(", ") : "-"
    };
  });

  const compatibilities = compatibilityRows.map((row) => {
    const isUsable = Number(row.isActive) === 1 &&
      Number(row.serviceIsActive) === 1 &&
      Number(row.roomIsActive) === 1;
    const statusMeta = toStatusMeta(isUsable ? 1 : 0);
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

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    || "sala";
}

function isEmptyCapacity(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function normalizeRoomCapacity(value, { defaultWhenEmpty = false } = {}) {
  if (isEmptyCapacity(value)) {
    if (defaultWhenEmpty) {
      return 1;
    }

    throw new ValidationError("Capacidad debe ser entero entre 1 y 50", { field: "capacity" });
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new ValidationError("Capacidad debe ser entero entre 1 y 50", { field: "capacity" });
  }

  return parsed;
}

function normalizeRoomFeatureKeys(featureKeys) {
  if (featureKeys === undefined) {
    return undefined;
  }

  if (!Array.isArray(featureKeys)) {
    throw new ValidationError("featureKeys debe ser array", {
      field: "featureKeys",
      allowed: Array.from(ROOM_FEATURE_KEYS)
    });
  }

  const normalized = [...new Set(featureKeys.map((key) => String(key || "").trim()).filter(Boolean))];

  for (const featureKey of normalized) {
    if (!ROOM_FEATURE_KEYS.has(featureKey)) {
      throw new ValidationError(`Recurso no permitido: ${featureKey}`, {
        field: "featureKeys",
        allowed: Array.from(ROOM_FEATURE_KEYS)
      });
    }
  }

  return normalized;
}

function normalizeRoomIsActive(value) {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return 1;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return 0;
  }

  throw new ValidationError("isActive invalido", { field: "isActive" });
}

function normalizeRequiredIsActive(value) {
  if (value === undefined) {
    throw new ValidationError("isActive obligatorio", { field: "isActive" });
  }

  return normalizeRoomIsActive(value);
}

function normalizeServiceName(value) {
  const trimmedName = String(value || "").trim();
  if (!trimmedName) {
    throw new ValidationError("Nombre de servicio obligatorio", { field: "name" });
  }
  if (trimmedName.length > 160) {
    throw new ValidationError("Nombre de servicio demasiado largo", { field: "name" });
  }

  return trimmedName;
}

function normalizeServiceDuration(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new ValidationError("Duracion debe ser entero entre 15 y 480", { field: "durationMinutes" });
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 15 || parsed > 480) {
    throw new ValidationError("Duracion debe ser entero entre 15 y 480", { field: "durationMinutes" });
  }

  return parsed;
}

function normalizeServicePrice(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 999999) {
    throw new ValidationError("Precio debe ser numero entre 0 y 999999", { field: "priceAmount" });
  }

  return Math.round(parsed * 100) / 100;
}

function toServiceMutationResult(serviceRow, requirementRows = []) {
  const durationMinutes = Math.max(0, Math.trunc(toSafeNumber(serviceRow.durationMinutes, 0)));
  const priceAmount = toSafeNumber(serviceRow.priceAmount, 0);
  const statusMeta = toStatusMeta(serviceRow.isActive);
  const requiredFeatureKeys = requirementRows
    .map((row) => String(row.featureKey || "").trim())
    .filter(Boolean);
  const requiredFeatures = requiredFeatureKeys.map(featureKeyToViewModel).filter(Boolean);

  return {
    id: Number(serviceRow.id),
    name: serviceRow.name,
    durationMinutes,
    durationLabel: `${durationMinutes} min`,
    priceAmount,
    priceLabel: toPriceLabel(priceAmount, serviceRow.currencyCode),
    currencyCode: serviceRow.currencyCode || "BOB",
    isActive: Number(serviceRow.isActive) === 1,
    status: statusMeta.status,
    statusLabel: statusMeta.statusLabel,
    requiredFeatureKeys,
    requiredFeatures,
    requiredFeaturesLabel: requiredFeatures.length
      ? requiredFeatures.map((feature) => feature.label).join(", ")
      : "Solo sillas"
  };
}

function toRoomMutationResult(roomRow, featureRows = []) {
  const featureKeys = featureRows.map((row) => String(row.featureKey || "").trim()).filter(Boolean);
  const features = featureKeys.map(featureKeyToViewModel).filter(Boolean);

  return {
    id: Number(roomRow.id),
    name: roomRow.name,
    slug: roomRow.slug,
    capacity: Number(roomRow.capacity),
    capacityLabel: toCapacityLabel(roomRow.capacity),
    isActive: Number(roomRow.isActive) === 1,
    status: Number(roomRow.isActive) === 1 ? "ACTIVE" : "INACTIVE",
    statusLabel: Number(roomRow.isActive) === 1 ? "Activo" : "Inactivo",
    featureKeys,
    features,
    featuresLabel: features.length ? features.map((feature) => feature.label).join(", ") : "-"
  };
}

async function insertRoomFeatures(connection, centerId, roomId, featureKeys) {
  if (!featureKeys.length) {
    return;
  }

  const featureValues = featureKeys.map(() => "(?, ?, ?)").join(", ");
  const featureParams = [];
  for (const featureKey of featureKeys) {
    featureParams.push(centerId, roomId, featureKey);
  }

  await connection.query(
    `INSERT INTO room_features (center_id, room_id, feature_key) VALUES ${featureValues}`,
    featureParams
  );
}

async function createRoom({ connection, adminSession, name, capacity, featureKeys }) {
  const centerId = parseAdminCenterId(adminSession);
  if (!centerId) {
    throw new ValidationError("Sesion admin sin centerId", { field: "adminSession.centerId" });
  }

  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    throw new ValidationError("Nombre de sala obligatorio", { field: "name" });
  }
  if (trimmedName.length > 160) {
    throw new ValidationError("Nombre de sala demasiado largo", { field: "name" });
  }

  const normalizedCapacity = normalizeRoomCapacity(capacity, { defaultWhenEmpty: true });
  const normalizedFeatureKeys = normalizeRoomFeatureKeys(featureKeys) || [];
  const slug = slugify(trimmedName);

  await connection.beginTransaction();

  try {
    const [existingRows] = await connection.query(
      "SELECT id FROM rooms WHERE center_id = ? AND slug = ? LIMIT 1",
      [centerId, slug]
    );

    if (existingRows.length) {
      throw new AdminResourcesError({
        status: 409,
        code: "ROOM_SLUG_DUPLICATE",
        message: `Ya existe una sala con slug "${slug}"`
      });
    }

    const [result] = await connection.query(
      `INSERT INTO rooms (center_id, slug, name, capacity, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [centerId, slug, trimmedName, normalizedCapacity]
    );
    const roomId = Number(result.insertId);

    await insertRoomFeatures(connection, centerId, roomId, normalizedFeatureKeys);

    const [createdRoom] = await connection.query(
      `SELECT id, name, slug, capacity, is_active AS isActive
       FROM rooms
       WHERE center_id = ? AND id = ?
       LIMIT 1`,
      [centerId, roomId]
    );
    const [createdFeatures] = await connection.query(
      `SELECT feature_key AS featureKey
       FROM room_features
       WHERE center_id = ? AND room_id = ?
       ORDER BY feature_key ASC`,
      [centerId, roomId]
    );

    await connection.commit();
    return toRoomMutationResult(createdRoom[0], createdFeatures);
  } catch (error) {
    await connection.rollback();

    if (error instanceof ValidationError || error instanceof AdminResourcesError) {
      throw error;
    }

    if (error?.code === "ER_DUP_ENTRY") {
      throw new AdminResourcesError({
        status: 409,
        code: "ROOM_SLUG_DUPLICATE",
        message: `Ya existe una sala con slug "${slug}"`
      });
    }

    throw new AdminResourcesError({
      status: 500,
      code: "ROOM_CREATE_ERROR",
      message: "No se pudo crear la sala"
    });
  }
}

async function insertServiceRequirements(connection, centerId, serviceId, featureKeys) {
  if (!featureKeys.length) {
    return;
  }

  const values = featureKeys.map(() => "(?, ?, ?, 1)").join(", ");
  const params = [];
  for (const featureKey of featureKeys) {
    params.push(centerId, serviceId, featureKey);
  }

  await connection.query(
    `INSERT INTO service_room_requirements (center_id, service_id, feature_key, is_active)
     VALUES ${values}`,
    params
  );
}

async function loadEligibleRoomIdsForService(connection, centerId, requiredFeatureKeys) {
  if (!requiredFeatureKeys.length) {
    const [rows] = await connection.query(
      `SELECT id
       FROM rooms
       WHERE center_id = ?
         AND is_active = 1
       ORDER BY id ASC`,
      [centerId]
    );
    return rows.map((row) => Number(row.id)).filter(Boolean);
  }

  const featurePlaceholders = requiredFeatureKeys.map(() => "?").join(", ");
  const [rows] = await connection.query(
    `SELECT r.id
     FROM rooms r
     INNER JOIN room_features rf
       ON rf.center_id = r.center_id
      AND rf.room_id = r.id
     WHERE r.center_id = ?
       AND r.is_active = 1
       AND rf.feature_key IN (${featurePlaceholders})
     GROUP BY r.id
     HAVING COUNT(DISTINCT rf.feature_key) = ?
     ORDER BY r.id ASC`,
    [centerId, ...requiredFeatureKeys, requiredFeatureKeys.length]
  );

  return rows.map((row) => Number(row.id)).filter(Boolean);
}

async function insertServiceRoomCompatibilities(connection, centerId, serviceId, roomIds) {
  if (!roomIds.length) {
    return;
  }

  const values = roomIds.map(() => "(?, ?, ?, 1)").join(", ");
  const params = [];
  for (const roomId of roomIds) {
    params.push(centerId, serviceId, roomId);
  }

  await connection.query(
    `INSERT INTO service_rooms (center_id, service_id, room_id, is_active)
     VALUES ${values}
     ON DUPLICATE KEY UPDATE
       is_active = VALUES(is_active)`,
    params
  );
}

async function createService({
  connection,
  adminSession,
  name,
  durationMinutes,
  priceAmount,
  isActive = true,
  requiredFeatureKeys
}) {
  const centerId = parseAdminCenterId(adminSession);
  if (!centerId) {
    throw new ValidationError("Sesion admin sin centerId", { field: "adminSession.centerId" });
  }

  const trimmedName = normalizeServiceName(name);
  const normalizedDuration = normalizeServiceDuration(durationMinutes);
  const normalizedPrice = normalizeServicePrice(priceAmount);
  const normalizedIsActive = normalizeRoomIsActive(isActive);
  const normalizedFeatureKeys = normalizeRoomFeatureKeys(requiredFeatureKeys) || [];
  const slug = slugify(trimmedName);

  await connection.beginTransaction();

  try {
    const [existingRows] = await connection.query(
      "SELECT id FROM services WHERE center_id = ? AND slug = ? LIMIT 1",
      [centerId, slug]
    );

    if (existingRows.length) {
      throw new AdminResourcesError({
        status: 409,
        code: "SERVICE_SLUG_DUPLICATE",
        message: `Ya existe un servicio con slug "${slug}"`
      });
    }

    const [result] = await connection.query(
      `INSERT INTO services (
        center_id,
        slug,
        name,
        duration_minutes,
        price_amount,
        currency_code,
        is_active
       ) VALUES (?, ?, ?, ?, ?, 'BOB', ?)`,
      [centerId, slug, trimmedName, normalizedDuration, normalizedPrice, normalizedIsActive]
    );
    const serviceId = Number(result.insertId);

    if (normalizedFeatureKeys.length && !(await hasServiceRoomRequirementsTable(connection))) {
      throw new AdminResourcesError({
        status: 500,
        code: "SERVICE_REQUIREMENTS_SCHEMA_MISSING",
        message: "No se pudo crear requisitos del servicio"
      });
    }

    await insertServiceRequirements(connection, centerId, serviceId, normalizedFeatureKeys);
    const eligibleRoomIds = await loadEligibleRoomIdsForService(connection, centerId, normalizedFeatureKeys);
    await insertServiceRoomCompatibilities(connection, centerId, serviceId, eligibleRoomIds);

    const [createdService] = await connection.query(
      `SELECT id,
        name,
        duration_minutes AS durationMinutes,
        price_amount AS priceAmount,
        currency_code AS currencyCode,
        is_active AS isActive
       FROM services
       WHERE center_id = ? AND id = ?
       LIMIT 1`,
      [centerId, serviceId]
    );
    const [createdRequirements] = normalizedFeatureKeys.length
      ? await connection.query(
          `SELECT feature_key AS featureKey
           FROM service_room_requirements
           WHERE center_id = ? AND service_id = ? AND is_active = 1
           ORDER BY feature_key ASC`,
          [centerId, serviceId]
        )
      : [[]];

    await connection.commit();
    return {
      ...toServiceMutationResult(createdService[0], createdRequirements),
      slug,
      compatibleRoomsCount: eligibleRoomIds.length
    };
  } catch (error) {
    await connection.rollback();

    if (error instanceof ValidationError || error instanceof AdminResourcesError) {
      throw error;
    }

    if (error?.code === "ER_DUP_ENTRY") {
      throw new AdminResourcesError({
        status: 409,
        code: "SERVICE_SLUG_DUPLICATE",
        message: `Ya existe un servicio con slug "${slug}"`
      });
    }

    throw new AdminResourcesError({
      status: 500,
      code: "SERVICE_CREATE_ERROR",
      message: "No se pudo crear el servicio"
    });
  }
}

async function updateRoom({ connection, adminSession, roomId: rawRoomId, name, capacity, isActive, featureKeys }) {
  const centerId = parseAdminCenterId(adminSession);
  if (!centerId) {
    throw new ValidationError("Sesion admin sin centerId", { field: "adminSession.centerId" });
  }

  const roomId = Number(rawRoomId);
  if (!Number.isInteger(roomId) || roomId <= 0) {
    throw new ValidationError("roomId invalido", { field: "roomId" });
  }

  const updates = [];
  const updateParams = [];

  if (name !== undefined) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      throw new ValidationError("Nombre de sala no puede estar vacio", { field: "name" });
    }
    if (trimmedName.length > 160) {
      throw new ValidationError("Nombre de sala demasiado largo", { field: "name" });
    }
    updates.push("name = ?");
    updateParams.push(trimmedName);
  }

  if (capacity !== undefined) {
    updates.push("capacity = ?");
    updateParams.push(normalizeRoomCapacity(capacity));
  }

  if (isActive !== undefined) {
    updates.push("is_active = ?");
    updateParams.push(normalizeRoomIsActive(isActive));
  }

  const normalizedFeatureKeys = normalizeRoomFeatureKeys(featureKeys);

  await connection.beginTransaction();

  try {
    const [existingRows] = await connection.query(
      "SELECT id FROM rooms WHERE center_id = ? AND id = ? LIMIT 1 FOR UPDATE",
      [centerId, roomId]
    );

    if (existingRows.length === 0) {
      throw new AdminResourcesError({
        status: 404,
        code: "ROOM_NOT_FOUND",
        message: "Sala no encontrada"
      });
    }

    if (updates.length) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      updateParams.push(centerId, roomId);

      await connection.query(
        `UPDATE rooms SET ${updates.join(", ")} WHERE center_id = ? AND id = ?`,
        updateParams
      );
    }

    if (normalizedFeatureKeys !== undefined) {
      await connection.query(
        "DELETE FROM room_features WHERE center_id = ? AND room_id = ?",
        [centerId, roomId]
      );
      await insertRoomFeatures(connection, centerId, roomId, normalizedFeatureKeys);
    }

    const [updatedRoom] = await connection.query(
      `SELECT id, name, slug, capacity, is_active AS isActive
       FROM rooms
       WHERE center_id = ? AND id = ?
       LIMIT 1`,
      [centerId, roomId]
    );
    const [updatedFeatures] = await connection.query(
      `SELECT feature_key AS featureKey
       FROM room_features
       WHERE center_id = ? AND room_id = ?
       ORDER BY feature_key ASC`,
      [centerId, roomId]
    );

    await connection.commit();
    return toRoomMutationResult(updatedRoom[0], updatedFeatures);
  } catch (error) {
    await connection.rollback();

    if (error instanceof ValidationError || error instanceof AdminResourcesError) {
      throw error;
    }

    throw new AdminResourcesError({
      status: 500,
      code: "ROOM_UPDATE_ERROR",
      message: "No se pudo actualizar la sala"
    });
  }
}

async function updateService({
  connection,
  adminSession,
  serviceId: rawServiceId,
  name,
  durationMinutes,
  priceAmount,
  isActive,
  requiredFeatureKeys
}) {
  const centerId = parseAdminCenterId(adminSession);
  if (!centerId) {
    throw new ValidationError("Sesion admin sin centerId", { field: "adminSession.centerId" });
  }

  const serviceId = Number(rawServiceId);
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    throw new ValidationError("serviceId invalido", { field: "serviceId" });
  }

  const updates = [];
  const updateParams = [];

  if (name !== undefined) {
    updates.push("name = ?");
    updateParams.push(normalizeServiceName(name));
  }

  if (durationMinutes !== undefined) {
    updates.push("duration_minutes = ?");
    updateParams.push(normalizeServiceDuration(durationMinutes));
  }

  if (priceAmount !== undefined) {
    updates.push("price_amount = ?");
    updateParams.push(normalizeServicePrice(priceAmount));
  }

  if (isActive !== undefined) {
    updates.push("is_active = ?");
    updateParams.push(normalizeRoomIsActive(isActive));
  }

  const normalizedFeatureKeys = normalizeRoomFeatureKeys(requiredFeatureKeys);

  await connection.beginTransaction();

  try {
    const [existingRows] = await connection.query(
      `SELECT id
       FROM services
       WHERE center_id = ?
         AND id = ?
       LIMIT 1
       FOR UPDATE`,
      [centerId, serviceId]
    );

    if (existingRows.length === 0) {
      throw new AdminResourcesError({
        status: 404,
        code: "SERVICE_NOT_FOUND",
        message: "Servicio no encontrado"
      });
    }

    if (updates.length) {
      updateParams.push(centerId, serviceId);
      await connection.query(
        `UPDATE services SET ${updates.join(", ")} WHERE center_id = ? AND id = ?`,
        updateParams
      );
    }

    if (normalizedFeatureKeys !== undefined) {
      if (!(await hasServiceRoomRequirementsTable(connection))) {
        throw new AdminResourcesError({
          status: 500,
          code: "SERVICE_REQUIREMENTS_SCHEMA_MISSING",
          message: "No se pudo actualizar requisitos del servicio"
        });
      }

      await connection.query(
        "DELETE FROM service_room_requirements WHERE center_id = ? AND service_id = ?",
        [centerId, serviceId]
      );

      if (normalizedFeatureKeys.length) {
        const requirementValues = normalizedFeatureKeys.map(() => "(?, ?, ?, 1)").join(", ");
        const requirementParams = [];
        for (const featureKey of normalizedFeatureKeys) {
          requirementParams.push(centerId, serviceId, featureKey);
        }

        await connection.query(
          `INSERT INTO service_room_requirements (center_id, service_id, feature_key, is_active)
           VALUES ${requirementValues}`,
          requirementParams
        );
      }
    }

    const [updatedService] = await connection.query(
      `SELECT id,
        name,
        duration_minutes AS durationMinutes,
        price_amount AS priceAmount,
        currency_code AS currencyCode,
        is_active AS isActive
       FROM services
       WHERE center_id = ? AND id = ?
       LIMIT 1`,
      [centerId, serviceId]
    );
    let updatedRequirements = [];
    if (await hasServiceRoomRequirementsTable(connection)) {
      const [requirementRows] = await connection.query(
        `SELECT feature_key AS featureKey
         FROM service_room_requirements
         WHERE center_id = ? AND service_id = ? AND is_active = 1
         ORDER BY feature_key ASC`,
        [centerId, serviceId]
      );
      updatedRequirements = requirementRows;
    }

    await connection.commit();
    return toServiceMutationResult(updatedService[0], updatedRequirements);
  } catch (error) {
    await connection.rollback();

    if (error instanceof ValidationError || error instanceof AdminResourcesError) {
      throw error;
    }

    throw new AdminResourcesError({
      status: 500,
      code: "SERVICE_UPDATE_ERROR",
      message: "No se pudo actualizar el servicio"
    });
  }
}

async function updateServiceRoomCompatibility({
  connection,
  adminSession,
  serviceId: rawServiceId,
  roomId: rawRoomId,
  isActive
}) {
  const centerId = parseAdminCenterId(adminSession);
  if (!centerId) {
    throw new ValidationError("Sesion admin sin centerId", { field: "adminSession.centerId" });
  }

  const serviceId = Number(rawServiceId);
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    throw new ValidationError("serviceId invalido", { field: "serviceId" });
  }

  const roomId = Number(rawRoomId);
  if (!Number.isInteger(roomId) || roomId <= 0) {
    throw new ValidationError("roomId invalido", { field: "roomId" });
  }

  const normalizedIsActive = normalizeRequiredIsActive(isActive);

  await connection.beginTransaction();

  try {
    const [serviceRows] = await connection.query(
      `SELECT id, name
       FROM services
       WHERE center_id = ?
         AND id = ?
       LIMIT 1
       FOR UPDATE`,
      [centerId, serviceId]
    );

    if (serviceRows.length === 0) {
      throw new AdminResourcesError({
        status: 404,
        code: "SERVICE_NOT_FOUND",
        message: "Servicio no encontrado"
      });
    }

    const [roomRows] = await connection.query(
      `SELECT id, name
       FROM rooms
       WHERE center_id = ?
         AND id = ?
       LIMIT 1
       FOR UPDATE`,
      [centerId, roomId]
    );

    if (roomRows.length === 0) {
      throw new AdminResourcesError({
        status: 404,
        code: "ROOM_NOT_FOUND",
        message: "Sala no encontrada"
      });
    }

    await connection.query(
      `INSERT INTO service_rooms (center_id, service_id, room_id, is_active)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_active = VALUES(is_active)`,
      [centerId, serviceId, roomId, normalizedIsActive]
    );

    await connection.commit();

    const statusMeta = toStatusMeta(normalizedIsActive);
    return {
      id: `${serviceId}-${roomId}`,
      serviceId,
      serviceLabel: serviceRows[0].name || `Servicio ${serviceId}`,
      roomId,
      roomLabel: roomRows[0].name || `Sala ${roomId}`,
      isActive: normalizedIsActive === 1,
      status: statusMeta.status,
      statusLabel: statusMeta.statusLabel
    };
  } catch (error) {
    await connection.rollback();

    if (error instanceof ValidationError || error instanceof AdminResourcesError) {
      throw error;
    }

    throw new AdminResourcesError({
      status: 500,
      code: "COMPATIBILITY_UPDATE_ERROR",
      message: "No se pudo actualizar la compatibilidad"
    });
  }
}

module.exports = {
  AdminResourcesError,
  createRoom,
  createService,
  listAdminResources,
  updateService,
  updateServiceRoomCompatibility,
  updateRoom,
  _resetServiceRoomRequirementsSchemaCache: resetServiceRoomRequirementsSchemaCache
};
