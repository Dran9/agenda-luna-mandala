const { ValidationError } = require("./errors");

function normalizeCandidate(candidate) {
  return {
    therapistId: Number(candidate.therapistId),
    therapistName: candidate.therapistName || null
  };
}

function buildLoadMap(rows) {
  const map = new Map();

  for (const row of rows || []) {
    map.set(Number(row.therapistId), Number(row.claimCount));
  }

  return map;
}

function pickTherapistCandidate({ candidates, loadMap = new Map(), lastTherapistId = null }) {
  const normalizedCandidates = (candidates || []).map(normalizeCandidate);

  if (normalizedCandidates.length === 0) {
    return null;
  }

  const candidatesById = new Map();
  for (const candidate of normalizedCandidates) {
    if (!Number.isInteger(candidate.therapistId) || candidate.therapistId <= 0) {
      continue;
    }
    if (!candidatesById.has(candidate.therapistId)) {
      candidatesById.set(candidate.therapistId, candidate);
    }
  }

  const sortedIds = Array.from(candidatesById.keys()).sort((left, right) => left - right);

  if (sortedIds.length === 0) {
    return null;
  }

  const normalizedLastId = lastTherapistId === null ? null : Number(lastTherapistId);

  if (!normalizedLastId || Number.isNaN(normalizedLastId)) {
    return candidatesById.get(sortedIds[0]) || null;
  }

  const nextId = sortedIds.find((id) => id > normalizedLastId) || sortedIds[0];

  return candidatesById.get(nextId) || null;
}

async function fetchLastTherapistId({ connection, centerId, serviceId }) {
  const [rows] = await connection.query(
    `SELECT last_therapist_id AS lastTherapistId
     FROM round_robin_state
     WHERE center_id = ?
       AND service_id = ?
     LIMIT 1`,
    [centerId, serviceId]
  );

  return rows[0]?.lastTherapistId ?? null;
}

async function fetchClaimLoadByTherapist({ connection, centerId, therapistIds, windowStart, windowEnd }) {
  if (!Array.isArray(therapistIds) || therapistIds.length === 0) {
    return new Map();
  }

  const placeholders = therapistIds.map(() => "?").join(", ");
  const [rows] = await connection.query(
    `SELECT
      resource_id AS therapistId,
      COUNT(*) AS claimCount
     FROM appointment_resource_claims
     WHERE center_id = ?
       AND resource_type = 'therapist'
       AND claim_time >= ?
       AND claim_time < ?
       AND resource_id IN (${placeholders})
     GROUP BY resource_id`,
    [centerId, windowStart, windowEnd, ...therapistIds]
  );

  return buildLoadMap(rows);
}

async function persistRoundRobinState({ connection, centerId, serviceId, therapistId }) {
  await connection.query(
    `INSERT INTO round_robin_state (center_id, service_id, last_therapist_id)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       last_therapist_id = VALUES(last_therapist_id),
       updated_at = CURRENT_TIMESTAMP`,
    [centerId, serviceId, therapistId]
  );
}

async function chooseTherapistForService({
  connection,
  centerId,
  serviceId,
  candidates,
  windowStart,
  windowEnd
}) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  if (!centerId || !serviceId) {
    throw new ValidationError("centerId y serviceId son requeridos");
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new ValidationError("No hay terapeutas candidatos para round-robin");
  }

  const lastTherapistId = await fetchLastTherapistId({ connection, centerId, serviceId });

  const selected = pickTherapistCandidate({
    candidates,
    lastTherapistId
  });

  if (!selected) {
    throw new ValidationError("No se pudo elegir terapeuta en round-robin");
  }

  await persistRoundRobinState({
    connection,
    centerId,
    serviceId,
    therapistId: selected.therapistId
  });

  return selected;
}

module.exports = {
  buildLoadMap,
  pickTherapistCandidate,
  fetchLastTherapistId,
  fetchClaimLoadByTherapist,
  persistRoundRobinState,
  chooseTherapistForService
};
