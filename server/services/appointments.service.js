const crypto = require("node:crypto");

const { addMinutes, toDate } = require("../utils/dates");
const { findAvailablePairsForSlot } = require("./availability.service");
const { createAppointmentClaims, releaseAppointmentClaims } = require("./claims.service");
const { acquireIdempotencyKey, persistIdempotencyResponse } = require("./idempotency.service");
const {
  chooseTherapistForService,
  persistRoundRobinState
} = require("./roundRobin.service");
const {
  PublicBookingError,
  SlotOccupiedError,
  ValidationError
} = require("./errors");

const HOLD_TTL_SECONDS = 180;
const BOLIVIA_DIAL_DIGITS = "591";
const BOLIVIA_LOCAL_MOBILE_PATTERN = /^[67]\d{7}$/;
const ONBOARDING_KEYBOARD_SMASHES = new Set([
  "asdf",
  "asdfasd",
  "adsfa",
  "qwer",
  "zxcv",
  "aaaa",
  "test",
  "prueba"
]);
const ONBOARDING_CITY_OPTIONS = ["Cochabamba", "Santa Cruz", "La Paz", "Sucre", "Otro"];
const ONBOARDING_SOURCE_OPTIONS = ["Referencia de amigos", "Redes sociales", "Otro"];
const RESCHEDULE_IDEMPOTENCY_SCOPE = "public_booking_reschedule_confirm";

function randomToken(size = 24) {
  return crypto.randomBytes(size).toString("hex");
}

function randomPublicCode() {
  return `PUB-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

function normalizeNumericId(value, fieldName) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} invalido`, {
      field: fieldName,
      value
    });
  }

  return parsed;
}

function computeHoldExpiresAt(createdAtInput) {
  return addMinutes(toDate(createdAtInput), HOLD_TTL_SECONDS / 60);
}

function computeHoldCutoff(nowInput = new Date()) {
  return addMinutes(toDate(nowInput), -(HOLD_TTL_SECONDS / 60));
}

function normalizeRoomId(roomId) {
  if (roomId === undefined || roomId === null || roomId === "") {
    return null;
  }

  return normalizeNumericId(roomId, "roomId");
}

function normalizeTherapistId(therapistId) {
  if (therapistId === undefined || therapistId === null || therapistId === "") {
    return null;
  }

  return normalizeNumericId(therapistId, "therapistId");
}

function normalizeAppointmentSource(value) {
  const normalized = String(value || "public_booking").trim().toLowerCase();
  const allowed = new Set(["public_booking", "admin_manual", "system"]);

  if (!allowed.has(normalized)) {
    throw new ValidationError("source invalido", {
      field: "source",
      allowed: Array.from(allowed)
    });
  }

  return normalized;
}

function normalizeRequiredOnboardingText(value, fieldName) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new PublicBookingError({
      status: 422,
      code: "ONBOARDING_REQUIRED",
      message: `${fieldName} es obligatorio`,
      details: { field: fieldName }
    });
  }

  if (fieldName === "city" || fieldName === "source") {
    const allowedOptions = fieldName === "city" ? ONBOARDING_CITY_OPTIONS : ONBOARDING_SOURCE_OPTIONS;
    const normalizedLower = normalized.toLowerCase();
    const canonicalValue = allowedOptions.find((option) => option.toLowerCase() === normalizedLower);

    if (!canonicalValue) {
      throw new PublicBookingError({
        status: 422,
        code: "ONBOARDING_INVALID_TEXT",
        message: `${fieldName} debe ser una opcion valida`,
        details: { field: fieldName }
      });
    }

    return canonicalValue;
  }

  const minimumLength = 2;
  const normalizedForQuality = normalized
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (normalized.length < minimumLength) {
    throw new PublicBookingError({
      status: 422,
      code: "ONBOARDING_INVALID_TEXT",
      message: `${fieldName} debe tener al menos ${minimumLength} caracteres`,
      details: { field: fieldName, minLength: minimumLength }
    });
  }

  if (!/[A-Za-zÀ-ÿ]/.test(normalized)) {
    throw new PublicBookingError({
      status: 422,
      code: "ONBOARDING_INVALID_TEXT",
      message: `${fieldName} debe incluir texto valido`,
      details: { field: fieldName }
    });
  }

  if (/^([a-z0-9])\1{2,}$/.test(normalizedForQuality) || ONBOARDING_KEYBOARD_SMASHES.has(normalizedForQuality)) {
    throw new PublicBookingError({
      status: 422,
      code: "ONBOARDING_INVALID_TEXT",
      message: `${fieldName} parece invalido`,
      details: { field: fieldName }
    });
  }

  return normalized;
}

