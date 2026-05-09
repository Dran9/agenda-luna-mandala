import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarCheck,
  CaretDown,
  CaretLeft,
  CaretRight,
  CheckCircle,
  CircleNotch,
  ClockCountdown,
  MagnifyingGlass,
  Moon,
  Sparkle,
  Sun,
  User,
  WarningCircle,
  WhatsappLogo
} from "@phosphor-icons/react";
import "./styles.css";

const SCREEN_TYPES = {
  default: "Booking default",
  single_therapist: "Single therapist",
  hybrid_explore: "Hybrid explore"
};

const DEFAULT_TENANT_SLUG = "demo";
const DEFAULT_SUPPORT_WHATSAPP = "59170000000";
const DEFAULT_API_BASE_URL = "/api";
const DEFAULT_TIMEZONE = "America/La_Paz";
const BUSINESS_DAYS_TO_SHOW = 5;
const CALENDAR_SPAN_DAYS = 180;
const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie"];
const ONBOARDING_FIELDS = ["firstName", "lastName", "age", "city", "source"];
const ONBOARDING_BANNED_TEXT = new Set(["asdf", "asdfasd", "adsfa", "qwer", "zxcv", "aaaa", "test", "prueba"]);
const ONBOARDING_CITY_OPTIONS = ["Cochabamba", "Santa Cruz", "La Paz", "Sucre", "Otro"];
const ONBOARDING_SOURCE_OPTIONS = ["Referencia de amigos", "Redes sociales", "Otro"];
const EMPTY_ONBOARDING_FORM = {
  firstName: "",
  lastName: "",
  age: "",
  city: "",
  source: ""
};

const COUNTRY_TIMEZONE_OPTIONS = [
  {
    region: "Sudamerica",
    country: "Bolivia",
    flag: "🇧🇴",
    timezone: "America/La_Paz",
    dialCode: "+591",
    digitsMin: 8,
    digitsMax: 8,
    example: "71234567"
  },
  {
    region: "Sudamerica",
    country: "Argentina",
    flag: "🇦🇷",
    timezone: "America/Argentina/Buenos_Aires",
    dialCode: "+54",
    digitsMin: 10,
    digitsMax: 11,
    example: "1123456789"
  },
  {
    region: "Sudamerica",
    country: "Chile",
    flag: "🇨🇱",
    timezone: "America/Santiago",
    dialCode: "+56",
    digitsMin: 9,
    digitsMax: 9,
    example: "912345678"
  },
  {
    region: "Sudamerica",
    country: "Peru",
    flag: "🇵🇪",
    timezone: "America/Lima",
    dialCode: "+51",
    digitsMin: 9,
    digitsMax: 9,
    example: "912345678"
  },
  {
    region: "Sudamerica",
    country: "Colombia",
    flag: "🇨🇴",
    timezone: "America/Bogota",
    dialCode: "+57",
    digitsMin: 10,
    digitsMax: 10,
    example: "3012345678"
  },
  {
    region: "Sudamerica",
    country: "Uruguay",
    flag: "🇺🇾",
    timezone: "America/Montevideo",
    dialCode: "+598",
    digitsMin: 8,
    digitsMax: 8,
    example: "91234567"
  },
  {
    region: "Sudamerica",
    country: "Brasil",
    flag: "🇧🇷",
    timezone: "America/Sao_Paulo",
    dialCode: "+55",
    digitsMin: 10,
    digitsMax: 11,
    example: "11912345678"
  },
  {
    region: "Norteamerica",
    country: "Mexico",
    flag: "🇲🇽",
    timezone: "America/Mexico_City",
    dialCode: "+52",
    digitsMin: 10,
    digitsMax: 10,
    example: "5512345678"
  },
  {
    region: "Norteamerica",
    country: "USA Este",
    flag: "🇺🇸",
    timezone: "America/New_York",
    dialCode: "+1",
    digitsMin: 10,
    digitsMax: 10,
    example: "3051234567"
  },
  {
    region: "Norteamerica",
    country: "USA Centro",
    flag: "🇺🇸",
    timezone: "America/Chicago",
    dialCode: "+1",
    digitsMin: 10,
    digitsMax: 10,
    example: "3121234567"
  },
  {
    region: "Norteamerica",
    country: "USA Pacifico",
    flag: "🇺🇸",
    timezone: "America/Los_Angeles",
    dialCode: "+1",
    digitsMin: 10,
    digitsMax: 10,
    example: "4151234567"
  },
  {
    region: "Norteamerica",
    country: "Canada Este",
    flag: "🇨🇦",
    timezone: "America/Toronto",
    dialCode: "+1",
    digitsMin: 10,
    digitsMax: 10,
    example: "4161234567"
  },
  {
    region: "Europa",
    country: "Espana",
    flag: "🇪🇸",
    timezone: "Europe/Madrid",
    dialCode: "+34",
    digitsMin: 9,
    digitsMax: 9,
    example: "612345678"
  },
  {
    region: "Europa",
    country: "Francia",
    flag: "🇫🇷",
    timezone: "Europe/Paris",
    dialCode: "+33",
    digitsMin: 8,
    digitsMax: 11,
    example: "612345678"
  },
  {
    region: "Europa",
    country: "Italia",
    flag: "🇮🇹",
    timezone: "Europe/Rome",
    dialCode: "+39",
    digitsMin: 8,
    digitsMax: 11,
    example: "3123456789"
  },
  {
    region: "Europa",
    country: "Alemania",
    flag: "🇩🇪",
    timezone: "Europe/Berlin",
    dialCode: "+49",
    digitsMin: 10,
    digitsMax: 11,
    example: "15123456789"
  }
];

function resolveScreenType(rawValue) {
  if (!rawValue) {
    return "default";
  }

  return Object.hasOwn(SCREEN_TYPES, rawValue) ? rawValue : "default";
}

function readInitialConfig() {
  const params = new URLSearchParams(window.location.search);
  const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

  const tenantSlug = params.get("tenantSlug") || import.meta.env.VITE_TENANT_SLUG || DEFAULT_TENANT_SLUG;
  const rawScreenType = params.get("screenType") || params.get("type") || import.meta.env.VITE_BOOKING_SCREEN_TYPE;
  const screenType = resolveScreenType(rawScreenType);
  const supportWhatsapp = params.get("supportWhatsapp") || import.meta.env.VITE_SUPPORT_WHATSAPP || DEFAULT_SUPPORT_WHATSAPP;
  const apiBaseUrl = String(envApiBaseUrl).trim().replace(/\/+$/, "") || DEFAULT_API_BASE_URL;

  return {
    tenantSlug,
    screenType,
    supportWhatsapp,
    apiBaseUrl
  };
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeOnboardingPayload(values) {
  const firstName = String(values?.firstName || "").trim();
  const lastName = String(values?.lastName || "").trim();
  const ageRaw = String(values?.age || "").trim();
  const city = String(values?.city || "").trim();
  const source = String(values?.source || "").trim();
  const errors = {};
  const resolveAllowedOptionValue = (value, options) => {
    const lowered = String(value || "").toLowerCase();
    return options.find((option) => option.toLowerCase() === lowered) || "";
  };
  const normalizeQualityText = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  const hasValidTextQuality = (value) => {
    const quality = normalizeQualityText(value);

    if (!quality) {
      return false;
    }

    if (/^([a-z0-9])\1{2,}$/.test(quality)) {
      return false;
    }

    if (ONBOARDING_BANNED_TEXT.has(quality)) {
      return false;
    }

    return true;
  };

  if (!firstName) {
    errors.firstName = "Ingresa tu nombre.";
  } else if (firstName.length < 2) {
    errors.firstName = "Tu nombre debe tener al menos 2 caracteres.";
  } else if (!hasValidTextQuality(firstName)) {
    errors.firstName = "Ingresa un nombre valido.";
  }

  if (!lastName) {
    errors.lastName = "Ingresa tu apellido.";
  } else if (lastName.length < 2) {
    errors.lastName = "Tu apellido debe tener al menos 2 caracteres.";
  } else if (!hasValidTextQuality(lastName)) {
    errors.lastName = "Ingresa un apellido valido.";
  }

  const age = Number.parseInt(ageRaw, 10);
  if (!ageRaw) {
    errors.age = "Ingresa tu edad.";
  } else if (!Number.isInteger(age) || age < 18 || age > 75) {
    errors.age = "La edad debe estar entre 18 y 75.";
  }

  if (!city) {
    errors.city = "Ingresa tu ciudad.";
  } else if (!resolveAllowedOptionValue(city, ONBOARDING_CITY_OPTIONS)) {
    errors.city = "Selecciona una ciudad valida.";
  }

  if (!source) {
    errors.source = "Indica como nos encontraste.";
  } else if (!resolveAllowedOptionValue(source, ONBOARDING_SOURCE_OPTIONS)) {
    errors.source = "Selecciona una fuente valida.";
  }

  const normalizedCity = resolveAllowedOptionValue(city, ONBOARDING_CITY_OPTIONS);
  const normalizedSource = resolveAllowedOptionValue(source, ONBOARDING_SOURCE_OPTIONS);

  return {
    errors,
    normalized: {
      firstName,
      lastName,
      age,
      city: normalizedCity || city,
      source: normalizedSource || source
    }
  };
}

function toDateKeyFromDateUtc(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map((part) => Number.parseInt(part, 10));

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function addDaysToDateKey(dateKey, daysToAdd) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return dateKey;
  }

  parsed.setUTCDate(parsed.getUTCDate() + daysToAdd);
  return toDateKeyFromDateUtc(parsed);
}

