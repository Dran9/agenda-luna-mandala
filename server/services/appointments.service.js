const crypto = require("node:crypto");

const { addMinutes, toDate } = require("../utils/dates");
const { findAvailablePairsForSlot } = require("./availability.service");
const { createAppointmentClaims, releaseAppointmentClaims } = require("./claims.service");
const { acquireIdempotencyKey, persistIdempotencyResponse } = require("./idempotency.service");
const { chooseTherapistForService } = require("./roundRobin.service");
const {
  PublicBookingError,
  SlotOccupiedError,
  ValidationError
} = require("./errors");

const HOLD_TTL_SECONDS = 180;

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

async function findOrCreateClient({ connection, centerId, phoneE164 }) {
  const [existingRows] = await connection.query(
    `SELECT id, full_name AS fullName, whatsapp_e164 AS phoneE164
     FROM clients
     WHERE center_id = ?
       AND whatsapp_e164 = ?
       AND is_active = 1
     LIMIT 1`,
    [centerId, phoneE164]
  );

  if (existingRows.length > 0) {
    return {
      id: Number(existingRows[0].id),
      fullName: existingRows[0].fullName,
      phoneE164: existingRows[0].phoneE164,
      created: false
    };
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
      phoneE164,
      created: true
    };
  } catch (error) {
    const isDuplicate = error && (error.code === "ER_DUP_ENTRY" || Number(error.errno) === 1062);

    if (!isDuplicate) {
      throw error;
    }

    const [rowsAfterDuplicate] = await connection.query(
      `SELECT id, full_name AS fullName, whatsapp_e164 AS phoneE164
       FROM clients
       WHERE center_id = ?
         AND whatsapp_e164 = ?
         AND is_active = 1
       LIMIT 1`,
      [centerId, phoneE164]
    );

    if (rowsAfterDuplicate.length === 0) {
      throw error;
    }

    return {
      id: Number(rowsAfterDuplicate[0].id),
      fullName: rowsAfterDuplicate[0].fullName,
      phoneE164: rowsAfterDuplicate[0].phoneE164,
      created: false
    };
  }
}

function pickSpecificPair({ availablePairs, therapistId, roomId }) {
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
  now = new Date()
}) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  const normalizedCenterId = normalizeNumericId(centerId, "centerId");
  const normalizedServiceId = normalizeNumericId(serviceId, "serviceId");
  const normalizedTherapistId = normalizeTherapistId(therapistId);
  const normalizedRoomId = normalizeRoomId(roomId);
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'public_booking')`,
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
        slotEnd
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

    if (String(hold.phoneE164) !== String(phoneE164)) {
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

module.exports = {
  HOLD_TTL_SECONDS,
  computeHoldCutoff,
  computeHoldExpiresAt,
  findOrCreateClient,
  pickPublicAvailabilityPair,
  releaseExpiredHolds,
  createHoldAppointment,
  confirmHoldAppointment
};