function normalizeOnboardingAge(value) {
  const age = Number.parseInt(value, 10);

  if (!Number.isInteger(age)) {
    throw new PublicBookingError({
      status: 422,
      code: "ONBOARDING_REQUIRED",
      message: "age es obligatorio",
      details: { field: "age" }
    });
  }

  if (age < 18 || age > 75) {
    throw new PublicBookingError({
      status: 422,
      code: "ONBOARDING_INVALID_AGE",
      message: "age debe estar entre 18 y 75",
      details: { field: "age", min: 18, max: 75 }
    });
  }

  return age;
}

function normalizeManagementToken(value) {
  const token = String(value || "").trim();

  if (!token) {
    throw new ValidationError("managementToken es requerido", {
      field: "managementToken"
    });
  }

  return token;
}

function isReschedulableStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "pending" || normalized === "confirmed";
}

function isClientOnboardingComplete(client) {
  if (!client) {
    return false;
  }

  const hasFirstName = String(client.firstName || "").trim().length > 0;
  const hasLastName = String(client.lastName || "").trim().length > 0;
  const hasCity = String(client.city || "").trim().length > 0;
  const hasSource = String(client.source || "").trim().length > 0;
  const age = Number.parseInt(client.age, 10);
  const hasAge = Number.isInteger(age) && age >= 18 && age <= 75;
  const hasTimestamp = Boolean(client.onboardingCompletedAt);

  return hasFirstName && hasLastName && hasCity && hasSource && hasAge && hasTimestamp;
}

function normalizeOnboardingPayload(payload) {
  const rawClient = payload && typeof payload === "object" ? payload.client : null;

  if (!rawClient || typeof rawClient !== "object") {
    return null;
  }

  const firstName = normalizeRequiredOnboardingText(rawClient.firstName, "firstName");
  const lastName = normalizeRequiredOnboardingText(rawClient.lastName, "lastName");
  const age = normalizeOnboardingAge(rawClient.age);
  const city = normalizeRequiredOnboardingText(rawClient.city, "city");
  const source = normalizeRequiredOnboardingText(rawClient.source, "source");
  const fullName = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim();

  return {
    firstName,
    lastName,
    age,
    city,
    source,
    fullName
  };
}

function buildPhoneLookupCandidates(phoneDigits) {
  const normalizedPhone = String(phoneDigits || "").replace(/\D/g, "");
  const candidates = [normalizedPhone];

  if (normalizedPhone.startsWith(BOLIVIA_DIAL_DIGITS)) {
    const localCandidate = normalizedPhone.slice(BOLIVIA_DIAL_DIGITS.length);
    if (BOLIVIA_LOCAL_MOBILE_PATTERN.test(localCandidate)) {
      candidates.push(localCandidate);
    }
  } else if (BOLIVIA_LOCAL_MOBILE_PATTERN.test(normalizedPhone)) {
    candidates.push(`${BOLIVIA_DIAL_DIGITS}${normalizedPhone}`);
  }

  return Array.from(new Set(candidates));
}

function areEquivalentPhones(leftPhone, rightPhone) {
  const leftCandidates = buildPhoneLookupCandidates(leftPhone);
  const rightCandidates = new Set(buildPhoneLookupCandidates(rightPhone));

  return leftCandidates.some((candidate) => rightCandidates.has(candidate));
}

async function loadClientByPhone({ connection, centerId, phoneE164 }) {
  const [existingRows] = await connection.query(
    `SELECT
      id,
      full_name AS fullName,
      first_name AS firstName,
      last_name AS lastName,
      age,
      city,
      source,
      onboarding_completed_at AS onboardingCompletedAt,
      whatsapp_e164 AS phoneE164
     FROM clients
     WHERE center_id = ?
       AND whatsapp_e164 = ?
       AND is_active = 1
     LIMIT 1`,
    [centerId, phoneE164]
  );

  if (existingRows.length === 0) {
    return null;
  }

  return {
    id: Number(existingRows[0].id),
    fullName: existingRows[0].fullName,
    firstName: existingRows[0].firstName,
    lastName: existingRows[0].lastName,
    age: existingRows[0].age === null ? null : Number(existingRows[0].age),
    city: existingRows[0].city,
    source: existingRows[0].source,
    onboardingCompletedAt: existingRows[0].onboardingCompletedAt,
    phoneE164: existingRows[0].phoneE164,
    created: false
  };
}

