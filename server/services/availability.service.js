const {
  addMinutes,
  formatDateTimeForDbLocal,
  getLocalDateKey,
  getLocalMinutesOfDay,
  getLocalWeekday,
  overlaps,
  parseTimeToMinutes,
  startOfMinute,
  toDate
} = require("../utils/dates");

const { buildClaimMinutes } = require("./claims.service");
const { ValidationError } = require("./errors");
const CENTER_TIMEZONE_OFFSET = process.env.DB_TIMEZONE || "-04:00";

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

function buildResourceScopeFilter({ therapistIds, roomIds, typeColumn, idColumn }) {
  const therapistClause = buildInClause(therapistIds);
  const roomClause = buildInClause(roomIds);

  const sql = `(
    (${typeColumn} = 'therapist' AND ${idColumn} IN ${therapistClause.sql})
    OR (${typeColumn} = 'room' AND ${idColumn} IN ${roomClause.sql})
  )`;

  return {
    sql,
    values: [...therapistClause.values, ...roomClause.values]
  };
}

function normalizeServiceRow(row) {
  if (!row || Number(row.isActive || 0) !== 1) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    durationMinutes: Number(row.durationMinutes),
    bufferBeforeMinutes: Number(row.bufferBeforeMinutes || 0),
    bufferAfterMinutes: Number(row.bufferAfterMinutes || 0),
    isActive: true
  };
}

function normalizeTherapistRows(rows) {
  return rows
    .map((row) => ({
      therapistId: Number(row.therapistId),
      therapistName: row.therapistName,
      isActive: row.isActive === undefined ? true : Number(row.isActive) === 1
    }))
    .filter((row) => row.isActive);
}

function normalizeRoomRows(rows) {
  return rows
    .map((row) => ({
      roomId: Number(row.roomId),
      roomName: row.roomName,
      isActive: row.isActive === undefined ? true : Number(row.isActive) === 1,
      isCompatible: row.isCompatible === undefined ? true : Boolean(row.isCompatible)
    }))
    .filter((row) => row.isActive && row.isCompatible);
}

function indexRowsByResource(rows, resourceKeyBuilder) {
  const map = new Map();

  for (const row of rows) {
    const key = resourceKeyBuilder(row.resourceType, Number(row.resourceId));

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(row);
  }

  return map;
}

function createResourceKey(resourceType, resourceId) {
  return `${resourceType}:${resourceId}`;
}

function normalizeScheduleRows(rows) {
  return rows.map((row) => ({
    resourceType: row.resourceType,
    resourceId: Number(row.resourceId),
    weekday: Number(row.weekday),
    startTime: row.startTime,
    endTime: row.endTime,
    slotMinutes: Number(row.slotMinutes || 30),
    validFrom: row.validFrom ? String(row.validFrom).slice(0, 10) : null,
    validTo: row.validTo ? String(row.validTo).slice(0, 10) : null,
    isActive: row.isActive === undefined ? true : Number(row.isActive) === 1
  }));
}

function normalizeBlockRows(rows) {
  return rows.map((row) => ({
    resourceType: row.resourceType,
    resourceId: Number(row.resourceId),
    startsAt: toDate(row.startsAt),
    endsAt: toDate(row.endsAt)
  }));
}

function normalizeClaimRows(rows) {
  return rows.map((row) => ({
    resourceType: row.resourceType,
    resourceId: Number(row.resourceId),
    claimDbDateTime: formatDateTimeForDbLocal(startOfMinute(toDate(row.claimTime)), CENTER_TIMEZONE_OFFSET)
  }));
}

function isScheduleCoveringSlot(schedule, slotStart, slotEnd) {
  if (!schedule.isActive) {
    return false;
  }

  const weekday = getLocalWeekday(slotStart, CENTER_TIMEZONE_OFFSET);

  if (schedule.weekday !== weekday) {
    return false;
  }

  const slotDateKey = getLocalDateKey(slotStart, CENTER_TIMEZONE_OFFSET);
  const slotEndDateKey = getLocalDateKey(slotEnd, CENTER_TIMEZONE_OFFSET);

  if (slotDateKey !== slotEndDateKey) {
    return false;
  }

  if (schedule.validFrom && slotDateKey < schedule.validFrom) {
    return false;
  }

  if (schedule.validTo && slotDateKey > schedule.validTo) {
    return false;
  }

  const slotStartMinutes = getLocalMinutesOfDay(slotStart, CENTER_TIMEZONE_OFFSET);
  const slotEndMinutes = getLocalMinutesOfDay(slotEnd, CENTER_TIMEZONE_OFFSET);
  const scheduleStartMinutes = parseTimeToMinutes(schedule.startTime);
  const scheduleEndMinutes = parseTimeToMinutes(schedule.endTime);

  if (slotStartMinutes < scheduleStartMinutes || slotEndMinutes > scheduleEndMinutes) {
    return false;
  }

  if (schedule.slotMinutes > 0) {
    const offset = slotStartMinutes - scheduleStartMinutes;

    if (offset % schedule.slotMinutes !== 0) {
      return false;
    }
  }

  return true;
}

