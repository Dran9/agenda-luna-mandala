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
  Door,
  Lightning,
  MagnifyingGlass,
  Moon,
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
  { id: "today", label: "Hoy", Icon: CalendarCheck },
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
  { id: "services", label: "Servicios" },
  { id: "rooms", label: "Salas" },
  { id: "compatibilities", label: "Compatibilidades" },
  { id: "schedules", label: "Horarios" }
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
const DEFAULT_TIMEZONE = "America/La_Paz";
const CONTROL_RESOURCES_DEFER_MS = 1500;
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
const STATUS_META = {
  pending: { label: "Pendiente", className: "status-pending" },
  confirmed: { label: "Confirmada", className: "status-confirmed" },
  cancelled: { label: "Cancelada", className: "status-cancelled" },
  completed: { label: "Completada", className: "status-completed" },
  no_show: { label: "No show", className: "status-no-show" },
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
  no_show: "Marcar no show"
};
const HISTORY_STATUS_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "completed", label: "Completadas" },
  { id: "cancelled", label: "Canceladas" },
  { id: "no_show", label: "No show" }
];
const HISTORY_ORDER_OPTIONS = [
  { id: "date_desc", label: "Mas reciente" },
  { id: "date_asc", label: "Mas antigua" }
];
const TERMINAL_ACTIONS = new Set(["completed", "cancelled", "no_show"]);
const ACTIVE_ROOM_STATUSES = new Set(["pending", "confirmed"]);
const CONTROL_AUTO_REFRESH_MS = 45000;
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