async function findOrCreateClient({ connection, centerId, phoneE164 }) {
  const phoneCandidates = buildPhoneLookupCandidates(phoneE164);
  for (const candidate of phoneCandidates) {
    const existingClient = await loadClientByPhone({
      connection,
      centerId,
      phoneE164: candidate
    });

    if (existingClient) {
      return existingClient;
    }
  }

  const defaultName = `Cliente ${phoneE164}`;

  try {
    const [insertResult] = await connection.query(
      `INSERT INTO clients (
        center_id,
        full_name,
        whatsapp_e164,
        is_active
      ) VALUES (?, ?, ?, 1)`,
      [centerId, defaultName, phoneE164]
    );

    return {
      id: Number(insertResult.insertId),
      fullName: defaultName,
      firstName: null,
      lastName: null,
      age: null,
      city: null,
      source: null,
      onboardingCompletedAt: null,
      phoneE164,
      created: true
    };
  } catch (error) {
    const isDuplicate = error && (error.code === "ER_DUP_ENTRY" || Number(error.errno) === 1062);

    if (!isDuplicate) {
      throw error;
    }

    for (const candidate of phoneCandidates) {
      const clientAfterDuplicate = await loadClientByPhone({
        connection,
        centerId,
        phoneE164: candidate
      });

      if (clientAfterDuplicate) {
        return clientAfterDuplicate;
      }
    }
    throw error;
  }
}

function pickSpecificPair({ availablePairs, therapistId, roomId }) {
  if (!therapistId && !roomId) {
    return null;
  }

  return availablePairs.find((pair) => {
    const therapistOk = therapistId ? Number(pair.therapistId) === therapistId : true;
    const roomOk = roomId ? Number(pair.roomId) === roomId : true;
    return therapistOk && roomOk;
  });
}

async function pickBestPair({ connection, centerId, serviceId, availablePairs, slotStart, slotEnd }) {
  const therapists = [];
  const seenTherapists = new Set();

  for (const pair of availablePairs) {
    const therapistId = Number(pair.therapistId);

    if (seenTherapists.has(therapistId)) {
      continue;
    }

    therapists.push({
      therapistId,
      therapistName: pair.therapistName
    });
    seenTherapists.add(therapistId);
  }

  const selectedTherapist = await chooseTherapistForService({
    connection,
    centerId,
    serviceId,
    candidates: therapists,
    windowStart: slotStart,
    windowEnd: slotEnd
  });

  const candidateRooms = availablePairs
    .filter((pair) => Number(pair.therapistId) === Number(selectedTherapist.therapistId))
    .sort((left, right) => Number(left.roomId) - Number(right.roomId));

  if (candidateRooms.length === 0) {
    throw new PublicBookingError({
      status: 409,
      code: "SLOT_NOT_AVAILABLE",
      message: "No hay sala disponible para el terapeuta seleccionado"
    });
  }

  return candidateRooms[0];
}

function pickPublicAvailabilityPair({ pairs, therapistId = null }) {
  const normalizedTherapistId = normalizeTherapistId(therapistId);
  const candidates = (pairs || [])
    .filter((pair) => {
      if (!normalizedTherapistId) {
        return true;
      }

      return Number(pair.therapistId) === normalizedTherapistId;
    })
    .sort((left, right) => {
      if (Number(left.therapistId) !== Number(right.therapistId)) {
        return Number(left.therapistId) - Number(right.therapistId);
      }

      return Number(left.roomId) - Number(right.roomId);
    });

  return candidates[0] || null;
}

function toIso(value) {
  return toDate(value).toISOString();
}

function toAppointmentSummary(row) {
  return {
    id: String(row.appointmentId),
    status: String(row.status || ""),
    publicCode: row.publicCode,
    managementToken: row.managementToken,
    serviceId: String(row.serviceId),
    serviceName: row.serviceName,
    therapistId: String(row.therapistId),
    therapistName: row.therapistName,
    roomId: String(row.roomId),
    roomName: row.roomName,
    startsAt: toIso(row.startsAt),
    endsAt: toIso(row.endsAt)
  };
}

