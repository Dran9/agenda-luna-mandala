const DEFAULT_TIMEZONE_OFFSET = process.env.DB_TIMEZONE || "-04:00";

function toDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return parsed;
}

function addMinutes(dateInput, minutes) {
  const date = toDate(dateInput);
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfMinute(dateInput) {
  const date = toDate(dateInput);
  date.setUTCSeconds(0, 0);
  return date;
}

function differenceInMinutes(startInput, endInput) {
  const start = toDate(startInput);
  const end = toDate(endInput);
  return Math.floor((end.getTime() - start.getTime()) / 60_000);
}

function parseTimezoneOffset(offsetInput = DEFAULT_TIMEZONE_OFFSET) {
  const offset = String(offsetInput || "").trim();
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error(`Invalid timezone offset: ${offsetInput}`);
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3], 10);

  if (hours > 23 || minutes > 59) {
    throw new Error(`Invalid timezone offset: ${offsetInput}`);
  }

  return sign * (hours * 60 + minutes);
}

function shiftToLocalOffset(dateInput, offsetInput = DEFAULT_TIMEZONE_OFFSET) {
  const date = toDate(dateInput);
  const offsetMinutes = parseTimezoneOffset(offsetInput);
  return new Date(date.getTime() + offsetMinutes * 60_000);
}

function toLocalComponents(dateInput, offsetInput = DEFAULT_TIMEZONE_OFFSET) {
  const shifted = shiftToLocalOffset(dateInput, offsetInput);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
    milliseconds: shifted.getUTCMilliseconds(),
    weekday: shifted.getUTCDay()
  };
}

function getLocalWeekday(dateInput, offsetInput = DEFAULT_TIMEZONE_OFFSET) {
  return toLocalComponents(dateInput, offsetInput).weekday;
}

function getLocalMinutesOfDay(dateInput, offsetInput = DEFAULT_TIMEZONE_OFFSET) {
  const local = toLocalComponents(dateInput, offsetInput);
  return local.hours * 60 + local.minutes;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getLocalDateKey(dateInput, offsetInput = DEFAULT_TIMEZONE_OFFSET) {
  const local = toLocalComponents(dateInput, offsetInput);
  return `${local.year}-${pad2(local.month)}-${pad2(local.day)}`;
}

function formatDateTimeForDbLocal(dateInput, offsetInput = DEFAULT_TIMEZONE_OFFSET) {
  const local = toLocalComponents(dateInput, offsetInput);
  return `${local.year}-${pad2(local.month)}-${pad2(local.day)} ${pad2(local.hours)}:${pad2(local.minutes)}:${pad2(local.seconds)}`;
}

function getUtcWeekday(dateInput) {
  return toDate(dateInput).getUTCDay();
}

function getUtcMinutesOfDay(dateInput) {
  const date = toDate(dateInput);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function getUtcDateKey(dateInput) {
  return toDate(dateInput).toISOString().slice(0, 10);
}

function parseTimeToMinutes(timeString) {
  const [hours, minutes] = String(timeString).split(":").map((part) => Number.parseInt(part, 10));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  return hours * 60 + minutes;
}

function overlaps(startAInput, endAInput, startBInput, endBInput) {
  const startA = toDate(startAInput).getTime();
  const endA = toDate(endAInput).getTime();
  const startB = toDate(startBInput).getTime();
  const endB = toDate(endBInput).getTime();

  return startA < endB && endA > startB;
}

module.exports = {
  DEFAULT_TIMEZONE_OFFSET,
  toDate,
  addMinutes,
  startOfMinute,
  differenceInMinutes,
  parseTimezoneOffset,
  toLocalComponents,
  getLocalWeekday,
  getLocalMinutesOfDay,
  getLocalDateKey,
  formatDateTimeForDbLocal,
  getUtcWeekday,
  getUtcMinutesOfDay,
  getUtcDateKey,
  parseTimeToMinutes,
  overlaps
};
