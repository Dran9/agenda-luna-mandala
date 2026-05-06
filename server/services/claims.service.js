const {
  addMinutes,
  differenceInMinutes,
  formatDateTimeForDbLocal,
  startOfMinute,
  toDate
} = require("../utils/dates");
const {
  InvalidAppointmentStateError,
  SlotOccupiedError,
  ValidationError
} = require("./errors");

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "no_show"]);
const CENTER_TIMEZONE_OFFSET = process.env.DB_TIMEZONE || "-04:00";

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(normalizeStatus(status));
}

function buildClaimMinutes(startsAtInput, endsAtInput) {
  const startsAt = startOfMinute(toDate(startsAtInput));
  const endsAt = startOfMinute(toDate(endsAtInput));

  if (endsAt <= startsAt) {
    throw new ValidationError("El rango de la cita es invalido", {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString()
    });
  }

  const totalMinutes = differenceInMinutes(startsAt, endsAt);
  const minutes = [];

  for (let offset = 0; offset < totalMinutes; offset += 1) {
    minutes.push(addMinutes(startsAt, offset));
  }

  return minutes;
}

function buildClaimRows(appointment) {
  const {
    centerId,
    appointmentId,
    therapistId,
    roomId,
    startsAt,
    endsAt
  } = appointment;

  if (!centerId || !appointmentId || !therapistId || !roomId) {
    throw new ValidationError("Faltan campos requeridos para crear claims", {
      centerId,
      appointmentId,
      therapistId,
      roomId
    });
  }

  const minutes = buildClaimMinutes(startsAt, endsAt);
  const rows = [];

  for (const claimTime of minutes) {
    const localDbDateTime = formatDateTimeForDbLocal(claimTime, CENTER_TIMEZONE_OFFSET);

    rows.push([centerId, appointmentId, "therapist", therapistId, localDbDateTime]);
    rows.push([centerId, appointmentId, "room", roomId, localDbDateTime]);
  }

  return rows;
}

function flattenRows(rows) {
  const placeholders = rows.map(() => "(?, ?, ?, ?, ?)").join(", ");
  const values = [];

  for (const row of rows) {
    for (const value of row) {
      values.push(value);
    }
  }

  return {
    placeholders,
    values
  };
}

function isUniqueConflict(error) {
  return error && (error.code === "ER_DUP_ENTRY" || Number(error.errno) === 1062);
}

function normalizeAppointment(input) {
  return {
    centerId: input.centerId,
    appointmentId: input.appointmentId || input.id,
    therapistId: input.therapistId,
    roomId: input.roomId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: normalizeStatus(input.status)
  };
}

async function createAppointmentClaims({ connection, appointment }) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  if (!appointment) {
    throw new ValidationError("Se requiere una cita para crear claims");
  }

  const normalizedAppointment = normalizeAppointment(appointment);

  if (isTerminalStatus(normalizedAppointment.status)) {
    throw new InvalidAppointmentStateError(normalizedAppointment.status);
  }

  const rows = buildClaimRows(normalizedAppointment);
  const { placeholders, values } = flattenRows(rows);

  let startedTransaction = false;

  try {
    await connection.beginTransaction();
    startedTransaction = true;

    await connection.query(
      "DELETE FROM appointment_resource_claims WHERE appointment_id = ?",
      [normalizedAppointment.appointmentId]
    );

    await connection.query(
      `INSERT INTO appointment_resource_claims (
        center_id,
        appointment_id,
        resource_type,
        resource_id,
        claim_time
      ) VALUES ${placeholders}`,
      values
    );

    await connection.commit();

    return {
      appointmentId: normalizedAppointment.appointmentId,
      claimsCreated: rows.length
    };
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback();
    }

    if (isUniqueConflict(error)) {
      throw new SlotOccupiedError("Slot ocupado para terapeuta o sala", {
        appointmentId: normalizedAppointment.appointmentId,
        startsAt: normalizedAppointment.startsAt,
        endsAt: normalizedAppointment.endsAt
      });
    }

    throw error;
  }
}

async function releaseAppointmentClaims({ connection, appointmentId }) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  if (!appointmentId) {
    throw new ValidationError("Se requiere appointmentId para liberar claims");
  }

  let startedTransaction = false;

  try {
    await connection.beginTransaction();
    startedTransaction = true;

    const [result] = await connection.query(
      "DELETE FROM appointment_resource_claims WHERE appointment_id = ?",
      [appointmentId]
    );

    await connection.commit();

    return {
      appointmentId,
      claimsReleased: result.affectedRows || 0
    };
  } catch (error) {
    if (startedTransaction) {
      await connection.rollback();
    }

    throw error;
  }
}

module.exports = {
  TERMINAL_STATUSES,
  isTerminalStatus,
  buildClaimMinutes,
  buildClaimRows,
  createAppointmentClaims,
  releaseAppointmentClaims
};