async function releaseExpiredHolds({ connection, centerId, now = new Date(), manageTransaction = true }) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  const normalizedCenterId = normalizeNumericId(centerId, "centerId");
  const cutoff = computeHoldCutoff(now);
  let startedTransaction = false;

  try {
    if (manageTransaction) {
      await connection.beginTransaction();
      startedTransaction = true;
    }

    const [expiredRows] = await connection.query(
      `SELECT id
       FROM appointments
       WHERE center_id = ?
         AND status = 'pending'
         AND hold_token IS NOT NULL
         AND created_at <= ?
       FOR UPDATE`,
      [normalizedCenterId, cutoff]
    );

    const appointmentIds = expiredRows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);

    for (const appointmentId of appointmentIds) {
      await releaseAppointmentClaims({
        connection,
        appointmentId,
        manageTransaction: false
      });
    }

    if (appointmentIds.length > 0) {
      const placeholders = appointmentIds.map(() => "?").join(", ");

      await connection.query(
        `UPDATE appointments
         SET
           status = 'cancelled',
           hold_token = NULL,
           cancellation_reason = 'hold_expired',
           cancelled_at = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE center_id = ?
           AND id IN (${placeholders})
           AND status = 'pending'`,
        [now, normalizedCenterId, ...appointmentIds]
      );
    }

    if (manageTransaction) {
      await connection.commit();
    }

    return {
      expiredHoldCount: appointmentIds.length,
      appointmentIds
    };
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback();
    }

    throw error;
  }
}

async function fetchServiceForHold({ connection, centerId, serviceId }) {
  const [serviceRows] = await connection.query(
    `SELECT
      id,
      duration_minutes AS durationMinutes,
      buffer_before_minutes AS bufferBeforeMinutes,
      buffer_after_minutes AS bufferAfterMinutes
     FROM services
     WHERE center_id = ?
       AND id = ?
       AND is_active = 1
     LIMIT 1`,
    [centerId, serviceId]
  );

  if (serviceRows.length === 0) {
    throw new PublicBookingError({
      status: 404,
      code: "SERVICE_NOT_FOUND",
      message: "Servicio no disponible para reserva"
    });
  }

  return {
    id: Number(serviceRows[0].id),
    durationMinutes: Number(serviceRows[0].durationMinutes),
    bufferBeforeMinutes: Number(serviceRows[0].bufferBeforeMinutes || 0),
    bufferAfterMinutes: Number(serviceRows[0].bufferAfterMinutes || 0)
  };
}

async function createHoldAppointment({
  connection,
  centerId,
  serviceId,
  phoneE164,
  startsAt,
  therapistId,
  roomId,
  source = "public_booking",
  now = new Date()
}) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  const normalizedCenterId = normalizeNumericId(centerId, "centerId");
  const normalizedServiceId = normalizeNumericId(serviceId, "serviceId");
  const normalizedTherapistId = normalizeTherapistId(therapistId);
  const normalizedRoomId = normalizeRoomId(roomId);
  const normalizedSource = normalizeAppointmentSource(source);
  const slotStart = toDate(startsAt);

  let startedTransaction = false;

  try {
    await connection.beginTransaction();
    startedTransaction = true;

    await releaseExpiredHolds({
      connection,
      centerId: normalizedCenterId,
      now,
      manageTransaction: false
    });

    const service = await fetchServiceForHold({
      connection,
      centerId: normalizedCenterId,
      serviceId: normalizedServiceId
    });

    const slotEnd = addMinutes(
      slotStart,
      service.durationMinutes + service.bufferBeforeMinutes + service.bufferAfterMinutes
    );

    const client = await findOrCreateClient({
      connection,
      centerId: normalizedCenterId,
      phoneE164
    });

    const availablePairs = await findAvailablePairsForSlot({
      connection,
      centerId: normalizedCenterId,
      serviceId: normalizedServiceId,
      slotStartInput: slotStart,
      slotEndInput: slotEnd
    });

    if (availablePairs.length === 0) {
      throw new PublicBookingError({
        status: 409,
        code: "SLOT_NOT_AVAILABLE",
        message: "El slot ya no esta disponible"
      });
    }

    const specificPair = pickSpecificPair({
      availablePairs,
      therapistId: normalizedTherapistId,
      roomId: normalizedRoomId
    });

    if ((normalizedTherapistId || normalizedRoomId) && !specificPair) {
      throw new PublicBookingError({
        status: 409,
        code: "SLOT_NOT_AVAILABLE",
        message: "El terapeuta o sala solicitada ya no esta disponible"
      });
    }

    const selectedWithSpecificPair = Boolean(specificPair);
    const selectedPair = specificPair || (await pickBestPair({
      connection,
      centerId: normalizedCenterId,
      serviceId: normalizedServiceId,
      availablePairs,
      slotStart,
      slotEnd
    }));

    const holdToken = randomToken(12);
    const publicCode = randomPublicCode();
    const managementToken = randomToken(12);

    const [insertResult] = await connection.query(
      `INSERT INTO appointments (
        center_id,
        public_code,
        hold_token,
        management_token,
        client_id,
        service_id,
        therapist_id,
        room_id,
        starts_at,
        ends_at,
        status,
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        normalizedCenterId,
        publicCode,
        holdToken,
        managementToken,
        client.id,
        normalizedServiceId,
        Number(selectedPair.therapistId),
        Number(selectedPair.roomId),
        slotStart,
        slotEnd,
        normalizedSource
      ]
    );

    await createAppointmentClaims({
      connection,
      manageTransaction: false,
      appointment: {
        centerId: normalizedCenterId,
        appointmentId: Number(insertResult.insertId),
        therapistId: Number(selectedPair.therapistId),
        roomId: Number(selectedPair.roomId),
        startsAt: slotStart,
        endsAt: slotEnd,
        status: "pending"
      }
    });

    if (selectedWithSpecificPair) {
      await persistRoundRobinState({
        connection,
        centerId: normalizedCenterId,
        serviceId: normalizedServiceId,
        therapistId: Number(selectedPair.therapistId)
      });
    }

    const [appointmentRows] = await connection.query(
      `SELECT id, created_at AS createdAt
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [insertResult.insertId]
    );

    const appointmentRow = appointmentRows[0];
    const holdExpiresAt = computeHoldExpiresAt(appointmentRow.createdAt);

    await connection.commit();

    return {
      replayed: false,
      holdToken,
      appointmentId: Number(insertResult.insertId),
      status: "pending",
      publicCode,
      managementToken,
      client: {
        id: String(client.id),
        phoneE164: client.phoneE164
      },
      serviceId: String(normalizedServiceId),
      therapistId: String(selectedPair.therapistId),
      therapistName: selectedPair.therapistName,
      roomId: String(selectedPair.roomId),
      roomName: selectedPair.roomName,
      startsAt: slotStart.toISOString(),
      endsAt: slotEnd.toISOString(),
      holdExpiresAt: holdExpiresAt.toISOString(),
      holdTtlSeconds: HOLD_TTL_SECONDS,
      createdAt: toIso(appointmentRow.createdAt),
      now: toDate(now).toISOString()
    };
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback();
    }

    throw error;
  }
}

