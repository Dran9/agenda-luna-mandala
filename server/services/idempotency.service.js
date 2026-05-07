const crypto = require("node:crypto");

const { toDate } = require("../utils/dates");
const { PublicBookingError, ValidationError } = require("./errors");

const DEFAULT_SCOPE = "public_booking_confirm";

function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object") {
    const sortedObject = {};
    const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));

    for (const key of keys) {
      sortedObject[key] = sortJsonValue(value[key]);
    }

    return sortedObject;
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortJsonValue(value));
}

function hashPayload(payload) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function parseStoredJson(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(String(value));
  } catch (_error) {
    return null;
  }
}

async function acquireIdempotencyKey({
  connection,
  centerId,
  idempotencyKey,
  payload,
  scope = DEFAULT_SCOPE,
  now = new Date()
}) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  if (!centerId) {
    throw new ValidationError("centerId es requerido para idempotencia");
  }

  const key = String(idempotencyKey || "").trim();

  if (!key) {
    throw new PublicBookingError({
      status: 400,
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message: "Idempotency-Key es obligatorio"
    });
  }

  const requestHash = hashPayload(payload);

  const [rows] = await connection.query(
    `SELECT
      request_hash AS requestHash,
      response_code AS responseCode,
      response_json AS responseJson,
      locked_until AS lockedUntil
     FROM idempotency_keys
     WHERE center_id = ?
       AND scope = ?
       AND idem_key = ?
     FOR UPDATE`,
    [centerId, scope, key]
  );

  if (rows.length === 0) {
    await connection.query(
      `INSERT INTO idempotency_keys (
        center_id,
        scope,
        idem_key,
        request_hash,
        locked_until
      ) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [centerId, scope, key, requestHash]
    );

    return {
      status: "acquired",
      requestHash,
      replayed: false
    };
  }

  const current = rows[0];

  if (current.requestHash !== requestHash) {
    throw new PublicBookingError({
      status: 409,
      code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
      message: "La Idempotency-Key ya fue usada con otro payload"
    });
  }

  const responseBody = parseStoredJson(current.responseJson);

  if (responseBody && current.responseCode) {
    return {
      status: "replay",
      requestHash,
      replayed: true,
      responseCode: Number(current.responseCode),
      responseBody
    };
  }

  const lockedUntil = current.lockedUntil ? toDate(current.lockedUntil) : null;

  if (lockedUntil && lockedUntil > now) {
    throw new PublicBookingError({
      status: 409,
      code: "IDEMPOTENCY_IN_PROGRESS",
      message: "Operacion en progreso para esta Idempotency-Key"
    });
  }

  await connection.query(
    `UPDATE idempotency_keys
     SET
       request_hash = ?,
       response_code = NULL,
       response_json = NULL,
       locked_until = DATE_ADD(NOW(), INTERVAL 5 MINUTE),
       updated_at = CURRENT_TIMESTAMP
     WHERE center_id = ?
       AND scope = ?
       AND idem_key = ?`,
    [requestHash, centerId, scope, key]
  );

  return {
    status: "acquired",
    requestHash,
    replayed: false
  };
}

async function persistIdempotencyResponse({
  connection,
  centerId,
  idempotencyKey,
  responseCode,
  responseBody,
  scope = DEFAULT_SCOPE
}) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  await connection.query(
    `UPDATE idempotency_keys
     SET
       response_code = ?,
       response_json = ?,
       locked_until = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE center_id = ?
       AND scope = ?
       AND idem_key = ?`,
    [responseCode, JSON.stringify(responseBody), centerId, scope, String(idempotencyKey).trim()]
  );
}

module.exports = {
  DEFAULT_SCOPE,
  stableStringify,
  hashPayload,
  acquireIdempotencyKey,
  persistIdempotencyResponse
};