function formatDateKeyInTimezone(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return toDateKeyFromDateUtc(date);
  }

  return `${year}-${month}-${day}`;
}

function isBusinessDateKey(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return false;
  }

  const day = parsed.getUTCDay();
  return day >= 1 && day <= 5;
}

function nextBusinessDateKey(timezone) {
  let key = formatDateKeyInTimezone(new Date(), timezone);
  key = addDaysToDateKey(key, 1);

  while (!isBusinessDateKey(key)) {
    key = addDaysToDateKey(key, 1);
  }

  return key;
}

function buildBusinessDateRange(startDateKey, count = BUSINESS_DAYS_TO_SHOW) {
  const days = [];
  let cursor = startDateKey;

  while (days.length < count) {
    if (isBusinessDateKey(cursor)) {
      days.push(cursor);
    }

    cursor = addDaysToDateKey(cursor, 1);
  }

  return days;
}

function formatDateChip(dateKey, timezone) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return {
      dayLabel: "--",
      dateLabel: "--"
    };
  }

  const dayLabel = parsed
    .toLocaleDateString("es-BO", {
      timeZone: timezone,
      weekday: "short"
    })
    .replace(/\./g, "");
  const monthLabel = parsed
    .toLocaleDateString("es-BO", {
      timeZone: timezone,
      month: "short"
    })
    .replace(/\./g, "");
  const dayNumber = parsed.toLocaleDateString("es-BO", {
    timeZone: timezone,
    day: "2-digit"
  });
  const normalizedDay = dayLabel ? `${dayLabel.slice(0, 1).toUpperCase()}${dayLabel.slice(1).toLowerCase()}` : "--";
  const normalizedMonth = monthLabel
    ? `${monthLabel.slice(0, 1).toUpperCase()}${monthLabel.slice(1).toLowerCase()}`
    : "--";

  return {
    dayLabel: normalizedDay,
    dateLabel: `${dayNumber} ${normalizedMonth}`
  };
}

function shiftMonthKey(monthKey, delta) {
  const [yearRaw, monthRaw] = String(monthKey || "").split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);

  if (!year || !month) {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1, 12, 0, 0));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey, timezone) {
  const [yearRaw, monthRaw] = String(monthKey || "").split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);

  if (!year || !month) {
    return "--";
  }

  const monthDate = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  return monthDate.toLocaleDateString("es-BO", {
    timeZone: timezone,
    month: "long",
    year: "numeric"
  });
}

function buildCalendarGrid(monthKey, minDateKey, maxDateKey) {
  const [yearRaw, monthRaw] = String(monthKey || "").split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);

  if (!year || !month) {
    return [];
  }

  const lastOfMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0));
  const businessDays = [];

  for (let dayNumber = 1; dayNumber <= lastOfMonth.getUTCDate(); dayNumber += 1) {
    const dayDate = new Date(Date.UTC(year, month - 1, dayNumber, 12, 0, 0));
    const dateKey = toDateKeyFromDateUtc(dayDate);
    const isBusiness = isBusinessDateKey(dateKey);

    if (!isBusiness) {
      continue;
    }

    const withinRange = dateKey >= minDateKey && dateKey <= maxDateKey;
    businessDays.push({
      dateKey,
      dayNumber,
      inCurrentMonth: true,
      isPlaceholder: false,
      disabled: !withinRange
    });
  }

  if (businessDays.length === 0) {
    return [];
  }

  const firstBusinessDate = parseDateKey(businessDays[0].dateKey);
  const firstBusinessWeekday = firstBusinessDate ? ((firstBusinessDate.getUTCDay() + 6) % 7) : 0;
  const leadingCells = firstBusinessWeekday;
  const cells = [];

  for (let index = 0; index < leadingCells; index += 1) {
    cells.push({
      dateKey: `placeholder-start-${monthKey}-${index}`,
      dayNumber: null,
      inCurrentMonth: false,
      isPlaceholder: true,
      disabled: true
    });
  }

  cells.push(...businessDays);

  const trailingCells = (5 - (cells.length % 5)) % 5;
  for (let index = 0; index < trailingCells; index += 1) {
    cells.push({
      dateKey: `placeholder-end-${monthKey}-${index}`,
      dayNumber: null,
      inCurrentMonth: false,
      isPlaceholder: true,
      disabled: true
    });
  }

  return cells;
}

