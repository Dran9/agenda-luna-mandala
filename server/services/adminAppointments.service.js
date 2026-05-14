const { formatDateTimeForDbLocal, getLocalDateKey, toDate } = require("../utils/dates");
const {
  buildClaimRows,
  createAppointmentClaims,
  releaseAppointmentClaims
} = require("./claims.service");
const { createHoldAppointment } = require("./appointments.service");
const { SlotOccupiedError, ValidationError } = require("./errors");

const DEFAULT_LIMIT = 20;
const DEFAULT_HISTORY_LIMIT = 40;
const MAX_LIMIT = 100;
const DEFAULT_DB_OFFSET = process.env.DB_TIMEZONE || "-04:00";
const STATUS_KEYS = ["pending", "confirmed", "cancelled", "completed", "no_show"];
const TERMINAL_STATUSES = new Set(["cancelled", "completed", "no_show"]);
const ROOM_MUTABLE_STATUSES = new Set(["pending", "confirmed"]);
const ROOM_ACTIVE_STATUSES = new Set(["pending", "confirmed"]);
const HISTORY_STATUS_FILTERS = new Set(["all", "completed", "cancelled", "no_show"]);
const HISTORY_ORDER_KEYS = new Set(["date_desc", "date_asc"]);
const LOCAL_MOBILE_PATTERN = /^[67]\d{7}$/;
const LEGACY_LOCAL_8_DIGIT_PATTERN = /^\d{8}$/;
const ALLOWED_STATUS_TRANSITIONS = {
  pending: new Set(["confirmed", "completed", "cancelled", "no_show"]),
  confirmed: new Set(["completed", "cancelled", "no_show"])
};
const ROOM_FEATURE_LABELS = {
  camilla: "Camilla",
  mesa: "Mesa"
};

class AdminAppointmentsError extends Error {
  constructor({
    message = "No se pudo completar la operacion admin",
    code = "ADMIN_APPOINTMENTS_ERROR",
    status = 400,
    details = {}
  } = {}) {
    super(message);
    this.name = "AdminAppointmentsError";
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

function parseHistoryLimit(rawLimit) {
  if (rawLimit === undefined || rawLimit === null || rawLimit === "") {
    return DEFAULT_HISTORY_LIMIT;
  }

  return parseLimit(rawLimit);
}

function parseUpcoming(rawUpcoming) {
  if (rawUpcoming === undefined || rawUpcoming === null || rawUpcoming === "") {
    return true;
  }

  const normalized = String(rawUpcoming).trim().toLowerCase();

  if (["1", "true", "yes", "si"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }

  throw new ValidationError("upcoming invalido", {
    field: "upcoming"
  });
}

function normalizeDateFilter(rawDate, now = new Date()) {
  if (rawDate === undefined || rawDate === null || rawDate === "" || rawDate === "today") {
    return getLocalDateKey(now, DEFAULT_DB_OFFSET);
  }

  const value = String(rawDate).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  throw new ValidationError("date invalida", {
    field: "date",
    allowed: ["today", "YYYY-MM-DD"]
  });
}

function normalizeSearch(rawQuery) {
  return String(rawQuery || "").trim();
}

function normalizeHistoryStatus(rawStatus) {
  const normalized = String(rawStatus || "all").trim().toLowerCase();

  if (!HISTORY_STATUS_FILTERS.has(normalized)) {
    throw new ValidationError("status invalido", {
      field: "status",
      allowed: Array.from(HISTORY_STATUS_FILTERS)
    });
  }

  return normalized;
}

function normalizeHistoryOrder(rawOrder) {
  const normalized = String(rawOrder || "date_desc").trim().toLowerCase();

  if (!HISTORY_ORDER_KEYS.has(normalized)) {
    throw new ValidationError("order invalido", {
      field: "order",
      allowed: Array.from(HISTORY_ORDER_KEYS)
    });
  }

  return normalized;
}

function parseAppointmentId(rawValue) {
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("appointmentId invalido", {
      field: "appointmentId",
      value: rawValue
    });
  }

  return parsed;
}

function parseAppointmentIds(rawValue) {
  if (!Array.isArray(rawValue)) {
    throw new ValidationError("ids invalido", {
      field: "ids",
      expected: "array<number>"
    });
  }

  const parsedIds = Array.from(
    new Set(
      rawValue.map((entry) => parseAppointmentId(entry))
    )
  );

  if (parsedIds.length === 0) {
    throw new ValidationError("ids vacio", {
      field: "ids"
    });
  }

  return parsedIds;
}

function parseRoomId(rawValue) {
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("roomId invalido", {
      field: "roomId",
      value: rawValue
    });
  }

  return parsed;
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

function parseServiceId(rawValue) {
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("serviceId invalido", {
      field: "serviceId",
      value: rawValue
    });
  }

  return parsed;
}

function normalizeOptionalRoomId(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }

  return parseRoomId(rawValue);
}

function normalizeOptionalTherapistId(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }

  return parseTherapistId(rawValue);
}

function normalizeTargetStatus(rawStatus) {
  const normalized = String(rawStatus || "").trim().toLowerCase();

  if (!STATUS_KEYS.includes(normalized)) {
    throw new ValidationError("status invalido", {
      field: "status",
      allowed: STATUS_KEYS
    });
  }

  return normalized;
}

