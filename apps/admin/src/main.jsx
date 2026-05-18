import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowsClockwise,
  CalendarDots,
  CalendarCheck,
  CaretDown,
  CaretRight,
  CircleNotch,
  Clock,
  ClockCounterClockwise,
  CopySimple,
  Door,
  Lightning,
  MagnifyingGlass,
  Moon,
  Plus,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  Sun,
  Trash,
  User,
  UserCircle,
  UserGear,
  UsersThree,
  Wallet,
  WarningCircle,
  X
} from "@phosphor-icons/react";
import "./styles.css";

const MENU = [
  { id: "control", label: "Control", Icon: Lightning, phase: "Activo" },
  { id: "clientes", label: "Clientes", Icon: UsersThree, phase: "Fase 4B" },
  { id: "terapeutas", label: "Terapeutas", Icon: UserGear, phase: "Fase 4B" },
  { id: "finanzas", label: "Finanzas", Icon: Wallet, phase: "Fase 5" },
  { id: "ajustes", label: "Ajustes", Icon: SlidersHorizontal, phase: "Fase 4B" }
];

const VIEW_TABS = [
  { id: "today", label: "Día", Icon: CalendarCheck },
  { id: "timeline", label: "Timeline", Icon: Clock },
  { id: "history", label: "Historial", Icon: ClockCounterClockwise },
  { id: "rooms", label: "Salas", Icon: Door }
];

const SEARCH_FILTERS = [
  { id: "all", label: "Todo" },
  { id: "clients", label: "Clientes" },
  { id: "appointments", label: "Citas" },
  { id: "cases", label: "Casos" },
  { id: "rooms", label: "Salas" }
];
const SETTINGS_MODULES = [
  {
    id: "services",
    label: "Servicios",
    group: "Operación",
    Icon: Sparkle,
    description: "Catálogo reservable, precios, duración y requisitos de sala."
  },
  {
    id: "rooms",
    label: "Salas",
    group: "Operación",
    Icon: Door,
    description: "Espacios físicos, capacidad y recursos disponibles."
  },
  {
    id: "compatibilities",
    label: "Compatibilidades",
    group: "Operación",
    Icon: SlidersHorizontal,
    description: "Relación servicio-sala que habilita o bloquea booking público."
  },
  {
    id: "booking_rules",
    label: "Reglas booking",
    group: "Booking",
    Icon: CalendarDots,
    description: "Contrato operativo aplicado al flujo público de reserva.",
    kind: "contract"
  },
  {
    id: "center_config",
    label: "Centro",
    group: "Centro",
    Icon: UsersThree,
    description: "Identidad operativa del centro usada por Admin y Booking.",
    kind: "contract"
  }
];
const SETTINGS_STATUS_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Activos" },
  { id: "inactive", label: "Inactivos" }
];
const ROOM_FEATURE_OPTIONS = [
  { key: "camilla", label: "Camilla" },
  { key: "mesa", label: "Mesa" }
];
const ROOM_FEATURE_LABELS = new Map(ROOM_FEATURE_OPTIONS.map((option) => [option.key, option.label]));
const THERAPIST_WEEKDAYS = [
  { weekday: 1, label: "Lunes", shortLabel: "Lun" },
  { weekday: 2, label: "Martes", shortLabel: "Mar" },
  { weekday: 3, label: "Miércoles", shortLabel: "Mié" },
  { weekday: 4, label: "Jueves", shortLabel: "Jue" },
  { weekday: 5, label: "Viernes", shortLabel: "Vie" },
  { weekday: 6, label: "Sábado", shortLabel: "Sáb" },
  { weekday: 0, label: "Domingo", shortLabel: "Dom" }
];
const DEFAULT_TIMEZONE = "America/La_Paz";
const CONTROL_THERAPISTS_DEFER_MS = 2000;
const CONTROL_RESOURCES_DEFER_MS = 1500;
const COUNTRY_TIMEZONE_OPTIONS = [
  {
    region: "Sudamérica",
    country: "Bolivia",
    flag: "🇧🇴",
    timezone: "America/La_Paz",
    dialCode: "+591",
    digitsMin: 8,
    digitsMax: 8,
    example: "71234567"
  },
  {
    region: "Sudamérica",
    country: "Argentina",
    flag: "🇦🇷",
    timezone: "America/Argentina/Buenos_Aires",
    dialCode: "+54",
    digitsMin: 10,
    digitsMax: 11,
    example: "1123456789"
  },
  {
    region: "Sudamérica",
    country: "Chile",
    flag: "🇨🇱",
    timezone: "America/Santiago",
    dialCode: "+56",
    digitsMin: 9,
    digitsMax: 9,
    example: "912345678"
  },
  {
    region: "Sudamérica",
    country: "Peru",
    flag: "🇵🇪",
    timezone: "America/Lima",
    dialCode: "+51",
    digitsMin: 9,
    digitsMax: 9,
    example: "912345678"
  },
  {
    region: "Sudamérica",
    country: "Colombia",
    flag: "🇨🇴",
    timezone: "America/Bogota",
    dialCode: "+57",
    digitsMin: 10,
    digitsMax: 10,
    example: "3012345678"
  },
  {
    region: "Sudamérica",
    country: "Uruguay",
    flag: "🇺🇾",
    timezone: "America/Montevideo",
    dialCode: "+598",
    digitsMin: 8,
    digitsMax: 8,
    example: "91234567"
  },
  {
    region: "Sudamérica",
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
const STATUS_META = {
  pending: { label: "Pendiente", className: "status-pending" },
  confirmed: { label: "Confirmada", className: "status-confirmed" },
  cancelled: { label: "Cancelada", className: "status-cancelled" },
  completed: { label: "Completada", className: "status-completed" },
  no_show: { label: "No asistió", className: "status-no-show" },
  active: { label: "Activo", className: "status-active" },
  inactive: { label: "Inactivo", className: "status-inactive" }
};

const STATUS_ACTIONS = {
  pending: ["confirmed", "completed", "cancelled", "no_show"],
  confirmed: ["completed", "cancelled", "no_show"]
};

const ACTION_LABELS = {
  confirmed: "Marcar confirmada",
  completed: "Marcar completada",
  cancelled: "Cancelar cita",
  no_show: "Marcar no asistió"
};
const HISTORY_STATUS_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "completed", label: "Completadas" },
  { id: "cancelled", label: "Canceladas" },
  { id: "no_show", label: "No asistió" }
];
const HISTORY_ORDER_OPTIONS = [
  { id: "date_desc", label: "Más reciente" },
  { id: "date_asc", label: "Más antigua" }
];
const CONTROL_STATUS_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendiente" },
  { id: "confirmed", label: "Confirmada" },
  { id: "cancelled", label: "Cancelada" },
  { id: "completed", label: "Completada" },
  { id: "no_show", label: "No asistió" }
];
const CONTROL_GROUP_OPTIONS = [
  { id: "none", label: "Sin agrupar" },
  { id: "date", label: "Fecha" },
  { id: "status", label: "Estado" },
  { id: "room", label: "Sala" },
  { id: "therapist", label: "Terapeuta" },
  { id: "service", label: "Servicio" }
];
const TERMINAL_ACTIONS = new Set(["completed", "cancelled", "no_show"]);
const ACTIVE_ROOM_STATUSES = new Set(["pending", "confirmed"]);
const CONTROL_AUTO_REFRESH_MS = 90000;
const CLIENTS_AUTO_REFRESH_MS = 60000;
const HISTORY_AUTO_REFRESH_MS = 60000;
const THERAPISTS_AUTO_REFRESH_MS = 60000;

const ADMIN_TOKEN_KEY = "agenda-admin-token";
const ADMIN_PROFILE_KEY = "agenda-admin-profile";

function uniqueFeatureKeys(featureKeys) {
  return Array.from(new Set((featureKeys || []).map((key) => String(key || "").trim()).filter(Boolean)));
}

function featureLabels(featureKeys) {
  return uniqueFeatureKeys(featureKeys).map((key) => ROOM_FEATURE_LABELS.get(key) || key);
}

function readTheme() {
  const byQuery = new URLSearchParams(window.location.search).get("theme");

  if (byQuery === "dark" || byQuery === "light") {
    return byQuery;
  }

  const stored = window.localStorage.getItem("agenda-theme");

  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredToken() {
  return String(window.localStorage.getItem(ADMIN_TOKEN_KEY) || "").trim();
}

function readStoredProfile() {
  const raw = window.localStorage.getItem(ADMIN_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveAuth(token, admin) {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  window.localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(admin));
}

function clearAuthStorage() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_PROFILE_KEY);
}

function toBoolLabel(value) {
  return value ? "Si" : "No";
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);

    handleChange();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [query]);

  return matches;
}

function normalizeResourceStatus(value, fallbackIsActive = false) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "ACTIVE" || normalized === "ACTIVO") {
    return "ACTIVE";
  }

  if (normalized === "INACTIVE" || normalized === "INACTIVO") {
    return "INACTIVE";
  }

  return fallbackIsActive ? "ACTIVE" : "INACTIVE";
}

function getStatusLabelFromValue(statusValue) {
  return statusValue === "ACTIVE" ? "Activo" : "Inactivo";
}

function statusToChipKey(statusValue) {
  return statusValue === "ACTIVE" ? "active" : "inactive";
}

function compactTimeLabel(value) {
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

function compactDateLabel(value) {
  if (!value) {
    return null;
  }

  return String(value).slice(0, 10);
}

function buildValidityLabel(validFrom, validTo) {
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

function normalizeSettingsPayload(resources) {
  const safeResources = resources && typeof resources === "object" ? resources : {};
  const safeSettings = safeResources.settings && typeof safeResources.settings === "object"
    ? safeResources.settings
    : {};

  const servicesSource = Array.isArray(safeSettings.services)
    ? safeSettings.services
    : Array.isArray(safeResources.services)
      ? safeResources.services
      : [];
  const roomsSource = Array.isArray(safeSettings.rooms)
    ? safeSettings.rooms
    : Array.isArray(safeResources.rooms)
      ? safeResources.rooms
      : [];
  const compatibilitiesSource = Array.isArray(safeSettings.compatibilities)
    ? safeSettings.compatibilities
    : Array.isArray(safeResources.serviceRoomCompatibilities)
      ? safeResources.serviceRoomCompatibilities
      : [];
  const schedulesSource = Array.isArray(safeSettings.schedules)
    ? safeSettings.schedules
    : Array.isArray(safeResources.resourceSchedules)
      ? safeResources.resourceSchedules
      : [];

  const services = servicesSource.map((entry) => {
    const durationMinutes = Number(entry?.durationMinutes || 0);
    const status = normalizeResourceStatus(entry?.status, entry?.isActive === true);
    const priceAmount = Number(entry?.priceAmount || 0);
    const currencyCode = String(entry?.currencyCode || "BOB").toUpperCase();
    const priceLabel = entry?.priceLabel
      ? String(entry.priceLabel)
      : `${Number.isInteger(priceAmount) ? priceAmount : priceAmount.toFixed(2).replace(/\.?0+$/, "")} ${currencyCode}`;

    return {
      id: Number(entry?.id || 0),
      name: entry?.name || `Servicio ${entry?.id || "-"}`,
      durationMinutes,
      durationLabel: entry?.durationLabel || `${durationMinutes} min`,
      priceAmount,
      priceLabel,
      status,
      statusLabel: entry?.statusLabel || getStatusLabelFromValue(status),
      compatibleRoomsCount: Number(entry?.compatibleRoomsCount || 0),
      compatibleRooms: Array.isArray(entry?.compatibleRooms) ? entry.compatibleRooms : [],
      compatibleRoomsLabel: entry?.compatibleRoomsLabel || (
        Number(entry?.compatibleRoomsCount || 0) > 0 ? `${Number(entry.compatibleRoomsCount)} salas` : "Sin salas activas"
      ),
      activeTherapistsCount: Number(entry?.activeTherapistsCount || 0),
      activeTherapists: Array.isArray(entry?.activeTherapists) ? entry.activeTherapists : [],
      activeTherapistsLabel: entry?.activeTherapistsLabel || (
        Number(entry?.activeTherapistsCount || 0) > 0 ? `${Number(entry.activeTherapistsCount)} terapeutas` : "Sin terapeutas activos"
      ),
      requiredFeatureKeys: uniqueFeatureKeys(entry?.requiredFeatureKeys || []),
      requiredFeatures: Array.isArray(entry?.requiredFeatures) ? entry.requiredFeatures : [],
      requiredFeaturesLabel: entry?.requiredFeaturesLabel || "Solo sillas"
    };
  });

  const rooms = roomsSource.map((entry) => {
    const capacity = Number(entry?.capacity || 0);
    const status = normalizeResourceStatus(entry?.status, entry?.isActive === true);
    const featureKeys = Array.isArray(entry?.featureKeys) ? entry.featureKeys : [];
    const features = Array.isArray(entry?.features)
      ? entry.features.map((feature) => ({
          key: String(feature?.key || "").trim(),
          label: String(feature?.label || feature?.key || "").trim()
        })).filter((feature) => feature.key)
      : featureKeys.map((key) => ({
          key,
          label: ROOM_FEATURE_OPTIONS.find((option) => option.key === key)?.label || key
        }));
    const featuresLabel = entry?.featuresLabel
      ? String(entry.featuresLabel)
      : features.length
        ? features.map((feature) => feature.label).join(", ")
        : "-";
    const capacityLabel = entry?.capacityLabel
      ? String(entry.capacityLabel)
      : capacity === 1
        ? "1 persona"
        : `${capacity} personas`;

    return {
      id: Number(entry?.id || 0),
      name: entry?.name || `Sala ${entry?.id || "-"}`,
      capacity,
      capacityLabel,
      status,
      statusLabel: entry?.statusLabel || getStatusLabelFromValue(status),
      compatibleServicesCount: Number(entry?.compatibleServicesCount || 0),
      featureKeys,
      features,
      featuresLabel
    };
  });

  const compatibilities = compatibilitiesSource.map((entry) => {
    const serviceId = Number(entry?.serviceId || 0);
    const roomId = Number(entry?.roomId || 0);
    const status = normalizeResourceStatus(entry?.status, entry?.isActive === true);

    return {
      id: entry?.id || `${serviceId}-${roomId}`,
      serviceId,
      serviceLabel: entry?.serviceLabel || entry?.serviceName || `Servicio ${serviceId}`,
      roomId,
      roomLabel: entry?.roomLabel || entry?.roomName || `Sala ${roomId}`,
      status,
      statusLabel: entry?.statusLabel || getStatusLabelFromValue(status)
    };
  });

  const schedules = schedulesSource.map((entry) => {
    const resourceType = String(entry?.resourceType || "").trim().toLowerCase();
    const resourceTypeLabel = entry?.resourceTypeLabel ||
      (resourceType === "therapist" ? "Terapeuta" : resourceType === "room" ? "Sala" : "Recurso");
    const status = normalizeResourceStatus(entry?.status, entry?.isActive === true);
    const startLabel = compactTimeLabel(entry?.startTime);
    const endLabel = compactTimeLabel(entry?.endTime);
    const validFrom = compactDateLabel(entry?.validFrom);
    const validTo = compactDateLabel(entry?.validTo);
    const slotMinutes = Number(entry?.slotMinutes || 0);

    return {
      id: Number(entry?.id || 0),
      resourceType,
      resourceTypeLabel,
      resourceId: Number(entry?.resourceId || 0),
      resourceLabel: entry?.resourceLabel || entry?.resourceName || `${resourceTypeLabel} ${entry?.resourceId || "-"}`,
      weekday: Number(entry?.weekday || 0),
      dayLabel: entry?.dayLabel || "-",
      timeRangeLabel: entry?.timeRangeLabel || `${startLabel} - ${endLabel}`,
      slotMinutes,
      slotLabel: entry?.slotLabel || `${slotMinutes} min`,
      validityLabel: entry?.validityLabel || buildValidityLabel(validFrom, validTo),
      status,
      statusLabel: entry?.statusLabel || getStatusLabelFromValue(status)
    };
  });

  return {
    services,
    rooms,
    compatibilities,
    schedules,
    summary: {
      servicesTotal: Number(safeResources?.summary?.servicesTotal ?? services.length),
      roomsTotal: Number(safeResources?.summary?.roomsTotal ?? rooms.length),
      compatibilitiesTotal: Number(safeResources?.summary?.compatibilitiesTotal ?? compatibilities.length),
      schedulesTotal: Number(safeResources?.summary?.schedulesTotal ?? schedules.length)
    }
  };
}

function formatDateTime(value, timezone) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  try {
    return new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || undefined
    }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(parsed);
  }
}

function formatClock(value, timezone) {
  if (!value) {
    return "--:--";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  try {
    return new Intl.DateTimeFormat("es-BO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone || undefined
    }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat("es-BO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(parsed);
  }
}

function formatDateOnly(value, timezone) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  try {
    return new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium",
      timeZone: timezone || undefined
    }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium"
    }).format(parsed);
  }
}

function getPersonInitials(name, fallback = "?") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return fallback;
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getClientTone(value) {
  const text = String(value || "").toLowerCase();
  if (["completed", "active", "confirmed"].includes(text)) return "green";
  if (["pending", "new"].includes(text)) return "blue";
  if (["cancelled", "no_show", "risk"].includes(text)) return "amber";
  return "violet";
}

function getRelativeAppointmentLabel(value, timezone) {
  if (!value) {
    return "Sin próxima";
  }

  const dateKey = getDateKeyForTimezone(value, timezone);
  const todayKey = getDateKeyForTimezone(new Date(), timezone);
  const date = new Date(`${dateKey}T12:00:00Z`);
  const today = new Date(`${todayKey}T12:00:00Z`);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (!Number.isFinite(diffDays)) {
    return formatDateOnly(value, timezone);
  }
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays === -1) return "Ayer";
  if (diffDays > 1) return `En ${diffDays} días`;
  return `Hace ${Math.abs(diffDays)} días`;
}

function GridClientIdentity({ name, meta, tone = "violet", asButton = false, onClick, title }) {
  const content = (
    <>
      <span className={`ops-avatar is-${tone}`} aria-hidden="true">
        {getPersonInitials(name)}
      </span>
      <span className="ops-client-copy">
        <strong>{name || "Sin nombre"}</strong>
        {meta ? <span>{meta}</span> : null}
      </span>
    </>
  );

  if (asButton) {
    return (
      <button type="button" className="ops-client-button" onClick={onClick} title={title}>
        {content}
      </button>
    );
  }

  return <span className="ops-client-identity">{content}</span>;
}

function MetricPill({ value, tone = "neutral", label }) {
  const number = Number(value || 0);
  if (!number) {
    return null;
  }

  return (
    <span className={`ops-metric-pill is-${tone}`} title={label}>
      {number}
    </span>
  );
}

function ClientMetrics({ stats }) {
  const safeStats = stats || {};
  return (
    <span className="ops-metrics">
      <MetricPill value={safeStats.completedCount} tone="green" label="Completadas" />
      <MetricPill value={safeStats.confirmedCount} tone="blue" label="Confirmadas" />
      <MetricPill value={safeStats.pendingCount} tone="violet" label="Pendientes" />
      <MetricPill value={safeStats.cancelledCount} tone="amber" label="Canceladas" />
      <MetricPill value={safeStats.noShowCount} tone="red" label="No asistió" />
      {!Number(safeStats.totalAppointments || 0) ? <span className="ops-empty-mark">-</span> : null}
    </span>
  );
}

function getClientRowTone(client) {
  return getClientCrmStatus(client).tone;
}

function getDayDeltaFromToday(value, timezone) {
  if (!value) return null;
  const dateKey = getDateKeyForTimezone(value, timezone);
  const todayKey = getDateKeyForTimezone(new Date(), timezone);
  const date = new Date(`${dateKey}T12:00:00Z`);
  const today = new Date(`${todayKey}T12:00:00Z`);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  return Number.isFinite(diff) ? diff : null;
}

function getClientCrmStatus(client, timezone) {
  const stats = client?.stats || {};
  const total = Number(stats.totalAppointments || 0);
  const cancelledOrNoShow = Number(stats.cancelledCount || 0) + Number(stats.noShowCount || 0);

  if (!total) {
    return { label: "Nuevo", tone: "blue", reason: "Sin historial" };
  }

  if (client?.nextAppointment) {
    return { label: "Activo", tone: "green", reason: "Con próxima cita" };
  }

  const daysSinceLast = getDayDeltaFromToday(client?.lastAppointment?.startsAt, timezone);

  if (cancelledOrNoShow > 0 || (daysSinceLast !== null && daysSinceLast < -45)) {
    const isChurn = daysSinceLast !== null && daysSinceLast < -90;
    return {
      label: isChurn ? "Churn" : "Riesgo",
      tone: isChurn ? "red" : "amber",
      reason: cancelledOrNoShow > 0 ? "Canceló o no asistió" : "Sin actividad reciente"
    };
  }

  if (!client?.onboardingComplete || (daysSinceLast !== null && daysSinceLast < -21)) {
    return {
      label: "Nurture",
      tone: "violet",
      reason: !client?.onboardingComplete ? "Onboarding pendiente" : "Reactivar relación"
    };
  }

  return { label: "Activo", tone: "green", reason: "Historial sano" };
}

function ClientCrmCell({ status }) {
  return (
    <span className="client-crm-cell">
      <span className={`inline-tag ops-crm-tag is-${status.tone}`}>{status.label}</span>
      <span className="client-crm-reason">{status.reason}</span>
    </span>
  );
}

function ClientCrmSnapshot({ clients, timezone }) {
  if (!clients.length) return null;

  const order = ["Nuevo", "Activo", "Riesgo", "Churn", "Nurture"];
  const tones = {
    Nuevo: "blue",
    Activo: "green",
    Riesgo: "amber",
    Churn: "red",
    Nurture: "violet"
  };
  const counts = new Map(order.map((label) => [label, 0]));

  clients.forEach((client) => {
    const status = getClientCrmStatus(client, timezone);
    counts.set(status.label, (counts.get(status.label) || 0) + 1);
  });

  const withRisk = Number(counts.get("Riesgo") || 0) + Number(counts.get("Churn") || 0);
  const nurture = Number(counts.get("Nurture") || 0);

  return (
    <div className="clients-crm-strip" aria-label="Resumen CRM de clientes visibles">
      <span className="clients-crm-title">Lectura CRM</span>
      {order.map((label) => (
        <span key={`client-crm-summary-${label}`} className={`clients-crm-chip is-${tones[label]}`}>
          {label}
          <strong>{counts.get(label) || 0}</strong>
        </span>
      ))}
      <span className="clients-crm-note">
        {withRisk || nurture
          ? `${withRisk} en riesgo/churn · ${nurture} para nurture`
          : "Sin alertas de retención visibles"}
      </span>
    </div>
  );
}

function AppointmentSummary({ startsAt, endsAt, serviceName, therapistName, timezone, compact = false }) {
  if (!startsAt) {
    return <span className="ops-empty-mark">Sin próxima</span>;
  }

  return (
    <span className="ops-appointment-summary">
      <strong>
        {compact ? formatDateOnly(startsAt, timezone) : getRelativeAppointmentLabel(startsAt, timezone)}
        <span className="ops-soft-pill">{formatClock(startsAt, timezone)}</span>
      </strong>
      <span>
        {serviceName || "-"}
        {therapistName ? ` · ${therapistName}` : ""}
        {endsAt ? ` · ${formatClock(endsAt, timezone)}` : ""}
      </span>
    </span>
  );
}

function getDateKeyForTimezone(value = new Date(), timezone = DEFAULT_TIMEZONE) {
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || DEFAULT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(parsed);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return parsed.toISOString().slice(0, 10);
  }
}

function getHourInTimezone(value, timezone = DEFAULT_TIMEZONE) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || DEFAULT_TIMEZONE,
      hour: "2-digit",
      hour12: false
    }).formatToParts(parsed);
    return Number(parts.find((part) => part.type === "hour")?.value || 0);
  } catch {
    return parsed.getHours();
  }
}