async function confirmHoldAppointment({
  connection,
  centerId,
  holdToken,
  phoneE164,
  idempotencyKey,
  payload,
  now = new Date()
}) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  const normalizedCenterId = normalizeNumericId(centerId, "centerId");
  const normalizedHoldToken = String(holdToken || "").trim();

  if (!normalizedHoldToken) {
    throw new ValidationError("holdToken es requerido");
  }

  let startedTransaction = false;

  try {
    await connection.beginTransaction();
    startedTransaction = true;

    const idemResult = await acquireIdempotencyKey({
      connection,
      centerId: normalizedCenterId,
      idempotencyKey,
      payload
    });

    if (idemResult.replayed) {
      await connection.commit();

      return {
        responseCode: idemResult.responseCode,
        responseBody: {
          ...idemResult.responseBody,
          replayed: true
        }
      };
    }

    const [holdRows] = await connection.query(
      `SELECT
        a.id AS appointmentId,
        a.public_code AS publicCode,
        a.management_token AS managementToken,
        a.center_id AS centerId,
        a.client_id AS clientId,
        a.service_id AS serviceId,
        a.therapist_id AS therapistId,
        a.room_id AS roomId,
        a.starts_at AS startsAt,
        a.ends_at AS endsAt,
        a.status,
        a.created_at AS createdAt,
        c.first_name AS firstName,
        c.last_name AS lastName,
        c.age,
        c.city,
        c.source,
        c.onboarding_completed_at AS onboardingCompletedAt,
        c.whatsapp_e164 AS phoneE164,
        s.name AS serviceName,
        COALESCE(t.display_name, t.full_name) AS therapistName,
        r.name AS roomName
       FROM appointments a
       INNER JOIN clients c ON c.id = a.client_id
       INNER JOIN services s ON s.id = a.service_id
       INNER JOIN therapists t ON t.id = a.therapist_id
       INNER JOIN rooms r ON r.id = a.room_id
       WHERE a.center_id = ?
         AND a.hold_token = ?
       LIMIT 1
       FOR UPDATE`,
      [normalizedCenterId, normalizedHoldToken]
    );

    if (holdRows.length === 0) {
      throw new PublicBookingError({
        status: 404,
        code: "HOLD_NOT_FOUND",
        message: "No se encontro hold activo"
      });
    }

    const hold = holdRows[0];

    if (!areEquivalentPhones(hold.phoneE164, phoneE164)) {
      throw new PublicBookingError({
        status: 409,
        code: "HOLD_PHONE_MISMATCH",
        message: "El hold no pertenece al telefono enviado"
      });
    }

    if (hold.status !== "pending") {
      throw new PublicBookingError({
        status: 409,
        code: "HOLD_NOT_PENDING",
        message: "El hold ya no esta en estado pendiente"
      });
    }

    const holdExpiresAt = computeHoldExpiresAt(hold.createdAt);

    if (toDate(now) >= holdExpiresAt) {
      throw new PublicBookingError({
        status: 410,
        code: "HOLD_EXPIRED",
        message: "El hold expiro"
      });
    }

    const onboardingComplete = isClientOnboardingComplete(hold);

    if (!onboardingComplete) {
      const onboarding = normalizeOnboardingPayload(payload);

      if (!onboarding) {
        throw new PublicBookingError({
          status: 422,
          code: "ONBOARDING_REQUIRED",
          message: "Debes completar onboarding antes de confirmar la cita",
          details: {
            requiredFields: ["firstName", "lastName", "age", "city", "source"]
          }
        });
      }

      await connection.query(
        `UPDATE clients
         SET
           full_name = ?,
           first_name = ?,
           last_name = ?,
           age = ?,
           city = ?,
           source = ?,
           onboarding_completed_at = COALESCE(onboarding_completed_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND center_id = ?
         LIMIT 1`,
        [
          onboarding.fullName,
          onboarding.firstName,
          onboarding.lastName,
          onboarding.age,
          onboarding.city,
          onboarding.source,
          Number(hold.clientId),
          Number(hold.centerId)
        ]
      );
    }

    const [updateResult] = await connection.query(
      `UPDATE appointments
       SET
         status = 'confirmed',
         hold_token = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND status = 'pending'`,
      [hold.appointmentId]
    );

    if (Number(updateResult.affectedRows || 0) !== 1) {
      throw new PublicBookingError({
        status: 409,
        code: "SLOT_NOT_AVAILABLE",
        message: "No se pudo confirmar el slot"
      });
    }

    const [claimRows] = await connection.query(
      `SELECT COUNT(*) AS claimCount
       FROM appointment_resource_claims
       WHERE appointment_id = ?`,
      [hold.appointmentId]
    );

    if (Number(claimRows[0]?.claimCount || 0) === 0) {
      try {
        await createAppointmentClaims({
          connection,
          manageTransaction: false,
          appointment: {
            centerId: Number(hold.centerId),
            appointmentId: Number(hold.appointmentId),
            therapistId: Number(hold.therapistId),
            roomId: Number(hold.roomId),
            startsAt: hold.startsAt,
            endsAt: hold.endsAt,
            status: "confirmed"
          }
        });
      } catch (error) {
        if (error instanceof SlotOccupiedError || error.code === "SLOT_OCCUPIED") {
          throw new PublicBookingError({
            status: 409,
            code: "SLOT_NOT_AVAILABLE",
            message: "El slot ya no esta disponible"
          });
        }

        throw error;
      }
    }

    const responseBody = {
      replayed: false,
      status: "confirmed",
      appointment: {
        id: String(hold.appointmentId),
        publicCode: hold.publicCode,
        managementToken: hold.managementToken,
        serviceId: String(hold.serviceId),
        serviceName: hold.serviceName,
        therapistId: String(hold.therapistId),
        therapistName: hold.therapistName,
        roomId: String(hold.roomId),
        roomName: hold.roomName,
        startsAt: toIso(hold.startsAt),
        endsAt: toIso(hold.endsAt)
      }
    };

    await persistIdempotencyResponse({
      connection,
      centerId: normalizedCenterId,
      idempotencyKey,
      responseCode: 200,
      responseBody
    });

    await connection.commit();

    return {
      responseCode: 200,
      responseBody
    };
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback();
    }

    throw error;
  }
}