function normalizePhoneE164(rawValue) {
  const digits = String(rawValue || "").replace(/\D/g, "");

  if (!digits) {
    throw new ValidationError("phoneE164 invalido", {
      field: "phoneE164"
    });
  }

  if (digits.startsWith("591")) {
    const localBoliviaNumber = digits.slice(3);
    if (!LOCAL_MOBILE_PATTERN.test(localBoliviaNumber)) {
      throw new ValidationError(
        "En Bolivia el WhatsApp movil debe tener 8 digitos y empezar con 6 o 7.",
        { field: "phoneE164", country: "BO" }
      );
    }
    return digits;
  }

  if (LOCAL_MOBILE_PATTERN.test(digits)) {
    return `591${digits}`;
  }

  if (LEGACY_LOCAL_8_DIGIT_PATTERN.test(digits) && !LOCAL_MOBILE_PATTERN.test(digits)) {
    throw new ValidationError(
      "En Bolivia el WhatsApp movil debe tener 8 digitos y empezar con 6 o 7.",
      { field: "phoneE164", country: "BO" }
    );
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  throw new ValidationError("phoneE164 invalido", {
    field: "phoneE164"
  });
}

function normalizeClientFullName(rawValue) {
  const normalized = String(rawValue || "").trim().replace(/\s+/g, " ");
  return normalized || null;
}

function normalizeStartsAt(rawValue) {
  if (!rawValue) {
    throw new ValidationError("startsAt invalido", {
      field: "startsAt"
    });
  }

  try {
    return toDate(rawValue);
  } catch {
    throw new ValidationError("startsAt invalido", {
      field: "startsAt"
    });
  }
}

function parseAdminCenterId(adminSession) {
  const parsed = Number.parseInt(adminSession?.centerId, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function buildInClause(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      sql: "(NULL)",
      values: []
    };
  }

  return {
    sql: `(${values.map(() => "?").join(", ")})`,
    values
  };
}

function featureKeyToViewModel(featureKey) {
  const key = String(featureKey || "").trim();
  return key ? { key, label: ROOM_FEATURE_LABELS[key] || key } : null;
}

async function hasServiceRoomRequirementsTable(connection) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS tableCount
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'service_room_requirements'`
  );

  return Number(rows[0]?.tableCount || 0) > 0;
}

async function loadServiceRoomRequirementsByServiceId({ connection, centerId, serviceIds }) {
  const normalizedIds = Array.from(
    new Set(
      (serviceIds || [])
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0)
    )
  );

  const result = new Map();
  if (!normalizedIds.length || !(await hasServiceRoomRequirementsTable(connection))) {
    return result;
  }

  const inClause = buildInClause(normalizedIds);
  const [rows] = await connection.query(
    `SELECT
      service_id AS serviceId,
      feature_key AS featureKey
     FROM service_room_requirements
     WHERE center_id = ?
       AND is_active = 1
       AND service_id IN ${inClause.sql}
     ORDER BY service_id ASC, feature_key ASC`,
    [centerId, ...inClause.values]
  );

  for (const row of rows) {
    const serviceId = Number(row.serviceId);
    const feature = featureKeyToViewModel(row.featureKey);
    if (!serviceId || !feature) continue;
    if (!result.has(serviceId)) {
      result.set(serviceId, []);
    }
    result.get(serviceId).push(feature);
  }

  return result;
}

function baseAppointmentSelectSql() {
  return `SELECT
    a.id,
    a.public_code AS publicCode,
    a.status,
    a.source,
    a.starts_at AS startsAt,
    a.ends_at AS endsAt,
    a.created_at AS createdAt,
    c.id AS clientId,
    c.full_name AS clientName,
    c.whatsapp_e164 AS clientPhone,
    s.id AS serviceId,
    s.name AS serviceName,
    t.id AS therapistId,
    COALESCE(t.display_name, t.full_name) AS therapistName,
    r.id AS roomId,
    r.name AS roomName
   FROM appointments a
   INNER JOIN clients c
     ON c.id = a.client_id
   INNER JOIN services s
     ON s.id = a.service_id
   INNER JOIN therapists t
     ON t.id = a.therapist_id
   INNER JOIN rooms r
     ON r.id = a.room_id`;
}

function mapAppointmentRow(row, requiredFeatures = []) {
  return {
    id: Number(row.id),
    publicCode: row.publicCode,
    status: row.status,
    source: row.source || null,
    startsAt: toIso(row.startsAt),
    endsAt: toIso(row.endsAt),
    createdAt: toIso(row.createdAt),
    client: {
      id: Number(row.clientId),
      fullName: row.clientName,
      whatsapp: row.clientPhone
    },
    service: {
      id: Number(row.serviceId),
      name: row.serviceName,
      requiredFeatures,
      requiredFeatureKeys: requiredFeatures.map((feature) => feature.key),
      requiredFeaturesLabel: requiredFeatures.length
        ? requiredFeatures.map((feature) => feature.label).join(", ")
        : "Solo sillas"
    },
    therapist: {
      id: Number(row.therapistId),
      name: row.therapistName
    },
    room: {
      id: Number(row.roomId),
      name: row.roomName
    }
  };
}

function createSummary(statusRows) {
  const summary = {
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    no_show: 0,
    total: 0
  };

  for (const row of statusRows) {
    if (!STATUS_KEYS.includes(row.status)) {
      continue;
    }

    const count = Number(row.total || 0);
    summary[row.status] = count;
    summary.total += count;
  }

  return summary;
}

function isClientOnboardingComplete(row) {
  const firstName = String(row.clientFirstName || "").trim();
  const lastName = String(row.clientLastName || "").trim();
  const city = String(row.clientCity || "").trim();
  const source = String(row.clientSource || "").trim();
  const age = Number.parseInt(row.clientAge, 10);

  return (
    firstName.length > 0 &&
    lastName.length > 0 &&
    city.length > 0 &&
    source.length > 0 &&
    Number.isInteger(age) &&
    age >= 18 &&
    age <= 75 &&
    Boolean(row.clientOnboardingCompletedAt)
  );
}

function mapAppointmentDetail(row, { claims = [], payments = [], requiredFeatures = [] } = {}) {
  const paymentsSummary = {
    totalPayments: payments.length,
    byStatus: {
      pending: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0
    },
    totalsByCurrency: {}
  };

  for (const payment of payments) {
    if (paymentsSummary.byStatus[payment.status] !== undefined) {
      paymentsSummary.byStatus[payment.status] += 1;
    }

    const currencyCode = String(payment.currencyCode || "").trim() || "UNKNOWN";
    paymentsSummary.totalsByCurrency[currencyCode] =
      (paymentsSummary.totalsByCurrency[currencyCode] || 0) + Number(payment.amount || 0);
  }

  return {
    id: Number(row.id),
    publicCode: row.publicCode,
    status: row.status,
    startsAt: toIso(row.startsAt),
    endsAt: toIso(row.endsAt),
    createdAt: toIso(row.createdAt),
    client: {
      id: Number(row.clientId),
      fullName: row.clientName,
      whatsapp: row.clientPhone,
      firstName: row.clientFirstName,
      lastName: row.clientLastName,
      age: row.clientAge === null ? null : Number(row.clientAge),
      city: row.clientCity,
      source: row.clientSource,
      onboardingCompletedAt: toIso(row.clientOnboardingCompletedAt),
      onboardingComplete: isClientOnboardingComplete(row)
    },
    service: {
      id: Number(row.serviceId),
      name: row.serviceName,
      requiredFeatures,
      requiredFeatureKeys: requiredFeatures.map((feature) => feature.key),
      requiredFeaturesLabel: requiredFeatures.length
        ? requiredFeatures.map((feature) => feature.label).join(", ")
        : "Solo sillas"
    },
    therapist: {
      id: Number(row.therapistId),
      name: row.therapistName
    },
    room: {
      id: Number(row.roomId),
      name: row.roomName
    },
    claims,
    payments,
    paymentsSummary
  };
}

function normalizeClaimTimeForSet(value) {
  if (value instanceof Date) {
    return formatDateTimeForDbLocal(value, DEFAULT_DB_OFFSET);
  }

  const raw = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)) {
    return raw.slice(0, 19);
  }

  try {
    return formatDateTimeForDbLocal(toDate(raw), DEFAULT_DB_OFFSET);
  } catch {
    return raw;
  }
}

function createClaimSet(claims) {
  const claimSet = new Set();

  for (const claim of claims) {
    claimSet.add(
      [
        String(claim.resourceType || "").trim(),
        Number(claim.resourceId),
        normalizeClaimTimeForSet(claim.claimTime)
      ].join("|")
    );
  }

  return claimSet;
}

function createExpectedClaimSet(expectedClaims) {
  const claimSet = new Set();

  for (const claim of expectedClaims) {
    claimSet.add([String(claim[2] || "").trim(), Number(claim[3]), claim[4]].join("|"));
  }

  return claimSet;
}

function doActiveClaimsMatchExpected({ activeClaims, expectedClaims }) {
  const activeSet = createClaimSet(activeClaims);
  const expectedSet = createExpectedClaimSet(expectedClaims);

  if (activeClaims.length !== expectedClaims.length || activeSet.size !== expectedSet.size) {
    return false;
  }

  for (const expectedClaim of expectedSet) {
    if (!activeSet.has(expectedClaim)) {
      return false;
    }
  }

  return true;
}

function mergeAppointmentRowsById(...groups) {
  const map = new Map();

  for (const group of groups) {
    for (const row of group || []) {
      map.set(Number(row.id), row);
    }
  }

  return Array.from(map.values());
}

function sortRowsByStartsAtAsc(rows) {
  return [...rows].sort((left, right) => {
    const leftTime = toDate(left.startsAt).getTime();
    const rightTime = toDate(right.startsAt).getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return Number(left.id) - Number(right.id);
  });
}

function mapAppointmentRowsWithRequirements(rows, requirementsByServiceId) {
  return rows.map((row) =>
    mapAppointmentRow(row, requirementsByServiceId.get(Number(row.serviceId)) || [])
  );
}

function isRoomActiveAppointmentRow(row, nowDate) {
  const status = String(row.status || "").trim().toLowerCase();

  if (!ROOM_ACTIVE_STATUSES.has(status)) {
    return false;
  }

  return toDate(row.endsAt).getTime() > nowDate.getTime();
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
      throw new AdminAppointmentsError({
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

async function getAppointmentRow({ connection, centerId, appointmentId, forUpdate = false }) {
  const lockSuffix = forUpdate ? " FOR UPDATE" : "";
  const [rows] = await connection.query(
    `SELECT
      a.id,
      a.public_code AS publicCode,
      a.status,
      a.starts_at AS startsAt,
      a.ends_at AS endsAt,
      a.created_at AS createdAt,
      a.hold_token AS holdToken,
      c.id AS clientId,
      c.full_name AS clientName,
      c.whatsapp_e164 AS clientPhone,
      c.first_name AS clientFirstName,
      c.last_name AS clientLastName,
      c.age AS clientAge,
      c.city AS clientCity,
      c.source AS clientSource,
      c.onboarding_completed_at AS clientOnboardingCompletedAt,
      s.id AS serviceId,
      s.name AS serviceName,
      t.id AS therapistId,
      COALESCE(t.display_name, t.full_name) AS therapistName,
      r.id AS roomId,
      r.name AS roomName
     FROM appointments a
     INNER JOIN clients c ON c.id = a.client_id
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN therapists t ON t.id = a.therapist_id
     INNER JOIN rooms r ON r.id = a.room_id
     WHERE a.center_id = ?
       AND a.id = ?
     LIMIT 1${lockSuffix}`,
    [centerId, appointmentId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function getAppointmentClaims({ connection, centerId, appointmentId }) {
  const [rows] = await connection.query(
    `SELECT
      c.id,
      c.resource_type AS resourceType,
      c.resource_id AS resourceId,
      c.claim_time AS claimTime,
      c.created_at AS createdAt,
      COALESCE(
        CASE WHEN c.resource_type = 'therapist' THEN t.display_name END,
        CASE WHEN c.resource_type = 'therapist' THEN t.full_name END,
        CASE WHEN c.resource_type = 'room' THEN r.name END
      ) AS resourceName
     FROM appointment_resource_claims c
     LEFT JOIN therapists t
       ON c.resource_type = 'therapist'
      AND t.id = c.resource_id
      AND t.center_id = c.center_id
     LEFT JOIN rooms r
       ON c.resource_type = 'room'
      AND r.id = c.resource_id
      AND r.center_id = c.center_id
     WHERE c.center_id = ?
       AND c.appointment_id = ?
     ORDER BY c.claim_time ASC, c.resource_type ASC, c.resource_id ASC`,
    [centerId, appointmentId]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    resourceType: row.resourceType,
    resourceId: Number(row.resourceId),
    resourceName: row.resourceName || null,
    claimTime: toIso(row.claimTime),
    createdAt: toIso(row.createdAt)
  }));
}

async function getAppointmentPayments({ connection, centerId, appointmentId }) {
  const [rows] = await connection.query(
    `SELECT
      id,
      status,
      amount,
      currency_code AS currencyCode,
      method,
      proof_file_id AS proofFileId,
      reviewed_by_admin_user_id AS reviewedByAdminUserId,
      reviewed_at AS reviewedAt,
      notes,
      created_at AS createdAt,
      updated_at AS updatedAt
     FROM payments
     WHERE center_id = ?
       AND appointment_id = ?
     ORDER BY created_at DESC, id DESC`,
    [centerId, appointmentId]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    status: row.status,
    amount: Number(row.amount),
    currencyCode: row.currencyCode,
    method: row.method,
    proofFileId: row.proofFileId === null ? null : Number(row.proofFileId),
    reviewedByAdminUserId:
      row.reviewedByAdminUserId === null ? null : Number(row.reviewedByAdminUserId),
    reviewedAt: toIso(row.reviewedAt),
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  }));
}

async function getClientActiveContext({
  connection,
  centerId,
  clientId,
  appointmentId,
  now = new Date()
}) {
  const nowDb = formatDateTimeForDbLocal(now, DEFAULT_DB_OFFSET);
  const [rows] = await connection.query(
    `SELECT
      a.id,
      a.service_id AS serviceId,
      s.name AS serviceName,
      a.therapist_id AS therapistId,
      COALESCE(t.display_name, t.full_name) AS therapistName,
      a.room_id AS roomId,
      r.name AS roomName,
      a.status,
      a.starts_at AS startsAt
     FROM appointments a
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN therapists t ON t.id = a.therapist_id
     INNER JOIN rooms r ON r.id = a.room_id
     WHERE a.center_id = ?
       AND a.client_id = ?
       AND a.status IN ('pending', 'confirmed')
       AND a.starts_at >= ?
     ORDER BY a.starts_at ASC, a.id ASC`,
    [centerId, clientId, nowDb]
  );

  const activeAppointments = rows.map((entry) => ({
    id: Number(entry.id),
    serviceId: Number(entry.serviceId),
    serviceName: entry.serviceName,
    therapistId: Number(entry.therapistId),
    therapistName: entry.therapistName,
    roomId: Number(entry.roomId),
    roomName: entry.roomName,
    status: entry.status,
    startsAt: toIso(entry.startsAt),
    isCurrent: Number(entry.id) === Number(appointmentId)
  }));

  const distinctServiceNames = Array.from(
    new Set(activeAppointments.map((entry) => String(entry.serviceName || "").trim()).filter(Boolean))
  );

  return {
    activeAppointments,
    distinctServiceNames,
    activeServiceCount: distinctServiceNames.length,
    hasMultipleServices: distinctServiceNames.length > 1
  };
}

async function getRoomOptionsForAppointment({
  connection,
  centerId,
  appointmentRow
}) {
  const serviceId = Number(appointmentRow.serviceId);
  const appointmentId = Number(appointmentRow.id);
  const currentRoomId = Number(appointmentRow.roomId);

  const [roomRows] = await connection.query(
    `SELECT
      r.id AS roomId,
      r.name AS roomName
     FROM service_rooms sr
     INNER JOIN rooms r
       ON r.id = sr.room_id
      AND r.center_id = sr.center_id
     WHERE sr.center_id = ?
       AND sr.service_id = ?
       AND sr.is_active = 1
       AND r.is_active = 1
     ORDER BY r.id ASC`,
    [centerId, serviceId]
  );

  if (roomRows.length === 0) {
    return [];
  }

  const roomIds = roomRows.map((entry) => Number(entry.roomId));
  const inClause = buildInClause(roomIds);
  const startsAtDb = formatDateTimeForDbLocal(appointmentRow.startsAt, DEFAULT_DB_OFFSET);
  const endsAtDb = formatDateTimeForDbLocal(appointmentRow.endsAt, DEFAULT_DB_OFFSET);

  const [blockedRows] = await connection.query(
    `SELECT
      resource_id AS roomId,
      COUNT(*) AS blockedMinutes
     FROM appointment_resource_claims
     WHERE center_id = ?
       AND resource_type = 'room'
       AND appointment_id <> ?
       AND claim_time >= ?
       AND claim_time < ?
       AND resource_id IN ${inClause.sql}
     GROUP BY resource_id`,
    [centerId, appointmentId, startsAtDb, endsAtDb, ...inClause.values]
  );

  const blockedByRoomId = new Map(
    blockedRows.map((entry) => [Number(entry.roomId), Number(entry.blockedMinutes || 0)])
  );

  return roomRows.map((entry) => {
    const roomId = Number(entry.roomId);
    const blockedMinutes = blockedByRoomId.get(roomId) || 0;
    return {
      id: roomId,
      name: entry.roomName,
      available: blockedMinutes === 0,
      blockedMinutes,
      current: roomId === currentRoomId
    };
  });
}

async function buildAppointmentDetail({ connection, centerId, appointmentId, row, now = new Date() }) {
  const appointmentRow = row || (await getAppointmentRow({ connection, centerId, appointmentId }));

  if (!appointmentRow) {
    return null;
  }

  const [claims, payments, clientContext, roomOptions] = await Promise.all([
    getAppointmentClaims({ connection, centerId, appointmentId }),
    getAppointmentPayments({ connection, centerId, appointmentId }),
    getClientActiveContext({
      connection,
      centerId,
      clientId: Number(appointmentRow.clientId),
      appointmentId,
      now
    }),
    getRoomOptionsForAppointment({
      connection,
      centerId,
      appointmentRow
    })
  ]);
  const requirementsByServiceId = await loadServiceRoomRequirementsByServiceId({
    connection,
    centerId,
    serviceIds: [appointmentRow.serviceId]
  });

  return {
    ...mapAppointmentDetail(appointmentRow, {
      claims,
      payments,
      requiredFeatures: requirementsByServiceId.get(Number(appointmentRow.serviceId)) || []
    }),
    clientContext,
    roomOptions
  };
}

async function listAdminAppointments({
  connection,
  tenantSlug,
  date,
  upcoming,
  limit,
  now = new Date(),
  adminSession
}) {
  const nowDate = toDate(now);
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const dateKey = normalizeDateFilter(date, nowDate);
  const includeUpcoming = parseUpcoming(upcoming);
  const rowLimit = parseLimit(limit);

  const dayStart = `${dateKey} 00:00:00`;
  const dayEnd = `${dateKey} 23:59:59`;

  const [todayRows] = await connection.query(
    `${baseAppointmentSelectSql()}
     WHERE a.center_id = ?
       AND a.starts_at >= ?
       AND a.starts_at <= ?
     ORDER BY a.starts_at ASC, a.id ASC
     LIMIT ?`,
    [center.id, dayStart, dayEnd, rowLimit]
  );

  let upcomingRows = [];

  if (includeUpcoming) {
    const [rows] = await connection.query(
      `${baseAppointmentSelectSql()}
       WHERE a.center_id = ?
         AND a.starts_at > ?
       ORDER BY a.starts_at ASC, a.id ASC
       LIMIT ?`,
      [center.id, dayEnd, rowLimit]
    );

    upcomingRows = rows;
  }

  const summaryParams = [center.id, dayStart];
  let summaryRangeSql = "";

  if (!includeUpcoming) {
    summaryRangeSql = " AND starts_at <= ?";
    summaryParams.push(dayEnd);
  }

  const [summaryRows] = await connection.query(
    `SELECT
      status,
      COUNT(*) AS total
     FROM appointments
     WHERE center_id = ?
       AND starts_at >= ?${summaryRangeSql}
     GROUP BY status`,
    summaryParams
  );

  const [recentRows] = await connection.query(
    `${baseAppointmentSelectSql()}
     WHERE a.center_id = ?
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ?`,
    [center.id, rowLimit]
  );

  const [roomRows] = await connection.query(
    `SELECT
      id,
      slug,
      name,
      capacity,
      is_active AS isActive
     FROM rooms
     WHERE center_id = ?
       AND is_active = 1
     ORDER BY name ASC, id ASC`,
    [center.id]
  );

  const roomsActiveRows = sortRowsByStartsAtAsc(
    mergeAppointmentRowsById(todayRows, upcomingRows, recentRows).filter((row) =>
      isRoomActiveAppointmentRow(row, nowDate)
    )
  );
  const requirementsByServiceId = await loadServiceRoomRequirementsByServiceId({
    connection,
    centerId: center.id,
    serviceIds: mergeAppointmentRowsById(todayRows, upcomingRows, recentRows).map((row) => row.serviceId)
  });

  return {
    generatedAt: nowDate.toISOString(),
    center,
    filters: {
      date: dateKey,
      upcoming: includeUpcoming,
      limit: rowLimit
    },
    summary: createSummary(summaryRows),
    today: mapAppointmentRowsWithRequirements(todayRows, requirementsByServiceId),
    upcoming: mapAppointmentRowsWithRequirements(upcomingRows, requirementsByServiceId),
    recentCreated: mapAppointmentRowsWithRequirements(recentRows, requirementsByServiceId),
    roomsActive: mapAppointmentRowsWithRequirements(roomsActiveRows, requirementsByServiceId),
    rooms: roomRows.map((row) => ({
      id: Number(row.id),
      slug: row.slug,
      name: row.name,
      capacity: Number(row.capacity || 1)
    })),
    metadata: {
      dbNow: formatDateTimeForDbLocal(nowDate, DEFAULT_DB_OFFSET)
    }
  };
}

async function listAdminAppointmentHistory({
  connection,
  tenantSlug,
  q,
  status,
  order,
  limit,
  now = new Date(),
  adminSession
}) {
  const nowDate = toDate(now);
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const searchQuery = normalizeSearch(q);
  const statusFilter = normalizeHistoryStatus(status);
  const orderFilter = normalizeHistoryOrder(order);
  const rowLimit = parseHistoryLimit(limit);
  const nowDb = formatDateTimeForDbLocal(nowDate, DEFAULT_DB_OFFSET);

  const whereSql = [
    "a.center_id = ?",
    "(a.ends_at <= ? OR a.status IN ('completed', 'cancelled', 'no_show'))"
  ];
  const params = [center.id, nowDb];

  if (searchQuery) {
    const qLike = `%${searchQuery.toLowerCase()}%`;
    whereSql.push("(LOWER(c.full_name) LIKE ? OR LOWER(c.whatsapp_e164) LIKE ?)");
    params.push(qLike, qLike);
  }

  if (statusFilter !== "all") {
    whereSql.push("a.status = ?");
    params.push(statusFilter);
  }

  const isAsc = orderFilter === "date_asc";
  const orderDirection = isAsc ? "ASC" : "DESC";
  const rowsOrderSql = `a.starts_at ${orderDirection}, a.id ${orderDirection}`;

  const [historyRows] = await connection.query(
    `${baseAppointmentSelectSql()}
     WHERE ${whereSql.join(" AND ")}
     ORDER BY ${rowsOrderSql}
     LIMIT ?`,
    [...params, rowLimit]
  );
  const requirementsByServiceId = await loadServiceRoomRequirementsByServiceId({
    connection,
    centerId: center.id,
    serviceIds: historyRows.map((row) => row.serviceId)
  });

  return {
    generatedAt: nowDate.toISOString(),
    center,
    filters: {
      q: searchQuery,
      status: statusFilter,
      order: orderFilter,
      limit: rowLimit
    },
    history: mapAppointmentRowsWithRequirements(historyRows, requirementsByServiceId),
    visible: historyRows.length,
    metadata: {
      dbNow: nowDb
    }
  };
}

async function createAdminManualAppointment({
  connection,
  tenantSlug,
  adminSession,
  phoneE164,
  clientFullName,
  serviceId,
  therapistId,
  roomId,
  startsAt,
  now = new Date(),
  createHold = createHoldAppointment,
  confirmStatus = updateAdminAppointmentStatus
}) {
  const nowDate = toDate(now);
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const normalizedPhone = normalizePhoneE164(phoneE164);
  const normalizedClientName = normalizeClientFullName(clientFullName);
  const normalizedServiceId = parseServiceId(serviceId);
  const normalizedTherapistId = normalizeOptionalTherapistId(therapistId);
  const normalizedRoomId = normalizeOptionalRoomId(roomId);
  const slotStart = normalizeStartsAt(startsAt);

  if (slotStart.getTime() <= nowDate.getTime()) {
    throw new ValidationError("startsAt debe ser futuro", {
      field: "startsAt"
    });
  }

  const hold = await createHold({
    connection,
    centerId: center.id,
    serviceId: normalizedServiceId,
    phoneE164: normalizedPhone,
    startsAt: slotStart,
    therapistId: normalizedTherapistId,
    roomId: normalizedRoomId,
    now: nowDate,
    source: "admin_manual"
  });

  if (normalizedClientName) {
    await connection.query(
      `UPDATE clients
       SET
         full_name = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND center_id = ?
       LIMIT 1`,
      [normalizedClientName, Number(hold.client.id), center.id]
    );
  }

  const confirmation = await confirmStatus({
    connection,
    appointmentId: hold.appointmentId,
    status: "confirmed",
    adminSession,
    tenantSlug,
    now: nowDate
  });

  return {
    generatedAt: nowDate.toISOString(),
    center,
    creation: {
      mode: "admin_manual",
      appointmentId: Number(hold.appointmentId),
      publicCode: hold.publicCode,
      startsAt: hold.startsAt,
      endsAt: hold.endsAt
    },
    appointment: confirmation.appointment
  };
}

async function deleteAdminAppointments({
  connection,
  tenantSlug,
  appointmentIds,
  now = new Date(),
  adminSession,
  releaseClaims = releaseAppointmentClaims
}) {
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const ids = parseAppointmentIds(appointmentIds);
  const nowDate = toDate(now);
  const inClause = buildInClause(ids);
  let startedTransaction = false;

  try {
    await connection.beginTransaction();
    startedTransaction = true;

    const [rows] = await connection.query(
      `SELECT id
       FROM appointments
       WHERE center_id = ?
         AND id IN ${inClause.sql}
       FOR UPDATE`,
      [center.id, ...inClause.values]
    );

    const foundIds = new Set(rows.map((entry) => Number(entry.id)));
    const missingIds = ids.filter((entry) => !foundIds.has(entry));

    if (missingIds.length > 0) {
      throw new AdminAppointmentsError({
        status: 404,
        code: "APPOINTMENT_NOT_FOUND",
        message: "Una o mas citas no existen para este centro",
        details: {
          missingIds
        }
      });
    }

    for (const appointmentId of ids) {
      await releaseClaims({
        connection,
        appointmentId,
        manageTransaction: false
      });
    }

    await connection.query(
      `DELETE FROM payments
       WHERE center_id = ?
         AND appointment_id IN ${inClause.sql}`,
      [center.id, ...inClause.values]
    );

    const [deleteResult] = await connection.query(
      `DELETE FROM appointments
       WHERE center_id = ?
         AND id IN ${inClause.sql}`,
      [center.id, ...inClause.values]
    );

    if (Number(deleteResult?.affectedRows || 0) !== ids.length) {
      throw new AdminAppointmentsError({
        status: 409,
        code: "APPOINTMENT_DELETE_CONFLICT",
        message: "No se pudieron borrar todas las citas solicitadas"
      });
    }

    await connection.commit();

    return {
      generatedAt: nowDate.toISOString(),
      center,
      deleted: {
        appointmentIds: ids,
        total: ids.length
      }
    };
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback();
    }

    throw error;
  }
}

async function getAdminAppointmentDetail({
  connection,
  appointmentId,
  adminSession,
  tenantSlug,
  now = new Date()
}) {
  const resolvedAppointmentId = parseAppointmentId(appointmentId);
  const center = await resolveCenter({ connection, tenantSlug, adminSession });
  const detail = await buildAppointmentDetail({
    connection,
    centerId: center.id,
    appointmentId: resolvedAppointmentId,
    now: toDate(now)
  });

  if (!detail) {
    throw new AdminAppointmentsError({
      status: 404,
      code: "APPOINTMENT_NOT_FOUND",
      message: "Cita no encontrada"
    });
  }

  return {
    generatedAt: toDate(now).toISOString(),
    center,
    appointment: detail
  };
}

async function updateAdminAppointmentStatus({
  connection,
  appointmentId,
  status,
  adminSession,
  tenantSlug,
  now = new Date(),
  createClaims = createAppointmentClaims,
  releaseClaims = releaseAppointmentClaims
}) {
  const resolvedAppointmentId = parseAppointmentId(appointmentId);
  const targetStatus = normalizeTargetStatus(status);
  const nowDate = toDate(now);
  const center = await resolveCenter({ connection, tenantSlug, adminSession });

  let startedTransaction = false;

  try {
    await connection.beginTransaction();
    startedTransaction = true;

    const appointmentRow = await getAppointmentRow({
      connection,
      centerId: center.id,
      appointmentId: resolvedAppointmentId,
      forUpdate: true
    });

    if (!appointmentRow) {
      throw new AdminAppointmentsError({
        status: 404,
        code: "APPOINTMENT_NOT_FOUND",
        message: "Cita no encontrada"
      });
    }

    const currentStatus = String(appointmentRow.status || "").trim().toLowerCase();
    const nextAllowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || null;

    if (!nextAllowedTransitions || !nextAllowedTransitions.has(targetStatus)) {
      throw new AdminAppointmentsError({
        status: 409,
        code: "APPOINTMENT_STATUS_TRANSITION_INVALID",
        message: "Transicion de estado no permitida",
        details: {
          from: currentStatus,
          to: targetStatus
        }
      });
    }

    let claimsAction = "unchanged";
    let claimsReleased = 0;
    let claimsCreated = 0;

    if (TERMINAL_STATUSES.has(targetStatus)) {
      const releaseResult = await releaseClaims({
        connection,
        appointmentId: resolvedAppointmentId,
        manageTransaction: false
      });

      claimsAction = "released";
      claimsReleased = Number(releaseResult?.claimsReleased || 0);
    } else if (currentStatus === "pending" && targetStatus === "confirmed") {
      const [activeClaims] = await connection.query(
        `SELECT
           resource_type AS resourceType,
           resource_id AS resourceId,
           claim_time AS claimTime
         FROM appointment_resource_claims
         WHERE center_id = ?
           AND appointment_id = ?
         ORDER BY claim_time ASC, resource_type ASC, resource_id ASC`,
        [center.id, resolvedAppointmentId]
      );

      const expectedClaims = buildClaimRows({
        centerId: center.id,
        appointmentId: resolvedAppointmentId,
        therapistId: Number(appointmentRow.therapistId),
        roomId: Number(appointmentRow.roomId),
        startsAt: appointmentRow.startsAt,
        endsAt: appointmentRow.endsAt
      });

      if (doActiveClaimsMatchExpected({ activeClaims, expectedClaims })) {
        claimsAction = "preserved";
      } else {
        try {
          const createResult = await createClaims({
            connection,
            manageTransaction: false,
            appointment: {
              centerId: center.id,
              appointmentId: resolvedAppointmentId,
              therapistId: Number(appointmentRow.therapistId),
              roomId: Number(appointmentRow.roomId),
              startsAt: appointmentRow.startsAt,
              endsAt: appointmentRow.endsAt,
              status: "confirmed"
            }
          });

          claimsAction = "recreated";
          claimsCreated = Number(createResult?.claimsCreated || 0);
        } catch (error) {
          if (error instanceof SlotOccupiedError || error?.code === "SLOT_OCCUPIED") {
            throw new AdminAppointmentsError({
              status: 409,
              code: "SLOT_NOT_AVAILABLE",
              message: "El slot ya no esta disponible"
            });
          }

          throw error;
        }
      }
    }

    const shouldClearHoldToken = currentStatus === "pending" && targetStatus !== "pending";

    const [updateResult] = await connection.query(
      `UPDATE appointments
       SET
         status = ?,
         cancelled_at = CASE WHEN ? = 'cancelled' THEN ? ELSE cancelled_at END,
         completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END,
         no_show_at = CASE WHEN ? = 'no_show' THEN ? ELSE no_show_at END,
         hold_token = CASE WHEN ? = 1 THEN NULL ELSE hold_token END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND center_id = ?
       LIMIT 1`,
      [
        targetStatus,
        targetStatus,
        nowDate,
        targetStatus,
        nowDate,
        targetStatus,
        nowDate,
        shouldClearHoldToken ? 1 : 0,
        resolvedAppointmentId,
        center.id
      ]
    );

    if (Number(updateResult?.affectedRows || 0) !== 1) {
      throw new AdminAppointmentsError({
        status: 409,
        code: "APPOINTMENT_STATUS_UPDATE_CONFLICT",
        message: "No se pudo actualizar la cita"
      });
    }

    const detail = await buildAppointmentDetail({
      connection,
      centerId: center.id,
      appointmentId: resolvedAppointmentId,
      now: nowDate
    });

    await connection.commit();

    return {
      generatedAt: nowDate.toISOString(),
      center,
      transition: {
        from: currentStatus,
        to: targetStatus,
        changedAt: nowDate.toISOString(),
        claims: {
          action: claimsAction,
          released: claimsReleased,
          created: claimsCreated
        }
      },
      appointment: detail
    };
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback();
    }

    throw error;
  }
}

async function updateAdminAppointmentRoom({
  connection,
  appointmentId,
  roomId,
  adminSession,
  tenantSlug,
  now = new Date(),
  createClaims = createAppointmentClaims
}) {
  const resolvedAppointmentId = parseAppointmentId(appointmentId);
  const resolvedRoomId = parseRoomId(roomId);
  const nowDate = toDate(now);
  const center = await resolveCenter({ connection, tenantSlug, adminSession });

  let startedTransaction = false;

  try {
    await connection.beginTransaction();
    startedTransaction = true;

    const appointmentRow = await getAppointmentRow({
      connection,
      centerId: center.id,
      appointmentId: resolvedAppointmentId,
      forUpdate: true
    });

    if (!appointmentRow) {
      throw new AdminAppointmentsError({
        status: 404,
        code: "APPOINTMENT_NOT_FOUND",
        message: "Cita no encontrada"
      });
    }

    const currentStatus = String(appointmentRow.status || "").trim().toLowerCase();

    if (!ROOM_MUTABLE_STATUSES.has(currentStatus)) {
      throw new AdminAppointmentsError({
        status: 409,
        code: "APPOINTMENT_ROOM_CHANGE_NOT_ALLOWED",
        message: "Solo se puede cambiar sala en citas pending o confirmed"
      });
    }

    const currentRoomId = Number(appointmentRow.roomId);
    const roomOptions = await getRoomOptionsForAppointment({
      connection,
      centerId: center.id,
      appointmentRow
    });
    const targetRoomOption = roomOptions.find((entry) => Number(entry.id) === resolvedRoomId);
    const availableRooms = roomOptions.filter((entry) => entry.available);

    if (availableRooms.length === 0) {
      throw new AdminAppointmentsError({
        status: 409,
        code: "ROOM_NOT_AVAILABLE",
        message: "No hay salas disponibles para ese horario"
      });
    }

    if (!targetRoomOption || !targetRoomOption.available) {
      throw new AdminAppointmentsError({
        status: 409,
        code: "ROOM_NOT_AVAILABLE",
        message: "La sala seleccionada no esta disponible para ese horario",
        details: {
          roomId: resolvedRoomId
        }
      });
    }

    if (resolvedRoomId !== currentRoomId) {
      const [updateResult] = await connection.query(
        `UPDATE appointments
         SET
           room_id = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND center_id = ?
         LIMIT 1`,
        [resolvedRoomId, resolvedAppointmentId, center.id]
      );

      if (Number(updateResult?.affectedRows || 0) !== 1) {
        throw new AdminAppointmentsError({
          status: 409,
          code: "APPOINTMENT_ROOM_UPDATE_CONFLICT",
          message: "No se pudo actualizar la sala de la cita"
        });
      }
    }

    try {
      await createClaims({
        connection,
        manageTransaction: false,
        appointment: {
          centerId: center.id,
          appointmentId: resolvedAppointmentId,
          therapistId: Number(appointmentRow.therapistId),
          roomId: resolvedRoomId,
          startsAt: appointmentRow.startsAt,
          endsAt: appointmentRow.endsAt,
          status: currentStatus
        }
      });
    } catch (error) {
      if (error instanceof SlotOccupiedError || error?.code === "SLOT_OCCUPIED") {
        throw new AdminAppointmentsError({
          status: 409,
          code: "ROOM_NOT_AVAILABLE",
          message: "La sala seleccionada ya no esta disponible"
        });
      }

      throw error;
    }

    const detail = await buildAppointmentDetail({
      connection,
      centerId: center.id,
      appointmentId: resolvedAppointmentId,
      now: nowDate
    });

    await connection.commit();

    return {
      generatedAt: nowDate.toISOString(),
      center,
      roomChange: {
        fromRoomId: currentRoomId,
        toRoomId: resolvedRoomId,
        changedAt: nowDate.toISOString()
      },
      appointment: detail
    };
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback();
    }

    throw error;
  }
}

module.exports = {
  AdminAppointmentsError,
  listAdminAppointments,
  listAdminAppointmentHistory,
  createAdminManualAppointment,
  getAdminAppointmentDetail,
  deleteAdminAppointments,
  updateAdminAppointmentStatus,
  updateAdminAppointmentRoom
};