function shiftDateKey(dateKey, amount) {
  const parsed = new Date(`${dateKey || getDateKeyForTimezone()}T12:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return getDateKeyForTimezone();
  }

  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function sanitizePhoneForWa(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
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
  if (timezoneOption?.timezone !== DEFAULT_TIMEZONE) {
    return true;
  }

  return /^[67]\d{7}$/.test(phoneDigits);
}

function buildPhonePayload(phoneDigits, timezoneOption) {
  return `${timezoneOption.dialCode}${phoneDigits}`;
}

function groupTimezoneOptions(options) {
  const groups = new Map();
  for (const option of options) {
    if (!groups.has(option.region)) {
      groups.set(option.region, []);
    }
    groups.get(option.region).push(option);
  }
  return Array.from(groups.entries());
}

function buildQuery({ date, includeUpcoming, limit }) {
  const params = new URLSearchParams();
  params.set("date", date || "today");
  params.set("upcoming", includeUpcoming ? "1" : "0");
  params.set("limit", String(limit));
  return params.toString();
}

function buildClientsQuery({ q, onboarding, limit }) {
  const params = new URLSearchParams();
  params.set("onboarding", onboarding || "all");
  params.set("limit", String(limit || 20));

  if (String(q || "").trim()) {
    params.set("q", String(q).trim());
  }

  return params.toString();
}

function buildHistoryQuery({ q, status, order, limit }) {
  const params = new URLSearchParams();
  params.set("status", status || "all");
  params.set("order", order || "date_desc");
  params.set("limit", String(limit || 40));

  if (String(q || "").trim()) {
    params.set("q", String(q).trim());
  }

  return params.toString();
}

function buildTherapistsQuery({ q, status, limit }) {
  const params = new URLSearchParams();
  params.set("status", status || "all");
  params.set("limit", String(limit || 20));

  if (String(q || "").trim()) {
    params.set("q", String(q).trim());
  }

  return params.toString();
}

function getErrorMessage(payload) {
  if (!payload || typeof payload !== "object") {
    return "No se pudo completar la solicitud de admin.";
  }

  if (payload.error && payload.error.message) {
    return String(payload.error.message);
  }

  return "No se pudo completar la solicitud de admin.";
}

function normalizeAppointmentList(items) {
  return Array.isArray(items) ? items : [];
}

function mergeById(...groups) {
  const map = new Map();

  for (const group of groups) {
    for (const item of normalizeAppointmentList(group)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

function sortByStartsAt(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.startsAt || 0).getTime();
    const rightTime = new Date(right.startsAt || 0).getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return Number(left.id || 0) - Number(right.id || 0);
  });
}

function normalizeFilterText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function appointmentDateKey(appointment, timezone) {
  return getDateKeyForTimezone(appointment?.startsAt, timezone);
}

function appointmentMatchesControlFilters(appointment, filters, timezone) {
  const query = normalizeFilterText(filters.q);

  if (query) {
    const haystack = normalizeFilterText([
      appointment?.client?.fullName,
      appointment?.client?.whatsapp,
      appointment?.publicCode,
      appointment?.service?.name,
      appointment?.therapist?.name,
      appointment?.room?.name,
      appointment?.status
    ].join(" "));

    if (!haystack.includes(query)) {
      return false;
    }
  }

  if (filters.status !== "all" && appointment?.status !== filters.status) {
    return false;
  }

  if (filters.serviceId !== "all" && String(appointment?.service?.id || "") !== String(filters.serviceId)) {
    return false;
  }

  if (filters.therapistId !== "all" && String(appointment?.therapist?.id || "") !== String(filters.therapistId)) {
    return false;
  }

  if (filters.roomId !== "all" && String(appointment?.room?.id || "") !== String(filters.roomId)) {
    return false;
  }

  const dateKey = appointmentDateKey(appointment, timezone);

  if (filters.fromDate && dateKey && dateKey < filters.fromDate) {
    return false;
  }

  if (filters.toDate && dateKey && dateKey > filters.toDate) {
    return false;
  }

  return true;
}

function filterAppointmentsForControl(appointments, filters, timezone) {
  return normalizeAppointmentList(appointments).filter((appointment) =>
    appointmentMatchesControlFilters(appointment, filters, timezone)
  );
}

function buildAppointmentEntityOptions({ appointments, resources, resourceType }) {
  const map = new Map();

  for (const item of normalizeAppointmentList(appointments)) {
    const entity = item?.[resourceType];
    const id = Number(entity?.id);
    if (!Number.isInteger(id) || id <= 0 || map.has(String(id))) {
      continue;
    }

    map.set(String(id), {
      id: String(id),
      label: entity?.name || `ID ${id}`
    });
  }

  for (const resource of resources || []) {
    const id = Number(resource?.id);
    if (!Number.isInteger(id) || id <= 0 || map.has(String(id))) {
      continue;
    }

    map.set(String(id), {
      id: String(id),
      label: resource?.name || resource?.displayName || resource?.fullName || `ID ${id}`
    });
  }

  return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function getAppointmentGroupMeta(appointment, groupBy, timezone) {
  if (groupBy === "date") {
    const key = appointmentDateKey(appointment, timezone) || "sin-fecha";
    return {
      key,
      orderKey: key,
      label: appointment?.startsAt ? formatDateOnly(appointment.startsAt, timezone) : "Sin fecha"
    };
  }

  if (groupBy === "status") {
    const status = appointment?.status || "sin-estado";
    return {
      key: status,
      label: STATUS_META[status]?.label || status
    };
  }

  if (groupBy === "room") {
    const id = appointment?.room?.id || "sin-sala";
    return {
      key: String(id),
      label: appointment?.room?.name || "Sin sala"
    };
  }

  if (groupBy === "therapist") {
    const id = appointment?.therapist?.id || "sin-terapeuta";
    return {
      key: String(id),
      label: appointment?.therapist?.name || "Sin terapeuta"
    };
  }

  if (groupBy === "service") {
    const id = appointment?.service?.id || "sin-servicio";
    return {
      key: String(id),
      label: appointment?.service?.name || "Sin servicio"
    };
  }

  return {
    key: "all",
    label: "Todas"
  };
}

function groupAppointmentsForControl(appointments, groupBy, timezone) {
  if (!groupBy || groupBy === "none") {
    return [
      {
        key: "all",
        label: "Todas",
        appointments
      }
    ];
  }

  const map = new Map();

  for (const appointment of appointments) {
    const meta = getAppointmentGroupMeta(appointment, groupBy, timezone);
    if (!map.has(meta.key)) {
      map.set(meta.key, {
        key: meta.key,
        orderKey: meta.orderKey || meta.label,
        label: meta.label,
        appointments: []
      });
    }
    map.get(meta.key).appointments.push(appointment);
  }

  return Array.from(map.values()).sort((left, right) =>
    String(left.orderKey).localeCompare(String(right.orderKey))
  );
}

function isActiveRoomAppointment(appointment, nowDate = new Date()) {
  const status = String(appointment?.status || "").trim().toLowerCase();

  if (!ACTIVE_ROOM_STATUSES.has(status)) {
    return false;
  }

  const endsAt = new Date(appointment?.endsAt || 0);
  if (Number.isNaN(endsAt.getTime())) {
    return false;
  }

  return endsAt.getTime() > nowDate.getTime();
}

function summarizeClaims(claims) {
  const groups = new Map();

  for (const claim of claims) {
    const key = [
      claim.resourceType || "resource",
      claim.resourceId || "unknown",
      claim.resourceName || ""
    ].join("|");
    const existing = groups.get(key) || {
      resourceType: claim.resourceType,
      resourceName: claim.resourceName || claim.resourceId || "-",
      count: 0
    };

    existing.count += 1;
    groups.set(key, existing);
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftRank = left.resourceType === "therapist" ? 0 : 1;
    const rightRank = right.resourceType === "therapist" ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return String(left.resourceName).localeCompare(String(right.resourceName));
  });
}

function StatusChip({ status }) {
  const meta = STATUS_META[status] || { label: status || "-", className: "status-pending" };

  return <span className={`status-chip ${meta.className}`}>{meta.label}</span>;
}

function SummaryCard({ label, value, className }) {
  return (
    <article className="summary-card">
      <p className="summary-label">{label}</p>
      <p className={`summary-value ${className}`}>{value}</p>
    </article>
  );
}

function ControlToolbar({
  filters,
  services,
  therapists,
  rooms,
  filteredCount,
  totalCount,
  createDisabled,
  onChange,
  onReset,
  onCreate
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  function updateFilter(field, value) {
    onChange((current) => ({
      ...current,
      [field]: value
    }));
  }

  const statusLabel = CONTROL_STATUS_FILTERS.find((option) => option.id === filters.status)?.label;
  const serviceLabel = services.find((option) => option.id === filters.serviceId)?.label;
  const therapistLabel = therapists.find((option) => option.id === filters.therapistId)?.label;
  const roomLabel = rooms.find((option) => option.id === filters.roomId)?.label;
  const groupLabel = CONTROL_GROUP_OPTIONS.find((option) => option.id === filters.groupBy)?.label;
  const filterCount = [
    filters.q,
    filters.fromDate,
    filters.toDate,
    filters.status !== "all",
    filters.serviceId !== "all",
    filters.therapistId !== "all",
    filters.roomId !== "all"
  ].filter(Boolean).length;
  const chips = [
    filters.q ? `Búsqueda: ${filters.q}` : null,
    filters.fromDate ? `Desde: ${filters.fromDate}` : null,
    filters.toDate ? `Hasta: ${filters.toDate}` : null,
    filters.status !== "all" ? `Estado: ${statusLabel}` : null,
    filters.serviceId !== "all" ? `Servicio: ${serviceLabel}` : null,
    filters.therapistId !== "all" ? `Terapeuta: ${therapistLabel}` : null,
    filters.roomId !== "all" ? `Sala: ${roomLabel}` : null,
    filters.groupBy !== "none" ? `Agrupado por: ${groupLabel}` : null
  ].filter(Boolean);

  return (
    <section className="control-toolbar" aria-label="Herramientas de citas">
      <div className="control-toolbar-row">
        <button
          type="button"
          className="control-primary-action"
          onClick={onCreate}
          disabled={createDisabled}
        >
          <CalendarDots size={16} weight="regular" aria-hidden="true" />
          <span>Nueva cita</span>
        </button>

        <label className="control-toolbar-search" htmlFor="control-filter-q">
          <MagnifyingGlass size={16} weight="regular" aria-hidden="true" />
          <input
            id="control-filter-q"
            type="search"
            value={filters.q}
            onChange={(event) => updateFilter("q", event.target.value)}
            placeholder="Buscar nombre, WA o codigo"
          />
        </label>

        <div className="control-toolbar-menu">
          <button
            type="button"
            className={`control-tool-button${filtersOpen ? " is-active" : ""}`}
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <SlidersHorizontal size={16} weight="regular" aria-hidden="true" />
            <span>Filtrar</span>
            {filterCount ? <strong>{filterCount}</strong> : null}
          </button>

          {filtersOpen ? (
            <div className="control-toolbar-popover" role="dialog" aria-label="Filtros de citas">
              <div className="control-popover-grid">
                <label className="client-filter-field" htmlFor="control-filter-from">
                  <span>Desde</span>
                  <input
                    id="control-filter-from"
                    type="date"
                    value={filters.fromDate}
                    onChange={(event) => updateFilter("fromDate", event.target.value)}
                  />
                </label>

                <label className="client-filter-field" htmlFor="control-filter-to">
                  <span>Hasta</span>
                  <input
                    id="control-filter-to"
                    type="date"
                    value={filters.toDate}
                    onChange={(event) => updateFilter("toDate", event.target.value)}
                  />
                </label>

                <label className="client-filter-field" htmlFor="control-filter-status">
                  <span>Estado</span>
                  <select
                    id="control-filter-status"
                    className="control-input"
                    value={filters.status}
                    onChange={(event) => updateFilter("status", event.target.value)}
                  >
                    {CONTROL_STATUS_FILTERS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="client-filter-field" htmlFor="control-filter-service">
                  <span>Servicio</span>
                  <select
                    id="control-filter-service"
                    className="control-input"
                    value={filters.serviceId}
                    onChange={(event) => updateFilter("serviceId", event.target.value)}
                  >
                    <option value="all">Todos</option>
                    {services.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="client-filter-field" htmlFor="control-filter-therapist">
                  <span>Terapeuta</span>
                  <select
                    id="control-filter-therapist"
                    className="control-input"
                    value={filters.therapistId}
                    onChange={(event) => updateFilter("therapistId", event.target.value)}
                  >
                    <option value="all">Todos</option>
                    {therapists.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="client-filter-field" htmlFor="control-filter-room">
                  <span>Sala</span>
                  <select
                    id="control-filter-room"
                    className="control-input"
                    value={filters.roomId}
                    onChange={(event) => updateFilter("roomId", event.target.value)}
                  >
                    <option value="all">Todas</option>
                    {rooms.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}
        </div>

        <label className="control-group-control" htmlFor="control-filter-group">
          <span>Agrupar</span>
          <select
            id="control-filter-group"
            value={filters.groupBy}
            onChange={(event) => updateFilter("groupBy", event.target.value)}
          >
            {CONTROL_GROUP_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>

        {chips.length ? (
          <button type="button" className="control-clear-button" onClick={onReset}>
            Limpiar
          </button>
        ) : null}

        <p className="control-result-count">{filteredCount} de {totalCount}</p>
      </div>

      {chips.length ? (
        <div className="control-filter-chips" aria-label="Filtros activos">
          {chips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const MemoControlToolbar = React.memo(ControlToolbar);

function AppointmentTable({
  appointments,
  timezone,
  groupBy = "none",
  onSelect,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteOne,
  armedDeleteId,
  deleteLoading
}) {
  const isMobileLayout = useMediaQuery("(max-width: 760px)");

  if (!appointments.length) {
    return <p className="empty-state">No hay citas para este bloque.</p>;
  }

  const allSelected = appointments.length > 0 && appointments.every((item) => selectedIds.has(item.id));
  const groups = groupAppointmentsForControl(appointments, groupBy, timezone);
  const showGroups = groupBy && groupBy !== "none";

  if (isMobileLayout) {
    return (
      <ul className="appointments-cards" aria-label="Lista de citas mobile">
        {groups.map((group) => (
          <React.Fragment key={`mobile-group-${group.key}`}>
            {showGroups ? (
              <li className="appointment-card-group">
                <span>{group.label}</span>
                <strong>{group.appointments.length}</strong>
              </li>
            ) : null}
            {group.appointments.map((item) => (
              <li key={`mobile-${item.id}`} className="appointment-card">
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={(event) => onToggleSelect(item.id, event.target.checked)}
                  />
                  <span>Seleccionar</span>
                </label>
                <button type="button" className="card-open" onClick={() => onSelect(item.id)}>
                  <span className="appointment-title">{item.client.fullName || "Sin nombre"}</span>
                  <StatusChip status={item.status} />
                </button>
                <p className="appointment-line">{formatDateTime(item.startsAt, timezone)}</p>
                <p className="appointment-line">WhatsApp: {item.client.whatsapp || "-"}</p>
                <p className="appointment-line">Servicio: {item.service.name || "-"}</p>
                <p className="appointment-line">Terapeuta: {item.therapist.name || "-"}</p>
                <p className="appointment-line">Sala: {item.room.name || "-"}</p>
                <p className="appointment-line">Creada: {formatDateTime(item.createdAt, timezone)}</p>
                <button
                  type="button"
                  className={`danger-button${armedDeleteId === item.id ? " is-armed" : ""}`}
                  onClick={() => onDeleteOne(item.id)}
                  disabled={deleteLoading}
                >
                  <Trash size={14} weight="regular" aria-hidden="true" />
                  <span>{armedDeleteId === item.id ? "¿Borrar?" : "Borrar"}</span>
                </button>
              </li>
            ))}
          </React.Fragment>
        ))}
      </ul>
    );
  }

  return (
    <div className="table-wrap ops-grid-wrap" role="region" aria-label="Tabla de citas">
      <table className="appointments-table ops-grid appointments-grid">
        <thead>
          <tr>
            <th className="cell-check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) =>
                  onToggleSelectAll(
                    appointments.map((item) => item.id),
                    event.target.checked
                  )
                }
                aria-label="Seleccionar citas visibles"
              />
            </th>
            <th>Cliente</th>
            <th>Fecha/Hora</th>
            <th>WhatsApp</th>
            <th>Servicio</th>
            <th>Terapeuta</th>
            <th>Sala</th>
            <th>Estado</th>
            <th>Creada</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <React.Fragment key={`group-${group.key}`}>
              {showGroups ? (
                <tr className="appointment-group-row">
                  <td colSpan={10}>
                    <span>{group.label}</span>
                    <strong>{group.appointments.length}</strong>
                  </td>
                </tr>
              ) : null}
              {group.appointments.map((item) => (
                <tr key={item.id} className={`ops-grid-row is-${getClientTone(item.status)}`}>
                  <td className="cell-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={(event) => onToggleSelect(item.id, event.target.checked)}
                      aria-label={`Seleccionar cita ${item.publicCode || item.id}`}
                    />
                  </td>
                  <td>
                    <GridClientIdentity
                      name={item.client.fullName}
                      tone={getClientTone(item.status)}
                      asButton
                      onClick={() => onSelect(item.id)}
                      title="Abrir detalle"
                    />
                  </td>
                  <td>{formatDateTime(item.startsAt, timezone)}</td>
                  <td>{item.client.whatsapp || "-"}</td>
                  <td>{item.service.name || "-"}</td>
                  <td>{item.therapist.name || "-"}</td>
                  <td>{item.room.name || "-"}</td>
                  <td>
                    <StatusChip status={item.status} />
                  </td>
                  <td>{formatDateTime(item.createdAt, timezone)}</td>
                  <td>
                    <button
                      type="button"
                      className={`danger-button${armedDeleteId === item.id ? " is-armed" : ""}`}
                      onClick={() => onDeleteOne(item.id)}
                      disabled={deleteLoading}
                    >
                      <Trash size={14} weight="regular" aria-hidden="true" />
                      <span>{armedDeleteId === item.id ? "¿Borrar?" : "Borrar"}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MemoAppointmentTable = React.memo(AppointmentTable);

function HistoryTable({ appointments, timezone }) {
  const isMobileLayout = useMediaQuery("(max-width: 760px)");

  if (!appointments.length) {
    return <p className="empty-state">No hay atenciones para este filtro.</p>;
  }

  if (isMobileLayout) {
    return (
      <ul className="appointments-cards" aria-label="Historial mobile">
        {appointments.map((item) => (
          <li key={`history-mobile-${item.id}`} className="appointment-card">
            <div className="card-open">
              <span className="appointment-title">{item.client.fullName || "Sin nombre"}</span>
              <StatusChip status={item.status} />
            </div>
            <p className="appointment-line">WhatsApp: {item.client.whatsapp || "-"}</p>
            <p className="appointment-line">Fecha: {formatDateTime(item.startsAt, timezone)}</p>
            <p className="appointment-line">
              Horario: {formatClock(item.startsAt, timezone)} - {formatClock(item.endsAt, timezone)}
            </p>
            <p className="appointment-line">Terapeuta: {item.therapist.name || "-"}</p>
            <p className="appointment-line">Terapia: {item.service.name || "-"}</p>
            <p className="appointment-line">Sala: {item.room.name || "-"}</p>
            <p className="appointment-line">Origen: {item.source || "-"}</p>
            <p className="appointment-line">Creada: {formatDateTime(item.createdAt, timezone)}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="table-wrap ops-grid-wrap" role="region" aria-label="Tabla de historial">
      <table className="appointments-table history-table ops-grid">
        <thead>
          <tr>
            <th className="col-client">Cliente</th>
            <th className="col-date">Fecha/Hora</th>
            <th className="col-phone">WhatsApp</th>
            <th className="col-service">Servicio</th>
            <th className="col-therapist">Terapeuta</th>
            <th className="col-room">Sala</th>
            <th className="col-status">Estado</th>
            <th className="col-created">Creada</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((item) => (
            <tr key={`history-${item.id}`} className={`ops-grid-row is-${getClientTone(item.status)}`}>
              <td className="col-client">
                <GridClientIdentity
                  name={item.client.fullName}
                  tone={getClientTone(item.status)}
                />
              </td>
              <td className="col-date">{formatDateTime(item.startsAt, timezone)}</td>
              <td className="col-phone">{item.client.whatsapp || "-"}</td>
              <td className="col-service">{item.service.name || "-"}</td>
              <td className="col-therapist">{item.therapist.name || "-"}</td>
              <td className="col-room">{item.room.name || "-"}</td>
              <td className="col-status">
                <StatusChip status={item.status} />
              </td>
              <td className="col-created">{formatDateTime(item.createdAt, timezone)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MemoHistoryTable = React.memo(HistoryTable);

function TimelineView({ appointments, timezone, onSelect }) {
  if (!appointments.length) {
    return <p className="empty-state">No hay citas para timeline.</p>;
  }

  return (
    <ul className="timeline-list" aria-label="Timeline de citas">
      {appointments.map((item) => (
        <li key={`timeline-${item.id}`} className="timeline-item">
          <div className="timeline-time">{formatClock(item.startsAt, timezone)}</div>
          <button type="button" className="timeline-card" onClick={() => onSelect(item.id)}>
            <div className="timeline-head">
              <p className="timeline-client">{item.client.fullName || "Sin nombre"}</p>
              <StatusChip status={item.status} />
            </div>
            <p className="timeline-line">{item.service.name || "-"} · {item.therapist.name || "-"}</p>
            <p className="timeline-line">Sala: {item.room.name || "-"}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

const MemoTimelineView = React.memo(TimelineView);

function appointmentDurationMinutes(appointment) {
  const start = appointment.startsAt ? new Date(appointment.startsAt) : null;
  const end = appointment.endsAt ? new Date(appointment.endsAt) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 60;
  }
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return Math.max(15, minutes);
}

function buildRoomColumnsModel({ appointments, rooms }) {
  const knownRooms = Array.isArray(rooms) ? rooms : [];
  const map = new Map();

  for (const room of knownRooms) {
    if (!room || !Number.isInteger(Number(room.id)) || Number(room.id) <= 0) continue;
    map.set(String(room.id), {
      key: String(room.id),
      roomId: Number(room.id),
      roomName: room.name || `Sala ${room.id}`,
      isFallback: false,
      appointments: []
    });
  }

  for (const item of appointments) {
    const id = item.room?.id ? Number(item.room.id) : null;
    if (id !== null && map.has(String(id))) {
      map.get(String(id)).appointments.push(item);
      continue;
    }
    const fallbackKey = id !== null ? `unknown-${id}` : "no-room";
    if (!map.has(fallbackKey)) {
      map.set(fallbackKey, {
        key: fallbackKey,
        roomId: null,
        roomName: item.room?.name || "Sin sala",
        isFallback: true,
        appointments: []
      });
    }
    map.get(fallbackKey).appointments.push(item);
  }

  for (const column of map.values()) {
    column.appointments = sortByStartsAt(column.appointments);
  }

  return Array.from(map.values()).sort((left, right) => {
    if (left.roomId === null && right.roomId !== null) return 1;
    if (left.roomId !== null && right.roomId === null) return -1;
    return String(left.roomName).localeCompare(String(right.roomName));
  });
}

function RoomsKanban({
  appointments,
  rooms,
  timezone,
  onSelect,
  onMoveToRoom,
  draggable,
  isMutating,
  pendingAppointmentId,
  pendingTargetRoomId
}) {
  const [dragState, setDragState] = useState(null);
  const [hoverRoomKey, setHoverRoomKey] = useState(null);

  const columns = useMemo(
    () => buildRoomColumnsModel({ appointments, rooms }),
    [appointments, rooms]
  );

  if (!columns.length) {
    return <p className="empty-state">No hay salas activas configuradas.</p>;
  }

  function clearDrag() {
    setDragState(null);
    setHoverRoomKey(null);
  }

  function handleDragStart(event, item) {
    if (!draggable) {
      event.preventDefault();
      return;
    }
    if (item.status !== "pending" && item.status !== "confirmed") {
      event.preventDefault();
      return;
    }
    try {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(item.id));
    } catch {
      // ignore browsers without dataTransfer
    }
    setDragState({
      appointmentId: item.id,
      sourceRoomId: item.room?.id ? Number(item.room.id) : null
    });
  }

  function handleColumnDragOver(event, column) {
    if (!draggable || !dragState) return;
    if (column.roomId === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setHoverRoomKey(column.key);
  }

  function handleColumnDragLeave(event, column) {
    if (!draggable) return;
    const next = event.relatedTarget;
    if (next && event.currentTarget.contains(next)) return;
    if (hoverRoomKey === column.key) {
      setHoverRoomKey(null);
    }
  }

  function handleColumnDrop(event, column) {
    if (!draggable || !dragState) return;
    event.preventDefault();
    const targetRoomId = column.roomId;
    const sourceRoomId = dragState.sourceRoomId;
    const appointmentId = dragState.appointmentId;
    clearDrag();
    if (!targetRoomId || !appointmentId || targetRoomId === sourceRoomId) {
      return;
    }
    onMoveToRoom?.({
      appointmentId,
      nextRoomId: targetRoomId,
      roomLabel: column.roomName
    });
  }

  return (
    <div className="rooms-board" role="region" aria-label="Salas">
      <div className="rooms-board-track">
        {columns.map((column) => {
          const isHover = hoverRoomKey === column.key && draggable && column.roomId !== null;
          const count = column.appointments.length;
          const countLabel = column.isFallback
            ? `${count} cita${count === 1 ? "" : "s"} existente${count === 1 ? "" : "s"}`
            : `${count} cita${count === 1 ? "" : "s"} activa${count === 1 ? "" : "s"}`;
          return (
            <article
              key={column.key}
              className={`rooms-board-col${isHover ? " is-drop-target" : ""}${
                column.isFallback ? " is-disabled-target" : ""
              }`}
              aria-disabled={column.isFallback ? "true" : undefined}
              onDragOver={(event) => handleColumnDragOver(event, column)}
              onDragLeave={(event) => handleColumnDragLeave(event, column)}
              onDrop={(event) => handleColumnDrop(event, column)}
            >
              <header className="rooms-board-col-head">
                <div className="rooms-board-col-title-row">
                  <h3 className="rooms-board-col-name">{column.roomName}</h3>
                  {column.isFallback ? (
                    <span className="rooms-board-col-badge">Inactiva · citas existentes</span>
                  ) : null}
                </div>
                <p className="rooms-board-col-stats">
                  {countLabel}
                </p>
              </header>

              <div className="rooms-board-col-body">
                {count === 0 ? (
                  <p className="rooms-board-empty">
                    {column.isFallback
                      ? "Sala inactiva conservada solo para mostrar citas existentes."
                      : column.roomId === null
                      ? "Citas sin sala asignada."
                      : "Sala libre. Arrastra una cita aqui."}
                  </p>
                ) : (
                  column.appointments.map((item) => {
                    const dragOk =
                      draggable &&
                      (item.status === "pending" || item.status === "confirmed");
                    const isPending =
                      pendingAppointmentId === item.id &&
                      Number(pendingTargetRoomId) === Number(column.roomId);
                    const duration = appointmentDurationMinutes(item);
                    return (
                      <article
                        key={`event-${column.key}-${item.id}`}
                        className={`rooms-board-card status-${item.status || "pending"}${
                          dragOk ? " is-draggable" : ""
                        }${isPending ? " is-pending" : ""}${column.isFallback ? " is-fallback-room" : ""}`}
                        data-status={item.status || "pending"}
                        draggable={dragOk && !isMutating ? "true" : undefined}
                        onDragStart={(event) => handleDragStart(event, item)}
                        onDragEnd={clearDrag}
                        onClick={() => onSelect?.(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelect?.(item.id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Cita ${item.client?.fullName || "sin cliente"}`}
                      >
                        <p className="rooms-board-card-time">
                          <span className="rooms-board-card-bullet" aria-hidden="true" />
                          {formatClock(item.startsAt, timezone)} – {formatClock(item.endsAt, timezone)}
                        </p>
                        <h4 className="rooms-board-card-client">
                          {item.client?.fullName || "Sin cliente"}
                        </h4>
                        <p className="rooms-board-card-row">
                          <User size={14} weight="regular" aria-hidden="true" />
                          <span>{item.therapist?.name || "Sin terapeuta"}</span>
                          {item.room?.name ? (
                            <>
                              <Door size={14} weight="regular" aria-hidden="true" />
                              <span>{item.room.name}</span>
                            </>
                          ) : null}
                        </p>
                        <p className="rooms-board-card-row">
                          <span className="rooms-board-card-service">
                            {item.service?.name || "Servicio"} · {duration} min
                          </span>
                        </p>
                        <footer className="rooms-board-card-footer">
                          <StatusChip status={item.status} />
                        </footer>
                      </article>
                    );
                  })
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DrawerSection({ title, children, className = "" }) {
  return (
    <section className={`drawer-section${className ? ` ${className}` : ""}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ClaimSummaryList({ claims, appointment, timezone }) {
  const claimSummaries = summarizeClaims(claims);
  const rangeLabel = `${formatClock(appointment.startsAt, timezone)} - ${formatClock(appointment.endsAt, timezone)}`;

  if (!claimSummaries.length) {
    return <p className="empty-state compact">Sin recursos bloqueados.</p>;
  }

  return (
    <div className="claim-summary">
      <p className="claim-summary-note">
        {claims.length} bloqueos por minuto activos, resumidos por recurso.
      </p>
      <ul className="claim-summary-list">
        {claimSummaries.map((claim) => (
          <li key={`${claim.resourceType}-${claim.resourceName}`}>
            <div>
              <span className="claim-resource-type">
                {claim.resourceType === "therapist" ? "Terapeuta" : "Sala"}
              </span>
              <strong>{claim.resourceName}</strong>
            </div>
            <span>{rangeLabel}</span>
            <span>{claim.count} min</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MemoRoomsKanban = React.memo(RoomsKanban);

function AppointmentDrawer({
  open,
  detail,
  loading,
  error,
  timezone,
  onClose,
  onChangeStatus,
  onChangeRoom,
  mutationLoading,
  mutationError,
  roomMutationLoading,
  roomMutationError
}) {
  const appointment = detail?.appointment || null;
  const client = appointment?.client || {};
  const service = appointment?.service || {};
  const therapist = appointment?.therapist || {};
  const room = appointment?.room || {};
  const claims = appointment?.claims || [];
  const payments = appointment?.payments || [];
  const paymentsSummary = appointment?.paymentsSummary || null;
  const clientContext = appointment?.clientContext || null;
  const roomOptions = appointment?.roomOptions || [];

  const nextActions = appointment ? STATUS_ACTIONS[appointment.status] || [] : [];
  const whatsappDigits = sanitizePhoneForWa(client.whatsapp);
  const selectableRooms = roomOptions.filter((entry) => entry.available || entry.current);
  const [targetRoomId, setTargetRoomId] = useState("");

  useEffect(() => {
    if (!open || !appointment?.room?.id) {
      setTargetRoomId("");
      return;
    }

    setTargetRoomId(String(appointment.room.id));
  }, [open, appointment?.id, appointment?.room?.id]);

  if (!open) {
    return null;
  }

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de cita"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p className="drawer-kicker">Detalle de cita</p>
            <h2>{client.fullName || "Cita"}</h2>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Cerrar detalle">
            <X size={18} weight="bold" />
          </button>
        </header>

        {loading ? (
          <p className="feedback drawer-feedback">Cargando detalle...</p>
        ) : null}

        {!loading && error ? <p className="feedback error drawer-feedback">{error}</p> : null}

        {!loading && !error && appointment ? (
          <div className="drawer-body">
            <div className="drawer-summary">
              <StatusChip status={appointment.status} />
              <p>{formatDateTime(appointment.startsAt, timezone)}</p>
              <p>Creada: {formatDateTime(appointment.createdAt, timezone)}</p>
            </div>

            <DrawerSection title="Cliente">
              <dl className="drawer-grid">
                <dt>Nombre</dt>
                <dd>{client.fullName || "-"}</dd>
                <dt>WhatsApp</dt>
                <dd>
                  {client.whatsapp || "-"}
                  {whatsappDigits ? (
                    <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer" className="drawer-link">
                      Abrir chat
                    </a>
                  ) : null}
                </dd>
              </dl>
            </DrawerSection>

            <DrawerSection title="Contexto cliente">
              {clientContext?.activeAppointments?.length ? (
                <>
                  <p className="drawer-note">
                    Citas activas: <strong>{clientContext.activeAppointments.length}</strong> · Terapias distintas:{" "}
                    <strong>{clientContext.activeServiceCount || 0}</strong>
                  </p>
                  <ul className="drawer-list">
                    {clientContext.activeAppointments.map((entry) => (
                      <li key={`context-${entry.id}`}>
                        <span>
                          {entry.serviceName || "-"} · {entry.therapistName || "-"}
                        </span>
                        <span>{formatDateTime(entry.startsAt, timezone)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="empty-state compact">Sin otras citas activas para este cliente.</p>
              )}
            </DrawerSection>

            <DrawerSection title="Cita">
              <dl className="drawer-grid">
                <dt>Servicio</dt>
                <dd>{service.name || "-"}</dd>
                <dt>Terapeuta</dt>
                <dd>{therapist.name || "-"}</dd>
                <dt>Sala</dt>
                <dd>{room.name || "-"}</dd>
                <dt>Inicio</dt>
                <dd>{formatDateTime(appointment.startsAt, timezone)}</dd>
                <dt>Fin</dt>
                <dd>{formatDateTime(appointment.endsAt, timezone)}</dd>
              </dl>
            </DrawerSection>

            <DrawerSection title="Cambio de sala">
              {selectableRooms.length ? (
                <div className="room-change-box">
                  <label className="field-inline">
                    <span>Sala disponible</span>
                    <select
                      value={targetRoomId}
                      onChange={(event) => setTargetRoomId(event.target.value)}
                      disabled={roomMutationLoading}
                    >
                      {selectableRooms.map((option) => (
                        <option key={`room-option-${option.id}`} value={String(option.id)}>
                          {option.name}
                          {option.current ? " (actual)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="status-action"
                    disabled={
                      roomMutationLoading
                      || !targetRoomId
                      || Number(targetRoomId) === Number(room.id)
                    }
                    onClick={() => onChangeRoom(targetRoomId)}
                  >
                    {roomMutationLoading ? <CircleNotch size={16} className="spin" /> : null}
                    <span>Guardar sala</span>
                  </button>
                </div>
              ) : (
                <p className="empty-state compact">No hay salas disponibles para esta hora.</p>
              )}
              {roomMutationError ? <p className="feedback error compact-feedback">{roomMutationError}</p> : null}
            </DrawerSection>

            <DrawerSection title="Recursos bloqueados">
              <ClaimSummaryList claims={claims} appointment={appointment} timezone={timezone} />
            </DrawerSection>

            <DrawerSection title="Pagos">
              {payments.length ? (
                <ul className="drawer-list">
                  {payments.map((payment) => (
                    <li key={payment.id}>
                      <span>
                        {payment.status} · {payment.amount} {payment.currencyCode}
                      </span>
                      <span>{formatDateTime(payment.createdAt, timezone)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state compact">Sin pagos registrados.</p>
              )}

              {paymentsSummary ? (
                <div className="payments-summary">
                  <p>Total pagos: {paymentsSummary.totalPayments}</p>
                  <p>
                    Totales: {Object.entries(paymentsSummary.totalsByCurrency || {}).length
                      ? Object.entries(paymentsSummary.totalsByCurrency)
                          .map(([currency, total]) => `${currency} ${total}`)
                          .join(" · ")
                      : "-"}
                  </p>
                </div>
              ) : null}
            </DrawerSection>

            <DrawerSection title="Acciones de estado">
              {nextActions.length ? (
                <div className="drawer-actions">
                  {nextActions.map((nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      className="status-action"
                      onClick={() => onChangeStatus(nextStatus)}
                      disabled={mutationLoading}
                    >
                      {mutationLoading ? <CircleNotch size={16} className="spin" /> : null}
                      <span>{ACTION_LABELS[nextStatus] || nextStatus}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-state compact">Estado terminal. No hay acciones disponibles.</p>
              )}

              {mutationError ? <p className="feedback error compact-feedback">{mutationError}</p> : null}
            </DrawerSection>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function RoomMoveConfirmModal({ request, loading, onCancel, onConfirm }) {
  if (!request) return null;

  const hasResourceWarning = request.missingFeatureLabels?.length > 0;

  return (
    <div className="confirm-overlay" role="presentation" onClick={loading ? undefined : onCancel}>
      <section
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar cambio de sala"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="confirm-header">
          <div className={`confirm-icon${hasResourceWarning ? " is-warning" : ""}`}>
            {hasResourceWarning ? (
              <WarningCircle size={22} weight="bold" />
            ) : (
              <Door size={22} weight="bold" />
            )}
          </div>
          <div>
            <p className="confirm-kicker">Cambio de sala</p>
            <h2>{hasResourceWarning ? "Revisar recursos antes de mover" : "Confirmar movimiento"}</h2>
          </div>
        </header>

        <div className="confirm-body">
          <p>
            Vas a mover <strong>{request.clientName}</strong> de{" "}
            <strong>{request.currentRoomName}</strong> a <strong>{request.targetRoomName}</strong>.
          </p>
          <dl className="confirm-grid">
            <dt>Servicio</dt>
            <dd>{request.serviceName}</dd>
            <dt>Horario</dt>
            <dd>{request.timeLabel}</dd>
            <dt>Recursos de destino</dt>
            <dd>{request.targetFeatureLabels.length ? request.targetFeatureLabels.join(", ") : "Solo sillas"}</dd>
          </dl>

          {hasResourceWarning ? (
            <div className="confirm-warning" role="alert">
              <strong>Esta sala no tiene {request.missingFeatureLabels.join(" ni ")}.</strong>
              <span>
                El servicio esta marcado como que requiere {request.requiredFeatureLabels.join(" y ")}.
                Confirma solo si Daniel valido una excepcion operativa.
              </span>
            </div>
          ) : (
            <p className="confirm-note">
              La sala destino esta disponible para este horario. Al confirmar se vuelven a crear los claims de sala.
            </p>
          )}
        </div>

        <footer className="confirm-actions">
          <button type="button" className="confirm-secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className={hasResourceWarning ? "confirm-danger" : "confirm-primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <CircleNotch size={16} className="spin" /> : null}
            <span>{hasResourceWarning ? "Confirmar excepcion" : "Confirmar cambio"}</span>
          </button>
        </footer>
      </section>
    </div>
  );
}

function ManualAppointmentModal({
  open,
  draft,
  services,
  therapists,
  rooms,
  tenantSlug,
  resourcesLoaded,
  resourcesLoading,
  resourcesError,
  loading,
  error,
  success,
  onChange,
  onClose,
  onSubmit
}) {
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [timezonePickerOpen, setTimezonePickerOpen] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const selectedTimezoneOption =
    COUNTRY_TIMEZONE_OPTIONS.find((option) => option.timezone === draft.timezone) ||
    COUNTRY_TIMEZONE_OPTIONS[0];
  const phoneDigits = normalizePhone(draft.phoneDigits);
  const isPhoneLengthValid = isPhoneValidByTimezone(phoneDigits, selectedTimezoneOption);
  const isPhoneValid = isPhoneLengthValid && isBoliviaMobilePhone(phoneDigits, selectedTimezoneOption);
  const phoneHelper = selectedTimezoneOption.timezone === DEFAULT_TIMEZONE
    ? `Bolivia: 8 digitos, debe empezar con 6 o 7. Ingresaste ${phoneDigits.length}.`
    : `${selectedTimezoneOption.flag} ${selectedTimezoneOption.country}: ${formatDigitsRule(selectedTimezoneOption)}. Ingresaste ${phoneDigits.length}.`;

  const groupedTimezoneOptions = useMemo(() => {
    const query = String(timezoneSearch || "").trim().toLowerCase();
    const filtered = query
      ? COUNTRY_TIMEZONE_OPTIONS.filter((option) => {
          const searchable = `${option.country} ${option.timezone} ${option.region}`.toLowerCase();
          return searchable.includes(query);
        })
      : COUNTRY_TIMEZONE_OPTIONS;

    return groupTimezoneOptions(filtered);
  }, [timezoneSearch]);
  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === String(draft.serviceId)) || null,
    [services, draft.serviceId]
  );
  const requiredFeatureKeys = useMemo(
    () => uniqueFeatureKeys(selectedService?.requiredFeatureKeys || []),
    [selectedService]
  );
  const requiredFeatureLabels = featureLabels(requiredFeatureKeys);
  const roomCompatibility = useMemo(() => {
    return rooms.map((room) => {
      const roomFeatureKeys = uniqueFeatureKeys(room.featureKeys || []);
      const missingFeatureKeys = requiredFeatureKeys.filter((key) => !roomFeatureKeys.includes(key));
      return {
        room,
        missingFeatureKeys,
        missingFeatureLabels: featureLabels(missingFeatureKeys)
      };
    });
  }, [rooms, requiredFeatureKeys]);
  const compatibleRoomOptions = roomCompatibility.filter((entry) => entry.missingFeatureKeys.length === 0);
  const overrideRoomOptions = roomCompatibility.filter((entry) => entry.missingFeatureKeys.length > 0);
  const selectedRoomCompatibility =
    roomCompatibility.find((entry) => String(entry.room.id) === String(draft.roomId)) || null;
  const hasSelectedRoomWarning = selectedRoomCompatibility?.missingFeatureKeys.length > 0;
  const availabilityReady = Boolean(
    open &&
    tenantSlug &&
    draft.serviceId &&
    draft.date &&
    isPhoneValid
  );
  const selectedAvailabilitySlot = useMemo(
    () => availabilitySlots.find((slot) => String(slot.startsAt) === String(draft.startsAt)) || null,
    [availabilitySlots, draft.startsAt]
  );
  const groupedAvailabilitySlots = useMemo(() => {
    const groups = {
      morning: [],
      afternoon: []
    };

    for (const slot of availabilitySlots) {
      const hour = getHourInTimezone(slot.startsAt, draft.timezone);
      const target = hour < 13 ? "morning" : "afternoon";
      groups[target].push(slot);
    }

    return groups;
  }, [availabilitySlots, draft.timezone]);

  useEffect(() => {
    if (!availabilityReady) {
      setAvailabilityLoading(false);
      setAvailabilityError("");
      setAvailabilitySlots([]);
      return undefined;
    }

    const controller = new AbortController();

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError("");

      try {
        const response = await fetch("/api/public/booking/availability", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            tenantSlug,
            phoneE164: buildPhonePayload(phoneDigits, selectedTimezoneOption),
            serviceId: draft.serviceId,
            therapistId: draft.therapistId || null,
            date: draft.date,
            timezone: draft.timezone,
            stepMinutes: 30
          }),
          signal: controller.signal
        });
        const nextPayload = await response.json();

        if (!response.ok) {
          throw new Error(getErrorMessage(nextPayload));
        }

        setAvailabilitySlots(Array.isArray(nextPayload?.slots) ? nextPayload.slots : []);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        setAvailabilitySlots([]);
        setAvailabilityError(fetchError.message || "No se pudo consultar disponibilidad.");
      } finally {
        setAvailabilityLoading(false);
      }
    }

    loadAvailability();

    return () => {
      controller.abort();
    };
  }, [
    availabilityReady,
    tenantSlug,
    phoneDigits,
    selectedTimezoneOption,
    draft.serviceId,
    draft.therapistId,
    draft.date,
    draft.timezone
  ]);

  if (!open) {
    return null;
  }

  function updateField(field, value) {
    onChange((current) => ({
      ...current,
      [field]: value,
      ...(field === "serviceId" ||
        field === "date" ||
        field === "therapistId" ||
        field === "timezone" ||
        field === "phoneDigits"
        ? { startsAt: "" }
        : {})
    }));
  }

  function handleTimezoneSelect(option) {
    onChange((current) => ({
      ...current,
      timezone: option.timezone,
      phoneDigits: "",
      startsAt: ""
    }));
    setTimezoneSearch("");
    setTimezonePickerOpen(false);
  }

  return (
    <div className="confirm-overlay manual-modal-overlay" role="presentation" onClick={loading ? undefined : onClose}>
      <section
        className="manual-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Nueva cita manual"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="manual-modal-header">
          <div>
            <p className="confirm-kicker">Control</p>
            <h2>Nueva cita manual</h2>
            <span>Servicio primero. Terapeuta y sala quedan automaticos salvo override operativo.</span>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Cerrar nueva cita">
            <X size={18} weight="bold" />
          </button>
        </header>

        {!resourcesLoaded ? (
          <div className="manual-modal-body">
            <section className="manual-step" aria-label="Recursos de cita">
              <p className="manual-step-label">Recursos</p>
              {resourcesError ? (
                <p className="feedback error compact-feedback">{resourcesError}</p>
              ) : (
                <p className="feedback drawer-feedback">
                  {resourcesLoading ? "Cargando servicios, terapeutas y salas..." : "Preparando recursos de cita..."}
                </p>
              )}
            </section>
            <footer className="manual-modal-actions">
              <button type="button" className="confirm-secondary" onClick={onClose} disabled={loading}>
                Cerrar
              </button>
            </footer>
          </div>
        ) : (
          <form className="manual-modal-body" onSubmit={onSubmit}>
          <section className="manual-step" aria-label="Servicio">
            <p className="manual-step-label">1. Servicio</p>
            {services.length ? (
              <div className="manual-service-grid">
                {services.map((service) => {
                  const selected = String(draft.serviceId) === String(service.id);
                  return (
                    <button
                      key={`manual-service-card-${service.id}`}
                      type="button"
                      className={`manual-service-option${selected ? " is-selected" : ""}`}
                      onClick={() => updateField("serviceId", String(service.id))}
                    >
                      <strong>{service.name}</strong>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="manual-form-note">Carga recursos para habilitar servicios activos.</p>
            )}
          </section>

          <section className="manual-step" aria-label="Cliente">
            <p className="manual-step-label">2. Cliente</p>
            <div className="manual-fields-grid">
              <label className="client-filter-field" htmlFor="manual-first-name">
                <span>Nombre</span>
                <input
                  id="manual-first-name"
                  type="text"
                  value={draft.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  placeholder="Nombre"
                  required
                />
              </label>
              <label className="client-filter-field" htmlFor="manual-last-name">
                <span>Apellido</span>
                <input
                  id="manual-last-name"
                  type="text"
                  value={draft.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  placeholder="Apellido"
                  required
                />
              </label>
            </div>
          </section>

          <section className="manual-step" aria-label="Pais y WhatsApp">
            <p className="manual-step-label">3. Pais, zona horaria y WhatsApp</p>
            <div className="manual-timezone-grid">
              <div className="client-filter-field timezone-field">
                <span>Pais / zona horaria</span>
                <div className="timezone-picker">
                  <button
                    type="button"
                    className="timezone-trigger"
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
                                const isActive = option.timezone === selectedTimezoneOption.timezone;
                                return (
                                  <li key={option.timezone}>
                                    <button
                                      type="button"
                                      className={`timezone-option${isActive ? " is-active" : ""}`}
                                      onClick={() => handleTimezoneSelect(option)}
                                    >
                                      <span className="timezone-option-main">
                                        <span className="timezone-flag">{option.flag}</span>
                                        <span className="timezone-copy">
                                          <strong>{option.country}</strong>
                                          <span>{option.timezone}</span>
                                        </span>
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
              </div>

              <div className="manual-phone-field">
                <label className="client-filter-field" htmlFor="manual-phone-digits">
                  <span>WhatsApp {selectedTimezoneOption.dialCode}</span>
                  <input
                    id="manual-phone-digits"
                    type="tel"
                    inputMode="numeric"
                    value={draft.phoneDigits}
                    onChange={(event) => updateField("phoneDigits", normalizePhone(event.target.value))}
                    maxLength={selectedTimezoneOption.digitsMax}
                    placeholder={selectedTimezoneOption.example}
                    required
                  />
                </label>
                <p className={`phone-helper${!isPhoneValid && phoneDigits.length > 0 ? " is-invalid" : ""}`}>
                  {phoneHelper}
                </p>
              </div>
            </div>
          </section>

          <section className="manual-step" aria-label="Asignacion">
            <p className="manual-step-label">4. Horario y asignacion</p>
            <div className="manual-date-row">
              <button
                type="button"
                className="manual-date-step"
                onClick={() => updateField("date", shiftDateKey(draft.date, -1))}
              >
                Anterior
              </button>
              <label className="client-filter-field manual-date-field" htmlFor="manual-date">
                <span>Fecha</span>
                <input
                  id="manual-date"
                  type="date"
                  value={draft.date || ""}
                  onChange={(event) => updateField("date", event.target.value)}
                  required
                />
              </label>
              <button
                type="button"
                className="manual-date-step"
                onClick={() => updateField("date", shiftDateKey(draft.date, 1))}
              >
                Siguiente
              </button>
              <button
                type="button"
                className="manual-date-step"
                onClick={() => updateField("date", getDateKeyForTimezone(new Date(), draft.timezone))}
              >
                Hoy
              </button>
            </div>

            <div className="manual-fields-grid manual-assignment-grid">
              <label className="client-filter-field" htmlFor="manual-therapist">
                <span>Terapeuta</span>
                <select
                  id="manual-therapist"
                  className="control-input"
                  value={draft.therapistId}
                  onChange={(event) => updateField("therapistId", event.target.value)}
                >
                  <option value="">Automatico</option>
                  {therapists.map((therapist) => (
                    <option key={`manual-therapist-${therapist.id}`} value={String(therapist.id)}>
                      {therapist.displayName || therapist.fullName || `Terapeuta ${therapist.id}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="client-filter-field" htmlFor="manual-room">
                <span>Sala</span>
                <select
                  id="manual-room"
                  className="control-input"
                  value={draft.roomId}
                  onChange={(event) => updateField("roomId", event.target.value)}
                >
                  <option value="">Automatica</option>
                  {compatibleRoomOptions.length ? (
                    <optgroup label="Compatibles">
                      {compatibleRoomOptions.map(({ room }) => (
                        <option key={`manual-room-${room.id}`} value={String(room.id)}>
                          {room.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {overrideRoomOptions.length ? (
                    <optgroup label="Override requiere revision">
                      {overrideRoomOptions.map(({ room, missingFeatureLabels }) => (
                        <option key={`manual-room-${room.id}`} value={String(room.id)}>
                          {room.name} - falta {missingFeatureLabels.join(" y ")}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
            </div>
            <p className="timezone-help">
              {requiredFeatureLabels.length
                ? `Este servicio requiere ${requiredFeatureLabels.join(" y ")}. `
                : ""}
              Si no eliges terapeuta o sala, el backend asigna disponibilidad real con claims.
            </p>
            {hasSelectedRoomWarning ? (
              <p className="manual-room-warning" role="alert">
                Override: {selectedRoomCompatibility.room.name} no tiene{" "}
                {selectedRoomCompatibility.missingFeatureLabels.join(" ni ")} para este servicio.
              </p>
            ) : null}

            <div className="manual-slot-panel" aria-live="polite">
              {!tenantSlug ? (
                <p className="manual-slot-empty">No se pudo resolver el centro para consultar disponibilidad.</p>
              ) : !draft.serviceId ? (
                <p className="manual-slot-empty">Elige un servicio para ver horarios disponibles.</p>
              ) : !isPhoneValid ? (
                <p className="manual-slot-empty">Ingresa un WhatsApp valido para consultar disponibilidad real.</p>
              ) : availabilityLoading ? (
                <p className="manual-slot-empty">Consultando disponibilidad...</p>
              ) : availabilityError ? (
                <p className="manual-slot-empty is-error">{availabilityError}</p>
              ) : availabilitySlots.length === 0 ? (
                <p className="manual-slot-empty">
                  No hay slots disponibles para esta fecha con el servicio y terapeuta seleccionados.
                </p>
              ) : (
                <>
                  <div className="manual-slot-group">
                    <p>Mañana</p>
                    <div className="manual-slot-grid">
                      {groupedAvailabilitySlots.morning.length ? (
                        groupedAvailabilitySlots.morning.map((slot) => (
                          <button
                            key={`manual-slot-${slot.startsAt}`}
                            type="button"
                            className={`manual-slot-button${draft.startsAt === slot.startsAt ? " is-selected" : ""}`}
                            onClick={() => updateField("startsAt", slot.startsAt)}
                          >
                            <span className="manual-slot-time">{formatClock(slot.startsAt, draft.timezone)}</span>
                            <span className="manual-slot-meta">
                              {slot.therapistName} · {slot.roomName}
                            </span>
                          </button>
                        ))
                      ) : (
                        <span className="manual-slot-muted">Sin horarios.</span>
                      )}
                    </div>
                  </div>
                  <div className="manual-slot-group">
                    <p>Tarde</p>
                    <div className="manual-slot-grid">
                      {groupedAvailabilitySlots.afternoon.length ? (
                        groupedAvailabilitySlots.afternoon.map((slot) => (
                          <button
                            key={`manual-slot-${slot.startsAt}`}
                            type="button"
                            className={`manual-slot-button${draft.startsAt === slot.startsAt ? " is-selected" : ""}`}
                            onClick={() => updateField("startsAt", slot.startsAt)}
                          >
                            <span className="manual-slot-time">{formatClock(slot.startsAt, draft.timezone)}</span>
                            <span className="manual-slot-meta">
                              {slot.therapistName} · {slot.roomName}
                            </span>
                          </button>
                        ))
                      ) : (
                        <span className="manual-slot-muted">Sin horarios.</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {selectedAvailabilitySlot ? (
              <p className="manual-selected-slot">
                Seleccionado: {formatDateTime(selectedAvailabilitySlot.startsAt, draft.timezone)} ·{" "}
                {selectedAvailabilitySlot.therapistName} · {selectedAvailabilitySlot.roomName}
              </p>
            ) : null}
          </section>

          {error ? <p className="feedback error compact-feedback">{error}</p> : null}
          {success ? <p className="feedback subtle compact-feedback">{success}</p> : null}

          <footer className="manual-modal-actions">
            <button type="button" className="confirm-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              type="submit"
              className="confirm-primary"
              disabled={
                loading ||
                availabilityLoading ||
                !services.length ||
                !draft.serviceId ||
                !draft.firstName.trim() ||
                !draft.lastName.trim() ||
                !draft.startsAt ||
                !isPhoneValid
              }
            >
              {loading ? <CircleNotch size={16} className="spin" /> : null}
              <span>{loading ? "Creando..." : "Crear cita"}</span>
            </button>
          </footer>
          </form>
        )}
      </section>
    </div>
  );
}

const MemoManualAppointmentModal = React.memo(ManualAppointmentModal);

function StatusConfirmModal({ request, loading, onCancel, onConfirm }) {
  if (!request) return null;

  return (
    <div className="confirm-overlay" role="presentation" onClick={loading ? undefined : onCancel}>
      <section
        className="confirm-modal compact"
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar estado terminal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="confirm-header">
          <div className="confirm-icon is-warning">
            <WarningCircle size={22} weight="bold" />
          </div>
          <div>
            <p className="confirm-kicker">Estado terminal</p>
            <h2>Confirmar accion</h2>
          </div>
        </header>
        <div className="confirm-body">
          <p>
            Confirma cambiar esta cita a <strong>{ACTION_LABELS[request.nextStatus] || request.nextStatus}</strong>.
            Esta accion es terminal.
          </p>
        </div>
        <footer className="confirm-actions">
          <button type="button" className="confirm-secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="confirm-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <CircleNotch size={16} className="spin" /> : null}
            <span>Confirmar</span>
          </button>
        </footer>
      </section>
    </div>
  );
}

function ClientTable({
  clients,
  timezone,
  onSelect,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteOne,
  armedDeleteId,
  deleteLoading
}) {
  if (!clients.length) {
    return <p className="empty-state">No hay clientes para este filtro.</p>;
  }

  const allSelected = clients.length > 0 && clients.every((client) => selectedIds.has(client.id));

  return (
    <>
	      <div className="table-wrap ops-grid-wrap" role="region" aria-label="Tabla de clientes">
	        <table className="appointments-table clients-table ops-grid clients-grid">
	          <thead>
	            <tr>
              <th className="cell-check">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) =>
                    onToggleSelectAll(
                      clients.map((client) => client.id),
                      event.target.checked
                    )
                  }
                  aria-label="Seleccionar clientes visibles"
                />
              </th>
	              <th>Cliente</th>
		              <th>CRM</th>
		              <th>WhatsApp</th>
		              <th>Actividad</th>
		              <th>Próxima cita</th>
		              <th>Última cita</th>
		              <th>Ciudad</th>
		              <th>Origen</th>
		              <th>Onboarding</th>
		              <th>Total</th>
		              <th>Acción</th>
	            </tr>
	          </thead>
	          <tbody>
	            {clients.map((client) => {
		              const crmStatus = getClientCrmStatus(client, timezone);
		              const rowTone = crmStatus.tone;
		              return (
	                <tr key={client.id} className={`ops-grid-row is-${rowTone}`}>
	                  <td className="cell-check">
	                    <input
	                      type="checkbox"
	                      checked={selectedIds.has(client.id)}
	                      onChange={(event) => onToggleSelect(client.id, event.target.checked)}
	                      aria-label={`Seleccionar cliente ${client.fullName || client.id}`}
	                    />
	                  </td>
	                  <td>
		                    <GridClientIdentity
		                      name={client.fullName}
		                      tone={rowTone}
		                      asButton
		                      onClick={() => onSelect(client.id)}
		                      title="Abrir ficha cliente"
		                    />
		                  </td>
		                  <td>
		                    <ClientCrmCell status={crmStatus} />
		                  </td>
		                  <td>{client.whatsapp || "-"}</td>
		                  <td><ClientMetrics stats={client.stats} /></td>
		                  <td>{client.nextAppointment ? formatDateTime(client.nextAppointment.startsAt, timezone) : "-"}</td>
		                  <td>{client.lastAppointment ? formatDateTime(client.lastAppointment.startsAt, timezone) : "-"}</td>
		                  <td>{client.city || "-"}</td>
		                  <td>{client.source || "-"}</td>
		                  <td>
		                    <span className={`inline-tag ${client.onboardingComplete ? "settings-booking-ready" : "ops-onboarding-tag"}`}>
		                      {client.onboardingComplete ? "Completo" : "Pendiente"}
		                    </span>
		                  </td>
		                  <td className="ops-total-cell">{client.stats?.totalAppointments || 0}</td>
		                  <td>
		                    <button
		                      type="button"
		                      className={`danger-button${armedDeleteId === client.id ? " is-armed" : ""}`}
		                      onClick={() => onDeleteOne(client.id)}
		                      disabled={deleteLoading}
		                    >
		                      <Trash size={14} weight="regular" aria-hidden="true" />
		                      <span>{armedDeleteId === client.id ? "¿Borrar?" : "Borrar"}</span>
		                    </button>
		                  </td>
	                </tr>
	              );
	            })}
          </tbody>
        </table>
      </div>

      <ul className="appointments-cards" aria-label="Lista de clientes mobile">
        {clients.map((client) => {
          const crmStatus = getClientCrmStatus(client, timezone);
          return (
          <li key={`client-mobile-${client.id}`} className="appointment-card">
            <label className="inline-check">
              <input
                type="checkbox"
                checked={selectedIds.has(client.id)}
                onChange={(event) => onToggleSelect(client.id, event.target.checked)}
              />
              <span>Seleccionar</span>
            </label>
            <button type="button" className="card-open" onClick={() => onSelect(client.id)}>
              <span className="appointment-title">{client.fullName || "Sin nombre"}</span>
              <span className={`inline-tag ops-crm-tag is-${crmStatus.tone}`}>{crmStatus.label}</span>
            </button>
            <p className="appointment-line">WhatsApp: {client.whatsapp || "-"}</p>
            <p className="appointment-line">
              CRM: {crmStatus.label} · {crmStatus.reason}
            </p>
            <p className="appointment-line">Ciudad: {client.city || "-"}</p>
            <p className="appointment-line">Origen: {client.source || "-"}</p>
            <p className="appointment-line">Onboarding: {client.onboardingComplete ? "Completo" : "Pendiente"}</p>
            <p className="appointment-line">Total citas: {client.stats?.totalAppointments || 0}</p>
            <p className="appointment-line">
              Próxima: {client.nextAppointment ? formatDateTime(client.nextAppointment.startsAt, timezone) : "-"}
            </p>
            <p className="appointment-line">
              Última: {client.lastAppointment ? formatDateTime(client.lastAppointment.startsAt, timezone) : "-"}
            </p>
            <button
              type="button"
              className={`danger-button${armedDeleteId === client.id ? " is-armed" : ""}`}
              onClick={() => onDeleteOne(client.id)}
              disabled={deleteLoading}
            >
              <Trash size={14} weight="regular" aria-hidden="true" />
              <span>{armedDeleteId === client.id ? "¿Borrar?" : "Borrar"}</span>
            </button>
          </li>
          );
        })}
      </ul>
    </>
  );
}

function ClientDrawer({ open, detail, loading, error, timezone, onClose }) {
  if (!open) {
    return null;
  }

  const client = detail?.client || null;
  const history = detail?.appointmentsHistory || [];
  const payments = detail?.payments || [];
  const whatsappDigits = sanitizePhoneForWa(client?.whatsapp);

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de cliente"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p className="drawer-kicker">Ficha cliente</p>
            <h2>{client?.fullName || "Cliente"}</h2>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Cerrar cliente">
            <X size={18} weight="bold" />
          </button>
        </header>

        {loading ? (
          <p className="feedback drawer-feedback">Cargando cliente...</p>
        ) : null}

        {!loading && error ? <p className="feedback error drawer-feedback">{error}</p> : null}

        {!loading && !error && client ? (
          <div className="drawer-body">
            <DrawerSection title="Datos">
              <dl className="drawer-grid">
                <dt>Nombre</dt>
                <dd>{client.fullName || "-"}</dd>
                <dt>WhatsApp</dt>
                <dd>
                  {client.whatsapp || "-"}
                  {whatsappDigits ? (
                    <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer" className="drawer-link">
                      Abrir chat
                    </a>
                  ) : null}
                </dd>
                <dt>First name</dt>
                <dd>{client.firstName || "-"}</dd>
                <dt>Last name</dt>
                <dd>{client.lastName || "-"}</dd>
                <dt>Edad</dt>
                <dd>{client.age ?? "-"}</dd>
                <dt>Ciudad</dt>
                <dd>{client.city || "-"}</dd>
                <dt>Fuente</dt>
                <dd>{client.source || "-"}</dd>
                <dt>Onboarding</dt>
                <dd>{client.onboardingComplete ? "Completo" : "Incompleto"}</dd>
                <dt>Onboarding at</dt>
                <dd>{formatDateTime(client.onboardingCompletedAt, timezone)}</dd>
                <dt>Creado</dt>
                <dd>{formatDateTime(client.createdAt, timezone)}</dd>
              </dl>
            </DrawerSection>

            <DrawerSection title="Stats citas">
              <ul className="client-stats-list">
                <li><span>Total</span><strong>{client.stats?.totalAppointments || 0}</strong></li>
                <li><span>Pendientes</span><strong>{client.stats?.pendingCount || 0}</strong></li>
                <li><span>Confirmadas</span><strong>{client.stats?.confirmedCount || 0}</strong></li>
                <li><span>Completadas</span><strong>{client.stats?.completedCount || 0}</strong></li>
                <li><span>Canceladas</span><strong>{client.stats?.cancelledCount || 0}</strong></li>
                <li><span>No asistió</span><strong>{client.stats?.noShowCount || 0}</strong></li>
              </ul>
            </DrawerSection>

            <DrawerSection title="Próxima / Última cita">
              <ul className="drawer-list">
                <li>
                  <span>Próxima</span>
                  <span>
                    {client.nextAppointment ? formatDateTime(client.nextAppointment.startsAt, timezone) : "-"}
                  </span>
                </li>
                <li>
                  <span>Última</span>
                  <span>
                    {client.lastAppointment ? formatDateTime(client.lastAppointment.startsAt, timezone) : "-"}
                  </span>
                </li>
              </ul>
            </DrawerSection>

            <DrawerSection title="Historial citas">
              {history.length ? (
                <ul className="drawer-list">
                  {history.map((appointment) => (
                    <li key={appointment.id}>
                      <span>
                        {appointment.serviceName || "-"} · {appointment.status}
                      </span>
                      <span>{formatDateTime(appointment.startsAt, timezone)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state compact">Sin historial de citas.</p>
              )}
            </DrawerSection>

            <DrawerSection title="Pagos">
              {payments.length ? (
                <ul className="drawer-list">
                  {payments.map((payment) => (
                    <li key={payment.id}>
                      <span>
                        {payment.status} · {payment.amount} {payment.currencyCode}
                      </span>
                      <span>{formatDateTime(payment.createdAt, timezone)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state compact">Sin pagos registrados.</p>
              )}
            </DrawerSection>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

const THERAPIST_DAY_ORDER = {
  Dom: 0,
  Lun: 1,
  Mar: 2,
  Mie: 3,
  Jue: 4,
  Vie: 5,
  Sab: 6
};

function getTherapistStatusMeta(therapist) {
  const status = normalizeResourceStatus(therapist?.status, therapist?.isActive === true);
  return {
    status,
    statusLabel: therapist?.statusLabel || getStatusLabelFromValue(status)
  };
}

function normalizeTherapistServices(services) {
  if (!Array.isArray(services)) {
    return [];
  }

  return services
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const serviceId = Number(entry.id || 0);
        return {
          id: Number.isInteger(serviceId) ? serviceId : 0,
          name: String(entry.name || "").trim()
        };
      }

      return {
        id: 0,
        name: String(entry || "").trim()
      };
    })
    .filter((entry) => entry.name);
}

function normalizeTherapistScheduleGroups(therapist) {
  const scheduleGroups = Array.isArray(therapist?.schedulesByDay) ? therapist.schedulesByDay : [];

  if (scheduleGroups.length) {
    return scheduleGroups
      .map((entry) => {
        const days = Array.isArray(entry?.days)
          ? entry.days.filter(Boolean).map((day) => String(day))
          : [];
        const daysLabel = String(entry?.daysLabel || days.join(", ") || "-");
        const normalizedStatus = normalizeResourceStatus(
          entry?.status,
          String(entry?.statusLabel || "").toLowerCase() === "activo"
        );

        const [startRaw, endRaw] = String(entry?.timeRange || "").split("-");
        const startLabel = compactTimeLabel(startRaw || "--:--");
        const endLabel = compactTimeLabel(endRaw || "--:--");
        const timeRange = `${startLabel}-${endLabel}`;
        const firstDay = days[0] || String(daysLabel).split(",")[0].trim();

        return {
          timeRange,
          days,
          daysLabel,
          slotMinutes: Number(entry?.slotMinutes || 60),
          status: normalizedStatus,
          statusLabel: entry?.statusLabel || getStatusLabelFromValue(normalizedStatus),
          _firstDay: THERAPIST_DAY_ORDER[firstDay] ?? 99
        };
      })
      .sort((left, right) => {
        if (left._firstDay !== right._firstDay) {
          return left._firstDay - right._firstDay;
        }

        if (left.timeRange !== right.timeRange) {
          return left.timeRange.localeCompare(right.timeRange);
        }

        if (left.status !== right.status) {
          return left.status === "ACTIVE" ? -1 : 1;
        }

        return left.slotMinutes - right.slotMinutes;
      })
      .map((entry) => {
        const { _firstDay, ...cleaned } = entry;
        return cleaned;
      });
  }

  const rawSchedules = Array.isArray(therapist?.schedules) ? therapist.schedules : [];
  const grouped = new Map();

  for (const slot of rawSchedules) {
    const dayLabel = String(slot?.dayLabel || "-");
    const weekday = Number(slot?.weekday);
    const startLabel = compactTimeLabel(slot?.startTime || "--:--");
    const endLabel = compactTimeLabel(slot?.endTime || "--:--");
    const timeRange = `${startLabel}-${endLabel}`;
    const normalizedStatus = normalizeResourceStatus(slot?.status, slot?.isActive === true);
    const key = `${timeRange}|${slot?.slotMinutes || 60}|${normalizedStatus}`;
    const existing = grouped.get(key) || {
      timeRange,
      slotMinutes: Number(slot?.slotMinutes || 60),
      status: normalizedStatus,
      statusLabel: slot?.statusLabel || getStatusLabelFromValue(normalizedStatus),
      days: [],
      weekdays: []
    };

    if (!existing.days.includes(dayLabel)) {
      existing.days.push(dayLabel);
      existing.weekdays.push(Number.isInteger(weekday) ? weekday : THERAPIST_DAY_ORDER[dayLabel] ?? 99);
    }

    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map((entry) => {
      const sortedDays = entry.days
        .map((dayLabel, index) => ({
          dayLabel,
          weekday: entry.weekdays[index]
        }))
        .sort((left, right) => left.weekday - right.weekday);
      const days = sortedDays.map((pair) => pair.dayLabel);

      return {
        timeRange: entry.timeRange,
        days,
        daysLabel: days.join(", "),
        slotMinutes: entry.slotMinutes,
        status: entry.status,
        statusLabel: entry.statusLabel,
        _firstDay: sortedDays[0]?.weekday ?? 99
      };
    })
    .sort((left, right) => {
      if (left._firstDay !== right._firstDay) {
        return left._firstDay - right._firstDay;
      }
      return left.timeRange.localeCompare(right.timeRange);
    })
    .map((entry) => {
      const { _firstDay, ...cleaned } = entry;
      return cleaned;
    });
}

function buildAvailabilityTimeOptions() {
  const options = [];
  for (let minutes = 0; minutes <= (23 * 60) + 30; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    options.push(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
  }
  return options;
}

const AVAILABILITY_TIME_OPTIONS = buildAvailabilityTimeOptions();

function compactAvailabilityTime(value, fallback = "09:00") {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):([0-5]\d)/);
  if (!match) {
    return fallback;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || hours < 0 || hours > 23 || ![0, 30].includes(minutes)) {
    return fallback;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addAvailabilityMinutes(timeValue, minutesToAdd) {
  const [hours, minutes] = compactAvailabilityTime(timeValue).split(":").map(Number);
  const total = Math.min((23 * 60) + 30, Math.max(0, (hours * 60) + minutes + minutesToAdd));
  const nextHours = Math.floor(total / 60);
  const nextMinutes = total % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function createAvailabilityDays(schedules = []) {
  const rangesByWeekday = new Map();

  for (const schedule of Array.isArray(schedules) ? schedules : []) {
    const weekday = Number(schedule?.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      continue;
    }

    const range = {
      startTime: compactAvailabilityTime(schedule.startTime),
      endTime: compactAvailabilityTime(schedule.endTime, "17:00")
    };

    if (!rangesByWeekday.has(weekday)) {
      rangesByWeekday.set(weekday, []);
    }
    rangesByWeekday.get(weekday).push(range);
  }

  return THERAPIST_WEEKDAYS.map((day) => {
    const ranges = (rangesByWeekday.get(day.weekday) || [])
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
    return {
      ...day,
      isActive: ranges.length > 0,
      ranges
    };
  });
}

function splitVisibleItems(items, maxVisible) {
  const safeItems = Array.isArray(items) ? items : [];
  const visible = safeItems.slice(0, maxVisible);
  return {
    visible,
    hiddenCount: Math.max(safeItems.length - visible.length, 0)
  };
}

function getTherapistInitials(therapist) {
  const avatarInitials = String(therapist?.avatar?.initials || "").trim();
  if (avatarInitials) {
    return avatarInitials.slice(0, 3).toUpperCase();
  }

  const displayName = String(therapist?.displayName || therapist?.fullName || "").trim();
  if (!displayName) {
    return "--";
  }

  const words = displayName.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  return displayName[0].toUpperCase();
}

function getTherapistAvatarImageUrl(therapist) {
  const imageUrl = String(therapist?.avatar?.imageUrl || therapist?.photoUrl || "").trim();
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("/") || imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return "";
}

function TherapistAvatar({ therapist, className }) {
  const imageUrl = getTherapistAvatarImageUrl(therapist);
  const initials = getTherapistInitials(therapist);

  return (
    <span className={className} aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : initials}
    </span>
  );
}

function getTherapistSchedulePreview(therapist) {
  const schedulesByDay = normalizeTherapistScheduleGroups(therapist);
  if (!schedulesByDay.length) {
    return {
      summary: "Sin horario base",
      extraCount: 0
    };
  }

  const first = schedulesByDay[0];
  return {
    summary: `${first.daysLabel} ${first.timeRange}`,
    extraCount: Math.max(schedulesByDay.length - 1, 0)
  };
}

function TherapistsGrid({ therapists, onSelect }) {
  if (!therapists.length) {
    return <p className="empty-state">No hay terapeutas para este filtro.</p>;
  }

  return (
    <div className="therapists-grid" role="list" aria-label="Directorio de terapeutas">
      {therapists.map((therapist) => {
        const statusMeta = getTherapistStatusMeta(therapist);
        const services = normalizeTherapistServices(therapist?.services);
        const visibleServices = splitVisibleItems(services, 4);
        const schedulePreview = getTherapistSchedulePreview(therapist);
        const displayName = therapist.displayName || therapist.fullName || "Terapeuta sin nombre";
        const compatibleRoomsCount = Number(therapist?.compatibleRoomsCount ?? 0);
        const servicesCount = Number(therapist?.servicesCount ?? services.length ?? 0);

        return (
          <button
            key={`therapist-card-${therapist.id}`}
            type="button"
            className={`therapist-grid-card${statusMeta.status === "INACTIVE" ? " is-inactive" : ""}`}
            onClick={() => onSelect?.(therapist.id)}
            aria-label={`Abrir perfil de ${displayName}`}
          >
            <div className="therapist-grid-top">
              <TherapistAvatar therapist={therapist} className="therapist-avatar" />
              <div className="therapist-identity">
                <h3>{displayName}</h3>
                <p>
                  Terapeuta
                  {therapist?.slug ? <span> · #{therapist.slug}</span> : null}
                </p>
              </div>
              <StatusChip status={statusToChipKey(statusMeta.status)} />
            </div>

            <div className="therapist-grid-stats" aria-label="Resumen operativo">
              <div className="therapist-grid-stat">
                <span>Servicios</span>
                <strong>{servicesCount}</strong>
              </div>
              <div className="therapist-grid-stat">
                <span>Salas compatibles</span>
                <strong>{compatibleRoomsCount}</strong>
              </div>
            </div>

            <div className="therapist-grid-tags">
              {visibleServices.visible.length
                ? visibleServices.visible.map((service) => (
                    <span key={`therapist-chip-${therapist.id}-${service.id || service.name}`} className="inline-tag therapist-service-chip">
                      {service.name}
                    </span>
                  ))
                : <span className="inline-tag therapist-service-chip is-empty">Sin servicios</span>}
              {visibleServices.hiddenCount > 0 ? (
                <span className="inline-tag therapist-service-chip therapist-service-chip-more">+{visibleServices.hiddenCount}</span>
              ) : null}
            </div>

            <div className="therapist-grid-foot">
              <span>{schedulePreview.summary}</span>
              <span className="therapist-grid-foot-tail">
                {schedulePreview.extraCount > 0 ? `+${schedulePreview.extraCount} mas` : null}
                <CaretRight size={14} weight="bold" aria-hidden="true" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TherapistsReadonlyView({
  payload,
  generatedAtLabel,
  onRefresh,
  isLoading,
  isRefreshing,
  isStale,
  errorMessage,
  authToken,
  onUnauthorized,
  onSelect
}) {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createFeedback, setCreateFeedback] = useState("");
  const therapists = Array.isArray(payload?.therapists) ? payload.therapists : [];
  const summary = payload?.summary || {
    total: therapists.length,
    active: therapists.filter((entry) => normalizeResourceStatus(entry?.status, entry?.isActive === true) === "ACTIVE").length,
    inactive: therapists.filter((entry) => normalizeResourceStatus(entry?.status, entry?.isActive === true) === "INACTIVE").length
  };

  const filteredTherapists = useMemo(() => {
    const query = String(searchValue || "").trim().toLowerCase();
    const statusValue = String(statusFilter || "all").trim().toLowerCase();

    return therapists.filter((therapist) => {
      const status = normalizeResourceStatus(therapist?.status, therapist?.isActive === true);
      const statusMatches =
        statusValue === "all" ||
        (statusValue === "active" && status === "ACTIVE") ||
        (statusValue === "inactive" && status === "INACTIVE");

      if (!statusMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      const services = normalizeTherapistServices(therapist?.services);
      const schedulesByDay = normalizeTherapistScheduleGroups(therapist);
      const haystack = [
        therapist?.displayName,
        therapist?.fullName,
        therapist?.contactSummary,
        therapist?.phone,
        therapist?.telegramChatId ? "telegram" : "",
        ...services.map((service) => service.name),
        ...schedulesByDay.map((slot) => `${slot.daysLabel} ${slot.timeRange}`),
        therapist?.statusLabel
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [therapists, searchValue, statusFilter]);

  const resetCreateTherapist = useCallback(() => {
    setCreateFullName("");
    setCreateDisplayName("");
    setCreatePhone("");
    setCreateIsActive(true);
    setCreateError("");
  }, []);

  const openCreateTherapist = useCallback(() => {
    resetCreateTherapist();
    setCreateFeedback("");
    setCreateDrawerOpen(true);
  }, [resetCreateTherapist]);

  const closeCreateTherapist = useCallback(() => {
    setCreateDrawerOpen(false);
    resetCreateTherapist();
  }, [resetCreateTherapist]);

  const saveCreateTherapist = useCallback(async () => {
    if (createLoading) {
      return;
    }

    setCreateLoading(true);
    setCreateError("");
    setCreateFeedback("");

    try {
      const response = await fetch("/api/admin/therapists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          fullName: createFullName.trim(),
          displayName: createDisplayName.trim(),
          phone: createPhone.trim(),
          isActive: createIsActive
        })
      });
      const nextPayload = await response.json();

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(nextPayload));
      }

      setCreateFeedback("Terapeuta creado.");
      closeCreateTherapist();
      onRefresh?.();
    } catch (requestError) {
      setCreateError(requestError.message || "No se pudo crear el terapeuta.");
    } finally {
      setCreateLoading(false);
    }
  }, [
    authToken,
    closeCreateTherapist,
    createDisplayName,
    createFullName,
    createIsActive,
    createLoading,
    createPhone,
    onRefresh,
    onUnauthorized
  ]);

  return (
    <section className="therapists-shell" aria-label="Terapeutas operativos">
      <header className="therapists-header">
        <div>
          <h2>Terapeutas</h2>
          <p>Configuracion operativa de terapeutas, servicios compatibles y horarios base.</p>
        </div>
        <div className="therapists-header-meta">
          <span className="settings-chip">Actualizado: {generatedAtLabel}</span>
          <span className="settings-chip">Total: {summary.total || 0}</span>
          <span className="settings-chip">Activos: {summary.active || 0}</span>
          <span className="settings-chip">Inactivos: {summary.inactive || 0}</span>
        </div>
      </header>

      <section className="panel therapists-panel" aria-label="Vista de terapeutas">
        <div className="therapists-toolbar">
          <label className="settings-search-field therapists-search-field" htmlFor="therapists-search">
            <MagnifyingGlass size={16} aria-hidden="true" />
            <input
              id="therapists-search"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar terapeuta..."
            />
          </label>

          <label className="settings-status-field therapists-status-field" htmlFor="therapists-status-filter">
            <span>Estado</span>
            <select
              id="therapists-status-filter"
              className="control-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>

          <p className="settings-counter therapists-counter" aria-live="polite">
            {filteredTherapists.length} resultados
          </p>

          <button
            type="button"
            className="refresh-button therapists-refresh-button"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
          >
            <ArrowsClockwise size={15} weight="bold" aria-hidden="true" className={isLoading || isRefreshing ? "spin" : ""} />
            <span>{isLoading || isRefreshing ? "Actualizando..." : "Actualizar"}</span>
          </button>

          <button
            type="button"
            className="refresh-button therapists-refresh-button"
            onClick={openCreateTherapist}
          >
            Nuevo terapeuta
          </button>
        </div>

        {isRefreshing ? (
          <p className="feedback subtle settings-feedback">Actualizando terapeutas en segundo plano...</p>
        ) : null}
        {createFeedback ? (
          <p className="feedback subtle settings-feedback">{createFeedback}</p>
        ) : null}
        {isStale ? (
          <p className="feedback error settings-feedback">
            No se pudo refrescar Terapeutas. Mostrando la última carga válida.
            {errorMessage ? ` (${errorMessage})` : ""}
          </p>
        ) : null}
        {isLoading && !therapists.length ? <p className="feedback">Cargando terapeutas...</p> : null}
        {errorMessage && !therapists.length ? <p className="feedback error">{errorMessage}</p> : null}

        {!isLoading && !errorMessage && !therapists.length ? (
          <p className="empty-state">Sin terapeutas disponibles para este centro.</p>
        ) : null}
        {therapists.length && !filteredTherapists.length ? (
          <p className="empty-state">Sin resultados para el filtro actual.</p>
        ) : null}
        {filteredTherapists.length ? (
          <TherapistsGrid therapists={filteredTherapists} onSelect={onSelect} />
        ) : null}
      </section>

      <TherapistCreateDrawer
        open={createDrawerOpen}
        fullName={createFullName}
        displayName={createDisplayName}
        phone={createPhone}
        isActive={createIsActive}
        loading={createLoading}
        error={createError}
        onChangeFullName={setCreateFullName}
        onChangeDisplayName={setCreateDisplayName}
        onChangePhone={setCreatePhone}
        onChangeIsActive={setCreateIsActive}
        onSave={saveCreateTherapist}
        onClose={closeCreateTherapist}
      />
    </section>
  );
}

function TherapistCreateDrawer({
  open,
  fullName,
  displayName,
  phone,
  isActive,
  loading,
  error,
  onChangeFullName,
  onChangeDisplayName,
  onChangePhone,
  onChangeIsActive,
  onSave,
  onClose
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="drawer settings-editor-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Crear terapeuta"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p className="drawer-kicker">Crear terapeuta</p>
            <h2>Nuevo terapeuta</h2>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Cerrar terapeuta">
            <X size={18} weight="bold" />
          </button>
        </header>

        <div className="drawer-body settings-editor-body">
          <div className="settings-editor-grid">
            <label className="client-filter-field" htmlFor="therapist-create-full-name">
              <span>Nombre completo</span>
              <input
                id="therapist-create-full-name"
                type="text"
                value={fullName}
                onChange={(event) => onChangeFullName(event.target.value)}
                placeholder="Nombre terapeuta"
              />
            </label>

            <label className="client-filter-field" htmlFor="therapist-create-display-name">
              <span>Nombre visible</span>
              <input
                id="therapist-create-display-name"
                type="text"
                value={displayName}
                onChange={(event) => onChangeDisplayName(event.target.value)}
                placeholder="Opcional"
              />
            </label>

            <label className="client-filter-field" htmlFor="therapist-create-phone">
              <span>Telefono</span>
              <input
                id="therapist-create-phone"
                type="tel"
                value={phone}
                onChange={(event) => onChangePhone(event.target.value)}
                placeholder="59171234567"
              />
            </label>
          </div>

          <label className={`settings-room-status-toggle${isActive ? " is-active" : ""}`}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => onChangeIsActive(event.target.checked)}
            />
            <span className="settings-room-status-control" aria-hidden="true" />
            <span>{isActive ? "Terapeuta activo" : "Terapeuta inactivo"}</span>
          </label>

          <div className="manual-form-actions settings-editor-actions">
            <button
              type="button"
              className="refresh-button"
              onClick={onSave}
              disabled={loading || !fullName.trim()}
            >
              {loading ? "Guardando..." : "Crear terapeuta"}
            </button>
            <button type="button" className="logout-button" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
          </div>

          {error ? (
            <p className="feedback error compact-feedback">{error}</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function TherapistDrawer({
  open,
  detail,
  loading,
  error,
  authToken,
  onClose,
  onUnauthorized,
  onAvailabilitySaved
}) {
  const [activeTab, setActiveTab] = useState("profile");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileTelegram, setProfileTelegram] = useState("");
  const [profileIsActive, setProfileIsActive] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileFeedback, setProfileFeedback] = useState("");
  const [availabilityDays, setAvailabilityDays] = useState(() => createAvailabilityDays([]));
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityFeedback, setAvailabilityFeedback] = useState("");
  const [serviceMutationId, setServiceMutationId] = useState(null);
  const [serviceMutationError, setServiceMutationError] = useState("");
  const [serviceMutationFeedback, setServiceMutationFeedback] = useState("");
  const [copySourceWeekday, setCopySourceWeekday] = useState(null);
  const [copyTargetWeekdays, setCopyTargetWeekdays] = useState([]);
  const therapist = detail?.therapist || null;
  const services = Array.isArray(detail?.services) ? detail.services : [];
  const operationServices = Array.isArray(detail?.availableServices) && detail.availableServices.length
    ? detail.availableServices
    : services;
  const assignedServicesCount = operationServices.filter((service) => service?.relationIsActive === true && service?.isActive !== false).length;
  const schedules = Array.isArray(detail?.schedules) ? detail.schedules : [];
  const hasActiveAvailability = schedules.some((slot) => slot?.isActive === true || normalizeResourceStatus(slot?.status, slot?.isActive === true) === "ACTIVE");
  const operationIssues = [
    assignedServicesCount > 0 && !hasActiveAvailability
      ? "Tiene servicios activos, pero no tiene disponibilidad activa."
      : null,
    ...operationServices
      .filter((service) => service?.relationIsActive === true && service?.isActive !== false && Number(service?.compatibleRoomsCount ?? 1) === 0)
      .map((service) => `${service.name || "Servicio"} no tiene sala compatible activa.`)
  ].filter(Boolean);
  const scheduleGroups = normalizeTherapistScheduleGroups({ schedulesByDay: [], schedules });
  const statusMeta = getTherapistStatusMeta(therapist);
  const therapistName = therapist?.displayName || therapist?.fullName || "Terapeuta";

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab("profile");
    setProfileError("");
    setProfileFeedback("");
    setAvailabilityError("");
    setAvailabilityFeedback("");
    setServiceMutationId(null);
    setServiceMutationError("");
    setServiceMutationFeedback("");
    setCopySourceWeekday(null);
    setCopyTargetWeekdays([]);
  }, [open, therapist?.id]);

  useEffect(() => {
    if (!open || !therapist) {
      return;
    }

    setProfileFullName(therapist.fullName || "");
    setProfileDisplayName(therapist.displayName || therapist.fullName || "");
    setProfilePhone(therapist.phone || "");
    setProfileTelegram(therapist.telegramChatId || "");
    setProfileIsActive(therapist.isActive !== false);
  }, [open, therapist]);

  useEffect(() => {
    if (!open || !therapist) {
      return;
    }

    setAvailabilityDays(createAvailabilityDays(schedules));
  }, [open, therapist?.id, schedules]);

  const updateAvailabilityDay = useCallback((weekday, updater) => {
    setAvailabilityDays((current) =>
      current.map((day) => {
        if (day.weekday !== weekday) {
          return day;
        }
        return updater(day);
      })
    );
  }, []);

  const toggleAvailabilityDay = useCallback((weekday, checked) => {
    updateAvailabilityDay(weekday, (day) => ({
      ...day,
      isActive: checked,
      ranges: checked && day.ranges.length === 0
        ? [{ startTime: "09:00", endTime: "17:00" }]
        : day.ranges
    }));
  }, [updateAvailabilityDay]);

  const addAvailabilityRange = useCallback((weekday) => {
    updateAvailabilityDay(weekday, (day) => {
      const lastRange = day.ranges[day.ranges.length - 1] || null;
      const startTime = lastRange ? lastRange.endTime : "09:00";
      const endTime = addAvailabilityMinutes(startTime, 60);
      return {
        ...day,
        isActive: true,
        ranges: [
          ...day.ranges,
          {
            startTime,
            endTime: endTime === startTime ? addAvailabilityMinutes(startTime, 30) : endTime
          }
        ]
      };
    });
  }, [updateAvailabilityDay]);

  const removeAvailabilityRange = useCallback((weekday, rangeIndex) => {
    updateAvailabilityDay(weekday, (day) => {
      const ranges = day.ranges.filter((_, index) => index !== rangeIndex);
      return {
        ...day,
        isActive: ranges.length > 0,
        ranges
      };
    });
  }, [updateAvailabilityDay]);

  const changeAvailabilityRange = useCallback((weekday, rangeIndex, field, value) => {
    updateAvailabilityDay(weekday, (day) => ({
      ...day,
      ranges: day.ranges.map((range, index) => (
        index === rangeIndex ? { ...range, [field]: value } : range
      ))
    }));
  }, [updateAvailabilityDay]);

  const openCopyAvailability = useCallback((weekday) => {
    setCopySourceWeekday((current) => (current === weekday ? null : weekday));
    setCopyTargetWeekdays([]);
  }, []);

  const toggleCopyTarget = useCallback((weekday, checked) => {
    setCopyTargetWeekdays((current) => {
      if (checked) {
        return current.includes(weekday) ? current : [...current, weekday];
      }
      return current.filter((item) => item !== weekday);
    });
  }, []);

  const applyCopyAvailability = useCallback(() => {
    const sourceDay = availabilityDays.find((day) => day.weekday === copySourceWeekday);
    if (!sourceDay) {
      return;
    }

    const copiedRanges = sourceDay.ranges.map((range) => ({ ...range }));
    setAvailabilityDays((current) =>
      current.map((day) => (
        copyTargetWeekdays.includes(day.weekday)
          ? { ...day, isActive: copiedRanges.length > 0, ranges: copiedRanges.map((range) => ({ ...range })) }
          : day
      ))
    );
    setCopySourceWeekday(null);
    setCopyTargetWeekdays([]);
  }, [availabilityDays, copySourceWeekday, copyTargetWeekdays]);

  const saveAvailability = useCallback(async () => {
    if (!therapist?.id || availabilitySaving) {
      return;
    }

    setAvailabilitySaving(true);
    setAvailabilityError("");
    setAvailabilityFeedback("");

    try {
      const response = await fetch(`/api/admin/therapists/${therapist.id}/availability`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          days: availabilityDays.map((day) => ({
            weekday: day.weekday,
            isActive: day.isActive,
            ranges: day.ranges
          }))
        })
      });
      const payload = await response.json();

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payload));
      }

      setAvailabilityFeedback("Disponibilidad actualizada.");
      onAvailabilitySaved?.(payload);
    } catch (requestError) {
      setAvailabilityError(requestError.message || "No se pudo guardar disponibilidad.");
    } finally {
      setAvailabilitySaving(false);
    }
  }, [
    authToken,
    availabilityDays,
    availabilitySaving,
    onAvailabilitySaved,
    onUnauthorized,
    therapist?.id
  ]);

  const toggleTherapistService = useCallback(async (service, nextIsActive) => {
    if (!therapist?.id || !service?.id || serviceMutationId) {
      return;
    }

    setServiceMutationId(service.id);
    setServiceMutationError("");
    setServiceMutationFeedback("");

    try {
      const response = await fetch(`/api/admin/therapists/${therapist.id}/services/${service.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isActive: nextIsActive })
      });

      if (response.status === 401) {
        onUnauthorized?.();
        throw new Error("Sesion expirada. Vuelve a entrar.");
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || "No se pudo actualizar el servicio.");
      }

      setServiceMutationFeedback(nextIsActive ? "Servicio asignado." : "Servicio desactivado.");
      onAvailabilitySaved?.(payload);
    } catch (saveError) {
      setServiceMutationError(saveError.message || "No se pudo actualizar el servicio.");
    } finally {
      setServiceMutationId(null);
    }
  }, [
    authToken,
    onAvailabilitySaved,
    onUnauthorized,
    serviceMutationId,
    therapist?.id
  ]);

  const saveProfile = useCallback(async () => {
    if (!therapist?.id || profileSaving) {
      return;
    }

    setProfileSaving(true);
    setProfileError("");
    setProfileFeedback("");

    try {
      const response = await fetch(`/api/admin/therapists/${therapist.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: profileFullName.trim(),
          displayName: profileDisplayName.trim(),
          phone: profilePhone.trim(),
          telegramChatId: profileTelegram.trim(),
          isActive: profileIsActive
        })
      });

      if (response.status === 401) {
        onUnauthorized?.();
        throw new Error("Sesion expirada. Vuelve a entrar.");
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || "No se pudo actualizar el perfil.");
      }

      setProfileFeedback("Perfil actualizado.");
      onAvailabilitySaved?.(payload);
    } catch (saveError) {
      setProfileError(saveError.message || "No se pudo actualizar el perfil.");
    } finally {
      setProfileSaving(false);
    }
  }, [
    authToken,
    onAvailabilitySaved,
    onUnauthorized,
    profileDisplayName,
    profileFullName,
    profileIsActive,
    profilePhone,
    profileSaving,
    profileTelegram,
    therapist?.id
  ]);

  if (!open) {
    return null;
  }

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="drawer therapist-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Ficha terapeuta"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header therapist-drawer-header" id="therapist-drawer-title">
          <div className="therapist-drawer-hero">
            <TherapistAvatar therapist={therapist} className="therapist-drawer-avatar" />
            <div className="therapist-drawer-heading">
              <h2>{therapistName}</h2>
              <div className="therapist-drawer-meta-row">
                {therapist?.slug ? <code>#{therapist.slug}</code> : null}
                <StatusChip status={statusToChipKey(statusMeta.status)} />
              </div>
            </div>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Cerrar terapeuta">
            <X size={18} weight="bold" />
          </button>
        </header>
        <nav className="therapist-drawer-tabs" aria-label="Secciones terapeuta">
          <button
            type="button"
            className={activeTab === "profile" ? "is-active" : ""}
            onClick={() => setActiveTab("profile")}
          >
            <UserCircle size={16} weight="regular" aria-hidden="true" />
            <span>Perfil</span>
          </button>
          <button
            type="button"
            className={activeTab === "operations" ? "is-active" : ""}
            onClick={() => setActiveTab("operations")}
          >
            <SlidersHorizontal size={16} weight="regular" aria-hidden="true" />
            <span>Operativa</span>
          </button>
          <button
            type="button"
            className={activeTab === "availability" ? "is-active" : ""}
            onClick={() => setActiveTab("availability")}
          >
            <CalendarDots size={16} weight="regular" aria-hidden="true" />
            <span>Disponibilidad</span>
          </button>
        </nav>

        {loading ? <p className="feedback drawer-feedback">Cargando terapeuta...</p> : null}
        {!loading && error ? <p className="feedback error drawer-feedback">{error}</p> : null}

        {!loading && !error && therapist ? (
          <div className="drawer-body therapist-drawer-body">
            {activeTab === "profile" ? (
              <div className="therapist-profile-panel">
                <section className="therapist-profile-section" aria-labelledby="therapist-photo-title">
                  <div className="therapist-section-head">
                    <h3 id="therapist-photo-title">Foto</h3>
                    <span className="inline-tag therapist-avatar-status">
                      {therapist?.avatar?.statusLabel || "Iniciales"}
                    </span>
                  </div>
                  <div className="therapist-photo-card">
                    <TherapistAvatar therapist={therapist} className="therapist-drawer-avatar therapist-profile-avatar" />
                    <div className="therapist-photo-copy">
                      <strong>Avatar operativo</strong>
                      <span>Iniciales visibles en Admin hasta conectar storage de fotos.</span>
                    </div>
                  </div>
                </section>

                <section className="therapist-profile-section" aria-labelledby="therapist-profile-title">
                  <div className="therapist-section-head">
                    <h3 id="therapist-profile-title">Perfil</h3>
                    <button
                      type="button"
                      className="table-open"
                      onClick={saveProfile}
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                  <div className="therapist-profile-form">
                    <label className="client-filter-field" htmlFor="therapist-profile-full-name">
                      <span>Nombre completo</span>
                      <input
                        id="therapist-profile-full-name"
                        className="control-input"
                        type="text"
                        value={profileFullName}
                        onChange={(event) => setProfileFullName(event.target.value)}
                      />
                    </label>
                    <label className="client-filter-field" htmlFor="therapist-profile-display-name">
                      <span>Nombre visible</span>
                      <input
                        id="therapist-profile-display-name"
                        className="control-input"
                        type="text"
                        value={profileDisplayName}
                        onChange={(event) => setProfileDisplayName(event.target.value)}
                      />
                    </label>
                    <label className="client-filter-field" htmlFor="therapist-profile-phone">
                      <span>Telefono</span>
                      <input
                        id="therapist-profile-phone"
                        className="control-input"
                        type="tel"
                        value={profilePhone}
                        onChange={(event) => setProfilePhone(event.target.value)}
                      />
                    </label>
                    <label className="client-filter-field" htmlFor="therapist-profile-telegram">
                      <span>Telegram</span>
                      <input
                        id="therapist-profile-telegram"
                        className="control-input"
                        type="text"
                        value={profileTelegram}
                        onChange={(event) => setProfileTelegram(event.target.value)}
                      />
                    </label>
                  </div>
                  <label className={`settings-room-status-toggle${profileIsActive ? " is-active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={profileIsActive}
                      onChange={(event) => setProfileIsActive(event.target.checked)}
                    />
                    <span className="settings-room-status-control" aria-hidden="true" />
                    <span>{profileIsActive ? "Activo" : "Inactivo"}</span>
                  </label>
                  {profileFeedback ? (
                    <p className="feedback subtle settings-feedback therapist-profile-feedback">{profileFeedback}</p>
                  ) : null}
                  {profileError ? (
                    <p className="feedback error settings-feedback therapist-profile-feedback">{profileError}</p>
                  ) : null}
                </section>

                <section className="therapist-profile-section" aria-labelledby="therapist-summary-title">
                  <div className="therapist-section-head">
                    <h3 id="therapist-summary-title">Resumen</h3>
                    <StatusChip status={statusToChipKey(statusMeta.status)} />
                  </div>
                  <dl className="therapist-metrics-grid">
                    <div>
                      <dt>Servicios</dt>
                      <dd>{assignedServicesCount}</dd>
                    </div>
                    <div>
                      <dt>Salas compatibles</dt>
                      <dd>{therapist.compatibleRoomsCount || 0}</dd>
                    </div>
                    <div>
                      <dt>Estado</dt>
                      <dd>{statusMeta.statusLabel}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            ) : null}

            {activeTab === "operations" ? (
              <section className="therapist-operations-panel" aria-labelledby="therapist-services-title">
                <div className="therapist-section-head">
                  <h3 id="therapist-services-title">Servicios</h3>
                  <span>{assignedServicesCount} activos</span>
                </div>
                {operationIssues.length ? (
                  <ul className="therapist-operation-alerts">
                    {operationIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
                {serviceMutationFeedback ? (
                  <p className="feedback subtle settings-feedback">{serviceMutationFeedback}</p>
                ) : null}
                {serviceMutationError ? (
                  <p className="feedback error settings-feedback">{serviceMutationError}</p>
                ) : null}
                {operationServices.length ? (
                  <ul className="therapist-service-rows">
                    {operationServices.map((service) => {
                      const relationStatus = normalizeResourceStatus(
                        service?.relationStatus,
                        service?.relationIsActive === true
                      );
                      const isAssigned = service?.relationIsActive === true;
                      const serviceIsActive = service?.isActive !== false;
                      const isSavingService = String(serviceMutationId) === String(service.id);
                      const statusLabel = !serviceIsActive
                        ? "Servicio inactivo"
                        : isSavingService
                          ? "Guardando..."
                          : isAssigned
                            ? (service.statusLabel || getStatusLabelFromValue(relationStatus))
                            : "No asignado";
                      const serviceWarnings = [
                        isAssigned && serviceIsActive && Number(service?.compatibleRoomsCount ?? 1) === 0
                          ? "Sin sala compatible activa"
                          : null
                      ].filter(Boolean);
                      return (
                        <li
                          key={`therapist-service-${service.id}`}
                          className={`${isAssigned ? "is-assigned" : "is-unassigned"}${!serviceIsActive ? " is-service-inactive" : ""}`}
                        >
                          <label className="therapist-service-toggle">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              disabled={isSavingService || !serviceIsActive}
                              onChange={(event) => toggleTherapistService(service, event.target.checked)}
                            />
                            <span aria-hidden="true" />
                          </label>
                          <div>
                            <strong>{service.name || "Servicio"}</strong>
                            <span>
                              {service.durationMinutes ? `${service.durationMinutes} min` : "Sin duracion"}
                              {Number.isFinite(Number(service?.compatibleRoomsCount))
                                ? ` · ${Number(service.compatibleRoomsCount)} salas`
                                : ""}
                            </span>
                            {serviceWarnings.map((warning) => (
                              <em key={warning}>{warning}</em>
                            ))}
                          </div>
                          <span className="therapist-row-status">
                            {statusLabel}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="empty-state compact">No hay servicios creados.</p>
                )}
              </section>
            ) : null}

            {activeTab === "availability" ? (
              <section className="availability-editor" aria-label="Disponibilidad semanal">
                <div className="availability-editor-head">
                  <div>
                    <h3>Disponibilidad</h3>
                    <p>{scheduleGroups.length ? scheduleGroups[0].timeRange : "Sin horario base"}</p>
                  </div>
                  <button
                    type="button"
                    className="refresh-button availability-save-button"
                    onClick={saveAvailability}
                    disabled={availabilitySaving}
                  >
                    {availabilitySaving ? "Guardando..." : "Guardar"}
                  </button>
                </div>

                {availabilityFeedback ? (
                  <p className="feedback subtle settings-feedback">{availabilityFeedback}</p>
                ) : null}
                {availabilityError ? (
                  <p className="feedback error settings-feedback">{availabilityError}</p>
                ) : null}

                <div className="availability-week">
                  {availabilityDays.map((day) => {
                    const copyOpen = copySourceWeekday === day.weekday;
                    const copyTargets = availabilityDays.filter((item) => item.weekday !== day.weekday);
                    return (
                      <div key={`availability-day-${day.weekday}`} className={`availability-day${day.isActive ? " is-active" : ""}`}>
                        <label className="availability-toggle">
                          <input
                            type="checkbox"
                            checked={day.isActive}
                            onChange={(event) => toggleAvailabilityDay(day.weekday, event.target.checked)}
                          />
                          <span className="availability-toggle-control" aria-hidden="true" />
                          <span>{day.label}</span>
                        </label>

                        <div className="availability-ranges">
                          {day.isActive && day.ranges.length ? (
                            day.ranges.map((range, rangeIndex) => (
                              <div key={`availability-range-${day.weekday}-${rangeIndex}`} className="availability-range">
                                <select
                                  aria-label={`${day.label} inicio ${rangeIndex + 1}`}
                                  value={range.startTime}
                                  onChange={(event) => changeAvailabilityRange(day.weekday, rangeIndex, "startTime", event.target.value)}
                                >
                                  {AVAILABILITY_TIME_OPTIONS.map((timeOption) => (
                                    <option key={`start-${day.weekday}-${rangeIndex}-${timeOption}`} value={timeOption}>
                                      {timeOption}
                                    </option>
                                  ))}
                                </select>
                                <span className="availability-range-separator">-</span>
                                <select
                                  aria-label={`${day.label} fin ${rangeIndex + 1}`}
                                  value={range.endTime}
                                  onChange={(event) => changeAvailabilityRange(day.weekday, rangeIndex, "endTime", event.target.value)}
                                >
                                  {AVAILABILITY_TIME_OPTIONS.map((timeOption) => (
                                    <option key={`end-${day.weekday}-${rangeIndex}-${timeOption}`} value={timeOption}>
                                      {timeOption}
                                    </option>
                                  ))}
                                </select>
                                {rangeIndex === 0 ? (
                                  <>
                                    <button
                                      type="button"
                                      className="icon-button availability-icon"
                                      onClick={() => addAvailabilityRange(day.weekday)}
                                      aria-label={`Agregar rango ${day.label}`}
                                    >
                                      <Plus size={17} weight="bold" />
                                    </button>
                                    <button
                                      type="button"
                                      className={`icon-button availability-icon${copyOpen ? " is-active" : ""}`}
                                      onClick={() => openCopyAvailability(day.weekday)}
                                      aria-label={`Copiar ${day.label}`}
                                    >
                                      <CopySimple size={17} weight="regular" />
                                    </button>
                                  </>
                                ) : null}
                                <button
                                  type="button"
                                  className="icon-button availability-icon"
                                  onClick={() => removeAvailabilityRange(day.weekday, rangeIndex)}
                                  aria-label={`Eliminar rango ${day.label} ${rangeIndex + 1}`}
                                >
                                  <Trash size={17} weight="regular" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <button
                              type="button"
                              className="availability-add-empty"
                              onClick={() => addAvailabilityRange(day.weekday)}
                            >
                              <Plus size={15} weight="bold" aria-hidden="true" />
                              <span>Agregar rango</span>
                            </button>
                          )}
                        </div>

                        {copyOpen ? (
                          <div className="availability-copy-popover">
                            <h4>Copiar horarios a</h4>
                            <label className="availability-copy-option">
                              <input
                                type="checkbox"
                                checked={copyTargets.every((target) => copyTargetWeekdays.includes(target.weekday))}
                                onChange={(event) => {
                                  setCopyTargetWeekdays(event.target.checked
                                    ? copyTargets.map((target) => target.weekday)
                                    : []);
                                }}
                              />
                              <span>Seleccionar todo</span>
                            </label>
                            {copyTargets.map((target) => (
                              <label key={`copy-target-${day.weekday}-${target.weekday}`} className="availability-copy-option">
                                <input
                                  type="checkbox"
                                  checked={copyTargetWeekdays.includes(target.weekday)}
                                  onChange={(event) => toggleCopyTarget(target.weekday, event.target.checked)}
                                />
                                <span>{target.label}</span>
                              </label>
                            ))}
                            <div className="availability-copy-actions">
                              <button type="button" className="logout-button" onClick={() => setCopySourceWeekday(null)}>
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="refresh-button"
                                onClick={applyCopyAvailability}
                                disabled={!copyTargetWeekdays.length}
                              >
                                Aplicar
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function ServicePackageList({ items, emptyLabel }) {
  const normalizedItems = Array.isArray(items)
    ? items.filter((item) => item && String(item.name || "").trim())
    : [];
  const visibleItems = splitVisibleItems(normalizedItems, 2);

  if (!normalizedItems.length) {
    return <span className="settings-package-empty">{emptyLabel}</span>;
  }

  return (
    <span className="settings-package-list">
      {visibleItems.visible.map((item) => (
        <span key={`${item.id || item.name}`} className="inline-tag">
          {item.name}
        </span>
      ))}
      {visibleItems.hiddenCount ? (
        <span className="inline-tag settings-package-more">+{visibleItems.hiddenCount}</span>
      ) : null}
    </span>
  );
}

function ResourcesReadonlyView({
  resources,
  timezone,
  onRefresh,
  isLoading,
  isRefreshing,
  isStale,
  errorMessage,
  authToken,
  onRoomSaved,
  onUnauthorized
}) {
  const normalizedSettings = useMemo(
    () => normalizeSettingsPayload(resources),
    [resources]
  );
  const [activeModule, setActiveModule] = useState("services");
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceFormName, setServiceFormName] = useState("");
  const [serviceFormDuration, setServiceFormDuration] = useState("60");
  const [serviceFormPrice, setServiceFormPrice] = useState("0");
  const [serviceFormIsActive, setServiceFormIsActive] = useState(true);
  const [serviceFormFeatureKeys, setServiceFormFeatureKeys] = useState([]);
  const [serviceFormLoading, setServiceFormLoading] = useState(false);
  const [serviceFormError, setServiceFormError] = useState("");
  const [serviceFormFeedback, setServiceFormFeedback] = useState("");
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomFormName, setRoomFormName] = useState("");
  const [roomFormCapacity, setRoomFormCapacity] = useState("1");
  const [roomFormIsActive, setRoomFormIsActive] = useState(true);
  const [roomFormFeatureKeys, setRoomFormFeatureKeys] = useState([]);
  const [roomFormLoading, setRoomFormLoading] = useState(false);
  const [roomFormError, setRoomFormError] = useState("");
  const [roomFormFeedback, setRoomFormFeedback] = useState("");
  const [compatibilityMutationId, setCompatibilityMutationId] = useState("");
  const [compatibilityMutationError, setCompatibilityMutationError] = useState("");
  const [compatibilityMutationFeedback, setCompatibilityMutationFeedback] = useState("");

  const moduleRows = useMemo(() => {
    if (activeModule === "rooms") return normalizedSettings.rooms;
    if (activeModule === "compatibilities") return normalizedSettings.compatibilities;
    if (activeModule !== "services") return [];
    return normalizedSettings.services;
  }, [activeModule, normalizedSettings]);

  const filteredRows = useMemo(() => {
    const statusFilterValue = String(statusFilter || "all").trim().toLowerCase();
    const query = String(searchValue || "").trim().toLowerCase();

    return moduleRows.filter((entry) => {
      const normalizedStatus = normalizeResourceStatus(entry?.status, entry?.isActive === true);
      const matchesStatus = statusFilterValue === "all" ||
        (statusFilterValue === "active" && normalizedStatus === "ACTIVE") ||
        (statusFilterValue === "inactive" && normalizedStatus === "INACTIVE");

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      if (activeModule === "services") {
        const haystack = [
          entry?.name,
          entry?.durationLabel,
          entry?.priceLabel,
          entry?.statusLabel,
          entry?.requiredFeaturesLabel,
          entry?.compatibleRoomsLabel,
          entry?.activeTherapistsLabel
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      }

      if (activeModule === "rooms") {
        const haystack = [
          entry?.name,
          entry?.capacityLabel,
          entry?.featuresLabel,
          entry?.statusLabel
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      }

      if (activeModule === "compatibilities") {
        const haystack = [
          entry?.serviceLabel,
          entry?.roomLabel,
          entry?.statusLabel
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      }

      return false;
    });
  }, [activeModule, moduleRows, searchValue, statusFilter]);

  const generatedAtLabel = resources?.generatedAt
    ? formatDateTime(resources.generatedAt, timezone)
    : "-";

  const totalByModule = {
    services: normalizedSettings.summary.servicesTotal,
    rooms: normalizedSettings.summary.roomsTotal,
    compatibilities: normalizedSettings.summary.compatibilitiesTotal,
    booking_rules: 3,
    center_config: 1
  };

  const activeModuleMeta = SETTINGS_MODULES.find((item) => item.id === activeModule) || SETTINGS_MODULES[0];
  const isTableModule = !activeModuleMeta.kind;
  const groupedSettingsModules = useMemo(() => SETTINGS_MODULES.reduce((groups, module) => {
    const group = groups.get(module.group) || [];
    group.push(module);
    groups.set(module.group, group);
    return groups;
  }, new Map()), []);
  const bookingBlockedServices = normalizedSettings.services.filter(
    (service) => Number(service.compatibleRoomsCount || 0) === 0 || Number(service.activeTherapistsCount || 0) === 0
  );
  const centerDisplayName = resources?.center?.displayName || resources?.center?.name || "Luna Mandala";
  const centerSlug = resources?.center?.slug || "-";

  const resetServiceForm = useCallback(() => {
    setEditingServiceId(null);
    setServiceFormName("");
    setServiceFormDuration("60");
    setServiceFormPrice("0");
    setServiceFormIsActive(true);
    setServiceFormFeatureKeys([]);
    setServiceFormError("");
  }, []);

  const resetRoomForm = useCallback(() => {
    setEditingRoomId(null);
    setRoomFormName("");
    setRoomFormCapacity("1");
    setRoomFormIsActive(true);
    setRoomFormFeatureKeys([]);
    setRoomFormError("");
  }, []);

  const openNewServiceForm = useCallback(() => {
    resetServiceForm();
    setServiceFormFeedback("");
    setRoomFormOpen(false);
    resetRoomForm();
    setServiceFormOpen(true);
  }, [resetRoomForm, resetServiceForm]);

  const openEditServiceForm = useCallback((service) => {
    setEditingServiceId(service.id);
    setServiceFormName(service.name || "");
    setServiceFormDuration(String(service.durationMinutes || 60));
    setServiceFormPrice(String(service.priceAmount ?? 0));
    setServiceFormIsActive(normalizeResourceStatus(service.status, service.isActive === true) === "ACTIVE");
    setServiceFormFeatureKeys(Array.isArray(service.requiredFeatureKeys) ? [...service.requiredFeatureKeys] : []);
    setServiceFormError("");
    setServiceFormFeedback("");
    setRoomFormOpen(false);
    resetRoomForm();
    setServiceFormOpen(true);
  }, [resetRoomForm]);

  const openNewRoomForm = useCallback(() => {
    resetRoomForm();
    setRoomFormFeedback("");
    setServiceFormOpen(false);
    resetServiceForm();
    setRoomFormOpen(true);
  }, [resetRoomForm, resetServiceForm]);

  const openEditRoomForm = useCallback((room) => {
    setEditingRoomId(room.id);
    setRoomFormName(room.name || "");
    setRoomFormCapacity(String(room.capacity || 1));
    setRoomFormIsActive(normalizeResourceStatus(room.status, room.isActive === true) === "ACTIVE");
    setRoomFormFeatureKeys(Array.isArray(room.featureKeys) ? [...room.featureKeys] : []);
    setRoomFormError("");
    setRoomFormFeedback("");
    setServiceFormOpen(false);
    resetServiceForm();
    setRoomFormOpen(true);
  }, [resetServiceForm]);

  const toggleServiceFeature = useCallback((featureKey, checked) => {
    setServiceFormFeatureKeys((current) => {
      if (checked) {
        return current.includes(featureKey) ? current : [...current, featureKey];
      }

      return current.filter((key) => key !== featureKey);
    });
  }, []);

  const toggleRoomFeature = useCallback((featureKey, checked) => {
    setRoomFormFeatureKeys((current) => {
      if (checked) {
        return current.includes(featureKey) ? current : [...current, featureKey];
      }

      return current.filter((key) => key !== featureKey);
    });
  }, []);

  const closeSettingsEditor = useCallback(() => {
    setServiceFormOpen(false);
    resetServiceForm();
    setRoomFormOpen(false);
    resetRoomForm();
  }, [resetRoomForm, resetServiceForm]);

  const switchSettingsModule = useCallback((moduleId) => {
    setActiveModule(moduleId);
    setSearchValue("");
    setStatusFilter("active");
  }, []);

  const saveService = useCallback(async () => {
    if (serviceFormLoading) {
      return;
    }

    setServiceFormLoading(true);
    setServiceFormError("");
    setServiceFormFeedback("");

    try {
      const endpoint = editingServiceId
        ? `/api/admin/resources/services/${editingServiceId}`
        : "/api/admin/resources/services";
      const response = await fetch(endpoint, {
        method: editingServiceId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: serviceFormName.trim(),
          durationMinutes: serviceFormDuration,
          priceAmount: serviceFormPrice,
          isActive: serviceFormIsActive,
          requiredFeatureKeys: serviceFormFeatureKeys
        })
      });
      const payload = await response.json();

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payload));
      }

      setServiceFormFeedback(editingServiceId ? "Servicio actualizado." : "Servicio creado.");
      setServiceFormOpen(false);
      resetServiceForm();
      onRoomSaved?.();
    } catch (requestError) {
      setServiceFormError(requestError.message || "No se pudo guardar el servicio.");
    } finally {
      setServiceFormLoading(false);
    }
  }, [
    authToken,
    editingServiceId,
    onRoomSaved,
    onUnauthorized,
    resetServiceForm,
    serviceFormDuration,
    serviceFormFeatureKeys,
    serviceFormIsActive,
    serviceFormLoading,
    serviceFormName,
    serviceFormPrice
  ]);

  const saveRoom = useCallback(async () => {
    if (roomFormLoading) {
      return;
    }

    setRoomFormLoading(true);
    setRoomFormError("");
    setRoomFormFeedback("");

    try {
      const endpoint = editingRoomId
        ? `/api/admin/resources/rooms/${editingRoomId}`
        : "/api/admin/resources/rooms";
      const response = await fetch(endpoint, {
        method: editingRoomId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: roomFormName.trim(),
          capacity: roomFormCapacity,
          ...(editingRoomId ? { isActive: roomFormIsActive } : {}),
          featureKeys: roomFormFeatureKeys
        })
      });
      const payload = await response.json();

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payload));
      }

      setRoomFormFeedback(editingRoomId ? "Sala actualizada." : "Sala creada.");
      setRoomFormOpen(false);
      resetRoomForm();
      onRoomSaved?.();
    } catch (requestError) {
      setRoomFormError(requestError.message || "No se pudo guardar la sala.");
    } finally {
      setRoomFormLoading(false);
    }
  }, [
    authToken,
    editingRoomId,
    onRoomSaved,
    onUnauthorized,
    resetRoomForm,
    roomFormCapacity,
    roomFormFeatureKeys,
    roomFormIsActive,
    roomFormLoading,
    roomFormName
  ]);

  const toggleCompatibility = useCallback(async (compatibility) => {
    if (!compatibility || compatibilityMutationId) {
      return;
    }

    const serviceId = Number(compatibility.serviceId);
    const roomId = Number(compatibility.roomId);
    if (!Number.isInteger(serviceId) || serviceId <= 0 || !Number.isInteger(roomId) || roomId <= 0) {
      setCompatibilityMutationError("Compatibilidad inválida.");
      return;
    }

    const nextIsActive = normalizeResourceStatus(compatibility.status, compatibility.isActive === true) !== "ACTIVE";
    const mutationId = `${serviceId}-${roomId}`;
    setCompatibilityMutationId(mutationId);
    setCompatibilityMutationError("");
    setCompatibilityMutationFeedback("");

    try {
      const response = await fetch(`/api/admin/resources/compatibilities/${serviceId}/${roomId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ isActive: nextIsActive })
      });
      const payload = await response.json();

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payload));
      }

      setCompatibilityMutationFeedback(nextIsActive ? "Compatibilidad activada." : "Compatibilidad desactivada.");
      onRoomSaved?.();
    } catch (requestError) {
      setCompatibilityMutationError(requestError.message || "No se pudo actualizar la compatibilidad.");
    } finally {
      setCompatibilityMutationId("");
    }
  }, [authToken, compatibilityMutationId, onRoomSaved, onUnauthorized]);

  return (
    <section className="settings-shell" aria-label="Ajustes operativos">
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Navegacion local ajustes">
          {Array.from(groupedSettingsModules.entries()).map(([groupLabel, modules]) => (
            <div key={`settings-group-${groupLabel}`} className="settings-nav-group">
              <p className="settings-nav-label">{groupLabel}</p>
              {modules.map((module) => {
                const Icon = module.Icon;
                return (
                  <button
                    key={`settings-module-${module.id}`}
                    type="button"
                    className={`settings-nav-button${activeModule === module.id ? " is-active" : ""}`}
                    onClick={() => switchSettingsModule(module.id)}
                    aria-current={activeModule === module.id ? "page" : undefined}
                  >
                    <Icon size={17} weight="regular" aria-hidden="true" />
                    <span>{module.label}</span>
                    <span className="settings-tab-count">{totalByModule[module.id] || 0}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="settings-workspace">
          <header className="settings-header">
            <div>
              <h2>{activeModuleMeta.label}</h2>
              <p>{activeModuleMeta.description}</p>
            </div>
            <div className="settings-header-meta">
              <span className="settings-chip">Actualizado: {generatedAtLabel}</span>
              {bookingBlockedServices.length ? (
                <span className="settings-chip settings-chip-warning">
                  {bookingBlockedServices.length} servicios con alerta
                </span>
              ) : (
                <span className="settings-chip">Booking listo</span>
              )}
            </div>
          </header>

          {isTableModule ? (
            <section className="panel settings-panel" aria-label="Tabla de ajustes">
        <div className="settings-toolbar">
          <label className="settings-search-field" htmlFor="settings-search">
            <MagnifyingGlass size={16} aria-hidden="true" />
            <input
              id="settings-search"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar en módulo activo"
            />
          </label>

          <label className="settings-status-field" htmlFor="settings-status-filter">
            <span>Estado</span>
            <select
              id="settings-status-filter"
              className="control-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {SETTINGS_STATUS_FILTERS.map((filterOption) => (
                <option key={`settings-status-${filterOption.id}`} value={filterOption.id}>
                  {filterOption.label}
                </option>
              ))}
            </select>
          </label>

          <p className="settings-counter" aria-live="polite">
            {filteredRows.length} visibles
          </p>

          <button
            type="button"
            className="refresh-button"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
          >
            {isLoading || isRefreshing ? "Actualizando..." : "Actualizar"}
          </button>

          {activeModule === "rooms" ? (
            <button
              type="button"
              className="refresh-button settings-room-new-button"
              onClick={openNewRoomForm}
            >
              Nueva sala
            </button>
          ) : null}

          {activeModule === "services" ? (
            <button
              type="button"
              className="refresh-button settings-room-new-button"
              onClick={openNewServiceForm}
            >
              Nuevo servicio
            </button>
          ) : null}
        </div>

        {isRefreshing ? (
          <p className="feedback subtle settings-feedback">Actualizando ajustes en segundo plano...</p>
        ) : null}
        {isStale ? (
          <p className="feedback error settings-feedback">
            No se pudo refrescar Ajustes. Mostrando la última carga válida.
            {errorMessage ? ` (${errorMessage})` : ""}
          </p>
        ) : null}

        {activeModule === "services" ? (
          <div className="settings-room-actions">
            {serviceFormFeedback ? (
              <p className="feedback subtle settings-feedback">{serviceFormFeedback}</p>
            ) : null}
            {serviceFormError ? (
              <p className="feedback error settings-feedback">{serviceFormError}</p>
            ) : null}
          </div>
        ) : null}

        {activeModule === "rooms" ? (
          <div className="settings-room-actions">
            {roomFormFeedback ? (
              <p className="feedback subtle settings-feedback">{roomFormFeedback}</p>
            ) : null}
            {roomFormError ? (
              <p className="feedback error settings-feedback">{roomFormError}</p>
            ) : null}
          </div>
        ) : null}

        {activeModule === "compatibilities" ? (
          <div className="settings-room-actions">
            {compatibilityMutationFeedback ? (
              <p className="feedback subtle settings-feedback">{compatibilityMutationFeedback}</p>
            ) : null}
            {compatibilityMutationError ? (
              <p className="feedback error settings-feedback">{compatibilityMutationError}</p>
            ) : null}
          </div>
        ) : null}

        {filteredRows.length === 0 ? (
          <p className="empty-state">Sin registros para el filtro actual.</p>
        ) : (
          <>
            {activeModule === "services" ? (
              <>
                <div className="table-wrap">
                  <table className="appointments-table settings-table">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Duración</th>
                        <th>Precio</th>
                        <th>Requiere</th>
	                        <th>Salas booking</th>
	                        <th>Terapeutas</th>
	                        <th>Booking</th>
	                        <th>Estado</th>
	                        <th>Acción</th>
	                      </tr>
	                    </thead>
	                    <tbody>
	                      {filteredRows.map((service) => {
	                        const bookingIssues = [
	                          Number(service.compatibleRoomsCount || 0) === 0 ? "Sin sala" : "",
	                          Number(service.activeTherapistsCount || 0) === 0 ? "Sin terapeuta" : ""
	                        ].filter(Boolean);
	                        return (
	                          <tr key={`settings-service-${service.id}`}>
	                            <td>{service.name}</td>
	                            <td>{service.durationLabel}</td>
	                            <td>{service.priceLabel}</td>
	                            <td>
	                              {service.requiredFeatureKeys.length ? (
	                                <span className="inline-tag-list">
	                                  {service.requiredFeatures.map((feature) => (
	                                    <span key={feature.key} className="inline-tag">{feature.label}</span>
	                                  ))}
	                                </span>
	                              ) : (
	                                <span className="inline-tag is-empty">Solo sillas</span>
	                              )}
	                            </td>
	                            <td>
	                              <ServicePackageList
	                                items={service.compatibleRooms}
	                                emptyLabel="Sin salas activas"
	                              />
	                            </td>
	                            <td>
	                              <ServicePackageList
	                                items={service.activeTherapists}
	                                emptyLabel="Sin terapeutas activos"
	                              />
	                            </td>
	                            <td>
	                              {bookingIssues.length ? (
	                                <span className="inline-tag settings-booking-warning">{bookingIssues.join(" + ")}</span>
	                              ) : (
	                                <span className="inline-tag settings-booking-ready">Listo</span>
	                              )}
	                            </td>
	                            <td><StatusChip status={statusToChipKey(service.status)} /></td>
	                            <td>
	                              <button
	                                type="button"
	                                className="table-open"
	                                onClick={() => openEditServiceForm(service)}
	                              >
	                                Editar
	                              </button>
	                            </td>
	                          </tr>
	                        );
	                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="settings-mobile-cards" aria-label="Servicios mobile">
	                  {filteredRows.map((service) => {
	                    const bookingIssues = [
	                      Number(service.compatibleRoomsCount || 0) === 0 ? "Sin sala" : "",
	                      Number(service.activeTherapistsCount || 0) === 0 ? "Sin terapeuta" : ""
	                    ].filter(Boolean);
	                    return (
	                      <li key={`settings-service-mobile-${service.id}`} className="settings-mobile-card">
	                        <p className="settings-mobile-title">{service.name}</p>
	                        <p className="settings-mobile-line">Duración: {service.durationLabel}</p>
	                        <p className="settings-mobile-line">Precio: {service.priceLabel}</p>
	                        <p className="settings-mobile-line">Requiere: {service.requiredFeaturesLabel}</p>
	                        <p className="settings-mobile-line">Salas booking: {service.compatibleRoomsLabel}</p>
	                        <p className="settings-mobile-line">Terapeutas: {service.activeTherapistsLabel}</p>
	                        <p className="settings-mobile-line">
	                          Booking: {bookingIssues.length ? bookingIssues.join(" + ") : "Listo"}
	                        </p>
	                        <div className="settings-mobile-card-actions">
	                          <StatusChip status={statusToChipKey(service.status)} />
	                          <button
	                            type="button"
	                            className="table-open"
	                            onClick={() => openEditServiceForm(service)}
	                          >
	                            Editar
	                          </button>
	                        </div>
	                      </li>
	                    );
	                  })}
                </ul>
              </>
            ) : null}

            {activeModule === "rooms" ? (
              <>
                <div className="table-wrap">
                  <table className="appointments-table settings-table">
	                    <thead>
	                      <tr>
	                        <th>Sala</th>
	                        <th>Capacidad</th>
	                        <th>Recursos</th>
	                        <th>Servicios compatibles</th>
	                        <th>Estado</th>
	                        <th>Acción</th>
	                      </tr>
	                    </thead>
	                    <tbody>
	                      {filteredRows.map((room) => (
	                        <tr key={`settings-room-${room.id}`}>
	                          <td>{room.name}</td>
	                          <td>{room.capacityLabel}</td>
	                          <td>
	                            {room.features.length ? (
	                              <span className="inline-tag-list">
	                                {room.features.map((feature) => (
	                                  <span key={feature.key} className="inline-tag">{feature.label}</span>
	                                ))}
	                              </span>
	                            ) : "-"}
	                          </td>
	                          <td>{room.compatibleServicesCount}</td>
	                          <td><StatusChip status={statusToChipKey(room.status)} /></td>
	                          <td>
	                            <button
	                              type="button"
	                              className="table-open"
	                              onClick={() => openEditRoomForm(room)}
	                            >
	                              Editar
	                            </button>
	                          </td>
	                        </tr>
	                      ))}
	                    </tbody>
                  </table>
                </div>

                <ul className="settings-mobile-cards" aria-label="Salas mobile">
                  {filteredRows.map((room) => (
	                    <li key={`settings-room-mobile-${room.id}`} className="settings-mobile-card">
	                      <p className="settings-mobile-title">{room.name}</p>
	                      <p className="settings-mobile-line">Capacidad: {room.capacityLabel}</p>
	                      <p className="settings-mobile-line">Recursos: {room.featuresLabel}</p>
	                      <p className="settings-mobile-line">Servicios compatibles: {room.compatibleServicesCount}</p>
	                      <div className="settings-mobile-card-actions">
	                        <StatusChip status={statusToChipKey(room.status)} />
	                        <button
	                          type="button"
	                          className="table-open"
	                          onClick={() => openEditRoomForm(room)}
	                        >
	                          Editar
	                        </button>
	                      </div>
	                    </li>
	                  ))}
	                </ul>
              </>
            ) : null}

            {activeModule === "compatibilities" ? (
              <>
                <div className="table-wrap">
                  <table className="appointments-table settings-table">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Sala</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((item) => (
                        <tr key={`settings-compat-${item.id}`}>
                          <td>{item.serviceLabel}</td>
                          <td>{item.roomLabel}</td>
                          <td><StatusChip status={statusToChipKey(item.status)} /></td>
                          <td>
                            <button
                              type="button"
                              className="table-open"
                              onClick={() => toggleCompatibility(item)}
                              disabled={compatibilityMutationId === item.id}
                            >
                              {compatibilityMutationId === item.id
                                ? "Guardando..."
                                : item.status === "ACTIVE"
                                  ? "Desactivar"
                                  : "Activar"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="settings-mobile-cards" aria-label="Compatibilidades mobile">
                  {filteredRows.map((item) => (
                    <li key={`settings-compat-mobile-${item.id}`} className="settings-mobile-card">
                      <p className="settings-mobile-title">{item.serviceLabel}</p>
                      <p className="settings-mobile-line">Sala: {item.roomLabel}</p>
                      <div className="settings-mobile-card-actions">
                        <StatusChip status={statusToChipKey(item.status)} />
                        <button
                          type="button"
                          className="table-open"
                          onClick={() => toggleCompatibility(item)}
                          disabled={compatibilityMutationId === item.id}
                        >
                          {compatibilityMutationId === item.id
                            ? "Guardando..."
                            : item.status === "ACTIVE"
                              ? "Desactivar"
                              : "Activar"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

          </>
        )}
            </section>
          ) : (
            <section className="settings-contract-panel" aria-label={activeModuleMeta.label}>
              {activeModule === "booking_rules" ? (
                <div className="settings-contract-grid">
                  <article className="settings-contract-card">
                    <h3>Cadena de disponibilidad</h3>
                    <p>Booking solo debe ofrecer horarios cuando el servicio tiene sala compatible activa, terapeuta activo y disponibilidad real.</p>
                    <dl>
                      <div><dt>Servicios listos</dt><dd>{normalizedSettings.services.length - bookingBlockedServices.length}</dd></div>
                      <div><dt>Servicios con alerta</dt><dd>{bookingBlockedServices.length}</dd></div>
                    </dl>
                  </article>
                  <article className="settings-contract-card">
                    <h3>Identificación previa</h3>
                    <p>El cliente valida WhatsApp antes de ver horarios. La disponibilidad no se expone sin ese paso.</p>
                    <dl>
                      <div><dt>País base</dt><dd>Bolivia</dd></div>
                      <div><dt>Zona horaria</dt><dd>{resources?.center?.timezone || DEFAULT_TIMEZONE}</dd></div>
                    </dl>
                  </article>
                  <article className="settings-contract-card">
                    <h3>Claims por minuto</h3>
                    <p>La confirmación y los holds reservan terapeuta y sala por minuto para evitar doble reserva.</p>
                    <dl>
                      <div><dt>Fuente de verdad</dt><dd>MySQL/MariaDB</dd></div>
                      <div><dt>Motor</dt><dd>API local Docker</dd></div>
                    </dl>
                  </article>
                </div>
              ) : (
                <div className="settings-contract-grid">
                  <article className="settings-contract-card settings-contract-card-wide">
                    <h3>Centro operativo</h3>
                    <p>Datos base usados para etiquetar Admin, Booking público y respuestas de API.</p>
                    <dl>
                      <div><dt>Nombre visible</dt><dd>{centerDisplayName}</dd></div>
                      <div><dt>Tenant</dt><dd>{centerSlug}</dd></div>
                      <div><dt>Zona horaria</dt><dd>{resources?.center?.timezone || DEFAULT_TIMEZONE}</dd></div>
                      <div><dt>Servicios</dt><dd>{normalizedSettings.summary.servicesTotal}</dd></div>
                      <div><dt>Salas</dt><dd>{normalizedSettings.summary.roomsTotal}</dd></div>
                      <div><dt>Compatibilidades</dt><dd>{normalizedSettings.summary.compatibilitiesTotal}</dd></div>
                    </dl>
                  </article>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <SettingsEditorDrawer
        open={serviceFormOpen || roomFormOpen}
        type={serviceFormOpen ? "service" : "room"}
        service={{
          editingId: editingServiceId,
          name: serviceFormName,
          duration: serviceFormDuration,
          price: serviceFormPrice,
          isActive: serviceFormIsActive,
          featureKeys: serviceFormFeatureKeys,
          loading: serviceFormLoading,
          error: serviceFormError,
          setName: setServiceFormName,
          setDuration: setServiceFormDuration,
          setPrice: setServiceFormPrice,
          setIsActive: setServiceFormIsActive,
          toggleFeature: toggleServiceFeature,
          onSave: saveService
        }}
        room={{
          editingId: editingRoomId,
          name: roomFormName,
          capacity: roomFormCapacity,
          isActive: roomFormIsActive,
          featureKeys: roomFormFeatureKeys,
          loading: roomFormLoading,
          error: roomFormError,
          setName: setRoomFormName,
          setCapacity: setRoomFormCapacity,
          setIsActive: setRoomFormIsActive,
          toggleFeature: toggleRoomFeature,
          onSave: saveRoom
        }}
        onClose={closeSettingsEditor}
      />
    </section>
  );
}

function SettingsEditorDrawer({ open, type, service, room, onClose }) {
  if (!open) {
    return null;
  }

  const isService = type === "service";
  const title = isService
    ? service.editingId
      ? service.name || "Servicio"
      : "Nuevo servicio"
    : room.editingId
      ? room.name || "Sala"
      : "Nueva sala";
  const kicker = isService
    ? service.editingId ? "Editar servicio" : "Crear servicio"
    : room.editingId ? "Editar sala" : "Crear sala";
  const loading = isService ? service.loading : room.loading;
  const error = isService ? service.error : room.error;

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="drawer settings-editor-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={kicker}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p className="drawer-kicker">{kicker}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Cerrar ajustes">
            <X size={18} weight="bold" />
          </button>
        </header>

        <div className="drawer-body settings-editor-body">
          {isService ? (
            <>
              <div className="settings-editor-grid">
                <label className="client-filter-field" htmlFor="settings-service-name">
                  <span>Nombre</span>
                  <input
                    id="settings-service-name"
                    type="text"
                    value={service.name}
                    onChange={(event) => service.setName(event.target.value)}
                    placeholder="Carta Astral"
                  />
                </label>

                <label className="client-filter-field" htmlFor="settings-service-duration">
                  <span>Duración</span>
                  <input
                    id="settings-service-duration"
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={service.duration}
                    onChange={(event) => service.setDuration(event.target.value)}
                  />
                </label>

                <label className="client-filter-field" htmlFor="settings-service-price">
                  <span>Precio BOB</span>
                  <input
                    id="settings-service-price"
                    type="number"
                    min="0"
                    max="999999"
                    step="0.01"
                    value={service.price}
                    onChange={(event) => service.setPrice(event.target.value)}
                  />
                </label>
              </div>

              <label className={`settings-room-status-toggle${service.isActive ? " is-active" : ""}`}>
                <input
                  type="checkbox"
                  checked={service.isActive}
                  onChange={(event) => service.setIsActive(event.target.checked)}
                />
                <span className="settings-room-status-control" aria-hidden="true" />
                <span>{service.isActive ? "Servicio activo" : "Servicio inactivo"}</span>
              </label>

              <fieldset className="settings-room-features">
                <legend>Requisito de sala</legend>
                <div className="settings-room-feature-list">
                  {ROOM_FEATURE_OPTIONS.map((feature) => {
                    const checked = service.featureKeys.includes(feature.key);
                    return (
                      <label
                        key={`service-feature-${feature.key}`}
                        className={`settings-room-feature${checked ? " is-selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => service.toggleFeature(feature.key, event.target.checked)}
                        />
                        <span>{feature.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <div className="settings-editor-grid">
                <label className="client-filter-field" htmlFor="settings-room-name">
                  <span>Nombre</span>
                  <input
                    id="settings-room-name"
                    type="text"
                    value={room.name}
                    onChange={(event) => room.setName(event.target.value)}
                    placeholder="Sala Fenix"
                  />
                </label>

                <label className="client-filter-field" htmlFor="settings-room-capacity">
                  <span>Capacidad</span>
                  <input
                    id="settings-room-capacity"
                    type="number"
                    min="1"
                    max="50"
                    value={room.capacity}
                    onChange={(event) => room.setCapacity(event.target.value)}
                  />
                </label>
              </div>

              {room.editingId ? (
                <label className={`settings-room-status-toggle${room.isActive ? " is-active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={room.isActive}
                    onChange={(event) => room.setIsActive(event.target.checked)}
                  />
                  <span className="settings-room-status-control" aria-hidden="true" />
                  <span>{room.isActive ? "Sala activa" : "Sala inactiva"}</span>
                </label>
              ) : null}

              <fieldset className="settings-room-features">
                <legend>Recursos</legend>
                <div className="settings-room-feature-list">
                  {ROOM_FEATURE_OPTIONS.map((feature) => {
                    const checked = room.featureKeys.includes(feature.key);
                    return (
                      <label
                        key={`room-feature-${feature.key}`}
                        className={`settings-room-feature${checked ? " is-selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => room.toggleFeature(feature.key, event.target.checked)}
                        />
                        <span>{feature.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </>
          )}

          <div className="manual-form-actions settings-editor-actions">
            <button
              type="button"
              className="refresh-button"
              onClick={isService ? service.onSave : room.onSave}
              disabled={
                loading ||
                (isService ? !service.name.trim() : !room.name.trim())
              }
            >
              {loading
                ? "Guardando..."
                : isService
                  ? service.editingId ? "Guardar servicio" : "Crear servicio"
                  : room.editingId
                    ? "Guardar sala"
                    : "Crear sala"}
            </button>
            <button type="button" className="logout-button" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
          </div>

          {error ? (
            <p className="feedback error compact-feedback">{error}</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

const TYPE_LABELS = {
  client: "Cliente",
  appointment: "Cita",
  case: "Caso",
  room: "Sala"
};

function GlobalSearchModal({
  open,
  onClose,
  authToken,
  onUnauthorized,
  onResolveAction
}) {
  const [draftQuery, setDraftQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [groups, setGroups] = useState({
    clients: [],
    appointments: [],
    cases: [],
    rooms: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setDraftQuery("");
      setActiveFilter("all");
      setResults([]);
      setGroups({ clients: [], appointments: [], cases: [], rooms: [] });
      setError("");
      setActiveIndex(0);
      setLoading(false);
      return undefined;
    }

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 30);

    return () => clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open || !authToken) {
      return undefined;
    }

    const controller = new AbortController();
    const trimmed = draftQuery.trim();
    const debounceMs = trimmed.length === 0 ? 0 : 220;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (trimmed) params.set("q", trimmed);
        params.set("type", activeFilter);
        params.set("limit", "10");

        const response = await fetch(`/api/admin/search?${params.toString()}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${authToken}` },
          signal: controller.signal
        });

        const payload = await response.json();

        if (response.status === 401) {
          onUnauthorized?.();
          return;
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(payload));
        }

        const safeResults = Array.isArray(payload?.results) ? payload.results : [];
        const safeGroups = payload?.groups || {
          clients: [],
          appointments: [],
          cases: [],
          rooms: []
        };

        setResults(safeResults);
        setGroups({
          clients: safeGroups.clients || [],
          appointments: safeGroups.appointments || [],
          cases: safeGroups.cases || [],
          rooms: safeGroups.rooms || []
        });
        setActiveIndex(0);
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return;
        }
        setError(requestError.message || "No se pudo buscar.");
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, authToken, draftQuery, activeFilter, onUnauthorized]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => {
          if (!results.length) return 0;
          return Math.min(index + 1, results.length - 1);
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        if (!results.length) return;
        const target = results[Math.min(activeIndex, results.length - 1)];
        if (target?.action) {
          event.preventDefault();
          onResolveAction?.(target.action);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onResolveAction, results, activeIndex]);

  if (!open) {
    return null;
  }

  function handleResultClick(action) {
    if (!action) return;
    onResolveAction?.(action);
  }

  const showSuggestionsHint = !draftQuery.trim();

  return (
    <div
      className="global-search-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="global-search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda global admin"
      >
        <header className="global-search-header">
          <div>
            <p className="global-search-eyebrow">Búsqueda global</p>
            <p className="global-search-subtitle">Clientes, citas, casos y salas</p>
          </div>
          <button
            type="button"
            className="global-search-close"
            onClick={onClose}
            aria-label="Cerrar busqueda"
          >
            <X size={18} weight="regular" aria-hidden="true" />
          </button>
        </header>

        <div className="global-search-input-row">
          <MagnifyingGlass size={20} weight="regular" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Buscar cliente, cita, codigo, sala..."
            aria-label="Termino de busqueda"
            autoComplete="off"
          />
          {loading ? <CircleNotch size={18} className="spin" aria-hidden="true" /> : null}
        </div>

        <nav className="global-search-filters" aria-label="Filtros de busqueda">
          {SEARCH_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`global-search-filter${activeFilter === filter.id ? " is-active" : ""}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </nav>

        {error ? <p className="feedback error compact-feedback">{error}</p> : null}

        {showSuggestionsHint && !loading ? (
          <p className="global-search-hint">
            Sugerencias en vivo. Escribe para filtrar por nombre, codigo, WhatsApp o sala.
          </p>
        ) : null}

        <div className="global-search-results" ref={listRef} role="listbox">
          {results.length === 0 && !loading ? (
            <p className="empty-state compact">Sin resultados.</p>
          ) : null}

          {results.map((result, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={result.id}
                type="button"
                className={`global-search-result${active ? " is-active" : ""}`}
                onClick={() => handleResultClick(result.action)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                aria-selected={active}
              >
                <span className="global-search-result-type">
                  {TYPE_LABELS[result.type] || result.type}
                </span>
                <span className="global-search-result-body">
                  <span className="global-search-result-title">{result.title}</span>
                  <span className="global-search-result-subtitle">{result.subtitle}</span>
                </span>
                {result.meta ? (
                  <span className="global-search-result-meta">{result.meta}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <footer className="global-search-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navegar
          </span>
          <span>
            <kbd>Enter</kbd> abrir
          </span>
          <span>
            <kbd>Esc</kbd> cerrar
          </span>
        </footer>
      </div>
    </div>
  );
}

function AdminApp() {
  const [theme, setTheme] = useState(readTheme);
  const [authToken, setAuthToken] = useState(readStoredToken);
  const [authAdmin, setAuthAdmin] = useState(readStoredProfile);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeSection, setActiveSection] = useState("control");

  const [activeTab, setActiveTab] = useState("today");
  const [controlDate, setControlDate] = useState(() => getDateKeyForTimezone());
  const [controlFilters, setControlFilters] = useState({
    q: "",
    fromDate: "",
    toDate: "",
    status: "all",
    serviceId: "all",
    therapistId: "all",
    roomId: "all",
    groupBy: "none"
  });
  const [includeUpcoming, setIncludeUpcoming] = useState(true);
  const [limit, setLimit] = useState(20);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailPayload, setDetailPayload] = useState(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [roomMutationLoading, setRoomMutationLoading] = useState(false);
  const [roomMutationError, setRoomMutationError] = useState("");
  const [kanbanMoving, setKanbanMoving] = useState(false);
  const [kanbanPending, setKanbanPending] = useState(null);
  const [kanbanError, setKanbanError] = useState("");
  const [roomMoveRequest, setRoomMoveRequest] = useState(null);
  const [statusConfirmRequest, setStatusConfirmRequest] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteAppointmentsLoading, setDeleteAppointmentsLoading] = useState(false);
  const [deleteAppointmentsError, setDeleteAppointmentsError] = useState("");
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState([]);
  const [armedDeleteAppointmentId, setArmedDeleteAppointmentId] = useState(null);
  const [confirmBulkAppointmentsDelete, setConfirmBulkAppointmentsDelete] = useState(false);
  const [clientsDraft, setClientsDraft] = useState({
    q: "",
    onboarding: "all",
    limit: 20
  });
  const [clientsFilters, setClientsFilters] = useState({
    q: "",
    onboarding: "all",
    limit: 20
  });
  const [clientsRefreshTick, setClientsRefreshTick] = useState(0);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsRefreshing, setClientsRefreshing] = useState(false);
  const [clientsError, setClientsError] = useState("");
  const [clientsPayload, setClientsPayload] = useState(null);
  const [historyDraft, setHistoryDraft] = useState({
    q: "",
    status: "all",
    order: "date_desc",
    limit: 40
  });
  const [historyFilters, setHistoryFilters] = useState({
    q: "",
    status: "all",
    order: "date_desc",
    limit: 40
  });
  const [historyRefreshTick, setHistoryRefreshTick] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyPayload, setHistoryPayload] = useState(null);
  const [therapistsRefreshTick, setTherapistsRefreshTick] = useState(0);
  const [therapistsLoading, setTherapistsLoading] = useState(false);
  const [therapistsRefreshing, setTherapistsRefreshing] = useState(false);
  const [therapistsError, setTherapistsError] = useState("");
  const [therapistsPayload, setTherapistsPayload] = useState(null);
  const [therapistDrawerOpen, setTherapistDrawerOpen] = useState(false);
  const [selectedTherapistId, setSelectedTherapistId] = useState(null);
  const [therapistDetailLoading, setTherapistDetailLoading] = useState(false);
  const [therapistDetailError, setTherapistDetailError] = useState("");
  const [therapistDetailPayload, setTherapistDetailPayload] = useState(null);
  const [resourcesPayload, setResourcesPayload] = useState(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesRefreshing, setResourcesRefreshing] = useState(false);
  const [resourcesError, setResourcesError] = useState("");
  const [resourcesRefreshTick, setResourcesRefreshTick] = useState(0);
  const [manualDraft, setManualDraft] = useState({
    firstName: "",
    lastName: "",
    phoneDigits: "",
    timezone: DEFAULT_TIMEZONE,
    serviceId: "",
    therapistId: "",
    roomId: "",
    date: getDateKeyForTimezone(),
    startsAt: ""
  });
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualCreateLoading, setManualCreateLoading] = useState(false);
  const [manualCreateError, setManualCreateError] = useState("");
  const [manualCreateSuccess, setManualCreateSuccess] = useState("");
  const [deleteClientsLoading, setDeleteClientsLoading] = useState(false);
  const [deleteClientsError, setDeleteClientsError] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [armedDeleteClientId, setArmedDeleteClientId] = useState(null);
  const [confirmBulkClientsDelete, setConfirmBulkClientsDelete] = useState(false);
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientDetailLoading, setClientDetailLoading] = useState(false);
  const [clientDetailError, setClientDetailError] = useState("");
  const [clientDetailPayload, setClientDetailPayload] = useState(null);
  const payloadRef = useRef(null);
  const clientsPayloadRef = useRef(null);
  const historyPayloadRef = useRef(null);
  const therapistsPayloadRef = useRef(null);
  const resourcesPayloadRef = useRef(null);
  const detailPayloadRef = useRef(null);
  const clientDetailPayloadRef = useRef(null);
  const therapistDetailPayloadRef = useRef(null);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    clientsPayloadRef.current = clientsPayload;
  }, [clientsPayload]);

  useEffect(() => {
    historyPayloadRef.current = historyPayload;
  }, [historyPayload]);

  useEffect(() => {
    therapistsPayloadRef.current = therapistsPayload;
  }, [therapistsPayload]);

  useEffect(() => {
    resourcesPayloadRef.current = resourcesPayload;
  }, [resourcesPayload]);

  useEffect(() => {
    detailPayloadRef.current = detailPayload;
  }, [detailPayload]);

  useEffect(() => {
    clientDetailPayloadRef.current = clientDetailPayload;
  }, [clientDetailPayload]);

  useEffect(() => {
    therapistDetailPayloadRef.current = therapistDetailPayload;
  }, [therapistDetailPayload]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("agenda-theme", theme);

    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [theme]);

  useEffect(() => {
    if (activeTab === "list") {
      setActiveTab("today");
    }
  }, [activeTab]);

  useEffect(() => {
    if (!authToken) {
      setSearchOpen(false);
    }
  }, [authToken]);

  useEffect(() => {
    function isEditableTarget(target) {
      if (!target) return false;
      if (target instanceof HTMLInputElement) return true;
      if (target instanceof HTMLTextAreaElement) return true;
      if (target instanceof HTMLSelectElement) return true;
      if (target instanceof HTMLElement && target.isContentEditable) return true;
      return false;
    }

    function onKeyDown(event) {
      if (!authToken) return;

      const isMacShortcut = event.key === "k" && (event.metaKey || event.ctrlKey);
      if (isMacShortcut) {
        event.preventDefault();
        setSearchOpen((value) => !value);
        return;
      }

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        setSearchOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authToken]);

  useEffect(() => {
    if (activeTab !== "rooms") {
      setKanbanError("");
    }
  }, [activeTab]);

  const handleUnauthorized = useCallback(() => {
    clearAuthStorage();
    setAuthToken("");
    setAuthAdmin(null);
    setPayload(null);
    setIsLoading(false);
    setIsRefreshing(false);
    setDrawerOpen(false);
    setSelectedAppointmentId(null);
    setSelectedAppointmentIds([]);
    setArmedDeleteAppointmentId(null);
    setConfirmBulkAppointmentsDelete(false);
    setDeleteAppointmentsLoading(false);
    setDeleteAppointmentsError("");
    setDetailPayload(null);
    setClientsPayload(null);
    setClientsLoading(false);
    setClientsRefreshing(false);
    setHistoryPayload(null);
    setHistoryLoading(false);
    setHistoryRefreshing(false);
    setHistoryError("");
    setTherapistsPayload(null);
    setTherapistsLoading(false);
    setTherapistsRefreshing(false);
    setTherapistsError("");
    setTherapistDrawerOpen(false);
    setSelectedTherapistId(null);
    setTherapistDetailPayload(null);
    setTherapistDetailError("");
    setResourcesPayload(null);
    setResourcesLoading(false);
    setResourcesRefreshing(false);
    setResourcesError("");
    setManualCreateLoading(false);
    setManualCreateError("");
    setManualCreateSuccess("");
    setSelectedClientIds([]);
    setArmedDeleteClientId(null);
    setConfirmBulkClientsDelete(false);
    setDeleteClientsLoading(false);
    setDeleteClientsError("");
    setClientDrawerOpen(false);
    setSelectedClientId(null);
    setClientDetailPayload(null);
    setLastRefreshedAt(null);
    setAuthError("Sesión expirada o token inválido. Inicia sesión nuevamente.");
  }, []);

  const fetchAppointmentDetail = useCallback(
    async (appointmentId, { signal } = {}) => {
      if (!authToken || !appointmentId) {
        return null;
      }

      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        signal
      });

      const nextPayload = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return null;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(nextPayload));
      }

      return nextPayload;
    },
    [authToken, handleUnauthorized]
  );

  const fetchClientDetail = useCallback(
    async (clientId, { signal } = {}) => {
      if (!authToken || !clientId) {
        return null;
      }

      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        signal
      });

      const nextPayload = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return null;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(nextPayload));
      }

      return nextPayload;
    },
    [authToken, handleUnauthorized]
  );

  const fetchTherapistDetail = useCallback(
    async (therapistId, { signal } = {}) => {
      if (!authToken || !therapistId) {
        return null;
      }

      const response = await fetch(`/api/admin/therapists/${therapistId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        signal
      });

      const nextPayload = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return null;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(nextPayload));
      }

      return nextPayload;
    },
    [authToken, handleUnauthorized]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      if (!authToken || activeSection !== "control") {
        setPayload(null);
        setIsLoading(false);
        setIsRefreshing(false);
        setLastRefreshedAt(null);
        setError("");
        return;
      }

      const hasCachedPayload = Boolean(payloadRef.current);

      if (hasCachedPayload) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const query = buildQuery({ date: controlDate, includeUpcoming, limit });
        const response = await fetch(`/api/admin/appointments?${query}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          signal: controller.signal
        });
        const nextPayload = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(nextPayload));
        }

        setPayload(nextPayload);
        setLastRefreshedAt(new Date().toISOString());
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        if (!hasCachedPayload) {
          setPayload(null);
        }
        setError(fetchError.message || "No se pudo cargar el tablero de admin.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }

    loadDashboard();

    return () => {
      controller.abort();
    };
  }, [authToken, activeSection, controlDate, includeUpcoming, limit, refreshTick, handleUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadClients() {
      if (!authToken || activeSection !== "clientes") {
        setClientsPayload(null);
        setClientsLoading(false);
        setClientsRefreshing(false);
        setClientsError("");
        return;
      }

      const hasCachedPayload = Boolean(clientsPayloadRef.current);

      if (hasCachedPayload) {
        setClientsRefreshing(true);
      } else {
        setClientsLoading(true);
      }

      setClientsError("");

      try {
        const query = buildClientsQuery(clientsFilters);
        const response = await fetch(`/api/admin/clients?${query}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          signal: controller.signal
        });

        const nextPayload = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(nextPayload));
        }

        setClientsPayload(nextPayload);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        if (!hasCachedPayload) {
          setClientsPayload(null);
        }
        setClientsError(fetchError.message || "No se pudo cargar el listado de clientes.");
      } finally {
        setClientsLoading(false);
        setClientsRefreshing(false);
      }
    }

    loadClients();

    return () => {
      controller.abort();
    };
  }, [authToken, activeSection, clientsFilters, clientsRefreshTick, handleUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    let deferTimer = null;

    async function loadTherapists() {
      if (!authToken || (activeSection !== "terapeutas" && activeSection !== "control")) {
        if (!authToken) {
          setTherapistsPayload(null);
        }
        setTherapistsLoading(false);
        setTherapistsRefreshing(false);
        setTherapistsError("");
        return;
      }

      const hasCachedPayload = Boolean(therapistsPayloadRef.current);

      if (hasCachedPayload) {
        setTherapistsRefreshing(true);
      } else {
        setTherapistsLoading(true);
      }

      setTherapistsError("");

      try {
        const query = activeSection === "control"
          ? buildTherapistsQuery({ q: "", status: "active", limit: 100 })
          : buildTherapistsQuery({ q: "", status: "all", limit: 100 });
        const response = await fetch(`/api/admin/therapists?${query}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          signal: controller.signal
        });

        const nextPayload = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(nextPayload));
        }

        setTherapistsPayload(nextPayload);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        if (!hasCachedPayload) {
          setTherapistsPayload(null);
        }
        setTherapistsError(fetchError.message || "No se pudo cargar terapeutas.");
      } finally {
        setTherapistsLoading(false);
        setTherapistsRefreshing(false);
      }
    }

    if (authToken && activeSection === "control" && !manualModalOpen && therapistsPayloadRef.current) {
      setTherapistsLoading(false);
      setTherapistsRefreshing(false);
    } else if (authToken && activeSection === "control" && !manualModalOpen && !therapistsPayloadRef.current) {
      setTherapistsLoading(false);
      setTherapistsRefreshing(false);
      deferTimer = window.setTimeout(loadTherapists, CONTROL_THERAPISTS_DEFER_MS);
    } else {
      loadTherapists();
    }

    return () => {
      if (deferTimer) {
        window.clearTimeout(deferTimer);
      }
      controller.abort();
    };
  }, [authToken, activeSection, manualModalOpen, therapistsRefreshTick, handleUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    let deferTimer = null;

    async function loadResources() {
      if (!authToken || (activeSection !== "ajustes" && activeSection !== "control")) {
        if (!authToken) {
          setResourcesPayload(null);
          setResourcesError("");
        }
        setResourcesLoading(false);
        setResourcesRefreshing(false);
        return;
      }

      const hasCachedPayload = Boolean(resourcesPayloadRef.current);
      if (hasCachedPayload) {
        setResourcesRefreshing(true);
      } else {
        setResourcesLoading(true);
      }

      setResourcesError("");

      try {
        const response = await fetch("/api/admin/resources", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          signal: controller.signal
        });
        const nextPayload = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(nextPayload));
        }

        setResourcesPayload(nextPayload);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        if (!hasCachedPayload) {
          setResourcesPayload(null);
        }
        setResourcesError(fetchError.message || "No se pudieron cargar recursos.");
      } finally {
        setResourcesLoading(false);
        setResourcesRefreshing(false);
      }
    }

    if (authToken && activeSection === "control" && !manualModalOpen && resourcesPayloadRef.current) {
      setResourcesLoading(false);
      setResourcesRefreshing(false);
    } else if (authToken && activeSection === "control" && !manualModalOpen && !resourcesPayloadRef.current) {
      setResourcesLoading(false);
      setResourcesRefreshing(false);
      deferTimer = window.setTimeout(loadResources, CONTROL_RESOURCES_DEFER_MS);
    } else {
      loadResources();
    }

    return () => {
      if (deferTimer) {
        window.clearTimeout(deferTimer);
      }
      controller.abort();
    };
  }, [authToken, activeSection, manualModalOpen, resourcesRefreshTick, handleUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      const inHistoryTab = authToken && activeSection === "control" && activeTab === "history";

      if (!inHistoryTab) {
        setHistoryLoading(false);
        setHistoryRefreshing(false);

        if (!authToken || activeSection !== "control") {
          setHistoryPayload(null);
          setHistoryError("");
        }
        return;
      }

      const hasCachedPayload = Boolean(historyPayloadRef.current);

      if (hasCachedPayload) {
        setHistoryRefreshing(true);
      } else {
        setHistoryLoading(true);
      }

      setHistoryError("");

      try {
        const query = buildHistoryQuery(historyFilters);
        const response = await fetch(`/api/admin/appointments/history?${query}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          signal: controller.signal
        });

        const nextPayload = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(nextPayload));
        }

        setHistoryPayload(nextPayload);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        if (!hasCachedPayload) {
          setHistoryPayload(null);
        }
        setHistoryError(fetchError.message || "No se pudo cargar el historial.");
      } finally {
        setHistoryLoading(false);
        setHistoryRefreshing(false);
      }
    }

    loadHistory();

    return () => {
      controller.abort();
    };
  }, [authToken, activeSection, activeTab, historyFilters, historyRefreshTick, handleUnauthorized]);

  useEffect(() => {
    if (!authToken || activeSection !== "control") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      setRefreshTick((value) => value + 1);
    }, CONTROL_AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [authToken, activeSection]);

  useEffect(() => {
    if (!authToken || activeSection !== "clientes") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClientsRefreshTick((value) => value + 1);
    }, CLIENTS_AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [authToken, activeSection]);

  useEffect(() => {
    if (!authToken || activeSection !== "terapeutas") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTherapistsRefreshTick((value) => value + 1);
    }, THERAPISTS_AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [authToken, activeSection]);

  useEffect(() => {
    if (!authToken || activeSection !== "control" || activeTab !== "history") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setHistoryRefreshTick((value) => value + 1);
    }, HISTORY_AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [authToken, activeSection, activeTab]);

  useEffect(() => {
    if (activeSection !== "control" || !drawerOpen || !selectedAppointmentId || !authToken) {
      return;
    }

    const controller = new AbortController();

    async function loadDetail() {
      const hasCachedDetail = Boolean(detailPayloadRef.current);

      if (!hasCachedDetail) {
        setDetailLoading(true);
      }
      setDetailError("");

      try {
        const nextPayload = await fetchAppointmentDetail(selectedAppointmentId, {
          signal: controller.signal
        });

        if (nextPayload) {
          setDetailPayload(nextPayload);
        }
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        if (!hasCachedDetail) {
          setDetailPayload(null);
          setDetailError(fetchError.message || "No se pudo cargar el detalle de la cita.");
        }
      } finally {
        setDetailLoading(false);
      }
    }

    loadDetail();

    return () => {
      controller.abort();
    };
  }, [activeSection, drawerOpen, selectedAppointmentId, authToken, fetchAppointmentDetail, refreshTick]);

  useEffect(() => {
    if (activeSection !== "clientes" || !clientDrawerOpen || !selectedClientId || !authToken) {
      return;
    }

    const controller = new AbortController();

    async function loadClientDetail() {
      const hasCachedDetail = Boolean(clientDetailPayloadRef.current);

      if (!hasCachedDetail) {
        setClientDetailLoading(true);
      }
      setClientDetailError("");

      try {
        const nextPayload = await fetchClientDetail(selectedClientId, {
          signal: controller.signal
        });

        if (nextPayload) {
          setClientDetailPayload(nextPayload);
        }
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        if (!hasCachedDetail) {
          setClientDetailPayload(null);
          setClientDetailError(fetchError.message || "No se pudo cargar la ficha del cliente.");
        }
      } finally {
        setClientDetailLoading(false);
      }
    }

    loadClientDetail();

    return () => {
      controller.abort();
    };
  }, [activeSection, clientDrawerOpen, selectedClientId, authToken, fetchClientDetail]);

  useEffect(() => {
    if (activeSection !== "terapeutas" || !therapistDrawerOpen || !selectedTherapistId || !authToken) {
      return;
    }

    const controller = new AbortController();

    async function loadTherapistDetail() {
      const hasCachedDetail = Boolean(therapistDetailPayloadRef.current);

      if (!hasCachedDetail) {
        setTherapistDetailLoading(true);
      }
      setTherapistDetailError("");

      try {
        const nextPayload = await fetchTherapistDetail(selectedTherapistId, {
          signal: controller.signal
        });

        if (nextPayload) {
          setTherapistDetailPayload(nextPayload);
        }
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        if (!hasCachedDetail) {
          setTherapistDetailPayload(null);
          setTherapistDetailError(fetchError.message || "No se pudo cargar la ficha del terapeuta.");
        }
      } finally {
        setTherapistDetailLoading(false);
      }
    }

    loadTherapistDetail();

    return () => {
      controller.abort();
    };
  }, [activeSection, therapistDrawerOpen, selectedTherapistId, authToken, fetchTherapistDetail, therapistsRefreshTick]);

  const timezone =
    payload?.center?.timezone ||
    historyPayload?.center?.timezone ||
    therapistsPayload?.center?.timezone ||
    resourcesPayload?.center?.timezone ||
    clientsPayload?.center?.timezone ||
    DEFAULT_TIMEZONE;
  const generatedAtLabel = payload ? formatDateTime(payload.generatedAt, timezone) : "-";
  const clientsGeneratedAtLabel = clientsPayload
    ? formatDateTime(clientsPayload.generatedAt, timezone)
    : "-";
  const historyGeneratedAtLabel = historyPayload
    ? formatDateTime(historyPayload.generatedAt, timezone)
    : "-";
  const therapistsGeneratedAtLabel = therapistsPayload
    ? formatDateTime(therapistsPayload.generatedAt, timezone)
    : "-";
  const controlRefreshLabel = lastRefreshedAt
    ? `Datos actualizados ${formatClock(lastRefreshedAt, timezone)}`
    : "Sin actualizar";
  const historyRefreshLabel = historyPayload
    ? `Historial actualizado ${formatClock(historyPayload.generatedAt, timezone)}`
    : "Sin actualizar";

  const summary = useMemo(() => {
    return (
      payload?.summary || {
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
        no_show: 0,
        total: 0
      }
    );
  }, [payload]);

  const todayAppointments = payload?.today || [];
  const upcomingAppointments = payload?.upcoming || [];
  const recentAppointments = payload?.recentCreated || [];

  const timelineAppointments = useMemo(() => {
    if (activeSection !== "control" || activeTab !== "timeline") {
      return [];
    }

    return sortByStartsAt(mergeById(todayAppointments, upcomingAppointments));
  }, [activeSection, activeTab, todayAppointments, upcomingAppointments]);

  const listAppointments = useMemo(() => {
    return sortByStartsAt(mergeById(todayAppointments, upcomingAppointments, recentAppointments));
  }, [todayAppointments, upcomingAppointments, recentAppointments]);

  const roomsAppointments = useMemo(() => {
    if (activeSection !== "control" || activeTab !== "rooms") {
      return [];
    }

    if (Array.isArray(payload?.roomsActive)) {
      return sortByStartsAt(payload.roomsActive);
    }

    return sortByStartsAt(listAppointments.filter((entry) => isActiveRoomAppointment(entry)));
  }, [activeSection, activeTab, payload, listAppointments]);

  const listedClients = clientsPayload?.clients || [];
  const historyAppointments = historyPayload?.history || [];
  const listedTherapists = therapistsPayload?.therapists || [];
  const resourcesSettings = useMemo(
    () => normalizeSettingsPayload(resourcesPayload),
    [resourcesPayload]
  );
  const manualServices = useMemo(
    () => resourcesSettings.services.filter((service) => service.status === "ACTIVE"),
    [resourcesSettings]
  );
  const manualRooms = useMemo(
    () => resourcesSettings.rooms.filter((room) => room.status === "ACTIVE"),
    [resourcesSettings]
  );
  const roomInfoById = useMemo(() => {
    const map = new Map();
    for (const room of resourcesSettings.rooms) {
      const roomId = Number(room.id);
      if (Number.isInteger(roomId) && roomId > 0) {
        map.set(roomId, room);
      }
    }
    for (const room of payload?.rooms || []) {
      const roomId = Number(room.id);
      if (Number.isInteger(roomId) && roomId > 0 && !map.has(roomId)) {
        map.set(roomId, room);
      }
    }
    return map;
  }, [payload?.rooms, resourcesSettings.rooms]);
  const manualTherapists = useMemo(() => {
    if (listedTherapists.length) {
      return listedTherapists.filter((therapist) => therapist.isActive);
    }

    const therapistMap = new Map();
    for (const item of listAppointments) {
      const therapistId = Number(item?.therapist?.id);
      if (!Number.isInteger(therapistId) || therapistId <= 0 || therapistMap.has(therapistId)) {
        continue;
      }

      therapistMap.set(therapistId, {
        id: therapistId,
        displayName:
          item?.therapist?.name ||
          item?.therapist?.fullName ||
          `Terapeuta ${therapistId}`
      });
    }

    return Array.from(therapistMap.values()).sort((left, right) =>
      String(left.displayName).localeCompare(String(right.displayName))
    );
  }, [listedTherapists, listAppointments]);
  const controlServiceOptions = useMemo(
    () => {
      if (activeSection !== "control" || activeTab !== "today") {
        return [];
      }

      return buildAppointmentEntityOptions({
        appointments: listAppointments,
        resources: manualServices,
        resourceType: "service"
      });
    },
    [activeSection, activeTab, listAppointments, manualServices]
  );
  const controlTherapistOptions = useMemo(
    () => {
      if (activeSection !== "control" || activeTab !== "today") {
        return [];
      }

      return buildAppointmentEntityOptions({
        appointments: listAppointments,
        resources: manualTherapists,
        resourceType: "therapist"
      });
    },
    [activeSection, activeTab, listAppointments, manualTherapists]
  );
  const controlRoomOptions = useMemo(
    () => {
      if (activeSection !== "control" || activeTab !== "today") {
        return [];
      }

      return buildAppointmentEntityOptions({
        appointments: listAppointments,
        resources: manualRooms,
        resourceType: "room"
      });
    },
    [activeSection, activeTab, listAppointments, manualRooms]
  );
  const filteredTodayAppointments = useMemo(
    () => {
      if (activeSection !== "control" || activeTab !== "today") {
        return [];
      }

      return filterAppointmentsForControl(todayAppointments, controlFilters, timezone);
    },
    [activeSection, activeTab, todayAppointments, controlFilters, timezone]
  );
  const filteredUpcomingAppointments = useMemo(
    () => {
      if (activeSection !== "control" || activeTab !== "today") {
        return [];
      }

      return filterAppointmentsForControl(upcomingAppointments, controlFilters, timezone);
    },
    [activeSection, activeTab, upcomingAppointments, controlFilters, timezone]
  );
  const filteredRecentAppointments = useMemo(
    () => {
      if (activeSection !== "control" || activeTab !== "today") {
        return [];
      }

      return filterAppointmentsForControl(recentAppointments, controlFilters, timezone);
    },
    [activeSection, activeTab, recentAppointments, controlFilters, timezone]
  );
  const filteredListAppointments = useMemo(
    () => {
      if (activeSection !== "control" || activeTab !== "today") {
        return [];
      }

      return filterAppointmentsForControl(listAppointments, controlFilters, timezone);
    },
    [activeSection, activeTab, listAppointments, controlFilters, timezone]
  );
  const filteredCasesByStatus = useMemo(() => {
    if (activeSection !== "control" || activeTab !== "today") {
      return [];
    }

    return [
      {
        status: "pending",
        label: "Pendientes",
        appointments: filteredListAppointments.filter((item) => item.status === "pending")
      },
      {
        status: "no_show",
        label: "No asistió",
        appointments: filteredListAppointments.filter((item) => item.status === "no_show")
      },
      {
        status: "cancelled",
        label: "Canceladas",
        appointments: filteredListAppointments.filter((item) => item.status === "cancelled")
      }
    ];
  }, [activeSection, activeTab, filteredListAppointments]);

  const selectedAppointmentIdsSet = useMemo(
    () => new Set(selectedAppointmentIds),
    [selectedAppointmentIds]
  );
  const selectedClientIdsSet = useMemo(
    () => new Set(selectedClientIds),
    [selectedClientIds]
  );
  const resetControlFilters = useCallback(() => {
    setControlFilters({
      q: "",
      fromDate: "",
      toDate: "",
      status: "all",
      serviceId: "all",
      therapistId: "all",
      roomId: "all",
      groupBy: "none"
    });
  }, []);
  const openManualAppointmentModal = useCallback(() => {
    setManualCreateError("");
    setManualCreateSuccess("");
    setManualDraft((value) => ({
      ...value,
      date: controlDate || getDateKeyForTimezone(new Date(), value.timezone),
      startsAt: ""
    }));
    setManualModalOpen(true);
  }, [controlDate]);

  useEffect(() => {
    const availableAppointmentIds = new Set(listAppointments.map((entry) => Number(entry.id)));
    setSelectedAppointmentIds((current) =>
      current.filter((entry) => availableAppointmentIds.has(Number(entry)))
    );
  }, [listAppointments]);

  useEffect(() => {
    setConfirmBulkAppointmentsDelete(false);
  }, [selectedAppointmentIds.length]);

  useEffect(() => {
    const availableClientIds = new Set(listedClients.map((entry) => Number(entry.id)));
    setSelectedClientIds((current) =>
      current.filter((entry) => availableClientIds.has(Number(entry)))
    );
  }, [listedClients]);

  useEffect(() => {
    setConfirmBulkClientsDelete(false);
  }, [selectedClientIds.length]);

  const activateSection = useCallback((sectionId) => {
    const allowed = new Set(["control", "clientes", "terapeutas", "ajustes"]);
    if (!allowed.has(sectionId)) {
      return;
    }

    setActiveSection(sectionId);
    setDrawerOpen(false);
    setSelectedAppointmentId(null);
    setDetailPayload(null);
    setDetailError("");
    setMutationError("");
    setRoomMutationError("");
    setDeleteAppointmentsError("");
    setArmedDeleteAppointmentId(null);
    setConfirmBulkAppointmentsDelete(false);
    setClientDrawerOpen(false);
    setSelectedClientId(null);
    setClientDetailPayload(null);
    setClientDetailError("");
    setDeleteClientsError("");
    setArmedDeleteClientId(null);
    setConfirmBulkClientsDelete(false);
    setTherapistDrawerOpen(false);
    setSelectedTherapistId(null);
    setTherapistDetailPayload(null);
    setTherapistDetailError("");
    setManualCreateError("");
    setManualCreateSuccess("");
  }, []);

  const openDrawer = useCallback((appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setDrawerOpen(true);
    setDetailPayload(null);
    setDetailError("");
    setMutationError("");
    setRoomMutationError("");
    setDeleteAppointmentsError("");
    setArmedDeleteAppointmentId(null);
    setConfirmBulkAppointmentsDelete(false);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedAppointmentId(null);
    setDetailPayload(null);
    setDetailError("");
    setMutationLoading(false);
    setMutationError("");
    setRoomMutationLoading(false);
    setRoomMutationError("");
    setRoomMoveRequest(null);
    setStatusConfirmRequest(null);
    setDeleteAppointmentsError("");
    setArmedDeleteAppointmentId(null);
    setConfirmBulkAppointmentsDelete(false);
  }, []);

  const openClientDrawer = useCallback((clientId) => {
    setSelectedClientId(clientId);
    setClientDrawerOpen(true);
    setClientDetailPayload(null);
    setClientDetailError("");
    setDeleteClientsError("");
    setArmedDeleteClientId(null);
    setConfirmBulkClientsDelete(false);
  }, []);

  const handleSearchAction = useCallback(
    (action) => {
      if (!action || !action.kind) return;

      if (action.kind === "openAppointment") {
        const appointmentId = Number(action.appointmentId);
        if (!Number.isInteger(appointmentId) || appointmentId <= 0) return;
        setActiveSection("control");
        setActiveTab("today");
        setClientDrawerOpen(false);
        setSelectedClientId(null);
        setClientDetailPayload(null);
        setSelectedAppointmentId(appointmentId);
        setDrawerOpen(true);
        setDetailPayload(null);
        setDetailError("");
        setMutationError("");
        setRoomMutationError("");
        setSearchOpen(false);
        return;
      }

      if (action.kind === "openClient") {
        const clientId = Number(action.clientId);
        if (!Number.isInteger(clientId) || clientId <= 0) return;
        setActiveSection("clientes");
        setDrawerOpen(false);
        setSelectedAppointmentId(null);
        setDetailPayload(null);
        setSelectedClientId(clientId);
        setClientDrawerOpen(true);
        setClientDetailPayload(null);
        setClientDetailError("");
        setSearchOpen(false);
        return;
      }

      if (action.kind === "openRooms") {
        setActiveSection("control");
        setActiveTab("rooms");
        setDrawerOpen(false);
        setClientDrawerOpen(false);
        setSelectedAppointmentId(null);
        setSelectedClientId(null);
        setSearchOpen(false);
        return;
      }
    },
    []
  );

  const closeClientDrawer = useCallback(() => {
    setClientDrawerOpen(false);
    setSelectedClientId(null);
    setClientDetailPayload(null);
    setClientDetailError("");
    setDeleteClientsError("");
    setArmedDeleteClientId(null);
    setConfirmBulkClientsDelete(false);
  }, []);

  async function handleLogin(event) {
    event.preventDefault();

    setLoginLoading(true);
    setAuthError("");

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const loginPayload = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(loginPayload));
      }

      const token = String(loginPayload?.token || "").trim();
      const admin = loginPayload?.admin || null;

      if (!token || !admin) {
        throw new Error("Respuesta de login inválida");
      }

      saveAuth(token, admin);
      setAuthToken(token);
      setAuthAdmin(admin);
      setLoginPassword("");
      setError("");
      setRefreshTick((value) => value + 1);
      setClientsRefreshTick((value) => value + 1);
    } catch (loginRequestError) {
      setAuthError(loginRequestError.message || "No se pudo iniciar sesión");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    clearAuthStorage();
    setAuthToken("");
    setAuthAdmin(null);
    setPayload(null);
    setIsLoading(false);
    setIsRefreshing(false);
    setLoginPassword("");
    setError("");
    setAuthError("");
    setDrawerOpen(false);
    setSelectedAppointmentId(null);
    setDetailPayload(null);
    setDetailError("");
    setMutationError("");
    setRoomMutationError("");
    setRoomMoveRequest(null);
    setStatusConfirmRequest(null);
    setDeleteAppointmentsError("");
    setDeleteAppointmentsLoading(false);
    setSelectedAppointmentIds([]);
    setArmedDeleteAppointmentId(null);
    setConfirmBulkAppointmentsDelete(false);
    setClientsPayload(null);
    setClientsLoading(false);
    setClientsRefreshing(false);
    setClientsError("");
    setHistoryPayload(null);
    setHistoryLoading(false);
    setHistoryRefreshing(false);
    setHistoryError("");
    setTherapistsPayload(null);
    setTherapistsLoading(false);
    setTherapistsRefreshing(false);
    setTherapistsError("");
    setTherapistDrawerOpen(false);
    setSelectedTherapistId(null);
    setTherapistDetailPayload(null);
    setTherapistDetailError("");
    setResourcesPayload(null);
    setResourcesLoading(false);
    setResourcesRefreshing(false);
    setResourcesError("");
    setManualCreateLoading(false);
    setManualCreateError("");
    setManualCreateSuccess("");
    setDeleteClientsError("");
    setDeleteClientsLoading(false);
    setSelectedClientIds([]);
    setArmedDeleteClientId(null);
    setConfirmBulkClientsDelete(false);
    setClientDrawerOpen(false);
    setSelectedClientId(null);
    setClientDetailPayload(null);
    setClientDetailError("");
    setLastRefreshedAt(null);
    setActiveSection("control");
  }

  async function applyStatusChange(nextStatus) {
    setMutationLoading(true);
    setMutationError("");

    try {
      const response = await fetch(`/api/admin/appointments/${selectedAppointmentId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      const mutationPayload = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(mutationPayload));
      }

      setDetailPayload(mutationPayload);
      setRefreshTick((value) => value + 1);
    } catch (mutationRequestError) {
      setMutationError(mutationRequestError.message || "No se pudo cambiar el estado.");
    } finally {
      setMutationLoading(false);
      setStatusConfirmRequest(null);
    }
  }

  async function handleStatusChange(nextStatus) {
    if (!selectedAppointmentId || mutationLoading) {
      return;
    }

    if (TERMINAL_ACTIONS.has(nextStatus)) {
      setStatusConfirmRequest({ nextStatus });
      return;
    }

    await applyStatusChange(nextStatus);
  }

  function findAppointmentForMove(appointmentId) {
    const numericAppointmentId = Number(appointmentId);
    if (detailPayload?.appointment && Number(detailPayload.appointment.id) === numericAppointmentId) {
      return detailPayload.appointment;
    }
    return listAppointments.find((item) => Number(item.id) === numericAppointmentId) || null;
  }

  function buildRoomMoveRequest({ appointmentId, nextRoomId, roomLabel, mode }) {
    const numericAppointmentId = Number(appointmentId);
    const numericRoomId = Number(nextRoomId);
    if (!Number.isInteger(numericAppointmentId) || numericAppointmentId <= 0) return null;
    if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) return null;

    const appointment = findAppointmentForMove(numericAppointmentId);
    const targetRoom = roomInfoById.get(numericRoomId) || {};
    const serviceName = appointment?.service?.name || "Servicio";
    const requiredFeatureKeys = uniqueFeatureKeys(appointment?.service?.requiredFeatureKeys || []);
    const targetFeatureKeys = Array.isArray(targetRoom.featureKeys)
      ? uniqueFeatureKeys(targetRoom.featureKeys)
      : [];
    const missingFeatureKeys = Array.isArray(targetRoom.featureKeys)
      ? requiredFeatureKeys.filter((key) => !targetFeatureKeys.includes(key))
      : [];

    return {
      mode,
      appointmentId: numericAppointmentId,
      targetRoomId: numericRoomId,
      targetRoomName: targetRoom.name || roomLabel || `Sala ${numericRoomId}`,
      currentRoomName: appointment?.room?.name || "sala actual",
      clientName: appointment?.client?.fullName || "esta cita",
      serviceName,
      timeLabel: appointment?.startsAt && appointment?.endsAt
        ? `${formatClock(appointment.startsAt, timezone)} - ${formatClock(appointment.endsAt, timezone)}`
        : "-",
      requiredFeatureLabels: featureLabels(requiredFeatureKeys),
      targetFeatureLabels: featureLabels(targetFeatureKeys),
      missingFeatureLabels: featureLabels(missingFeatureKeys)
    };
  }

  function requestRoomMove({ appointmentId, nextRoomId, roomLabel, mode }) {
    if (!authToken || kanbanMoving || roomMutationLoading) return;
    const request = buildRoomMoveRequest({ appointmentId, nextRoomId, roomLabel, mode });
    if (!request) return;
    setKanbanError("");
    setRoomMutationError("");
    setRoomMoveRequest(request);
  }

  const handleRoomKanbanMove = useCallback(
    ({ appointmentId, nextRoomId, roomLabel }) => {
      requestRoomMove({ appointmentId, nextRoomId, roomLabel, mode: "kanban" });
    },
    [authToken, kanbanMoving, listAppointments, roomInfoById, roomMutationLoading, timezone]
  );

  async function executeRoomMove(request) {
    if (!request || !authToken) return;
    const numericAppointmentId = Number(request.appointmentId);
    const numericRoomId = Number(request.targetRoomId);
    if (!Number.isInteger(numericAppointmentId) || numericAppointmentId <= 0) return;
    if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) return;

    if (request.mode === "drawer") {
      setRoomMutationLoading(true);
      setRoomMutationError("");
    } else {
      setKanbanMoving(true);
      setKanbanError("");
      setKanbanPending({ appointmentId: numericAppointmentId, roomId: numericRoomId });
    }

    try {
      const response = await fetch(`/api/admin/appointments/${numericAppointmentId}/room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ roomId: numericRoomId })
      });

      const mutationPayload = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(mutationPayload));
      }

      setRefreshTick((value) => value + 1);
      if (
        request.mode === "drawer" ||
        (drawerOpen && Number(selectedAppointmentId) === numericAppointmentId)
      ) {
        setDetailPayload(mutationPayload);
      }
      setRoomMoveRequest(null);
    } catch (mutationRequestError) {
      const message = mutationRequestError.message || "No se pudo cambiar la sala.";
      if (request.mode === "drawer") {
        setRoomMutationError(message);
      } else {
        setKanbanError(message);
      }
    } finally {
      if (request.mode === "drawer") {
        setRoomMutationLoading(false);
      } else {
        setKanbanMoving(false);
        setKanbanPending(null);
      }
    }
  }

  function handleRoomChange(nextRoomId) {
    if (!selectedAppointmentId || !nextRoomId || roomMutationLoading) {
      return;
    }
    requestRoomMove({
      appointmentId: selectedAppointmentId,
      nextRoomId,
      roomLabel: roomInfoById.get(Number(nextRoomId))?.name,
      mode: "drawer"
    });
  }

  const toggleAppointmentSelection = useCallback((appointmentId, checked) => {
    const normalizedId = Number(appointmentId);
    setSelectedAppointmentIds((current) => {
      const currentSet = new Set(current.map((entry) => Number(entry)));

      if (checked) {
        currentSet.add(normalizedId);
      } else {
        currentSet.delete(normalizedId);
      }

      return Array.from(currentSet.values());
    });
  }, []);

  const toggleAppointmentSelectionGroup = useCallback((ids, checked) => {
    const normalizedIds = ids.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry > 0);
    setSelectedAppointmentIds((current) => {
      const currentSet = new Set(current.map((entry) => Number(entry)));

      for (const id of normalizedIds) {
        if (checked) {
          currentSet.add(id);
        } else {
          currentSet.delete(id);
        }
      }

      return Array.from(currentSet.values());
    });
  }, []);

  const requestDeleteAppointments = useCallback(async (ids) => {
    if (!ids.length || deleteAppointmentsLoading) {
      return;
    }

    setDeleteAppointmentsLoading(true);
    setDeleteAppointmentsError("");

    try {
      const response = await fetch("/api/admin/appointments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ ids })
      });
      const payloadResponse = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payloadResponse));
      }

      setArmedDeleteAppointmentId(null);
      setConfirmBulkAppointmentsDelete(false);
      setSelectedAppointmentIds((current) => current.filter((entry) => !ids.includes(Number(entry))));

      if (selectedAppointmentId && ids.includes(Number(selectedAppointmentId))) {
        closeDrawer();
      }

      setRefreshTick((value) => value + 1);
    } catch (deleteError) {
      setDeleteAppointmentsError(deleteError.message || "No se pudieron borrar las citas seleccionadas.");
    } finally {
      setDeleteAppointmentsLoading(false);
    }
  }, [
    authToken,
    closeDrawer,
    deleteAppointmentsLoading,
    handleUnauthorized,
    selectedAppointmentId
  ]);

  const handleDeleteAppointmentButton = useCallback((appointmentId) => {
    if (deleteAppointmentsLoading) {
      return;
    }

    const normalizedId = Number(appointmentId);

    if (armedDeleteAppointmentId === normalizedId) {
      requestDeleteAppointments([normalizedId]);
      return;
    }

    setDeleteAppointmentsError("");
    setConfirmBulkAppointmentsDelete(false);
    setArmedDeleteAppointmentId(normalizedId);
  }, [armedDeleteAppointmentId, deleteAppointmentsLoading, requestDeleteAppointments]);

  const handleBulkDeleteAppointmentsButton = useCallback(() => {
    if (deleteAppointmentsLoading || selectedAppointmentIds.length === 0) {
      return;
    }

    if (confirmBulkAppointmentsDelete) {
      requestDeleteAppointments(selectedAppointmentIds.map((entry) => Number(entry)));
      return;
    }

    setDeleteAppointmentsError("");
    setArmedDeleteAppointmentId(null);
    setConfirmBulkAppointmentsDelete(true);
  }, [
    confirmBulkAppointmentsDelete,
    deleteAppointmentsLoading,
    requestDeleteAppointments,
    selectedAppointmentIds
  ]);

  function toggleClientSelection(clientId, checked) {
    const normalizedId = Number(clientId);
    setSelectedClientIds((current) => {
      const currentSet = new Set(current.map((entry) => Number(entry)));

      if (checked) {
        currentSet.add(normalizedId);
      } else {
        currentSet.delete(normalizedId);
      }

      return Array.from(currentSet.values());
    });
  }

  function toggleClientSelectionGroup(ids, checked) {
    const normalizedIds = ids.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry > 0);
    setSelectedClientIds((current) => {
      const currentSet = new Set(current.map((entry) => Number(entry)));

      for (const id of normalizedIds) {
        if (checked) {
          currentSet.add(id);
        } else {
          currentSet.delete(id);
        }
      }

      return Array.from(currentSet.values());
    });
  }

  async function requestDeleteClients(ids) {
    if (!ids.length || deleteClientsLoading) {
      return;
    }

    setDeleteClientsLoading(true);
    setDeleteClientsError("");

    try {
      const response = await fetch("/api/admin/clients", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ ids })
      });
      const payloadResponse = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payloadResponse));
      }

      setArmedDeleteClientId(null);
      setConfirmBulkClientsDelete(false);
      setSelectedClientIds((current) => current.filter((entry) => !ids.includes(Number(entry))));

      if (selectedClientId && ids.includes(Number(selectedClientId))) {
        closeClientDrawer();
      }

      setClientsRefreshTick((value) => value + 1);
      setRefreshTick((value) => value + 1);
    } catch (deleteError) {
      setDeleteClientsError(deleteError.message || "No se pudieron borrar los clientes seleccionados.");
    } finally {
      setDeleteClientsLoading(false);
    }
  }

  function handleDeleteClientButton(clientId) {
    if (deleteClientsLoading) {
      return;
    }

    const normalizedId = Number(clientId);

    if (armedDeleteClientId === normalizedId) {
      requestDeleteClients([normalizedId]);
      return;
    }

    setDeleteClientsError("");
    setConfirmBulkClientsDelete(false);
    setArmedDeleteClientId(normalizedId);
  }

  function handleBulkDeleteClientsButton() {
    if (deleteClientsLoading || selectedClientIds.length === 0) {
      return;
    }

    if (confirmBulkClientsDelete) {
      requestDeleteClients(selectedClientIds.map((entry) => Number(entry)));
      return;
    }

    setDeleteClientsError("");
    setArmedDeleteClientId(null);
    setConfirmBulkClientsDelete(true);
  }

  function handleClientSearchSubmit(event) {
    event.preventDefault();
    setClientsFilters({
      q: clientsDraft.q,
      onboarding: clientsDraft.onboarding,
      limit: Number(clientsDraft.limit) || 20
    });
  }

  function handleClientFiltersReset() {
    const next = {
      q: "",
      onboarding: "all",
      limit: 20
    };
    setClientsDraft(next);
    setClientsFilters(next);
    setClientsRefreshTick((value) => value + 1);
  }

  function handleHistoryFiltersSubmit(event) {
    event.preventDefault();
    const nextFilters = {
      q: String(historyDraft.q || "").trim(),
      status: historyDraft.status || "all",
      order: historyDraft.order || "date_desc",
      limit: Number(historyDraft.limit) || 40
    };
    setHistoryFilters(nextFilters);
  }

  function handleHistoryStatusFilter(nextStatus) {
    const statusValue = nextStatus || "all";
    setHistoryDraft((value) => ({ ...value, status: statusValue }));
    setHistoryFilters((value) => ({ ...value, status: statusValue }));
  }

  function handleHistoryFiltersReset() {
    const next = {
      q: "",
      status: "all",
      order: "date_desc",
      limit: 40
    };
    setHistoryDraft(next);
    setHistoryFilters(next);
    setHistoryRefreshTick((value) => value + 1);
  }

  function openTherapistDrawer(therapistId) {
    setSelectedTherapistId(therapistId);
    setTherapistDrawerOpen(true);
    setTherapistDetailPayload(null);
    setTherapistDetailError("");
  }

  function closeTherapistDrawer() {
    setTherapistDrawerOpen(false);
    setSelectedTherapistId(null);
    setTherapistDetailPayload(null);
    setTherapistDetailError("");
  }

  async function handleCreateManualAppointment(event) {
    event.preventDefault();

    if (!authToken || manualCreateLoading) {
      return;
    }

    setManualCreateLoading(true);
    setManualCreateError("");
    setManualCreateSuccess("");

    try {
      const selectedTimezoneOption =
        COUNTRY_TIMEZONE_OPTIONS.find((option) => option.timezone === manualDraft.timezone) ||
        COUNTRY_TIMEZONE_OPTIONS[0];
      const phoneDigits = normalizePhone(manualDraft.phoneDigits);
      const fullName = `${manualDraft.firstName || ""} ${manualDraft.lastName || ""}`.trim();

      if (!isPhoneValidByTimezone(phoneDigits, selectedTimezoneOption) ||
          !isBoliviaMobilePhone(phoneDigits, selectedTimezoneOption)) {
        throw new Error(
          selectedTimezoneOption.timezone === DEFAULT_TIMEZONE
            ? "WhatsApp invalido para Bolivia. Usa 8 digitos y empieza con 6 o 7."
            : `WhatsApp invalido para ${selectedTimezoneOption.country}. Usa ${formatDigitsRule(selectedTimezoneOption)}.`
        );
      }

      const startsAtIso = manualDraft.startsAt
        ? new Date(manualDraft.startsAt).toISOString()
        : "";

      const payloadBody = {
        phoneE164: buildPhonePayload(phoneDigits, selectedTimezoneOption),
        clientFullName: fullName || null,
        serviceId: manualDraft.serviceId,
        startsAt: startsAtIso,
        therapistId: manualDraft.therapistId || null,
        roomId: manualDraft.roomId || null
      };

      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payloadBody)
      });
      const nextPayload = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(nextPayload));
      }

      setManualCreateSuccess("Cita manual creada y confirmada.");
      setControlDate(manualDraft.date || controlDate);
      setManualDraft((value) => ({
        ...value,
        firstName: "",
        lastName: "",
        phoneDigits: "",
        startsAt: "",
        therapistId: "",
        roomId: ""
      }));
      setManualModalOpen(false);
      setRefreshTick((value) => value + 1);
      if (nextPayload?.appointment?.id) {
        openDrawer(Number(nextPayload.appointment.id));
      }
    } catch (createError) {
      const message = createError.message || "No se pudo crear la cita manual.";
      setManualCreateError(
        message.toLowerCase().includes("slot")
          ? "Ese horario ya no tiene terapeuta/sala disponible. Vuelve a elegir un slot disponible."
          : message
      );
    } finally {
      setManualCreateLoading(false);
    }
  }

  const sectionTitle = (() => {
    if (activeSection === "clientes") return "Clientes";
    if (activeSection === "terapeutas") return "Terapeutas";
    if (activeSection === "ajustes") return "Ajustes";
    return "Control";
  })();
  const sectionCenterName =
    payload?.center?.displayName ||
    historyPayload?.center?.displayName ||
    therapistsPayload?.center?.displayName ||
    resourcesPayload?.center?.displayName ||
    clientsPayload?.center?.displayName ||
    "-";
  const hasControlData = Boolean(payload);
  const hasHistoryData = Boolean(historyPayload);
  const hasClientsData = Boolean(clientsPayload);
  const hasTherapistsData = Boolean(therapistsPayload);
  const hasResourcesData = Boolean(resourcesPayload);
  const canOpenSection = (sectionId) =>
    sectionId === "control" ||
    sectionId === "clientes" ||
    sectionId === "terapeutas" ||
    sectionId === "ajustes";
  const isControlSection = activeSection === "control";
  const isClientsSection = activeSection === "clientes";
  const isTherapistsSection = activeSection === "terapeutas";
  const isSettingsSection = activeSection === "ajustes";

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-label="Luna Mandala">
          <Sparkle size={24} weight="fill" aria-hidden="true" />
        </div>

        <nav className="sidebar-nav" aria-label="Menu Admin">
          {MENU.map((item) => {
            const MenuIcon = item.Icon;
            const isActive = item.id === activeSection;

            if (canOpenSection(item.id)) {
              return (
                <button
                  type="button"
                  className={`nav-item nav-item-button${isActive ? " is-active" : ""}`}
                  key={item.id}
                  onClick={() => activateSection(item.id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <MenuIcon size={24} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
                  <p className="nav-label">{item.label}</p>
                  <span className={`nav-phase${isActive ? " nav-phase-active" : ""}`}>{item.phase}</span>
                </button>
              );
            }

            return (
              <div className={`nav-item${isActive ? " is-active" : ""}`} key={item.id} aria-current={isActive ? "page" : undefined}>
                <MenuIcon size={24} weight="regular" aria-hidden="true" />
                <p className="nav-label">{item.label}</p>
                <span className="nav-phase">{item.phase}</span>
              </div>
            );
          })}
        </nav>

        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        >
          {theme === "dark" ? <Sun size={22} weight="regular" aria-hidden="true" /> : <Moon size={22} weight="regular" aria-hidden="true" />}
        </button>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Agenda Luna Mandala</p>
            <h1>{sectionTitle}</h1>
            <p className="subtle-line">Centro: {sectionCenterName}</p>
          </div>

          <div className="controls">
            {authToken ? (
              <button
                type="button"
                className="search-button"
                onClick={() => setSearchOpen(true)}
                aria-label="Abrir busqueda global"
              >
                <MagnifyingGlass size={16} weight="regular" aria-hidden="true" />
                <span>Buscar</span>
                <kbd className="search-button-kbd">/</kbd>
              </button>
            ) : null}

            {authToken && authAdmin ? (
              <div className="auth-chip" aria-label="Sesion activa">
                <UserCircle size={18} weight="regular" aria-hidden="true" />
                <span>{authAdmin.fullName || authAdmin.email || "Admin"}</span>
              </div>
            ) : null}

            {authToken && isControlSection ? (
              activeTab === "history" ? (
                <>
                  <button
                    type="button"
                    className="refresh-button"
                    onClick={() => setHistoryRefreshTick((value) => value + 1)}
                    disabled={historyLoading || historyRefreshing}
                  >
                    {historyLoading || historyRefreshing ? "Actualizando..." : "Actualizar"}
                  </button>

                  <p
                    className={`refresh-indicator${historyError ? " is-error" : ""}`}
                    aria-live="polite"
                  >
                    {historyRefreshing
                      ? "Actualizando historial..."
                      : historyError
                        ? "Error en ultima actualizacion"
                        : historyRefreshLabel}
                  </p>
                </>
              ) : (
                <>
                  <div className="control-date-nav" aria-label="Fecha operativa">
                    <button
                      type="button"
                      className="control-date-step"
                      onClick={() => {
                        setActiveTab("today");
                        setControlDate((value) => shiftDateKey(value, -1));
                      }}
                    >
                      Anterior
                    </button>
                    <label className="control-field" htmlFor="control-date">
                      <span>Fecha</span>
                      <input
                        id="control-date"
                        className="control-date-input"
                        type="date"
                        value={controlDate}
                        onChange={(event) => {
                          setActiveTab("today");
                          setControlDate(event.target.value || getDateKeyForTimezone(new Date(), timezone));
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="control-date-step"
                      onClick={() => {
                        setActiveTab("today");
                        setControlDate((value) => shiftDateKey(value, 1));
                      }}
                    >
                      Siguiente
                    </button>
                    <button
                      type="button"
                      className="control-date-step"
                      onClick={() => {
                        setActiveTab("today");
                        setControlDate(getDateKeyForTimezone(new Date(), timezone));
                      }}
                    >
                      Hoy
                    </button>
                  </div>

                  <label className="control-field" htmlFor="limit-select">
                    <span>Limit</span>
                    <select
                      id="limit-select"
                      className="control-input"
                      value={limit}
                      onChange={(event) => setLimit(Number(event.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                    </select>
                  </label>

                  <label className="control-check" htmlFor="upcoming-check">
                    <input
                      id="upcoming-check"
                      type="checkbox"
                      checked={includeUpcoming}
                      onChange={(event) => setIncludeUpcoming(event.target.checked)}
                    />
                    <span>Incluir proximas</span>
                  </label>

                  <button
                    type="button"
                    className="refresh-button"
                    onClick={() => setRefreshTick((value) => value + 1)}
                    disabled={isLoading || isRefreshing}
                  >
                    {isLoading || isRefreshing ? "Actualizando..." : "Actualizar"}
                  </button>

                  <p
                    className={`refresh-indicator${error ? " is-error" : ""}`}
                    aria-live="polite"
                  >
                    {isRefreshing
                      ? "Actualizando datos..."
                      : error
                        ? "Error en ultima actualizacion"
                        : controlRefreshLabel}
                  </p>

                  {selectedAppointmentIds.length ? (
                    <button
                      type="button"
                      className={`danger-button${confirmBulkAppointmentsDelete ? " is-armed" : ""}`}
                      disabled={deleteAppointmentsLoading}
                      onClick={handleBulkDeleteAppointmentsButton}
                    >
                      <Trash size={14} weight="regular" aria-hidden="true" />
                      <span>
                        {confirmBulkAppointmentsDelete
                          ? `¿Borrar ${selectedAppointmentIds.length}?`
                          : `Borrar citas (${selectedAppointmentIds.length})`}
                      </span>
                    </button>
                  ) : null}
                </>
              )
            ) : null}

            {authToken && isClientsSection && selectedClientIds.length ? (
              <button
                type="button"
                className={`danger-button${confirmBulkClientsDelete ? " is-armed" : ""}`}
                disabled={deleteClientsLoading}
                onClick={handleBulkDeleteClientsButton}
              >
                <Trash size={14} weight="regular" aria-hidden="true" />
                <span>
                  {confirmBulkClientsDelete
                    ? `¿Borrar ${selectedClientIds.length}?`
                    : `Borrar clientes (${selectedClientIds.length})`}
                </span>
              </button>
            ) : null}

            {authToken ? (
              <button type="button" className="logout-button" onClick={handleLogout}>
                <SignOut size={16} weight="regular" aria-hidden="true" />
                <span>Salir</span>
              </button>
            ) : null}
          </div>
        </header>

        <main className="canvas">
          {!authToken ? (
            <section className="auth-panel" aria-label="Login admin">
              <h2>Ingreso Admin</h2>
              <p className="auth-subtitle">Inicia sesión para acceder al Control.</p>

              <form className="auth-form" onSubmit={handleLogin}>
                <label className="auth-field" htmlFor="admin-email">
                  <span>Email</span>
                  <input
                    id="admin-email"
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="auth-field" htmlFor="admin-password">
                  <span>Password</span>
                  <input
                    id="admin-password"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>

                <button type="submit" className="login-button" disabled={loginLoading}>
                  {loginLoading ? "Ingresando..." : "Entrar"}
                </button>
              </form>

              {authError ? <p className="feedback error">{authError}</p> : null}
            </section>
          ) : (
            <>
              {isControlSection ? (
                <>
                  <section className="meta-strip" aria-label="Filtros activos">
                    {activeTab === "history" ? (
                      <>
                        <p>
                          Búsqueda: <strong>{historyFilters.q || "-"}</strong>
                        </p>
                        <p>
                          Estado: <strong>{historyFilters.status}</strong>
                        </p>
                        <p>
                          Orden: <strong>{historyFilters.order}</strong>
                        </p>
                        <p>
                          Última carga: <strong>{historyGeneratedAtLabel}</strong>
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          Fecha: <strong>{payload?.filters?.date || controlDate}</strong>
                        </p>
                        <p>
                          Upcoming: <strong>{toBoolLabel(includeUpcoming)}</strong>
                        </p>
                        <p>
                          Última carga: <strong>{generatedAtLabel}</strong>
                        </p>
                      </>
                    )}
                  </section>

                  <section className="command-bar" aria-label="Vistas internas control">
                    {VIEW_TABS.map((tab) => {
                      const Icon = tab.Icon;
                      const active = activeTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={`tab-button${active ? " is-active" : ""}`}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          <Icon size={16} weight={active ? "fill" : "regular"} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </section>

                  {activeTab === "history" ? (
                    <>
                      {historyLoading && !hasHistoryData ? (
                        <p className="feedback">Cargando historial...</p>
                      ) : null}
                      {historyError && !hasHistoryData ? <p className="feedback error">{historyError}</p> : null}
                      {historyError && hasHistoryData ? (
                        <p className="feedback error">No se pudo actualizar historial. Mostrando última carga válida.</p>
                      ) : null}
                      {historyRefreshing ? (
                        <p className="feedback subtle">Actualizando historial en segundo plano...</p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {isLoading && !hasControlData ? <p className="feedback">Cargando tablero...</p> : null}
                      {error && !hasControlData ? <p className="feedback error">{error}</p> : null}
                      {error && hasControlData ? (
                        <p className="feedback error">No se pudo actualizar el tablero. Mostrando última carga válida.</p>
                      ) : null}
                      {deleteAppointmentsError ? (
                        <p className="feedback error">{deleteAppointmentsError}</p>
                      ) : null}
                    </>
                  )}

                  {activeTab === "history" && hasHistoryData ? (
                    <>
                      <section className="panel history-filters-panel" aria-label="Filtros historial admin">
                        <form className="history-toolbar" onSubmit={handleHistoryFiltersSubmit}>
                          <label className="history-search-field" htmlFor="history-search">
                            <MagnifyingGlass size={16} weight="regular" aria-hidden="true" />
                            <input
                              id="history-search"
                              type="search"
                              value={historyDraft.q}
                              onChange={(event) =>
                                setHistoryDraft((value) => ({ ...value, q: event.target.value }))
                              }
                              placeholder="Buscar por nombre o WhatsApp"
                            />
                          </label>

                          <nav className="history-status-pills" aria-label="Filtro por estado historial">
                            {HISTORY_STATUS_FILTERS.map((filter) => {
                              const active = historyFilters.status === filter.id;
                              return (
                                <button
                                  key={filter.id}
                                  type="button"
                                  className={`history-pill${active ? " is-active" : ""}`}
                                  onClick={() => handleHistoryStatusFilter(filter.id)}
                                >
                                  {filter.label}
                                </button>
                              );
                            })}
                          </nav>

                          <label className="history-toolbar-select" htmlFor="history-order">
                            <span>Orden</span>
                            <select
                              id="history-order"
                              className="control-input"
                              value={historyDraft.order}
                              onChange={(event) =>
                                setHistoryDraft((value) => ({ ...value, order: event.target.value }))
                              }
                            >
                              {HISTORY_ORDER_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="history-toolbar-select" htmlFor="history-limit">
                            <span>Ver</span>
                            <select
                              id="history-limit"
                              className="control-input"
                              value={historyDraft.limit}
                              onChange={(event) =>
                                setHistoryDraft((value) => ({
                                  ...value,
                                  limit: Number(event.target.value)
                                }))
                              }
                            >
                              <option value={20}>20</option>
                              <option value={40}>40</option>
                              <option value={60}>60</option>
                              <option value={100}>100</option>
                            </select>
                          </label>

                          <div className="history-toolbar-actions">
                            <button type="submit" className="refresh-button">Aplicar</button>
                            <button
                              type="button"
                              className="logout-button"
                              onClick={handleHistoryFiltersReset}
                            >
                              Limpiar
                            </button>
                          </div>

                          <p className="history-visible-count">{historyAppointments.length} visibles</p>
                        </form>
                      </section>

                      <section className="panel history-results-panel" aria-label="Historial de atenciones">
                        <div className="panel-heading panel-heading-compact">
                          <h2>Historial</h2>
                          <p>Actualizado: {historyGeneratedAtLabel}</p>
                        </div>
                        <MemoHistoryTable appointments={historyAppointments} timezone={timezone} />
                      </section>
                    </>
                  ) : null}

                  {hasControlData ? (
                    <>
                      {activeTab === "today" ? (
                        <>
                          <section className="summary-grid" aria-label="Resumen por estado">
                            <SummaryCard label="Pendientes" value={summary.pending} className="status-pending" />
                            <SummaryCard label="Confirmadas" value={summary.confirmed} className="status-confirmed" />
                            <SummaryCard label="Canceladas" value={summary.cancelled} className="status-cancelled" />
                            <SummaryCard label="Completadas" value={summary.completed} className="status-completed" />
                            <SummaryCard label="No asistió" value={summary.no_show} className="status-no-show" />
                            <SummaryCard label="Total" value={summary.total} className="status-total" />
                          </section>

                          <section className="panel" aria-label="Casos prioritarios">
                            <div className="panel-heading">
                              <h2>Casos</h2>
                              <p>Pendientes / No asistió / Canceladas</p>
                            </div>
                            <div className="cases-grid">
                              {filteredCasesByStatus.map((group) => (
                                <article key={group.status} className="case-column">
                                  <div className="case-column-head">
                                    <StatusChip status={group.status} />
                                    <span>{group.appointments.length}</span>
                                  </div>
                                  {group.appointments.length ? (
                                    <ul className="case-list">
                                      {group.appointments.map((item) => (
                                        <li key={`case-${group.status}-${item.id}`}>
                                          <button
                                            type="button"
                                            className="case-item"
                                            onClick={() => openDrawer(item.id)}
                                          >
                                            <strong>{item.client.fullName || "Sin nombre"}</strong>
                                            <span>{formatDateTime(item.startsAt, timezone)}</span>
                                            <span>{item.publicCode || "-"}</span>
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="empty-state compact">Sin casos en este estado.</p>
                                  )}
                                </article>
                              ))}
                            </div>
                          </section>

                          <MemoControlToolbar
                            filters={controlFilters}
                            services={controlServiceOptions}
                            therapists={controlTherapistOptions}
                            rooms={controlRoomOptions}
                            filteredCount={filteredListAppointments.length}
                            totalCount={listAppointments.length}
                            createDisabled={hasResourcesData && !manualServices.length}
                            onChange={setControlFilters}
                            onReset={resetControlFilters}
                            onCreate={openManualAppointmentModal}
                          />

                          <section className="panel" aria-label="Citas del día">
                            <div className="panel-heading">
                              <h2>Citas del día</h2>
                              <p>{filteredTodayAppointments.length} de {todayAppointments.length} registros</p>
                            </div>
                            <MemoAppointmentTable
                              appointments={filteredTodayAppointments}
                              timezone={timezone}
                              groupBy={controlFilters.groupBy}
                              onSelect={openDrawer}
                              selectedIds={selectedAppointmentIdsSet}
                              onToggleSelect={toggleAppointmentSelection}
                              onToggleSelectAll={toggleAppointmentSelectionGroup}
                              onDeleteOne={handleDeleteAppointmentButton}
                              armedDeleteId={armedDeleteAppointmentId}
                              deleteLoading={deleteAppointmentsLoading}
                            />
                          </section>

                          {includeUpcoming ? (
                            <section className="panel" aria-label="Próximas citas">
                              <div className="panel-heading">
                                <h2>Próximas citas</h2>
                                <p>{filteredUpcomingAppointments.length} de {upcomingAppointments.length} registros</p>
                              </div>
                              <MemoAppointmentTable
                                appointments={filteredUpcomingAppointments}
                                timezone={timezone}
                                groupBy={controlFilters.groupBy}
                                onSelect={openDrawer}
                                selectedIds={selectedAppointmentIdsSet}
                                onToggleSelect={toggleAppointmentSelection}
                                onToggleSelectAll={toggleAppointmentSelectionGroup}
                                onDeleteOne={handleDeleteAppointmentButton}
                                armedDeleteId={armedDeleteAppointmentId}
                                deleteLoading={deleteAppointmentsLoading}
                              />
                            </section>
                          ) : null}

                          <section className="panel" aria-label="Últimas citas creadas">
                            <div className="panel-heading">
                              <h2>Últimas citas creadas</h2>
                              <p>{filteredRecentAppointments.length} de {recentAppointments.length} registros</p>
                            </div>
                            <MemoAppointmentTable
                              appointments={filteredRecentAppointments}
                              timezone={timezone}
                              groupBy={controlFilters.groupBy}
                              onSelect={openDrawer}
                              selectedIds={selectedAppointmentIdsSet}
                              onToggleSelect={toggleAppointmentSelection}
                              onToggleSelectAll={toggleAppointmentSelectionGroup}
                              onDeleteOne={handleDeleteAppointmentButton}
                              armedDeleteId={armedDeleteAppointmentId}
                              deleteLoading={deleteAppointmentsLoading}
                            />
                          </section>
                        </>
                      ) : null}

                      {activeTab === "timeline" ? (
                        <section className="panel" aria-label="Timeline real de citas">
                          <div className="panel-heading">
                            <h2>Timeline</h2>
                            <p>{timelineAppointments.length} citas</p>
                          </div>
                          <MemoTimelineView
                            appointments={timelineAppointments}
                            timezone={timezone}
                            onSelect={openDrawer}
                          />
                        </section>
                      ) : null}

                      {activeTab === "rooms" ? (
                        <section className="panel rooms-panel" aria-label="Vista por salas">
                          <div className="panel-heading">
                            <h2>Kanban de salas</h2>
                            <p>Arrastra una cita hacia una sala activa para reasignarla.</p>
                          </div>
                          {kanbanError ? (
                            <p className="feedback error compact-feedback">{kanbanError}</p>
                          ) : null}
                          <MemoRoomsKanban
                            appointments={roomsAppointments}
                            rooms={payload?.rooms || []}
                            timezone={timezone}
                            onSelect={openDrawer}
                            onMoveToRoom={handleRoomKanbanMove}
                            draggable={!kanbanMoving}
                            isMutating={kanbanMoving}
                            pendingAppointmentId={kanbanPending?.appointmentId || null}
                            pendingTargetRoomId={kanbanPending?.roomId || null}
                          />
                        </section>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}

              {isClientsSection ? (
                <>
                  <section className="panel" aria-label="Filtros clientes">
                    <form className="client-command-bar" onSubmit={handleClientSearchSubmit}>
                      <label className="client-filter-field" htmlFor="client-search">
                        <span>Buscar</span>
                        <input
                          id="client-search"
                          type="search"
                          value={clientsDraft.q}
                          onChange={(event) =>
                            setClientsDraft((value) => ({ ...value, q: event.target.value }))
                          }
                          placeholder="Nombre o WhatsApp"
                        />
                      </label>

                      <label className="client-filter-field" htmlFor="client-onboarding">
                        <span>Onboarding</span>
                        <select
                          id="client-onboarding"
                          className="control-input"
                          value={clientsDraft.onboarding}
                          onChange={(event) =>
                            setClientsDraft((value) => ({
                              ...value,
                              onboarding: event.target.value
                            }))
                          }
                        >
                          <option value="all">Todos</option>
                          <option value="complete">Completo</option>
                          <option value="incomplete">Incompleto</option>
                        </select>
                      </label>

                      <label className="client-filter-field" htmlFor="client-limit">
                        <span>Limit</span>
                        <select
                          id="client-limit"
                          className="control-input"
                          value={clientsDraft.limit}
                          onChange={(event) =>
                            setClientsDraft((value) => ({
                              ...value,
                              limit: Number(event.target.value)
                            }))
                          }
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={30}>30</option>
                          <option value={50}>50</option>
                        </select>
                      </label>

                      <div className="client-command-actions">
                        <button type="submit" className="refresh-button">Buscar</button>
                        <button
                          type="button"
                          className="logout-button"
                          onClick={handleClientFiltersReset}
                        >
                          Limpiar
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="meta-strip" aria-label="Filtros activos clientes">
                    <p>
                      Filtro q: <strong>{clientsFilters.q || "-"}</strong>
                    </p>
                    <p>
                      Onboarding: <strong>{clientsFilters.onboarding}</strong>
                    </p>
                    <p>
                      Última carga: <strong>{clientsGeneratedAtLabel}</strong>
                    </p>
                  </section>

                  {clientsLoading && !hasClientsData ? <p className="feedback">Cargando clientes...</p> : null}
                  {clientsError && !hasClientsData ? (
                    <p className="feedback error">{clientsError}</p>
                  ) : null}
                  {clientsError && hasClientsData ? (
                    <p className="feedback error">No se pudo actualizar clientes. Mostrando última carga válida.</p>
                  ) : null}
                  {clientsRefreshing ? (
                    <p className="feedback subtle">Actualizando clientes en segundo plano...</p>
                  ) : null}
                  {deleteClientsError ? (
                    <p className="feedback error">{deleteClientsError}</p>
                  ) : null}

                  {hasClientsData ? (
                    <section className="panel" aria-label="Listado de clientes">
                      <div className="panel-heading">
                        <h2>Clientes</h2>
                        <p>{listedClients.length} registros</p>
                      </div>
                      <ClientCrmSnapshot clients={listedClients} timezone={timezone} />
                      <ClientTable
                        clients={listedClients}
                        timezone={timezone}
                        onSelect={openClientDrawer}
                        selectedIds={selectedClientIdsSet}
                        onToggleSelect={toggleClientSelection}
                        onToggleSelectAll={toggleClientSelectionGroup}
                        onDeleteOne={handleDeleteClientButton}
                        armedDeleteId={armedDeleteClientId}
                        deleteLoading={deleteClientsLoading}
                      />
                    </section>
                  ) : null}
                </>
              ) : null}

              {isTherapistsSection ? (
                <>
                  {hasTherapistsData || therapistsLoading || therapistsError ? (
                    <TherapistsReadonlyView
                      payload={therapistsPayload}
                      generatedAtLabel={therapistsGeneratedAtLabel}
                      onRefresh={() => setTherapistsRefreshTick((value) => value + 1)}
                      isLoading={therapistsLoading}
                      isRefreshing={therapistsRefreshing}
                      isStale={Boolean(therapistsError && hasTherapistsData)}
                      errorMessage={therapistsError}
                      authToken={authToken}
                      onUnauthorized={handleUnauthorized}
                      onSelect={openTherapistDrawer}
                    />
                  ) : null}
                </>
              ) : null}

              {isSettingsSection ? (
                <>
                  {resourcesLoading && !hasResourcesData ? (
                    <p className="feedback">Cargando Ajustes...</p>
                  ) : null}
                  {resourcesError && !hasResourcesData ? (
                    <p className="feedback error">{resourcesError}</p>
                  ) : null}

                  {hasResourcesData ? (
	                    <ResourcesReadonlyView
	                      resources={resourcesPayload}
	                      timezone={timezone}
	                      onRefresh={() => setResourcesRefreshTick((value) => value + 1)}
	                      isLoading={resourcesLoading}
	                      isRefreshing={resourcesRefreshing}
	                      isStale={Boolean(resourcesError)}
	                      errorMessage={resourcesError}
	                      authToken={authToken}
	                      onRoomSaved={() => setResourcesRefreshTick((value) => value + 1)}
	                      onUnauthorized={handleUnauthorized}
	                    />
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </main>
      </div>

      <AppointmentDrawer
        open={drawerOpen}
        detail={detailPayload}
        loading={detailLoading}
        error={detailError}
        timezone={timezone}
        onClose={closeDrawer}
        onChangeStatus={handleStatusChange}
        onChangeRoom={handleRoomChange}
        mutationLoading={mutationLoading}
        mutationError={mutationError}
        roomMutationLoading={roomMutationLoading}
        roomMutationError={roomMutationError}
      />

      <ClientDrawer
        open={clientDrawerOpen}
        detail={clientDetailPayload}
        loading={clientDetailLoading}
        error={clientDetailError}
        timezone={timezone}
        onClose={closeClientDrawer}
      />

      <TherapistDrawer
        open={therapistDrawerOpen}
        detail={therapistDetailPayload}
        loading={therapistDetailLoading}
        error={therapistDetailError}
        authToken={authToken}
        onClose={closeTherapistDrawer}
        onUnauthorized={handleUnauthorized}
        onAvailabilitySaved={(nextPayload) => {
          setTherapistDetailPayload(nextPayload);
          setTherapistsRefreshTick((value) => value + 1);
        }}
      />

      <MemoManualAppointmentModal
        open={manualModalOpen}
        draft={manualDraft}
        services={manualServices}
        therapists={manualTherapists}
        rooms={manualRooms}
        tenantSlug={payload?.center?.slug || resourcesPayload?.center?.slug || ""}
        resourcesLoaded={hasResourcesData}
        resourcesLoading={resourcesLoading || resourcesRefreshing}
        resourcesError={resourcesError}
        loading={manualCreateLoading}
        error={manualCreateError}
        success={manualCreateSuccess}
        onChange={setManualDraft}
        onClose={() => {
          if (!manualCreateLoading) {
            setManualModalOpen(false);
          }
        }}
        onSubmit={handleCreateManualAppointment}
      />

      <GlobalSearchModal
        open={searchOpen && Boolean(authToken)}
        onClose={() => setSearchOpen(false)}
        authToken={authToken}
        onUnauthorized={handleUnauthorized}
        onResolveAction={handleSearchAction}
      />

      <RoomMoveConfirmModal
        request={roomMoveRequest}
        loading={kanbanMoving || roomMutationLoading}
        onCancel={() => {
          if (!kanbanMoving && !roomMutationLoading) {
            setRoomMoveRequest(null);
          }
        }}
        onConfirm={() => executeRoomMove(roomMoveRequest)}
      />

      <StatusConfirmModal
        request={statusConfirmRequest}
        loading={mutationLoading}
        onCancel={() => {
          if (!mutationLoading) {
            setStatusConfirmRequest(null);
          }
        }}
        onConfirm={() => applyStatusChange(statusConfirmRequest?.nextStatus)}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