function buildClaimIndex(claimRows) {
  const map = new Map();

  for (const row of claimRows) {
    const key = createResourceKey(row.resourceType, row.resourceId);

    if (!map.has(key)) {
      map.set(key, new Set());
    }

    map.get(key).add(row.claimDbDateTime);
  }

  return map;
}

function hasClaimConflict(resourceType, resourceId, slotStart, slotEnd, claimIndex) {
  const key = createResourceKey(resourceType, resourceId);
  const set = claimIndex.get(key);

  if (!set || set.size === 0) {
    return false;
  }

  const minutes = buildClaimMinutes(slotStart, slotEnd);

  for (const minute of minutes) {
    if (set.has(formatDateTimeForDbLocal(minute, CENTER_TIMEZONE_OFFSET))) {
      return true;
    }
  }

  return false;
}

function hasBlockConflict(resourceType, resourceId, slotStart, slotEnd, blocksByResource) {
  const key = createResourceKey(resourceType, resourceId);
  const blocks = blocksByResource.get(key) || [];

  for (const block of blocks) {
    if (overlaps(slotStart, slotEnd, block.startsAt, block.endsAt)) {
      return true;
    }
  }

  return false;
}

function hasScheduleCoverage(resourceType, resourceId, slotStart, slotEnd, schedulesByResource) {
  const key = createResourceKey(resourceType, resourceId);
  const schedules = schedulesByResource.get(key) || [];

  for (const schedule of schedules) {
    if (isScheduleCoveringSlot(schedule, slotStart, slotEnd)) {
      return true;
    }
  }

  return false;
}

function resolveAvailablePairsForSlot({ context, slotStartInput, slotEndInput }) {
  const slotStart = startOfMinute(toDate(slotStartInput));
  const slotEnd = startOfMinute(toDate(slotEndInput));

  if (!context || !context.service || !context.service.isActive) {
    return [];
  }

  const therapists = normalizeTherapistRows(context.therapists || []);
  const rooms = normalizeRoomRows(context.rooms || []);

  if (therapists.length === 0 || rooms.length === 0) {
    return [];
  }

  const schedules = normalizeScheduleRows(context.schedules || []);
  const blocks = normalizeBlockRows(context.blocks || []);
  const claims = normalizeClaimRows(context.claims || []);

  const schedulesByResource = indexRowsByResource(schedules, createResourceKey);
  const blocksByResource = indexRowsByResource(blocks, createResourceKey);
  const claimIndex = buildClaimIndex(claims);

  const availableTherapists = therapists.filter((therapist) => {
    return (
      hasScheduleCoverage("therapist", therapist.therapistId, slotStart, slotEnd, schedulesByResource) &&
      !hasBlockConflict("therapist", therapist.therapistId, slotStart, slotEnd, blocksByResource) &&
      !hasClaimConflict("therapist", therapist.therapistId, slotStart, slotEnd, claimIndex)
    );
  });

  const availableRooms = rooms.filter((room) => {
    return (
      hasScheduleCoverage("room", room.roomId, slotStart, slotEnd, schedulesByResource) &&
      !hasBlockConflict("room", room.roomId, slotStart, slotEnd, blocksByResource) &&
      !hasClaimConflict("room", room.roomId, slotStart, slotEnd, claimIndex)
    );
  });

  const pairs = [];

  for (const therapist of availableTherapists) {
    for (const room of availableRooms) {
      pairs.push({
        therapistId: therapist.therapistId,
        therapistName: therapist.therapistName,
        roomId: room.roomId,
        roomName: room.roomName
      });
    }
  }

  return pairs;
}