function createIdempotencyKey() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `booking-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function buildWhatsappHref(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatTime(dateLike, timezone) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("es-BO", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatDateTime(dateLike, timezone) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("es-BO", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getHourInTimezone(dateLike, timezone) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return -1;
  }

  const hourFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false
  });

  return Number.parseInt(hourFormatter.format(date), 10);
}

function formatTimezoneShort(dateLike, timezone) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return timezone;
  }

  const parts = new Intl.DateTimeFormat("es-BO", {
    timeZone: timezone,
    timeZoneName: "short"
  }).formatToParts(date);

  return parts.find((part) => part.type === "timeZoneName")?.value || timezone;
}

function formatTimezoneLocalClock(timezone) {
  return new Date().toLocaleTimeString("es-BO", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDigitsRule(option) {
  if (option.digitsMin === option.digitsMax) {
    return `${option.digitsMin} digitos`;
  }

  return `${option.digitsMin}-${option.digitsMax} digitos`;
}

function isPhoneValidByTimezone(phoneDigits, timezoneOption) {
  const length = phoneDigits.length;
  return length >= timezoneOption.digitsMin && length <= timezoneOption.digitsMax;
}

function isBoliviaMobilePhone(phoneDigits, timezoneOption) {
  if (timezoneOption?.timezone !== "America/La_Paz") {
    return true;
  }

  return /^[67]\d{7}$/.test(phoneDigits);
}

function buildPhonePayload(phoneDigits, timezoneOption) {
  return `${timezoneOption.dialCode}${phoneDigits}`;
}

function toMinutesAndSeconds(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeRequestError(error) {
  if (error?.isNetworkError) {
    return {
      status: 0,
      code: "NETWORK_ERROR",
      message: "No pudimos conectar con el servidor. Reintenta en unos segundos.",
      details: {}
    };
  }

  if (error?.status) {
    return {
      status: Number(error.status),
      code: error.code || "API_ERROR",
      message: error.message || "No se pudo completar la solicitud.",
      details: error.details || {}
    };
  }

  return {
    status: 0,
    code: "UNKNOWN_ERROR",
    message: "Ocurrio un error inesperado. Reintenta.",
    details: {}
  };
}

async function requestJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (_error) {
    const networkError = new Error("NETWORK_ERROR");
    networkError.isNetworkError = true;
    throw networkError;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error?.message || "API_ERROR");
    error.status = response.status;
    error.code = payload?.error?.code || "API_ERROR";
    error.message = payload?.error?.message || "No se pudo completar la solicitud";
    error.details = payload?.error?.details || {};
    throw error;
  }

  return payload;
}

function filterAndGroupSlots(slots = [], timezone) {
  const now = Date.now();
  const futureSlots = slots
    .filter((slot) => {
      const startsAt = new Date(slot.startsAt);
      if (Number.isNaN(startsAt.getTime())) {
        return false;
      }

      if (startsAt.getTime() <= now) {
        return false;
      }

      const hour = getHourInTimezone(slot.startsAt, timezone);
      return hour >= 7 && hour < 20;
    })
    .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt));

  return {
    morning: futureSlots.filter((slot) => getHourInTimezone(slot.startsAt, timezone) < 13),
    afternoon: futureSlots.filter((slot) => getHourInTimezone(slot.startsAt, timezone) >= 13)
  };
}

function BookingApp() {
  const config = useMemo(readInitialConfig, []);

  const [catalogState, setCatalogState] = useState({
    status: "loading",
    data: null,
    error: null
  });
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedTherapistId, setSelectedTherapistId] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  const [identifyState, setIdentifyState] = useState({
    status: "idle",
    data: null,
    error: null
  });
  const [decision, setDecision] = useState("");

  const [selectedTimezone, setSelectedTimezone] = useState(DEFAULT_TIMEZONE);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [timezonePickerOpen, setTimezonePickerOpen] = useState(false);
  const [timezonePinnedByUser, setTimezonePinnedByUser] = useState(false);

  const [stripStartDateKey, setStripStartDateKey] = useState(nextBusinessDateKey(DEFAULT_TIMEZONE));
  const [selectedDateKey, setSelectedDateKey] = useState(nextBusinessDateKey(DEFAULT_TIMEZONE));
  const [calendarMonthKey, setCalendarMonthKey] = useState(nextBusinessDateKey(DEFAULT_TIMEZONE).slice(0, 7));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDateStatus, setCalendarDateStatus] = useState({});

  const [availabilityState, setAvailabilityState] = useState({
    status: "idle",
    data: null,
    error: null
  });
  const [holdState, setHoldState] = useState(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(0);
  const [holdingSlotStartsAt, setHoldingSlotStartsAt] = useState("");
  const [confirmState, setConfirmState] = useState({
    status: "idle",
    data: null,
    error: null
  });
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState(EMPTY_ONBOARDING_FORM);
  const [onboardingTouched, setOnboardingTouched] = useState({});
  const [onboardingBackendErrors, setOnboardingBackendErrors] = useState({});
  const [onboardingHint, setOnboardingHint] = useState("");
  const [confirmedClientName, setConfirmedClientName] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());
  const confirmationSectionRef = useRef(null);

  const catalog = catalogState.data;
  const services = catalog?.services || [];
  const compatibleTherapists = (catalog?.therapists || []).filter((therapist) => therapist.serviceIds.includes(selectedServiceId));
  const selectedService = services.find((service) => service.id === selectedServiceId) || null;
  const selectedTherapist = compatibleTherapists.find((therapist) => therapist.id === selectedTherapistId) || null;
  const nextAppointment = identifyState.data?.nextAppointment || null;
  const existingClientName = String(identifyState.data?.client?.fullName || "").trim();
  const clientFirstName = existingClientName ? existingClientName.split(/\s+/)[0] : "";

  const selectedTimezoneOption = useMemo(
    () =>
      COUNTRY_TIMEZONE_OPTIONS.find((option) => option.timezone === selectedTimezone)
      || COUNTRY_TIMEZONE_OPTIONS[0],
    [selectedTimezone]
  );

  const phoneDigits = normalizePhone(phoneInput);
  const isPhoneLengthValid = isPhoneValidByTimezone(phoneDigits, selectedTimezoneOption);
  const isPhoneCountryRuleValid = isBoliviaMobilePhone(phoneDigits, selectedTimezoneOption);
  const isPhoneValid = isPhoneLengthValid && isPhoneCountryRuleValid;
  const phoneForApi = buildPhonePayload(phoneDigits, selectedTimezoneOption);
  const phoneHelper = selectedTimezoneOption.timezone === "America/La_Paz"
    ? `En Bolivia el WhatsApp movil debe tener 8 digitos y empezar con 6 o 7. Ingresaste ${phoneDigits.length}.`
    : `${selectedTimezoneOption.flag} ${selectedTimezoneOption.country}: ${formatDigitsRule(selectedTimezoneOption)} · ingresaste ${phoneDigits.length}.`;
  const onboardingValidation = useMemo(() => normalizeOnboardingPayload(onboardingForm), [onboardingForm]);
  const onboardingErrors = useMemo(
    () => ({
      ...onboardingValidation.errors,
      ...onboardingBackendErrors
    }),
    [onboardingBackendErrors, onboardingValidation.errors]
  );
  const onboardingIsValid = useMemo(
    () => Object.keys(onboardingValidation.errors).length === 0,
    [onboardingValidation.errors]
  );

  const minSelectableDateKey = useMemo(() => nextBusinessDateKey(selectedTimezone), [selectedTimezone]);
  const maxSelectableDateKey = useMemo(() => addDaysToDateKey(minSelectableDateKey, CALENDAR_SPAN_DAYS), [minSelectableDateKey]);

  const visibleDateKeys = useMemo(
    () => buildBusinessDateRange(stripStartDateKey, BUSINESS_DAYS_TO_SHOW),
    [stripStartDateKey]
  );

  const calendarDays = useMemo(
    () => buildCalendarGrid(calendarMonthKey, minSelectableDateKey, maxSelectableDateKey),
    [calendarMonthKey, minSelectableDateKey, maxSelectableDateKey]
  );
  const monthBusinessDays = useMemo(
    () => calendarDays.filter((day) => !day.disabled),
    [calendarDays]
  );

  const filteredTimezoneOptions = useMemo(() => {
    const query = String(timezoneSearch || "").trim().toLowerCase();
    if (!query) {
      return COUNTRY_TIMEZONE_OPTIONS;
    }

    return COUNTRY_TIMEZONE_OPTIONS.filter((option) => {
      const searchable = `${option.country} ${option.timezone} ${option.region}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [timezoneSearch]);

  const groupedTimezoneOptions = useMemo(() => {
    const groups = new Map();
    for (const option of filteredTimezoneOptions) {
      const group = groups.get(option.region) || [];
      group.push(option);
      groups.set(option.region, group);
    }
    return Array.from(groups.entries());
  }, [filteredTimezoneOptions]);

  const slotGroups = useMemo(
    () => filterAndGroupSlots(availabilityState.data?.slots || [], selectedTimezone),
    [availabilityState.data, selectedTimezone]
  );

  const supportGuideHref = useMemo(
    () => buildWhatsappHref(config.supportWhatsapp, "Hola, quisiera orientacion para elegir una terapia en Luna Mandala."),
    [config.supportWhatsapp]
  );
  const supportManageHref = useMemo(
    () => buildWhatsappHref(config.supportWhatsapp, "Hola, necesito ayuda para gestionar mi cita."),
    [config.supportWhatsapp]
  );
  const hasActiveHold = Boolean(holdState) && confirmState.status !== "success";
  const lockByHold = hasActiveHold;
  const isRescheduleFlow = decision === "reschedule";
  const isBookAnotherFlow = decision === "book_another";
  const lockByServiceSelection = isBookAnotherFlow && !selectedServiceId;
  const needsOnboardingForConfirmation = hasActiveHold && requiresOnboarding && !isRescheduleFlow;
  const canConfirm = Boolean(holdState?.holdToken)
    && confirmState.status !== "loading"
    && (!needsOnboardingForConfirmation || onboardingIsValid);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (confirmState.status !== "success") {
      return;
    }

    const confirmationNode = confirmationSectionRef.current;
    if (confirmationNode && typeof confirmationNode.scrollIntoView === "function") {
      confirmationNode.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [confirmState.status]);

  useEffect(() => {
    setPhoneInput((current) => {
      const trimmed = normalizePhone(current).slice(0, selectedTimezoneOption.digitsMax);
      return trimmed === current ? current : trimmed;
    });
  }, [selectedTimezoneOption.digitsMax]);

  useEffect(() => {
    async function loadCatalog() {
      setCatalogState({
        status: "loading",
        data: null,
        error: null
      });

      try {
        const response = await requestJson(
          `${config.apiBaseUrl}/public/booking/catalog?tenantSlug=${encodeURIComponent(config.tenantSlug)}`
        );

        setCatalogState({
          status: "success",
          data: response,
          error: null
        });

        const reservableServices = (response.services || []).filter((service) => service.reservable);
        setSelectedServiceId((current) => {
          if (current && reservableServices.some((service) => service.id === current)) {
            return current;
          }
          return reservableServices[0]?.id || "";
        });

        if (!timezonePinnedByUser) {
          const centerTimezone = response?.center?.timezone;
          const centerTimezoneIsSupported = COUNTRY_TIMEZONE_OPTIONS.some(
            (option) => option.timezone === centerTimezone
          );
          const timezoneToUse = centerTimezoneIsSupported ? centerTimezone : DEFAULT_TIMEZONE;
          const startKey = nextBusinessDateKey(timezoneToUse);

          setSelectedTimezone(timezoneToUse);
          setStripStartDateKey(startKey);
          setSelectedDateKey(startKey);
          setCalendarMonthKey(startKey.slice(0, 7));
        }
      } catch (error) {
        const mapped = normalizeRequestError(error);
        setCatalogState({
          status: "error",
          data: null,
          error: mapped
        });
      }
    }

    loadCatalog();
  }, [config.apiBaseUrl, config.tenantSlug]);

  useEffect(() => {
    if (!selectedServiceId || !selectedTherapistId) {
      return;
    }

    const stillCompatible = compatibleTherapists.some((therapist) => therapist.id === selectedTherapistId);
    if (!stillCompatible) {
      setSelectedTherapistId("");
    }
  }, [compatibleTherapists, selectedServiceId, selectedTherapistId]);

  useEffect(() => {
    if (!holdState?.holdExpiresAt) {
      setHoldSecondsLeft(0);
      return undefined;
    }

    const update = () => {
      const expiresAt = new Date(holdState.holdExpiresAt).getTime();
      const seconds = Math.ceil((expiresAt - Date.now()) / 1000);
      setHoldSecondsLeft(Math.max(0, seconds));
    };

    update();
    const timer = window.setInterval(update, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [holdState]);

  useEffect(() => {
    if (!holdState || confirmState.status === "success") {
      return;
    }

    const expiresAt = new Date(holdState.holdExpiresAt).getTime();
    if (Number.isNaN(expiresAt) || expiresAt > Date.now()) {
      return;
    }

    setHoldState(null);
    setIdempotencyKey("");
    setConfirmState({
      status: "error",
      data: null,
      error: {
        status: 410,
        code: "HOLD_EXPIRED",
        message: "El hold expiro. Elige otro horario y crea un nuevo hold."
      }
    });
  }, [confirmState.status, holdSecondsLeft, holdState]);

  useEffect(() => {
    if (!selectedDateKey) {
      return;
    }

    setCalendarMonthKey((current) => {
      const selectedMonthKey = selectedDateKey.slice(0, 7);
      return current || selectedMonthKey;
    });
  }, [selectedDateKey]);

  useEffect(() => {
    const selectedIsBusiness = isBusinessDateKey(selectedDateKey);
    const selectedInRange = selectedDateKey >= minSelectableDateKey && selectedDateKey <= maxSelectableDateKey;

    if (selectedIsBusiness && selectedInRange) {
      return;
    }

    setSelectedDateKey(minSelectableDateKey);
    setStripStartDateKey(minSelectableDateKey);
    setCalendarMonthKey(minSelectableDateKey.slice(0, 7));
  }, [maxSelectableDateKey, minSelectableDateKey, selectedDateKey]);

  useEffect(() => {
    if (!showCalendar || !decision || hasActiveHold) {
      return undefined;
    }

    if (identifyState.status !== "success" || !selectedServiceId || !isPhoneValid) {
      return undefined;
    }

    const datesToVerify = monthBusinessDays
      .map((day) => day.dateKey)
      .filter((dateKey) => !calendarDateStatus[dateKey]);

    if (datesToVerify.length === 0) {
      return undefined;
    }

    let cancelled = false;

    async function probeMonthDates() {
      for (const dateKey of datesToVerify) {
        if (cancelled) {
          return;
        }

        setCalendarDateStatus((current) => {
          if (current[dateKey]) {
            return current;
          }

          return {
            ...current,
            [dateKey]: "checking"
          };
        });

        try {
          const response = await fetchAvailabilityForDate(dateKey);
          const hasSlots = Array.isArray(response?.slots) && response.slots.length > 0;

          if (cancelled) {
            return;
          }

          setCalendarDateStatus((current) => ({
            ...current,
            [dateKey]: hasSlots ? "available" : "empty"
          }));
        } catch {
          if (cancelled) {
            return;
          }

          setCalendarDateStatus((current) => ({
            ...current,
            [dateKey]: "error"
          }));
        }
      }
    }

    probeMonthDates();

    return () => {
      cancelled = true;
    };
  }, [
    decision,
    hasActiveHold,
    identifyState.status,
    isPhoneValid,
    monthBusinessDays,
    selectedServiceId,
    showCalendar
  ]);

  useEffect(() => {
    if (confirmState.status === "success") {
      return;
    }

    if (identifyState.status !== "success") {
      return;
    }

    if (nextAppointment || decision || hasActiveHold) {
      return;
    }

    if (!selectedServiceId || !isPhoneValid) {
      return;
    }

    setDecision("book_now");
    void loadAvailability(selectedDateKey, true);
  }, [
    confirmState.status,
    decision,
    hasActiveHold,
    identifyState.status,
    isPhoneValid,
    nextAppointment,
    selectedDateKey,
    selectedServiceId
  ]);

  useEffect(() => {
    if (confirmState.status === "success") {
      return;
    }

    if (decision !== "book_another") {
      return;
    }

    if (identifyState.status !== "success" || !isPhoneValid || !selectedServiceId || hasActiveHold) {
      return;
    }

    void loadAvailability(selectedDateKey, true);
  }, [
    confirmState.status,
    decision,
    hasActiveHold,
    identifyState.status,
    isPhoneValid,
    selectedDateKey,
    selectedServiceId
  ]);

  function resetFromIdentifyDownstream({ keepDecision = false } = {}) {
    if (!keepDecision) {
      setDecision("");
    }
    setAvailabilityState({
      status: "idle",
      data: null,
      error: null
    });
    setCalendarDateStatus({});
    setHoldState(null);
    setHoldSecondsLeft(0);
    setHoldingSlotStartsAt("");
    setIdempotencyKey("");
    setRequiresOnboarding(false);
    setOnboardingForm(EMPTY_ONBOARDING_FORM);
    setOnboardingTouched({});
    setOnboardingBackendErrors({});
    setOnboardingHint("");
    setConfirmedClientName("");
    setConfirmState({
      status: "idle",
      data: null,
      error: null
    });
    setShowCalendar(false);
  }

  async function handleIdentify(event) {
    event.preventDefault();

    if (hasActiveHold) {
      return;
    }

    if (!selectedServiceId) {
      setIdentifyState({
        status: "error",
        data: null,
        error: {
          status: 422,
          code: "SERVICE_REQUIRED",
          message: "Selecciona un servicio antes de continuar."
        }
      });
      return;
    }

    if (!isPhoneValid) {
      setIdentifyState({
        status: "error",
        data: null,
        error: {
          status: 422,
          code: "PHONE_INVALID",
          message: selectedTimezoneOption.timezone === "America/La_Paz"
            ? "En Bolivia el WhatsApp movil debe tener 8 digitos y empezar con 6 o 7."
            : `WhatsApp invalido para ${selectedTimezoneOption.country}. Usa ${formatDigitsRule(selectedTimezoneOption)}.`
        }
      });
      return;
    }

    setIdentifyState({
      status: "loading",
      data: null,
      error: null
    });
    resetFromIdentifyDownstream();

    try {
      const response = await requestJson(`${config.apiBaseUrl}/public/booking/identify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tenantSlug: config.tenantSlug,
          phoneE164: phoneForApi
        })
      });

      setIdentifyState({
        status: "success",
        data: response,
        error: null
      });
      const requiresForNewClient = response?.status === "new";
      const requiresForExistingClient = response?.status === "existing" && response?.client?.onboardingComplete !== true;
      setRequiresOnboarding(requiresForNewClient || requiresForExistingClient);
      setOnboardingForm(EMPTY_ONBOARDING_FORM);
      setOnboardingTouched({});
      setOnboardingBackendErrors({});
      setOnboardingHint("");
      setConfirmedClientName("");
    } catch (error) {
      const mapped = normalizeRequestError(error);
      setIdentifyState({
        status: "error",
        data: null,
        error: mapped
      });
    }
  }

  async function fetchAvailabilityForDate(dateKey = selectedDateKey, overrides = {}) {
    const effectiveServiceId = overrides.serviceId || selectedServiceId;
    const effectiveTherapistId = overrides.therapistId || selectedTherapistId;

    return requestJson(`${config.apiBaseUrl}/public/booking/availability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tenantSlug: config.tenantSlug,
        phoneE164: phoneForApi,
        serviceId: effectiveServiceId,
        therapistId: effectiveTherapistId || undefined,
        date: dateKey || undefined,
        timezone: selectedTimezone
      })
    });
  }

  async function loadAvailability(
    dateKey = selectedDateKey,
    skipDecisionCheck = false,
    preserveConfirmState = false,
    overrides = {}
  ) {
    const phoneValid = isPhoneValid;
    const identifyReady = identifyState.status === "success";
    const decisionReady = skipDecisionCheck || Boolean(decision);
    const effectiveServiceId = overrides.serviceId || selectedServiceId;

    if (!identifyReady || !phoneValid || !decisionReady || !effectiveServiceId || hasActiveHold) {
      return;
    }

    setAvailabilityState({
      status: "loading",
      data: null,
      error: null
    });
    setHoldingSlotStartsAt("");
    setIdempotencyKey("");
    if (!preserveConfirmState) {
      setConfirmState({
        status: "idle",
        data: null,
        error: null
      });
    }

    try {
      const response = await fetchAvailabilityForDate(dateKey, overrides);
      const hasSlots = Array.isArray(response?.slots) && response.slots.length > 0;
      setCalendarDateStatus((current) => ({
        ...current,
        [dateKey]: hasSlots ? "available" : "empty"
      }));

      setAvailabilityState({
        status: "success",
        data: response,
        error: null
      });
    } catch (error) {
      const mapped = normalizeRequestError(error);
      setCalendarDateStatus((current) => ({
        ...current,
        [dateKey]: "error"
      }));
      setAvailabilityState({
        status: "error",
        data: null,
        error: mapped
      });
    }
  }

  function handleDecisionReserveAnother() {
    resetFromIdentifyDownstream({ keepDecision: true });
    setSelectedServiceId("");
    setSelectedTherapistId("");
    setDecision("book_another");
  }

  async function handleDecisionReschedule() {
    if (!nextAppointment?.id || !nextAppointment?.managementToken || !nextAppointment?.serviceId || !nextAppointment?.therapistId) {
      setAvailabilityState({
        status: "error",
        data: null,
        error: {
          status: 409,
          code: "RESCHEDULE_CONTEXT_MISSING",
          message: "No tenemos datos suficientes para reagendar esta cita."
        }
      });
      return;
    }

    resetFromIdentifyDownstream({ keepDecision: true });
    setDecision("reschedule");
    setSelectedServiceId(nextAppointment.serviceId);
    setSelectedTherapistId(nextAppointment.therapistId);
    await loadAvailability(
      selectedDateKey,
      true,
      false,
      {
        serviceId: nextAppointment.serviceId,
        therapistId: nextAppointment.therapistId
      }
    );
  }

  async function handleCreateHold(slot) {
    if (!slot?.startsAt || holdState) {
      return;
    }

    setHoldingSlotStartsAt(slot.startsAt);
    setOnboardingBackendErrors({});
    setOnboardingHint("");
    setConfirmState({
      status: "idle",
      data: null,
      error: null
    });

    try {
      const isReschedule = decision === "reschedule" && nextAppointment;
      const response = await requestJson(
        `${config.apiBaseUrl}/public/booking/${isReschedule ? "reschedule/hold" : "hold"}`,
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tenantSlug: config.tenantSlug,
          phoneE164: phoneForApi,
          ...(isReschedule
            ? {
                appointmentId: nextAppointment.id,
                managementToken: nextAppointment.managementToken,
                startsAt: slot.startsAt,
                roomId: slot.roomId
              }
            : {
                serviceId: selectedServiceId,
                startsAt: slot.startsAt,
                therapistId: slot.therapistId,
                roomId: slot.roomId
              })
        })
      });

      setHoldState(response);
      setIdempotencyKey(createIdempotencyKey());
    } catch (error) {
      const mapped = normalizeRequestError(error);
      setConfirmState({
        status: "error",
        data: null,
        error: mapped
      });

      if (mapped.code === "SLOT_NOT_AVAILABLE" || mapped.status === 409) {
        await loadAvailability(selectedDateKey, false, true);
      }
    } finally {
      setHoldingSlotStartsAt("");
    }
  }

  async function handleConfirm() {
    if (!holdState?.holdToken) {
      return;
    }

    setOnboardingBackendErrors({});
    setOnboardingHint("");

    if (needsOnboardingForConfirmation && !onboardingIsValid) {
      const touchedFields = {};
      for (const field of ONBOARDING_FIELDS) {
        touchedFields[field] = true;
      }
      setOnboardingTouched(touchedFields);
      setConfirmState({
        status: "error",
        data: null,
        error: {
          status: 422,
          code: "ONBOARDING_REQUIRED",
          message: "Completa tus datos antes de confirmar la cita.",
          details: {}
        }
      });
      return;
    }

    const requestKey = idempotencyKey || createIdempotencyKey();
    if (!idempotencyKey) {
      setIdempotencyKey(requestKey);
    }

    const requestPayload = {
      tenantSlug: config.tenantSlug,
      phoneE164: phoneForApi,
      holdToken: holdState.holdToken
    };
    const onboardingPayload = needsOnboardingForConfirmation ? onboardingValidation.normalized : null;
    if (onboardingPayload) {
      requestPayload.client = onboardingPayload;
    }

    setConfirmState({
      status: "loading",
      data: null,
      error: null
    });

    try {
      const isReschedule = decision === "reschedule" && nextAppointment;
      const response = await requestJson(`${config.apiBaseUrl}/public/booking/${isReschedule ? "reschedule/confirm" : "confirm"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey
        },
        body: JSON.stringify(
          isReschedule
            ? {
                tenantSlug: config.tenantSlug,
                phoneE164: phoneForApi,
                appointmentId: nextAppointment.id,
                managementToken: nextAppointment.managementToken,
                holdToken: holdState.holdToken
              }
            : requestPayload
        )
      });

      setConfirmState({
        status: "success",
        data: response,
        error: null
      });

      setConfirmedClientName(
        onboardingPayload
          ? `${onboardingPayload.firstName} ${onboardingPayload.lastName}`.trim()
          : (identifyState.data?.client?.fullName || "")
      );
      setHoldState(null);
      setHoldingSlotStartsAt("");
      setIdempotencyKey("");
      setRequiresOnboarding(false);
      setOnboardingTouched({});
      setOnboardingHint("");
    } catch (error) {
      const mapped = normalizeRequestError(error);
      setConfirmState({
        status: "error",
        data: null,
        error: mapped
      });

      if (mapped.code === "ONBOARDING_REQUIRED" || mapped.code === "ONBOARDING_INVALID_AGE" || mapped.status === 422) {
        setRequiresOnboarding(true);
      }

      if (mapped.code === "ONBOARDING_REQUIRED") {
        setOnboardingHint(mapped.message || "Completa tus datos antes de confirmar.");
        const requiredFields = Array.isArray(mapped.details?.requiredFields)
          ? mapped.details.requiredFields
          : ONBOARDING_FIELDS;

        setOnboardingTouched((current) => {
          const next = { ...current };
          for (const field of requiredFields) {
            if (ONBOARDING_FIELDS.includes(field)) {
              next[field] = true;
            }
          }
          return next;
        });
      }

      if (mapped.code === "ONBOARDING_INVALID_AGE") {
        setOnboardingBackendErrors((current) => ({
          ...current,
          age: mapped.message || "La edad debe estar entre 18 y 75."
        }));
        setOnboardingTouched((current) => ({
          ...current,
          age: true
        }));
      } else if (mapped.status === 422 && ONBOARDING_FIELDS.includes(mapped.details?.field)) {
        const field = mapped.details.field;
        setOnboardingBackendErrors((current) => ({
          ...current,
          [field]: mapped.message || "Revisa este dato."
        }));
        setOnboardingTouched((current) => ({
          ...current,
          [field]: true
        }));
      }

      if (mapped.code === "HOLD_EXPIRED" || mapped.status === 410) {
        setHoldState(null);
        setIdempotencyKey("");
        setOnboardingTouched({});
        setOnboardingHint("");
      }

      if (mapped.code === "SLOT_NOT_AVAILABLE" || mapped.status === 409) {
        setHoldState(null);
        setIdempotencyKey("");
        setOnboardingTouched({});
        setOnboardingHint("");
        await loadAvailability(selectedDateKey, false, true);
      }
    }
  }

  function handleOnboardingFieldChange(field, value) {
    setOnboardingForm((current) => ({
      ...current,
      [field]: value
    }));
    setOnboardingBackendErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    if (onboardingHint) {
      setOnboardingHint("");
    }
  }

  function handleBookAnother() {
    setIdentifyState({
      status: "idle",
      data: null,
      error: null
    });
    setPhoneInput("");
    setConfirmState({
      status: "idle",
      data: null,
      error: null
    });
    setConfirmedClientName("");
    resetFromIdentifyDownstream();
  }

  function formatAppointmentSummary(appointment) {
    if (!appointment) {
      return "--";
    }

    const service = appointment.serviceName || "Servicio";
    const therapist = appointment.therapistName || "Terapeuta";
    const startsAtDate = new Date(appointment.startsAt);
    const dateText = Number.isNaN(startsAtDate.getTime())
      ? "--"
      : startsAtDate.toLocaleString("es-BO", {
          timeZone: selectedTimezone,
          weekday: "long",
          day: "2-digit",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });
    return `${service} - ${dateText} con ${therapist}`;
  }

  function handleTimezoneSelect(option) {
    if (lockByHold) {
      return;
    }

    setSelectedTimezone(option.timezone);
    setTimezonePinnedByUser(true);
    setTimezonePickerOpen(false);
    setTimezoneSearch("");

    const nextBusinessDay = nextBusinessDateKey(option.timezone);
    if (selectedDateKey < nextBusinessDay) {
      setSelectedDateKey(nextBusinessDay);
      setStripStartDateKey(nextBusinessDay);
      setCalendarMonthKey(nextBusinessDay.slice(0, 7));
    }

    resetFromIdentifyDownstream();
  }

  async function selectDate(dateKey) {
    if (lockByHold) {
      return;
    }

    setSelectedDateKey(dateKey);
    setStripStartDateKey(dateKey);
    setCalendarMonthKey(dateKey.slice(0, 7));

    if (decision) {
      await loadAvailability(dateKey);
    }
  }

  const activeHoldStartsAt = holdState?.startsAt || "";
  const holdServiceName = holdState
    ? (services.find((service) => service.id === String(holdState.serviceId))?.name || selectedService?.name || "Servicio")
    : "";
  const holdTimezoneShort = holdState ? formatTimezoneShort(holdState.startsAt, selectedTimezone) : selectedTimezone;
  const confirmationStatus = confirmState.data?.status || "";
  const isRescheduleConfirmation = confirmationStatus === "rescheduled";
  const confirmedAppointment = confirmState.data?.appointment || {};
  const previousAppointmentAfterReschedule = confirmState.data?.previousAppointment || null;
  const confirmationMissingFields = [];

  if (confirmState.status === "success") {
    if (!confirmedAppointment.startsAt) confirmationMissingFields.push("fecha/hora");
    if (!confirmedAppointment.serviceName) confirmationMissingFields.push("servicio");
    if (!confirmedAppointment.therapistName) confirmationMissingFields.push("terapeuta");
  }

  return (
    <main className="booking-app">
      <section className="hero">
        <header className="booking-header">
          <div className="brand-mark" aria-hidden="true">
            <Sparkle size={24} weight="fill" />
          </div>
          <div>
            <p className="eyebrow">Reserva publica</p>
            <h1>Luna Mandala</h1>
            <p className="tenant">tenant: {config.tenantSlug}</p>
          </div>
        </header>

        <div className="support-row">
          <a className="btn btn-ghost" href={supportGuideHref} target="_blank" rel="noreferrer">
            <WhatsappLogo size={18} weight="regular" aria-hidden="true" />
            Buscar guia
          </a>
          <a className="btn btn-ghost" href={supportManageHref} target="_blank" rel="noreferrer">
            <WhatsappLogo size={18} weight="regular" aria-hidden="true" />
            Hablar con alguien
          </a>
        </div>
      </section>

      <section className="surface" aria-labelledby="booking-flow-title">
        <h2 id="booking-flow-title">Reserva tu sesion</h2>
        <p className="supporting">Primero elige servicio y valida tu WhatsApp. Los horarios aparecen recien despues de identificarte.</p>

        {catalogState.status === "loading" ? (
          <p className="inline-state" role="status">
            <CircleNotch size={18} className="spin" aria-hidden="true" />
            Cargando catalogo...
          </p>
        ) : null}

        {catalogState.status === "error" ? (
          <div className="feedback feedback-error" role="alert">
            <p>{catalogState.error?.message || "No pudimos cargar el catalogo."}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setCatalogState({
                  status: "loading",
                  data: null,
                  error: null
                });
                window.location.reload();
              }}
            >
              Reintentar carga
            </button>
          </div>
        ) : null}

        {catalogState.status === "success" ? (
          <form className="step-stack" onSubmit={handleIdentify}>
            <div className="step">
              <p className="step-label">1. Servicio</p>
              <ul className="service-list" aria-label="Servicios disponibles">
                {services.map((service) => {
                  const isSelected = service.id === selectedServiceId;
                  const isDisabled = !service.reservable;

                  return (
                    <li key={service.id}>
                      <button
                        type="button"
                        className={`service-item${isSelected ? " is-selected" : ""}`}
                        disabled={isDisabled || lockByHold || isRescheduleFlow}
                        onClick={() => {
                          if (lockByHold || isRescheduleFlow) {
                            return;
                          }
                          const keepDecision = decision === "book_another";
                          setSelectedServiceId(service.id);
                          setSelectedTherapistId("");
                          resetFromIdentifyDownstream({ keepDecision });
                        }}
                      >
                        <span className="service-main">
                          <span className="service-name">
                            <CheckCircle size={15} weight={isSelected ? "fill" : "regular"} aria-hidden="true" />
                            {service.name}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="step">
              <p className="step-label">2. Terapeuta (opcional)</p>
              <label className="field">
                <span>Elegir terapeuta</span>
                <select
                  value={selectedTherapistId}
                  onChange={(event) => {
                    if (lockByHold || isRescheduleFlow) {
                      return;
                    }
                    setSelectedTherapistId(event.target.value);
                    resetFromIdentifyDownstream();
                  }}
                  disabled={!selectedServiceId || compatibleTherapists.length === 0 || lockByHold || isRescheduleFlow}
                >
                  <option value="">{isRescheduleFlow ? "Fijo por reagendamiento" : "Recomendado automaticamente"}</option>
                  {compatibleTherapists.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <p className="therapist-helper">
                {isRescheduleFlow
                  ? `Reagendando con ${nextAppointment?.therapistName || selectedTherapist?.displayName || "tu terapeuta original"}.`
                  : (selectedTherapist
                    ? `Seleccionaste a ${selectedTherapist.displayName}.`
                    : "Terapeuta sugerido automaticamente.")}
              </p>
            </div>

            <div className="step">
              <p className="step-label">3. WhatsApp</p>
              <label className="field">
                <span>Numero WhatsApp ({selectedTimezoneOption.dialCode})</span>
                <input
                  className="phone-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phoneInput}
                  onChange={(event) => {
                    if (lockByHold) {
                      return;
                    }
                    const trimmed = normalizePhone(event.target.value).slice(0, selectedTimezoneOption.digitsMax);
                    setPhoneInput(trimmed);
                    setIdentifyState((current) =>
                      current.status === "idle" ? current : { status: "idle", data: null, error: null }
                    );
                    resetFromIdentifyDownstream();
                  }}
                  disabled={lockByHold}
                  maxLength={selectedTimezoneOption.digitsMax}
                  placeholder={selectedTimezoneOption.example}
                />
              </label>
              <p className={`phone-helper${!isPhoneValid && phoneDigits.length > 0 ? " is-invalid" : ""}`}>
                {phoneHelper}
              </p>
            </div>

            <div className="step">
              <p className="step-label">4. Pais y zona horaria</p>
              <div className="timezone-picker">
                <button
                  type="button"
                  className="timezone-trigger"
                  disabled={lockByHold}
                  onClick={() => setTimezonePickerOpen((current) => !current)}
                >
                  <span className="timezone-trigger-main">
                    <span className="timezone-flag">{selectedTimezoneOption.flag}</span>
                    <span className="timezone-copy">
                      <strong>{selectedTimezoneOption.country}</strong>
                      <span>{selectedTimezoneOption.timezone}</span>
                    </span>
                  </span>
                  <span className="timezone-trigger-side">
                    <span>{formatTimezoneLocalClock(selectedTimezoneOption.timezone)}</span>
                    <CaretDown size={16} aria-hidden="true" />
                  </span>
                </button>

                {timezonePickerOpen ? (
                  <div className="timezone-panel">
                    <label className="timezone-search">
                      <MagnifyingGlass size={16} aria-hidden="true" />
                      <input
                        type="search"
                        value={timezoneSearch}
                        onChange={(event) => setTimezoneSearch(event.target.value)}
                        placeholder="Buscar pais o zona horaria"
                        disabled={lockByHold}
                      />
                    </label>

                    <div className="timezone-list">
                      {groupedTimezoneOptions.length === 0 ? (
                        <p className="timezone-empty">Sin resultados para la busqueda actual.</p>
                      ) : null}

                      {groupedTimezoneOptions.map(([region, options]) => (
                        <div key={region} className="timezone-group">
                          <p className="timezone-group-title">{region}</p>
                          <ul className="timezone-option-list">
                            {options.map((option) => {
                              const isActive = option.timezone === selectedTimezone;
                              return (
                                <li key={option.timezone}>
                                  <button
                                    type="button"
                                    className={`timezone-option${isActive ? " is-active" : ""}`}
                                    onClick={() => handleTimezoneSelect(option)}
                                    disabled={lockByHold}
                                  >
                                    <span className="timezone-option-main">
                                      <span className="timezone-flag">{option.flag}</span>
                                      <span className="timezone-copy">
                                        <strong>{option.country}</strong>
                                        <span>{option.timezone}</span>
                                      </span>
                                    </span>
                                    <span className="timezone-option-side">
                                      {formatTimezoneLocalClock(option.timezone)}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="timezone-help">Los horarios y recordatorios se mostraran en esta zona horaria.</p>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={identifyState.status === "loading" || lockByHold || !selectedServiceId || !isPhoneValid}
              >
                {identifyState.status === "loading" ? (
                  <>
                    <CircleNotch size={18} className="spin" aria-hidden="true" />
                    Identificando...
                  </>
                ) : (
                  "Continuar"
                )}
              </button>
            </div>
          </form>
        ) : null}

        {identifyState.status === "error" ? (
          <p className="feedback feedback-error" role="alert">
            {identifyState.error?.message || "No pudimos identificar tu WhatsApp."}
          </p>
        ) : null}

        {identifyState.status === "success" && nextAppointment ? (
          <div className="identify-state identify-state-existing">
            <div className="feedback feedback-warning" role="status">
              <strong>{clientFirstName ? `${clientFirstName}, ya tienes una cita` : "Ya tienes una cita"}</strong>
              <span>{formatAppointmentSummary(nextAppointment)}</span>
              <span className="identify-existing-question">¿Que necesitas cambiar?</span>
            </div>
            <div className="actions">
              <button
                type="button"
                className={`btn ${isRescheduleFlow ? "btn-primary" : "btn-ghost"}`}
                onClick={handleDecisionReschedule}
                disabled={hasActiveHold}
              >
                Reagendar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDecisionReserveAnother}
                disabled={hasActiveHold}
              >
                Reservar otra terapia
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {decision ? (
        <section className="surface" aria-labelledby="availability-title">
          <h2 id="availability-title">Horarios disponibles</h2>

          <div className="availability-head">
            <div className="availability-timezone">
              <span>{selectedTimezoneOption.flag}</span>
              <span>{selectedTimezoneOption.country}</span>
              <small>{selectedTimezoneOption.timezone}</small>
            </div>
          </div>

          {isBookAnotherFlow && !selectedServiceId ? (
            <p className="feedback feedback-info">Elige la terapia que quieres reservar para mostrar horarios.</p>
          ) : null}

          <div className="date-strip" role="tablist" aria-label="Fechas disponibles">
            {visibleDateKeys.map((dateKey) => {
              const chip = formatDateChip(dateKey, selectedTimezone);
              return (
                <button
                  key={dateKey}
                  type="button"
                  className={`date-chip${selectedDateKey === dateKey ? " is-selected" : ""}`}
                  disabled={lockByHold || lockByServiceSelection}
                  onClick={() => selectDate(dateKey)}
                >
                  <span className="date-chip-weekday">{chip.dayLabel}</span>
                  <strong>{chip.dateLabel}</strong>
                </button>
              );
            })}
            <button
              type="button"
              className={`date-chip date-chip-calendar${showCalendar ? " is-open" : ""}`}
              onClick={() => setShowCalendar((current) => !current)}
              disabled={lockByHold || lockByServiceSelection}
              aria-expanded={showCalendar}
              aria-controls="booking-calendar-panel"
            >
              <span className="date-chip-calendar-top">
                <CalendarCheck size={18} weight="regular" aria-hidden="true" />
                Ver mas
              </span>
              <span className="date-chip-calendar-icon" aria-hidden="true">
                <CalendarCheck size={22} weight={showCalendar ? "fill" : "regular"} />
              </span>
            </button>
          </div>

          {showCalendar ? (
            <div className="calendar-wrap" id="booking-calendar-panel">
              <div className="calendar-head">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setCalendarMonthKey((current) => shiftMonthKey(current, -1))}
                  disabled={lockByHold || lockByServiceSelection}
                >
                  <CaretLeft size={18} aria-hidden="true" />
                </button>
                <p>{formatMonthLabel(calendarMonthKey, selectedTimezone)}</p>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setCalendarMonthKey((current) => shiftMonthKey(current, 1))}
                  disabled={lockByHold || lockByServiceSelection}
                >
                  <CaretRight size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="calendar-grid">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label} className="calendar-weekday">
                    {label}
                  </span>
                ))}

                {calendarDays.map((day) => {
                  if (day.isPlaceholder) {
                    return <span key={day.dateKey} className="calendar-day calendar-day-placeholder" aria-hidden="true" />;
                  }

                  const availabilityStatus = calendarDateStatus[day.dateKey] || "unknown";
                  const canSelect = availabilityStatus === "available";
                  const isDisabled = day.disabled || lockByHold || lockByServiceSelection || !canSelect;

                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      className={`calendar-day${selectedDateKey === day.dateKey ? " is-selected" : ""}${day.inCurrentMonth ? "" : " is-outside"} is-${availabilityStatus}`}
                      disabled={isDisabled}
                      onClick={() => {
                        setShowCalendar(false);
                        selectDate(day.dateKey);
                      }}
                    >
                      {day.dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {hasActiveHold ? (
            <p className="hold-lock-note">
              Horario reservado temporalmente. Confirma la cita antes de que expire.
            </p>
          ) : null}

          {holdState ? (
            <div className="hold-panel" role="status">
              <div className="hold-top">
                <p className="hold-kicker">Horario reservado</p>
                <span className="hold-countdown">
                  <ClockCountdown size={16} aria-hidden="true" />
                  Expira en {toMinutesAndSeconds(holdSecondsLeft)}
                </span>
              </div>
              <p className="hold-time">
                {formatTime(holdState.startsAt, selectedTimezone)}
                <span>{holdTimezoneShort}</span>
              </p>
              <p className="hold-date">{formatDateTime(holdState.startsAt, selectedTimezone)}</p>
              <ul className="hold-summary" aria-label="Resumen del hold">
                <li>
                  <strong>Servicio</strong>
                  <span>{holdServiceName}</span>
                </li>
                <li>
                  <strong>Terapeuta asignado</strong>
                  <span>{holdState.therapistName || "Por asignar"}</span>
                </li>
                <li>
                  <strong>Zona horaria</strong>
                  <span>
                    {selectedTimezoneOption.flag} {selectedTimezoneOption.country} ({selectedTimezoneOption.timezone})
                  </span>
                </li>
              </ul>
              <p className="hold-note">
                Servicio, terapeuta, telefono, fecha y zona horaria quedan bloqueados para proteger este horario.
              </p>

              {isBookAnotherFlow && nextAppointment ? (
                <div className="dual-appointment-note" role="status">
                  <strong>{clientFirstName || "Tendras"}{clientFirstName ? ", tendras entonces 2 citas:" : " entonces 2 citas:"}</strong>
                  <ol>
                    <li>{formatAppointmentSummary(nextAppointment)}</li>
                    <li>
                      {`${holdServiceName} - ${formatDateTime(holdState.startsAt, selectedTimezone)} con ${holdState.therapistName || "Por asignar"}`}
                    </li>
                  </ol>
                </div>
              ) : null}

              {needsOnboardingForConfirmation ? (
                <div className="onboarding-panel">
                  <p className="onboarding-title">Completa tus datos para confirmar</p>
                  <p className="onboarding-copy">
                    Estos datos nos ayudan a preparar tu atencion y confirmar tu reserva.
                  </p>
                  {onboardingHint ? <p className="onboarding-banner">{onboardingHint}</p> : null}
                  <div className="onboarding-grid">
                    <label className="field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        autoComplete="given-name"
                        value={onboardingForm.firstName}
                        onBlur={() => setOnboardingTouched((current) => ({ ...current, firstName: true }))}
                        onChange={(event) => handleOnboardingFieldChange("firstName", event.target.value)}
                        disabled={confirmState.status === "loading"}
                      />
                      {onboardingTouched.firstName && onboardingErrors.firstName ? (
                        <small className="field-error">{onboardingErrors.firstName}</small>
                      ) : null}
                    </label>

                    <label className="field">
                      <span>Apellido</span>
                      <input
                        type="text"
                        autoComplete="family-name"
                        value={onboardingForm.lastName}
                        onBlur={() => setOnboardingTouched((current) => ({ ...current, lastName: true }))}
                        onChange={(event) => handleOnboardingFieldChange("lastName", event.target.value)}
                        disabled={confirmState.status === "loading"}
                      />
                      {onboardingTouched.lastName && onboardingErrors.lastName ? (
                        <small className="field-error">{onboardingErrors.lastName}</small>
                      ) : null}
                    </label>

                    <label className="field">
                      <span>Edad</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={2}
                        value={onboardingForm.age}
                        onBlur={() => setOnboardingTouched((current) => ({ ...current, age: true }))}
                        onChange={(event) =>
                          handleOnboardingFieldChange("age", String(event.target.value || "").replace(/\D/g, "").slice(0, 2))
                        }
                        disabled={confirmState.status === "loading"}
                        placeholder="18-75"
                      />
                      {onboardingTouched.age && onboardingErrors.age ? (
                        <small className="field-error">{onboardingErrors.age}</small>
                      ) : null}
                    </label>

                    <label className="field">
                      <span>Ciudad</span>
                      <select
                        value={onboardingForm.city}
                        onBlur={() => setOnboardingTouched((current) => ({ ...current, city: true }))}
                        onChange={(event) => handleOnboardingFieldChange("city", event.target.value)}
                        disabled={confirmState.status === "loading"}
                      >
                        <option value="">Selecciona una ciudad</option>
                        {ONBOARDING_CITY_OPTIONS.map((cityOption) => (
                          <option key={cityOption} value={cityOption}>
                            {cityOption}
                          </option>
                        ))}
                      </select>
                      {onboardingTouched.city && onboardingErrors.city ? (
                        <small className="field-error">{onboardingErrors.city}</small>
                      ) : null}
                    </label>

                    <div className="field">
                      <span>Como nos encontraste</span>
                      <div className="source-options" role="radiogroup" aria-label="Fuente de llegada">
                        {ONBOARDING_SOURCE_OPTIONS.map((sourceOption) => {
                          const isSelected = onboardingForm.source === sourceOption;
                          return (
                            <button
                              key={sourceOption}
                              type="button"
                              className={`source-option${isSelected ? " is-selected" : ""}`}
                              disabled={confirmState.status === "loading"}
                              aria-pressed={isSelected}
                              onClick={() => {
                                handleOnboardingFieldChange("source", sourceOption);
                                setOnboardingTouched((current) => ({ ...current, source: true }));
                              }}
                            >
                              <span className="source-option-radio" aria-hidden="true">
                                <span className="source-option-dot" />
                              </span>
                              <span className="source-option-label">{sourceOption}</span>
                            </button>
                          );
                        })}
                      </div>
                      {onboardingTouched.source && onboardingErrors.source ? (
                        <small className="field-error">{onboardingErrors.source}</small>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={!canConfirm}>
                {confirmState.status === "loading" ? (
                  <>
                    <CircleNotch size={18} className="spin" aria-hidden="true" />
                    Confirmando...
                  </>
                ) : (
                  (isRescheduleFlow ? "Confirmar reagendamiento" : (isBookAnotherFlow ? "Confirmar nueva terapia" : "Confirmar cita"))
                )}
              </button>
            </div>
          ) : null}

          {availabilityState.status === "loading" ? (
            <p className="inline-state" role="status">
              <CircleNotch size={18} className="spin" aria-hidden="true" />
              Buscando horarios disponibles...
            </p>
          ) : null}

          {availabilityState.status === "error" ? (
            <div className="feedback feedback-error" role="alert">
              <p>{availabilityState.error?.message || "No se pudo cargar la disponibilidad."}</p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={hasActiveHold}
                onClick={() => loadAvailability(selectedDateKey)}
              >
                Reintentar horarios
              </button>
            </div>
          ) : null}

          {availabilityState.status === "success" && !hasActiveHold ? (
            <>
              {slotGroups.morning.length === 0 && slotGroups.afternoon.length === 0 ? (
                <p className="feedback feedback-info">No hay horarios para esta fecha. Prueba otra fecha.</p>
              ) : null}

              {slotGroups.morning.length > 0 ? (
                <div className="slot-group">
                  <p className="slot-group-title">
                    <Sun size={16} aria-hidden="true" />
                    Manana
                  </p>
                  <ul className="slot-list">
                    {slotGroups.morning.map((slot) => {
                      const isHoldingCurrent = activeHoldStartsAt && slot.startsAt === activeHoldStartsAt;
                      const isLoadingHold = holdingSlotStartsAt === slot.startsAt;

                      return (
                        <li key={`${slot.startsAt}-${slot.therapistId}-${slot.roomId}`}>
                          <button
                            type="button"
                            className={`slot-item${isHoldingCurrent ? " is-held" : ""}`}
                            disabled={Boolean(holdState) || isLoadingHold}
                            onClick={() => handleCreateHold(slot)}
                          >
                            <span className="slot-main">
                              <strong>{formatTime(slot.startsAt, selectedTimezone)}</strong>
                              <span className="slot-therapist">
                                <User size={16} aria-hidden="true" />
                                <span>{slot.therapistName || "Terapeuta asignado"}</span>
                              </span>
                            </span>
                            {isLoadingHold ? (
                              <span className="slot-state">
                                <CircleNotch size={15} className="spin" aria-hidden="true" />
                                Creando hold...
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {slotGroups.afternoon.length > 0 ? (
                <div className="slot-group">
                  <p className="slot-group-title">
                    <Moon size={16} aria-hidden="true" />
                    Tarde
                  </p>
                  <ul className="slot-list">
                    {slotGroups.afternoon.map((slot) => {
                      const isHoldingCurrent = activeHoldStartsAt && slot.startsAt === activeHoldStartsAt;
                      const isLoadingHold = holdingSlotStartsAt === slot.startsAt;

                      return (
                        <li key={`${slot.startsAt}-${slot.therapistId}-${slot.roomId}`}>
                          <button
                            type="button"
                            className={`slot-item${isHoldingCurrent ? " is-held" : ""}`}
                            disabled={Boolean(holdState) || isLoadingHold}
                            onClick={() => handleCreateHold(slot)}
                          >
                            <span className="slot-main">
                              <strong>{formatTime(slot.startsAt, selectedTimezone)}</strong>
                              <span className="slot-therapist">
                                <User size={16} aria-hidden="true" />
                                <span>{slot.therapistName || "Terapeuta asignado"}</span>
                              </span>
                            </span>
                            {isLoadingHold ? (
                              <span className="slot-state">
                                <CircleNotch size={15} className="spin" aria-hidden="true" />
                                Creando hold...
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          {confirmState.status === "error" ? (
            <div className="feedback feedback-error" role="alert">
              <p>{confirmState.error?.message || "No se pudo confirmar la cita."}</p>
              {(confirmState.error?.code === "SLOT_NOT_AVAILABLE" || confirmState.error?.code === "HOLD_EXPIRED") && (
                <p className="hint-line">
                  <WarningCircle size={16} aria-hidden="true" />
                  Elige un nuevo horario para continuar.
                </p>
              )}
              {(confirmState.error?.code === "ONBOARDING_REQUIRED"
                || confirmState.error?.code === "ONBOARDING_INVALID_AGE") ? (
                <p className="hint-line">
                  <WarningCircle size={16} aria-hidden="true" />
                  Completa onboarding para poder confirmar esta cita.
                </p>
              ) : null}
              {confirmState.error?.code === "NETWORK_ERROR" ? (
                <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={!holdState}>
                  Reintentar confirmacion
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {confirmState.status === "success" ? (
        <section ref={confirmationSectionRef} className="surface surface-success confirmation-surface" aria-live="polite">
          <div className="confirmation-head">
            <h2 className="section-title">
              <CalendarCheck size={20} weight="fill" aria-hidden="true" />
              {isRescheduleConfirmation ? "Tu cita fue reagendada" : "Tu cita esta confirmada"}
            </h2>
            <p className="confirmation-subtitle">
              {isRescheduleConfirmation
                ? "Listo. Actualizamos tu horario y liberamos la cita anterior."
                : "Todo listo. Te esperamos en el horario reservado."}
            </p>
          </div>
          {isRescheduleConfirmation && previousAppointmentAfterReschedule ? (
            <p className="confirmation-warning">
              Cita anterior: {formatAppointmentSummary(previousAppointmentAfterReschedule)}.
            </p>
          ) : null}
          <ul className="confirmation-list" aria-label="Detalle de cita confirmada">
            <li>
              <strong>Fecha y hora</strong>
              <span>{formatDateTime(confirmedAppointment.startsAt, selectedTimezone)}</span>
            </li>
            <li>
              <strong>Servicio</strong>
              <span>{confirmedAppointment.serviceName || "--"}</span>
            </li>
            <li>
              <strong>Terapeuta</strong>
              <span>{confirmedAppointment.therapistName || "--"}</span>
            </li>
            <li>
              <strong>WhatsApp</strong>
              <span>{selectedTimezoneOption.dialCode} {phoneDigits}</span>
            </li>
            <li>
              <strong>Zona horaria</strong>
              <span>
                {selectedTimezoneOption.flag} {selectedTimezoneOption.country} ({selectedTimezoneOption.timezone})
              </span>
            </li>
            <li>
              <strong>Cliente</strong>
              <span>{confirmedClientName || "--"}</span>
            </li>
          </ul>
          {confirmationMissingFields.length > 0 ? (
            <p className="confirmation-warning">
              Confirmamos la cita, pero faltan datos en la respuesta: {confirmationMissingFields.join(", ")}.
            </p>
          ) : null}
          <div className="confirmation-actions confirmation-actions--final">
            <button type="button" className="btn btn-primary" onClick={handleBookAnother}>
              Reservar otra cita
            </button>
            <a className="btn btn-ghost" href={supportManageHref} target="_blank" rel="noreferrer">
              <WhatsappLogo size={18} weight="regular" aria-hidden="true" />
              Hablar con alguien
            </a>
          </div>
        </section>
      ) : null}

      <span className="sr-only" aria-hidden="true">
        {nowTick}
      </span>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BookingApp />
  </React.StrictMode>
);