function buildQuery({ includeUpcoming, limit }) {
  const params = new URLSearchParams();
  params.set("date", "today");
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

function AppointmentTable({
  appointments,
  timezone,
  onSelect,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteOne,
  armedDeleteId,
  deleteLoading
}) {
  if (!appointments.length) {
    return <p className="empty-state">No hay citas para este bloque.</p>;
  }

  const allSelected = appointments.length > 0 && appointments.every((item) => selectedIds.has(item.id));

  return (
    <>
      <div className="table-wrap" role="region" aria-label="Tabla de citas">
        <table className="appointments-table">
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
              <th>Public code</th>
              <th>Creada</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((item) => (
              <tr key={item.id}>
                <td className="cell-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={(event) => onToggleSelect(item.id, event.target.checked)}
                    aria-label={`Seleccionar cita ${item.publicCode || item.id}`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="table-open"
                    onClick={() => onSelect(item.id)}
                    title="Abrir detalle"
                  >
                    {item.client.fullName || "Sin nombre"}
                  </button>
                </td>
                <td>{formatDateTime(item.startsAt, timezone)}</td>
                <td>{item.client.whatsapp || "-"}</td>
                <td>{item.service.name || "-"}</td>
                <td>{item.therapist.name || "-"}</td>
                <td>{item.room.name || "-"}</td>
                <td>
                  <StatusChip status={item.status} />
                </td>
                <td>{item.publicCode || "-"}</td>
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
          </tbody>
        </table>
      </div>

      <ul className="appointments-cards" aria-label="Lista de citas mobile">
        {appointments.map((item) => (
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
      </ul>
    </>
  );
}

function HistoryTable({ appointments, timezone }) {
  if (!appointments.length) {
    return <p className="empty-state">No hay atenciones para este filtro.</p>;
  }

  return (
    <>
      <div className="table-wrap" role="region" aria-label="Tabla de historial">
        <table className="appointments-table history-table">
          <thead>
            <tr>
              <th className="col-client">Cliente</th>
              <th className="col-phone">WhatsApp</th>
              <th className="col-date">Fecha cita</th>
              <th className="col-time">Horario</th>
              <th className="col-therapist">Terapeuta</th>
              <th className="col-service">Terapia</th>
              <th className="col-room">Sala</th>
              <th className="col-status">Estado final</th>
              <th className="col-origin">Origen</th>
              <th className="col-created">Creada</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((item) => (
              <tr key={`history-${item.id}`}>
                <td className="col-client">{item.client.fullName || "Sin nombre"}</td>
                <td className="col-phone">{item.client.whatsapp || "-"}</td>
                <td className="col-date">{formatDateOnly(item.startsAt, timezone)}</td>
                <td className="col-time">{formatClock(item.startsAt, timezone)} - {formatClock(item.endsAt, timezone)}</td>
                <td className="col-therapist">{item.therapist.name || "-"}</td>
                <td className="col-service">{item.service.name || "-"}</td>
                <td className="col-room">{item.room.name || "-"}</td>
                <td className="col-status">
                  <StatusChip status={item.status} />
                </td>
                <td className="col-origin">{item.source || "-"}</td>
                <td className="col-created">{formatDateTime(item.createdAt, timezone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </>
  );
}

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

function DrawerSection({ title, children }) {
  return (
    <section className="drawer-section">
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

  if (!open) {
    return null;
  }

  function updateField(field, value) {
    onChange((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleTimezoneSelect(option) {
    onChange((current) => ({
      ...current,
      timezone: option.timezone,
      phoneDigits: ""
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
            <div className="manual-fields-grid manual-assignment-grid">
              <label className="client-filter-field" htmlFor="manual-starts-at">
                <span>Fecha y hora</span>
                <input
                  id="manual-starts-at"
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(event) => updateField("startsAt", event.target.value)}
                  required
                />
              </label>
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
      <div className="table-wrap" role="region" aria-label="Tabla de clientes">
        <table className="appointments-table clients-table">
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
              <th>WhatsApp</th>
              <th>Onboarding</th>
              <th>Total citas</th>
              <th>Pending</th>
              <th>Confirmed</th>
              <th>Completed</th>
              <th>Cancelled</th>
              <th>No show</th>
              <th>Proxima cita</th>
              <th>Ultima cita</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="cell-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(client.id)}
                    onChange={(event) => onToggleSelect(client.id, event.target.checked)}
                    aria-label={`Seleccionar cliente ${client.fullName || client.id}`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="table-open"
                    onClick={() => onSelect(client.id)}
                    title="Abrir ficha cliente"
                  >
                    {client.fullName || "Sin nombre"}
                  </button>
                </td>
                <td>{client.whatsapp || "-"}</td>
                <td>{client.onboardingComplete ? "Completo" : "Incompleto"}</td>
                <td>{client.stats?.totalAppointments || 0}</td>
                <td>{client.stats?.pendingCount || 0}</td>
                <td>{client.stats?.confirmedCount || 0}</td>
                <td>{client.stats?.completedCount || 0}</td>
                <td>{client.stats?.cancelledCount || 0}</td>
                <td>{client.stats?.noShowCount || 0}</td>
                <td>
                  {client.nextAppointment ? formatDateTime(client.nextAppointment.startsAt, timezone) : "-"}
                </td>
                <td>
                  {client.lastAppointment ? formatDateTime(client.lastAppointment.startsAt, timezone) : "-"}
                </td>
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
            ))}
          </tbody>
        </table>
      </div>

      <ul className="appointments-cards" aria-label="Lista de clientes mobile">
        {clients.map((client) => (
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
              <StatusChip status={client.onboardingComplete ? "confirmed" : "pending"} />
            </button>
            <p className="appointment-line">WhatsApp: {client.whatsapp || "-"}</p>
            <p className="appointment-line">Total citas: {client.stats?.totalAppointments || 0}</p>
            <p className="appointment-line">
              Proxima: {client.nextAppointment ? formatDateTime(client.nextAppointment.startsAt, timezone) : "-"}
            </p>
            <p className="appointment-line">
              Ultima: {client.lastAppointment ? formatDateTime(client.lastAppointment.startsAt, timezone) : "-"}
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
        ))}
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
                <li><span>Pending</span><strong>{client.stats?.pendingCount || 0}</strong></li>
                <li><span>Confirmed</span><strong>{client.stats?.confirmedCount || 0}</strong></li>
                <li><span>Completed</span><strong>{client.stats?.completedCount || 0}</strong></li>
                <li><span>Cancelled</span><strong>{client.stats?.cancelledCount || 0}</strong></li>
                <li><span>No show</span><strong>{client.stats?.noShowCount || 0}</strong></li>
              </ul>
            </DrawerSection>

            <DrawerSection title="Proxima / Ultima cita">
              <ul className="drawer-list">
                <li>
                  <span>Proxima</span>
                  <span>
                    {client.nextAppointment ? formatDateTime(client.nextAppointment.startsAt, timezone) : "-"}
                  </span>
                </li>
                <li>
                  <span>Ultima</span>
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

function splitVisibleItems(items, maxVisible) {
  const safeItems = Array.isArray(items) ? items : [];
  const visible = safeItems.slice(0, maxVisible);
  return {
    visible,
    hiddenCount: Math.max(safeItems.length - visible.length, 0)
  };
}

function getTherapistInitials(therapist) {
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
              <span className="therapist-avatar" aria-hidden="true">
                {getTherapistInitials(therapist)}
              </span>
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
  onSelect
}) {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
        </div>

        {isRefreshing ? (
          <p className="feedback subtle settings-feedback">Actualizando terapeutas en segundo plano...</p>
        ) : null}
        {isStale ? (
          <p className="feedback error settings-feedback">
            No se pudo refrescar Terapeutas. Mostrando la ultima carga valida.
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
    </section>
  );
}

function TherapistDrawer({ open, detail, loading, error, onClose }) {
  if (!open) {
    return null;
  }

  const therapist = detail?.therapist || null;
  const services = Array.isArray(detail?.services) ? detail.services : [];
  const schedules = Array.isArray(detail?.schedules) ? detail.schedules : [];
  const scheduleGroups = normalizeTherapistScheduleGroups({ schedulesByDay: [], schedules });
  const statusMeta = getTherapistStatusMeta(therapist);
  const therapistName = therapist?.displayName || therapist?.fullName || "Terapeuta";

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
            <span className="therapist-drawer-avatar" aria-hidden="true">
              {getTherapistInitials(therapist)}
            </span>
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
          <button type="button" className="is-active">
            <UserCircle size={16} weight="regular" aria-hidden="true" />
            <span>Perfil</span>
          </button>
          <button type="button" disabled aria-disabled="true" title="Proximamente">
            <SlidersHorizontal size={16} weight="regular" aria-hidden="true" />
            <span>Operativa</span>
          </button>
          <button type="button" disabled aria-disabled="true" title="Proximamente">
            <CalendarDots size={16} weight="regular" aria-hidden="true" />
            <span>Disponibilidad</span>
          </button>
        </nav>

        {loading ? <p className="feedback drawer-feedback">Cargando terapeuta...</p> : null}
        {!loading && error ? <p className="feedback error drawer-feedback">{error}</p> : null}

        {!loading && !error && therapist ? (
          <div className="drawer-body therapist-drawer-body">
            <DrawerSection title="Contacto">
              <ul className="therapist-contact-list">
                <li>
                  <span>Telefono</span>
                  <strong>{therapist.phone || "-"}</strong>
                </li>
                <li>
                  <span>Telegram</span>
                  <strong>{therapist.telegramChatId || "-"}</strong>
                </li>
              </ul>
            </DrawerSection>

            <DrawerSection title="Servicios">
              {services.length ? (
                <ul className="drawer-list therapist-drawer-list therapist-drawer-list-services">
                  {services.map((service) => {
                    const relationStatus = normalizeResourceStatus(
                      service?.relationStatus,
                      service?.relationIsActive === true
                    );
                    return (
                      <li key={`therapist-service-${service.id}`}>
                        <span>{service.name || "Servicio"}</span>
                        <span className="therapist-drawer-service-meta">
                          {service.durationMinutes ? `${service.durationMinutes} min` : "Sin duracion"} ·{" "}
                          {service.statusLabel || getStatusLabelFromValue(relationStatus)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="empty-state compact">Sin servicios asociados.</p>
              )}
            </DrawerSection>

            <DrawerSection title="Horarios base">
              {scheduleGroups.length ? (
                <ul className="drawer-list therapist-drawer-list therapist-drawer-list-schedules">
                  {scheduleGroups.map((group) => (
                    <li key={`therapist-schedule-${group.daysLabel}-${group.timeRange}-${group.status}`}>
                      <span className="therapist-drawer-schedule-days">{group.daysLabel}</span>
                      <span className="therapist-drawer-schedule-time">
                        {group.timeRange}
                      </span>
                      <span className="therapist-drawer-service-meta">
                        {group.slotMinutes} min · {group.statusLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state compact">Sin horarios base.</p>
              )}
            </DrawerSection>
          </div>
        ) : null}
      </aside>
    </div>
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomFormName, setRoomFormName] = useState("");
  const [roomFormCapacity, setRoomFormCapacity] = useState("1");
  const [roomFormFeatureKeys, setRoomFormFeatureKeys] = useState([]);
  const [roomFormLoading, setRoomFormLoading] = useState(false);
  const [roomFormError, setRoomFormError] = useState("");
  const [roomFormFeedback, setRoomFormFeedback] = useState("");

  const moduleRows = useMemo(() => {
    if (activeModule === "rooms") return normalizedSettings.rooms;
    if (activeModule === "compatibilities") return normalizedSettings.compatibilities;
    if (activeModule === "schedules") return normalizedSettings.schedules;
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
          entry?.statusLabel
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

      const scheduleHaystack = [
        entry?.resourceLabel,
        entry?.resourceTypeLabel,
        entry?.dayLabel,
        entry?.timeRangeLabel,
        entry?.slotLabel,
        entry?.validityLabel,
        entry?.statusLabel
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return scheduleHaystack.includes(query);
    });
  }, [activeModule, moduleRows, searchValue, statusFilter]);

  const generatedAtLabel = resources?.generatedAt
    ? formatDateTime(resources.generatedAt, timezone)
    : "-";

  const totalByModule = {
    services: normalizedSettings.summary.servicesTotal,
    rooms: normalizedSettings.summary.roomsTotal,
    compatibilities: normalizedSettings.summary.compatibilitiesTotal,
    schedules: normalizedSettings.summary.schedulesTotal
  };

  const resetRoomForm = useCallback(() => {
    setEditingRoomId(null);
    setRoomFormName("");
    setRoomFormCapacity("1");
    setRoomFormFeatureKeys([]);
    setRoomFormError("");
  }, []);

  const openNewRoomForm = useCallback(() => {
    resetRoomForm();
    setRoomFormFeedback("");
    setRoomFormOpen(true);
  }, [resetRoomForm]);

  const openEditRoomForm = useCallback((room) => {
    setEditingRoomId(room.id);
    setRoomFormName(room.name || "");
    setRoomFormCapacity(String(room.capacity || 1));
    setRoomFormFeatureKeys(Array.isArray(room.featureKeys) ? [...room.featureKeys] : []);
    setRoomFormError("");
    setRoomFormFeedback("");
    setRoomFormOpen(true);
  }, []);

  const toggleRoomFeature = useCallback((featureKey, checked) => {
    setRoomFormFeatureKeys((current) => {
      if (checked) {
        return current.includes(featureKey) ? current : [...current, featureKey];
      }

      return current.filter((key) => key !== featureKey);
    });
  }, []);

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
    roomFormLoading,
    roomFormName
  ]);

  return (
    <section className="settings-shell" aria-label="Ajustes operativos">
      <header className="settings-header">
        <div>
          <h2>Ajustes</h2>
          <p>Configuracion operativa de servicios, salas, compatibilidades y horarios base.</p>
        </div>
        <div className="settings-header-meta">
          <span className="settings-chip">Actualizado: {generatedAtLabel}</span>
          <span className="settings-chip">Modulo: {SETTINGS_MODULES.find((item) => item.id === activeModule)?.label || "Servicios"}</span>
        </div>
      </header>

      <nav className="settings-tab-nav" aria-label="Navegacion local ajustes">
        {SETTINGS_MODULES.map((module) => (
          <button
            key={`settings-module-${module.id}`}
            type="button"
            className={`settings-tab-button${activeModule === module.id ? " is-active" : ""}`}
            onClick={() => setActiveModule(module.id)}
            aria-current={activeModule === module.id ? "page" : undefined}
          >
            <span>{module.label}</span>
            <span className="settings-tab-count">{totalByModule[module.id] || 0}</span>
          </button>
        ))}
      </nav>

      <section className="panel settings-panel" aria-label="Tabla de ajustes">
        <div className="settings-toolbar">
          <label className="settings-search-field" htmlFor="settings-search">
            <MagnifyingGlass size={16} aria-hidden="true" />
            <input
              id="settings-search"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar en modulo activo"
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
        </div>

        {isRefreshing ? (
          <p className="feedback subtle settings-feedback">Actualizando ajustes en segundo plano...</p>
        ) : null}
        {isStale ? (
          <p className="feedback error settings-feedback">
            No se pudo refrescar Ajustes. Mostrando la ultima carga valida.
            {errorMessage ? ` (${errorMessage})` : ""}
          </p>
        ) : null}

        {activeModule === "rooms" ? (
          <div className="settings-room-actions">
            {roomFormFeedback ? (
              <p className="feedback subtle settings-feedback">{roomFormFeedback}</p>
            ) : null}

            <button
              type="button"
              className="refresh-button settings-room-new-button"
              onClick={openNewRoomForm}
              disabled={roomFormOpen && !editingRoomId}
            >
              Nueva sala
            </button>

            {roomFormOpen ? (
              <section className="settings-room-form" aria-label="Formulario de sala">
                <div className="settings-room-form-header">
                  <h3>{editingRoomId ? `Editar sala #${editingRoomId}` : "Nueva sala"}</h3>
                </div>

                <div className="settings-room-form-grid">
                  <label className="client-filter-field" htmlFor="settings-room-name">
                    <span>Nombre</span>
                    <input
                      id="settings-room-name"
                      type="text"
                      value={roomFormName}
                      onChange={(event) => setRoomFormName(event.target.value)}
                      placeholder="Sala Fénix"
                    />
                  </label>

                  <label className="client-filter-field" htmlFor="settings-room-capacity">
                    <span>Capacidad (1-50)</span>
                    <input
                      id="settings-room-capacity"
                      type="number"
                      min="1"
                      max="50"
                      value={roomFormCapacity}
                      onChange={(event) => setRoomFormCapacity(event.target.value)}
                    />
                  </label>
                </div>

                <fieldset className="settings-room-features">
                  <legend>Recursos</legend>
                  <div className="settings-room-feature-list">
                    {ROOM_FEATURE_OPTIONS.map((feature) => {
                      const checked = roomFormFeatureKeys.includes(feature.key);
                      return (
                        <label
                          key={`room-feature-${feature.key}`}
                          className={`settings-room-feature${checked ? " is-selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => toggleRoomFeature(feature.key, event.target.checked)}
                          />
                          <span>{feature.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="manual-form-actions">
                  <button
                    type="button"
                    className="refresh-button"
                    onClick={saveRoom}
                    disabled={roomFormLoading || !roomFormName.trim()}
                  >
                    {roomFormLoading
                      ? "Guardando..."
                      : editingRoomId
                        ? "Guardar cambios"
                        : "Crear sala"}
                  </button>
                  <button
                    type="button"
                    className="logout-button"
                    onClick={() => {
                      setRoomFormOpen(false);
                      resetRoomForm();
                    }}
                  >
                    Cancelar
                  </button>
                </div>

                {roomFormError ? (
                  <p className="feedback error compact-feedback">{roomFormError}</p>
                ) : null}
              </section>
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
                        <th>Duracion</th>
                        <th>Precio</th>
                        <th>Salas compatibles</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((service) => (
                        <tr key={`settings-service-${service.id}`}>
                          <td>{service.name}</td>
                          <td>{service.durationLabel}</td>
                          <td>{service.priceLabel}</td>
                          <td>{service.compatibleRoomsCount}</td>
                          <td><StatusChip status={statusToChipKey(service.status)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="settings-mobile-cards" aria-label="Servicios mobile">
                  {filteredRows.map((service) => (
                    <li key={`settings-service-mobile-${service.id}`} className="settings-mobile-card">
                      <p className="settings-mobile-title">{service.name}</p>
                      <p className="settings-mobile-line">Duracion: {service.durationLabel}</p>
                      <p className="settings-mobile-line">Precio: {service.priceLabel}</p>
                      <p className="settings-mobile-line">Salas compatibles: {service.compatibleRoomsCount}</p>
                      <StatusChip status={statusToChipKey(service.status)} />
                    </li>
                  ))}
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
	                        <th>Accion</th>
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
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((item) => (
                        <tr key={`settings-compat-${item.id}`}>
                          <td>{item.serviceLabel}</td>
                          <td>{item.roomLabel}</td>
                          <td><StatusChip status={statusToChipKey(item.status)} /></td>
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
                      <StatusChip status={statusToChipKey(item.status)} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {activeModule === "schedules" ? (
              <>
                <div className="table-wrap">
                  <table className="appointments-table settings-table settings-schedules-table">
                    <thead>
                      <tr>
                        <th>Recurso</th>
                        <th>Tipo</th>
                        <th>Dia</th>
                        <th>Horario</th>
                        <th>Slot</th>
                        <th>Vigencia</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((slot) => (
                        <tr key={`settings-schedule-${slot.id}`}>
                          <td>{slot.resourceLabel}</td>
                          <td>{slot.resourceTypeLabel}</td>
                          <td>{slot.dayLabel}</td>
                          <td>{slot.timeRangeLabel}</td>
                          <td>{slot.slotLabel}</td>
                          <td>{slot.validityLabel}</td>
                          <td><StatusChip status={statusToChipKey(slot.status)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="settings-mobile-cards" aria-label="Horarios mobile">
                  {filteredRows.map((slot) => (
                    <li key={`settings-schedule-mobile-${slot.id}`} className="settings-mobile-card">
                      <p className="settings-mobile-title">{slot.resourceLabel}</p>
                      <p className="settings-mobile-line">Tipo: {slot.resourceTypeLabel}</p>
                      <p className="settings-mobile-line">Dia: {slot.dayLabel}</p>
                      <p className="settings-mobile-line">Horario: {slot.timeRangeLabel}</p>
                      <p className="settings-mobile-line">Slot: {slot.slotLabel}</p>
                      <p className="settings-mobile-line">Vigencia: {slot.validityLabel}</p>
                      <StatusChip status={statusToChipKey(slot.status)} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>
    </section>
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
        aria-label="Busqueda global admin"
      >
        <header className="global-search-header">
          <div>
            <p className="global-search-eyebrow">Busqueda global</p>
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
    setAuthError("Sesion expirada o token invalido. Inicia sesion nuevamente.");
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
        const query = buildQuery({ includeUpcoming, limit });
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
  }, [authToken, activeSection, includeUpcoming, limit, refreshTick, handleUnauthorized]);

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

    async function loadTherapists() {
      if (!authToken || (activeSection !== "terapeutas" && activeSection !== "control")) {
        setTherapistsPayload(null);
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

    loadTherapists();

    return () => {
      controller.abort();
    };
  }, [authToken, activeSection, therapistsRefreshTick, handleUnauthorized]);

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

      const hasCachedPayload = Boolean(resourcesPayload);
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

    if (authToken && activeSection === "control" && !manualModalOpen && resourcesPayload) {
      setResourcesLoading(false);
      setResourcesRefreshing(false);
    } else if (authToken && activeSection === "control" && !manualModalOpen && !resourcesPayload) {
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
  }, [authToken, activeSection, manualModalOpen, resourcesPayload, resourcesRefreshTick, handleUnauthorized]);

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
    return sortByStartsAt(mergeById(todayAppointments, upcomingAppointments));
  }, [todayAppointments, upcomingAppointments]);

  const listAppointments = useMemo(() => {
    return sortByStartsAt(mergeById(todayAppointments, upcomingAppointments, recentAppointments));
  }, [todayAppointments, upcomingAppointments, recentAppointments]);

  const roomsAppointments = useMemo(() => {
    if (Array.isArray(payload?.roomsActive)) {
      return sortByStartsAt(payload.roomsActive);
    }

    return sortByStartsAt(listAppointments.filter((entry) => isActiveRoomAppointment(entry)));
  }, [payload, listAppointments]);

  const casesByStatus = useMemo(() => {
    return [
      {
        status: "pending",
        label: "Pendientes",
        appointments: listAppointments.filter((item) => item.status === "pending")
      },
      {
        status: "no_show",
        label: "No show",
        appointments: listAppointments.filter((item) => item.status === "no_show")
      },
      {
        status: "cancelled",
        label: "Canceladas",
        appointments: listAppointments.filter((item) => item.status === "cancelled")
      }
    ];
  }, [listAppointments]);

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

  const selectedAppointmentIdsSet = useMemo(
    () => new Set(selectedAppointmentIds),
    [selectedAppointmentIds]
  );
  const selectedClientIdsSet = useMemo(
    () => new Set(selectedClientIds),
    [selectedClientIds]
  );

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
        throw new Error("Respuesta de login invalida");
      }

      saveAuth(token, admin);
      setAuthToken(token);
      setAuthAdmin(admin);
      setLoginPassword("");
      setError("");
      setRefreshTick((value) => value + 1);
      setClientsRefreshTick((value) => value + 1);
    } catch (loginRequestError) {
      setAuthError(loginRequestError.message || "No se pudo iniciar sesion");
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

  function toggleAppointmentSelection(appointmentId, checked) {
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
  }

  function toggleAppointmentSelectionGroup(ids, checked) {
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
  }

  async function requestDeleteAppointments(ids) {
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
  }

  function handleDeleteAppointmentButton(appointmentId) {
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
  }

  function handleBulkDeleteAppointmentsButton() {
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
  }

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
      setManualCreateError(createError.message || "No se pudo crear la cita manual.");
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
              <p className="auth-subtitle">Inicia sesion para acceder al Control.</p>

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
                          Busqueda: <strong>{historyFilters.q || "-"}</strong>
                        </p>
                        <p>
                          Estado: <strong>{historyFilters.status}</strong>
                        </p>
                        <p>
                          Orden: <strong>{historyFilters.order}</strong>
                        </p>
                        <p>
                          Ultima carga: <strong>{historyGeneratedAtLabel}</strong>
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          Fecha: <strong>{payload?.filters?.date || "today"}</strong>
                        </p>
                        <p>
                          Upcoming: <strong>{toBoolLabel(includeUpcoming)}</strong>
                        </p>
                        <p>
                          Ultima carga: <strong>{generatedAtLabel}</strong>
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
                        <p className="feedback error">No se pudo actualizar historial. Mostrando ultima carga valida.</p>
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
                        <p className="feedback error">No se pudo actualizar el tablero. Mostrando ultima carga valida.</p>
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
                        <HistoryTable appointments={historyAppointments} timezone={timezone} />
                      </section>
                    </>
                  ) : null}

                  {hasControlData ? (
                    <>
                      {activeTab === "today" ? (
                        <>
                          <section className="summary-grid" aria-label="Resumen por estado">
                            <SummaryCard label="Pending" value={summary.pending} className="status-pending" />
                            <SummaryCard label="Confirmed" value={summary.confirmed} className="status-confirmed" />
                            <SummaryCard label="Cancelled" value={summary.cancelled} className="status-cancelled" />
                            <SummaryCard label="Completed" value={summary.completed} className="status-completed" />
                            <SummaryCard label="No show" value={summary.no_show} className="status-no-show" />
                            <SummaryCard label="Total" value={summary.total} className="status-total" />
                          </section>

                          <section className="panel manual-launch-panel" aria-label="Nueva cita manual">
                            <div className="manual-launch-copy">
                              <h2>Nueva cita manual</h2>
                              <p>Crear con servicio primero, cliente separado y asignacion automatica por claims.</p>
                            </div>
                            <button
                              type="button"
                              className="refresh-button manual-launch-button"
                              onClick={() => {
                                setManualCreateError("");
                                setManualCreateSuccess("");
                                setManualModalOpen(true);
                              }}
                              disabled={hasResourcesData && !manualServices.length}
                            >
                              <CalendarDots size={16} weight="regular" aria-hidden="true" />
                              <span>Nueva cita</span>
                            </button>
                            {!hasResourcesData ? (
                              <p className="manual-form-note">
                                Los recursos se preparan en segundo plano o al abrir el modal.
                              </p>
                            ) : !manualServices.length ? (
                              <p className="manual-form-note">
                                Carga recursos para habilitar servicios activos.
                              </p>
                            ) : null}
                          </section>

                          <section className="panel" aria-label="Casos prioritarios">
                            <div className="panel-heading">
                              <h2>Casos</h2>
                              <p>Pending / No show / Canceladas</p>
                            </div>
                            <div className="cases-grid">
                              {casesByStatus.map((group) => (
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

                          <section className="panel" aria-label="Citas de hoy">
                            <div className="panel-heading">
                              <h2>Citas de hoy</h2>
                              <p>{todayAppointments.length} registros</p>
                            </div>
                            <AppointmentTable
                              appointments={todayAppointments}
                              timezone={timezone}
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
                            <section className="panel" aria-label="Proximas citas">
                              <div className="panel-heading">
                                <h2>Proximas citas</h2>
                                <p>{upcomingAppointments.length} registros</p>
                              </div>
                              <AppointmentTable
                                appointments={upcomingAppointments}
                                timezone={timezone}
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

                          <section className="panel" aria-label="Ultimas citas creadas">
                            <div className="panel-heading">
                              <h2>Ultimas citas creadas</h2>
                              <p>{recentAppointments.length} registros</p>
                            </div>
                            <AppointmentTable
                              appointments={recentAppointments}
                              timezone={timezone}
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
                          <TimelineView
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
                          <RoomsKanban
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
                      Ultima carga: <strong>{clientsGeneratedAtLabel}</strong>
                    </p>
                  </section>

                  {clientsLoading && !hasClientsData ? <p className="feedback">Cargando clientes...</p> : null}
                  {clientsError && !hasClientsData ? (
                    <p className="feedback error">{clientsError}</p>
                  ) : null}
                  {clientsError && hasClientsData ? (
                    <p className="feedback error">No se pudo actualizar clientes. Mostrando ultima carga valida.</p>
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
        onClose={closeTherapistDrawer}
      />

      <ManualAppointmentModal
        open={manualModalOpen}
        draft={manualDraft}
        services={manualServices}
        therapists={manualTherapists}
        rooms={manualRooms}
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