async function confirmRescheduleAppointment({
  connection,
  centerId,
  appointmentId,
  managementToken,
  holdToken,
  phoneE164,
  idempotencyKey,
  payload,
  now = new Date()
}) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  const normalizedCenterId = normalizeNumericId(centerId, "centerId");
  const normalizedAppointmentId = normalizeNumericId(appointmentId, "appointmentId");
  const normalizedManagementToken = normalizeManagementToken(managementToken);
  const normalizedHoldToken = String(holdToken || "").trim();

  if (!normalizedHoldToken) {
    throw new ValidationError("holdToken es requerido");
  }

  let startedTransaction = false;

  try {
    await connection.beginTransaction();
    startedTransaction = true;

    const idemResult = await acquireIdempotencyKey({
      connection,
      centerId: normalizedCenterId,
      idempotencyKey,
      payload,
      scope: RESCHEDULE_IDEMPOTENCY_SCOPE
    });

    if (idemResult.replayed) {
      await connection.commit();

      return {
        responseCode: idemResult.responseCode,
        responseBody: {
          ...idemResult.responseBody,
          replayed: true
        }
      };
    }

    const [originalRows] = await connection.query(
      `SELECT
        a.id AS appointmentId,
        a.public_code AS publicCode,
        a.management_token AS managementToken,
        a.center_id AS centerId,
        a.client_id AS clientId,
        a.service_id AS serviceId,
        a.therapist_id AS therapistId,
        a.room_id AS roomId,
        a.starts_at AS startsAt,
        a.ends_at AS endsAt,
        a.status,
        c.whatsapp_e164 AS phoneE164,
        s.name AS serviceName,
        COALESCE(t.display_name, t.full_name) AS therapistName,
        r.name AS roomName
       FROM appointments a
       INNER JOIN clients c ON c.id = a.client_id
       INNER JOIN services s ON s.id = a.service_id
       INNER JOIN therapists t ON t.id = a.therapist_id
       INNER JOIN rooms r ON r.id = a.room_id
       WHERE a.center_id = ?
         AND a.id = ?
       LIMIT 1
       FOR UPDATE`,
      [normalizedCenterId, normalizedAppointmentId]
    );

    if (originalRows.length === 0) {
      throw new PublicBookingError({
        status: 404,
        code: "APPOINTMENT_NOT_FOUND",
        message: "No se encontro la cita a reagendar"
      });
    }

    const original = originalRows[0];

    if (original.managementToken !== normalizedManagementToken) {
      throw new PublicBookingError({
        status: 401,
        code: "MANAGEMENT_TOKEN_INVALID",
        message: "managementToken invalido para esta cita"
      });
    }

    if (!areEquivalentPhones(original.phoneE164, phoneE164)) {
      throw new PublicBookingError({
        status: 409,
        code: "APPOINTMENT_PHONE_MISMATCH",
        message: "La cita no pertenece al telefono enviado"
      });
    }

    if (!isReschedulableStatus(original.status)) {
      throw new PublicBookingError({
        status: 409,
        code: "APPOINTMENT_NOT_RESCHEDULABLE",
        message: "La cita ya no se puede reagendar"
      });
    }

    if (toDate(original.startsAt).getTime() <= toDate(now).getTime()) {
      throw new PublicBookingError({
        status: 409,
        code: "APPOINTMENT_NOT_RESCHEDULABLE",
        message: "La cita ya no se puede reagendar por horario"
      });
    }

    const [holdRows] = await connection.query(
      `SELECT
        a.id AS appointmentId,
        a.public_code AS publicCode,
        a.management_token AS managementToken,
        a.center_id AS centerId,
        a.client_id AS clientId,
        a.service_id AS serviceId,
        a.therapist_id AS therapistId,
        a.room_id AS roomId,
        a.starts_at AS startsAt,
        a.ends_at AS endsAt,
        a.status,
        a.created_at AS createdAt,
        c.whatsapp_e164 AS phoneE164,
        s.name AS serviceName,
        COALESCE(t.display_name, t.full_name) AS therapistName,
        r.name AS roomName
       FROM appointments a
       INNER JOIN clients c ON c.id = a.client_id
       INNER JOIN services s ON s.id = a.service_id
       INNER JOIN therapists t ON t.id = a.therapist_id
       INNER JOIN rooms r ON r.id = a.room_id
       WHERE a.center_id = ?
         AND a.hold_token = ?
       LIMIT 1
       FOR UPDATE`,
      [normalizedCenterId, normalizedHoldToken]
    );

    if (holdRows.length === 0) {
      throw new PublicBookingError({
        status: 404,
        code: "HOLD_NOT_FOUND",
        message: "No se encontro hold activo"
      });
    }

    const hold = holdRows[0];

    if (Number(hold.appointmentId) === Number(original.appointmentId)) {
      throw new PublicBookingError({
        status: 409,
        code: "RESCHEDULE_HOLD_INVALID",
        message: "El hold no es valido para reagendar"
      });
    }

    if (!areEquivalentPhones(hold.phoneE164, phoneE164)) {
      throw new PublicBookingError({
        status: 409,
        code: "HOLD_PHONE_MISMATCH",
        message: "El hold no pertenece al telefono enviado"
      });
    }

    if (Number(hold.clientId) !== Number(original.clientId)) {
      throw new PublicBookingError({
        status: 409,
        code: "RESCHEDULE_CLIENT_MISMATCH",
        message: "El hold no pertenece al mismo cliente"
      });
    }

    if (Number(hold.serviceId) !== Number(original.serviceId)) {
      throw new PublicBookingError({
        status: 409,
        code: "RESCHEDULE_SERVICE_MISMATCH",
        message: "El hold no coincide con el servicio original"
      });
    }

    if (Number(hold.therapistId) !== Number(original.therapistId)) {
      throw new PublicBookingError({
        status: 409,
        code: "RESCHEDULE_THERAPIST_MISMATCH",
        message: "El hold no coincide con el terapeuta original"
      });
    }

    if (hold.status !== "pending") {
      throw new PublicBookingError({
        status: 409,
        code: "HOLD_NOT_PENDING",
        message: "El hold ya no esta en estado pendiente"
      });
    }

    const holdExpiresAt = computeHoldExpiresAt(hold.createdAt);
    if (toDate(now) >= holdExpiresAt) {
      throw new PublicBookingError({
        status: 410,
        code: "HOLD_EXPIRED",
        message: "El hold expiro"
      });
    }

    await releaseAppointmentClaims({
      connection,
      appointmentId: Number(original.appointmentId),
      manageTransaction: false
    });

    const [cancelOriginalResult] = await connection.query(
      `UPDATE appointments
       SET
         status = 'cancelled',
         cancellation_reason = 'rescheduled',
         cancelled_at = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND status IN ('pending', 'confirmed')`,
      [now, Number(original.appointmentId)]
    );

    if (Number(cancelOriginalResult.affectedRows || 0) !== 1) {
      throw new PublicBookingError({
        status: 409,
        code: "APPOINTMENT_NOT_RESCHEDULABLE",
        message: "La cita original no se pudo reagendar"
      });
    }

    const [confirmHoldResult] = await connection.query(
      `UPDATE appointments
       SET
         status = 'confirmed',
         hold_token = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND status = 'pending'`,
      [Number(hold.appointmentId)]
    );

    if (Number(confirmHoldResult.affectedRows || 0) !== 1) {
      throw new PublicBookingError({
        status: 409,
        code: "SLOT_NOT_AVAILABLE",
        message: "No se pudo confirmar el nuevo horario"
      });
    }

    const [holdClaimRows] = await connection.query(
      `SELECT COUNT(*) AS claimCount
       FROM appointment_resource_claims
       WHERE appointment_id = ?`,
      [Number(hold.appointmentId)]
    );

    if (Number(holdClaimRows[0]?.claimCount || 0) === 0) {
      try {
        await createAppointmentClaims({
          connection,
          manageTransaction: false,
          appointment: {
            centerId: Number(hold.centerId),
            appointmentId: Number(hold.appointmentId),
            therapistId: Number(hold.therapistId),
            roomId: Number(hold.roomId),
            startsAt: hold.startsAt,
            endsAt: hold.endsAt,
            status: "confirmed"
          }
        });
      } catch (error) {
        if (error instanceof SlotOccupiedError || error.code === "SLOT_OCCUPIED") {
          throw new PublicBookingError({
            status: 409,
            code: "SLOT_NOT_AVAILABLE",
            message: "El slot ya no esta disponible"
          });
        }

        throw error;
      }
    }

    const responseBody = {
      replayed: false,
      status: "rescheduled",
      previousAppointment: toAppointmentSummary({
        ...original,
        status: "cancelled"
      }),
      appointment: toAppointmentSummary(hold),
      notificationEvents: [
        {
          type: "center.reschedule.confirmed",
          channel: "prepared",
          appointmentId: String(hold.appointmentId),
          previousAppointmentId: String(original.appointmentId)
        },
        {
          type: "client.reschedule.confirmed",
          channel: "prepared",
          appointmentId: String(hold.appointmentId),
          previousAppointmentId: String(original.appointmentId)
        },
        {
          type: "therapist.reschedule.confirmed",
          channel: "prepared",
          appointmentId: String(hold.appointmentId),
          previousAppointmentId: String(original.appointmentId)
        }
      ]
    };

    await persistIdempotencyResponse({
      connection,
      centerId: normalizedCenterId,
      idempotencyKey,
      responseCode: 200,
      responseBody,
      scope: RESCHEDULE_IDEMPOTENCY_SCOPE
    });

    await connection.commit();

    return {
      responseCode: 200,
      responseBody
    };
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback();
    }

    throw error;
  }
}

module.exports = {
  HOLD_TTL_SECONDS,
  computeHoldCutoff,
  computeHoldExpiresAt,
  findOrCreateClient,
  pickPublicAvailabilityPair,
  releaseExpiredHolds,
  createHoldAppointment,
  confirmHoldAppointment,
  confirmRescheduleAppointment
};