async function fetchAvailabilityContext({ connection, centerId, serviceId, windowStart, windowEnd }) {
  if (!connection) {
    throw new ValidationError("Se requiere una conexion DB activa");
  }

  if (!centerId || !serviceId) {
    throw new ValidationError("centerId y serviceId son requeridos");
  }

  const [serviceRows] = await connection.query(
    `SELECT
      id,
      name,
      duration_minutes AS durationMinutes,
      buffer_before_minutes AS bufferBeforeMinutes,
      buffer_after_minutes AS bufferAfterMinutes,
      is_active AS isActive
     FROM services
     WHERE center_id = ? AND id = ?
     LIMIT 1`,
    [centerId, serviceId]
  );

  const service = normalizeServiceRow(serviceRows[0]);

  if (!service) {
    return {
      service: null,
      therapists: [],
      rooms: [],
      schedules: [],
      blocks: [],
      claims: []
    };
  }

  const [therapistRows] = await connection.query(
    `SELECT
      t.id AS therapistId,
      COALESCE(t.display_name, t.full_name) AS therapistName,
      t.is_active AS isActive
     FROM therapist_services ts
     INNER JOIN therapists t
       ON t.id = ts.therapist_id
      AND t.center_id = ts.center_id
     WHERE ts.center_id = ?
       AND ts.service_id = ?
       AND ts.is_active = 1
       AND t.is_active = 1
     ORDER BY t.id ASC`,
    [centerId, serviceId]
  );

  const [roomRows] = await connection.query(
    `SELECT
      r.id AS roomId,
      r.name AS roomName,
      r.is_active AS isActive,
      sr.is_active AS isCompatible
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

  const therapists = normalizeTherapistRows(therapistRows);
  const rooms = normalizeRoomRows(roomRows);

  if (therapists.length === 0 || rooms.length === 0) {
    return {
      service,
      therapists,
      rooms,
      schedules: [],
      blocks: [],
      claims: []
    };
  }

  const therapistIds = therapists.map((row) => row.therapistId);
  const roomIds = rooms.map((row) => row.roomId);
  const resourceScope = buildResourceScopeFilter({
    therapistIds,
    roomIds,
    typeColumn: "resource_type",
    idColumn: "resource_id"
  });

  const [scheduleRows] = await connection.query(
    `SELECT
      resource_type AS resourceType,
      resource_id AS resourceId,
      weekday,
      start_time AS startTime,
      end_time AS endTime,
      slot_minutes AS slotMinutes,
      valid_from AS validFrom,
      valid_to AS validTo,
      is_active AS isActive
     FROM resource_schedules
     WHERE center_id = ?
       AND is_active = 1
       AND ${resourceScope.sql}`,
    [centerId, ...resourceScope.values]
  );

  const [blockRows] = await connection.query(
    `SELECT
      resource_type AS resourceType,
      resource_id AS resourceId,
      starts_at AS startsAt,
      ends_at AS endsAt
     FROM resource_blocks
     WHERE center_id = ?
       AND starts_at < ?
       AND ends_at > ?
       AND ${resourceScope.sql}`,
    [centerId, windowEnd, windowStart, ...resourceScope.values]
  );

  const [claimRows] = await connection.query(
    `SELECT
      resource_type AS resourceType,
      resource_id AS resourceId,
      claim_time AS claimTime
     FROM appointment_resource_claims
     WHERE center_id = ?
       AND claim_time >= ?
       AND claim_time < ?
       AND ${resourceScope.sql}`,
    [centerId, windowStart, windowEnd, ...resourceScope.values]
  );

  return {
    service,
    therapists,
    rooms,
    schedules: scheduleRows,
    blocks: blockRows,
    claims: claimRows
  };
}

async function findAvailablePairsForSlot({ connection, centerId, serviceId, slotStartInput, slotEndInput }) {
  const slotStart = startOfMinute(toDate(slotStartInput));
  const slotEnd = startOfMinute(toDate(slotEndInput));

  const context = await fetchAvailabilityContext({
    connection,
    centerId,
    serviceId,
    windowStart: slotStart,
    windowEnd: slotEnd
  });

  return resolveAvailablePairsForSlot({
    context,
    slotStartInput: slotStart,
    slotEndInput: slotEnd
  });
}

function buildFutureSlotRange({ fromInput, toInput, stepMinutes, nowInput = new Date() }) {
  const from = startOfMinute(toDate(fromInput));
  const to = startOfMinute(toDate(toInput));
  const now = startOfMinute(toDate(nowInput));

  if (to <= from) {
    throw new ValidationError("Rango invalido para disponibilidad", {
      from: from.toISOString(),
      to: to.toISOString()
    });
  }

  if (!Number.isInteger(stepMinutes) || stepMinutes <= 0) {
    throw new ValidationError("stepMinutes debe ser entero positivo", { stepMinutes });
  }

  const slots = [];

  for (let cursor = from; cursor < to; cursor = addMinutes(cursor, stepMinutes)) {
    if (cursor > now) {
      slots.push(cursor);
    }
  }

  return slots;
}

async function listAvailableSlots({
  connection,
  centerId,
  serviceId,
  fromInput,
  toInput,
  stepMinutes = 30,
  nowInput = new Date()
}) {
  const from = startOfMinute(toDate(fromInput));
  const to = startOfMinute(toDate(toInput));

  const context = await fetchAvailabilityContext({
    connection,
    centerId,
    serviceId,
    windowStart: from,
    windowEnd: to
  });

  if (!context.service) {
    return [];
  }

  const durationMinutes =
    context.service.durationMinutes + context.service.bufferBeforeMinutes + context.service.bufferAfterMinutes;

  const slotStarts = buildFutureSlotRange({
    fromInput: from,
    toInput: to,
    stepMinutes,
    nowInput
  });

  const availability = [];

  for (const slotStart of slotStarts) {
    const slotEnd = addMinutes(slotStart, durationMinutes);

    if (slotEnd > to) {
      continue;
    }

    const pairs = resolveAvailablePairsForSlot({
      context,
      slotStartInput: slotStart,
      slotEndInput: slotEnd
    });

    if (pairs.length > 0) {
      availability.push({
        startsAt: slotStart.toISOString(),
        endsAt: slotEnd.toISOString(),
        pairs
      });
    }
  }

  return availability;
}

module.exports = {
  fetchAvailabilityContext,
  resolveAvailablePairsForSlot,
  findAvailablePairsForSlot,
  buildFutureSlotRange,
  listAvailableSlots
};
