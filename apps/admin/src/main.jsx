import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarCheck,
  CircleNotch,
  Clock,
  Door,
  Lightning,
  MagnifyingGlass,
  Moon,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  Sun,
  Trash,
  UserCircle,
  UserGear,
  UsersThree,
  Wallet,
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
  { id: "rooms", label: "Salas", Icon: Door }
];

const SEARCH_FILTERS = [
  { id: "all", label: "Todo" },
  { id: "clients", label: "Clientes" },
  { id: "appointments", label: "Citas" },
  { id: "cases", label: "Casos" },
  { id: "rooms", label: "Salas" }
];

const STATUS_META = {
  pending: { label: "Pendiente", className: "status-pending" },
  confirmed: { label: "Confirmada", className: "status-confirmed" },
  cancelled: { label: "Cancelada", className: "status-cancelled" },
  completed: { label: "Completada", className: "status-completed" },
  no_show: { label: "No show", className: "status-no-show" }
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
const TERMINAL_ACTIONS = new Set(["completed", "cancelled", "no_show"]);
const CONTROL_AUTO_REFRESH_MS = 45000;
const CLIENTS_AUTO_REFRESH_MS = 60000;

const ADMIN_TOKEN_KEY = "agenda-admin-token";
const ADMIN_PROFILE_KEY = "agenda-admin-profile";

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

function sanitizePhoneForWa(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits;
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
            <p className="appointment-line">Public code: {item.publicCode || "-"}</p>
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
            <p className="timeline-line">Sala: {item.room.name || "-"} · {item.publicCode || "-"}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

const ROOMS_GRID_SLOT_MIN = 30;
const ROOMS_GRID_SLOT_PX = 42;
const ROOMS_GRID_DEFAULT_START_HOUR = 8;
const ROOMS_GRID_DEFAULT_END_HOUR = 19;
const ROOMS_GRID_THREE_LINE_THRESHOLD_PX = 60;

function clampMinutesOfDay(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 24 * 60) return 24 * 60;
  return value;
}

function appointmentMinutesOfDay(value, timezone) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat("es-BO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone || undefined
    });
    const parts = formatter.formatToParts(parsed);
    const hourPart = parts.find((entry) => entry.type === "hour");
    const minutePart = parts.find((entry) => entry.type === "minute");
    const hours = Number.parseInt(hourPart?.value || "0", 10);
    const minutes = Number.parseInt(minutePart?.value || "0", 10);
    return clampMinutesOfDay(hours * 60 + minutes);
  } catch {
    return clampMinutesOfDay(parsed.getUTCHours() * 60 + parsed.getUTCMinutes());
  }
}

function formatHourLabel(minutesOfDay) {
  const hours = Math.floor(minutesOfDay / 60);
  const hh = String(hours).padStart(2, "0");
  return `${hh}:00`;
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

function shortFirstName(value) {
  if (!value) return "";
  return String(value).split(/\s+/)[0];
}

function buildRoomGridModel({ appointments, rooms, timezone }) {
  const knownRooms = Array.isArray(rooms) ? rooms : [];
  const map = new Map();

  for (const room of knownRooms) {
    if (!room || !Number.isInteger(Number(room.id)) || Number(room.id) <= 0) continue;
    map.set(String(room.id), {
      key: String(room.id),
      roomId: Number(room.id),
      roomName: room.name || `Sala ${room.id}`,
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
        appointments: []
      });
    }
    map.get(fallbackKey).appointments.push(item);
  }

  for (const column of map.values()) {
    column.appointments = sortByStartsAt(column.appointments);
  }

  const columns = Array.from(map.values()).sort((left, right) => {
    if (left.roomId === null && right.roomId !== null) return 1;
    if (left.roomId !== null && right.roomId === null) return -1;
    return String(left.roomName).localeCompare(String(right.roomName));
  });

  let minHour = ROOMS_GRID_DEFAULT_START_HOUR;
  let maxHour = ROOMS_GRID_DEFAULT_END_HOUR;

  for (const item of appointments) {
    const startMin = appointmentMinutesOfDay(item.startsAt, timezone);
    if (startMin === null) continue;
    const duration = appointmentDurationMinutes(item);
    const endMin = startMin + duration;
    const startHour = Math.floor(startMin / 60);
    const endHour = Math.ceil(endMin / 60);
    if (startHour < minHour) minHour = Math.max(0, startHour);
    if (endHour > maxHour) maxHour = Math.min(24, endHour);
  }

  if (maxHour - minHour < 6) {
    maxHour = Math.min(24, minHour + 6);
  }

  const startMin = minHour * 60;
  const endMin = maxHour * 60;
  const totalMinutes = endMin - startMin;
  const slotsCount = totalMinutes / ROOMS_GRID_SLOT_MIN;
  const totalHeight = slotsCount * ROOMS_GRID_SLOT_PX;
  const hourTicks = [];
  for (let h = minHour; h <= maxHour; h += 1) {
    hourTicks.push(h * 60);
  }

  return {
    columns,
    range: { startMin, endMin, totalHeight },
    hourTicks
  };
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

  const { columns, range, hourTicks } = useMemo(
    () => buildRoomGridModel({ appointments, rooms, timezone }),
    [appointments, rooms, timezone]
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
    onMoveToRoom?.(appointmentId, targetRoomId, column.roomName);
  }

  const totalSlots = (range.endMin - range.startMin) / ROOMS_GRID_SLOT_MIN;

  return (
    <div className="rooms-grid" role="region" aria-label="Salas timeline">
      <div className="rooms-grid-scroll">
        <div className="rooms-grid-head">
          <div className="rooms-grid-head-spacer" />
          {columns.map((column) => (
            <div
              key={`head-${column.key}`}
              className={`rooms-grid-head-cell${
                column.roomId === null ? " is-disabled-target" : ""
              }`}
            >
              <Door size={14} weight="regular" aria-hidden="true" />
              <span>{column.roomName}</span>
              <span className="rooms-grid-head-count">{column.appointments.length}</span>
            </div>
          ))}
        </div>

        <div
          className="rooms-grid-body"
          style={{
            "--rooms-grid-rooms": columns.length,
            "--rooms-grid-slot-px": `${ROOMS_GRID_SLOT_PX}px`,
            height: `${range.totalHeight}px`
          }}
        >
          <div className="rooms-grid-axis">
            {hourTicks.map((tick) => (
              <div
                key={`tick-${tick}`}
                className="rooms-grid-axis-tick"
                style={{ top: `${(tick - range.startMin) * (ROOMS_GRID_SLOT_PX / ROOMS_GRID_SLOT_MIN)}px` }}
              >
                {formatHourLabel(tick)}
              </div>
            ))}
          </div>

          {Array.from({ length: totalSlots }).map((_, slotIndex) => {
            const minutesFromStart = slotIndex * ROOMS_GRID_SLOT_MIN;
            const isHourBoundary = minutesFromStart % 60 === 0;
            return (
              <div
                key={`row-${slotIndex}`}
                className={`rooms-grid-row${isHourBoundary ? " is-hour-start" : ""}`}
                style={{ top: `${slotIndex * ROOMS_GRID_SLOT_PX}px` }}
              >
                {columns.map((column) => (
                  <div
                    key={`cell-${slotIndex}-${column.key}`}
                    className="rooms-grid-cell"
                  />
                ))}
              </div>
            );
          })}

          <div className="rooms-grid-columns">
            {columns.map((column) => {
              const isHover = hoverRoomKey === column.key && draggable && column.roomId !== null;
              return (
                <div
                  key={column.key}
                  className={`rooms-grid-column${isHover ? " is-drop-target" : ""}${
                    column.roomId === null ? " is-disabled-target" : ""
                  }`}
                  onDragOver={(event) => handleColumnDragOver(event, column)}
                  onDragLeave={(event) => handleColumnDragLeave(event, column)}
                  onDrop={(event) => handleColumnDrop(event, column)}
                >
                  {column.appointments.map((item) => {
                    const startMin = appointmentMinutesOfDay(item.startsAt, timezone);
                    if (startMin === null) return null;
                    const duration = appointmentDurationMinutes(item);
                    const top = Math.max(
                      0,
                      (startMin - range.startMin) * (ROOMS_GRID_SLOT_PX / ROOMS_GRID_SLOT_MIN)
                    );
                    const height = Math.max(
                      ROOMS_GRID_SLOT_PX * 0.95,
                      duration * (ROOMS_GRID_SLOT_PX / ROOMS_GRID_SLOT_MIN) - 2
                    );
                    const dragOk =
                      draggable &&
                      (item.status === "pending" || item.status === "confirmed");
                    const isPending =
                      pendingAppointmentId === item.id &&
                      Number(pendingTargetRoomId) === Number(column.roomId);

                    const showMeta = height >= ROOMS_GRID_THREE_LINE_THRESHOLD_PX;
                    return (
                      <article
                        key={`event-${column.key}-${item.id}`}
                        className={`rooms-grid-event status-${item.status || "pending"}${
                          dragOk ? " is-draggable" : ""
                        }${isPending ? " is-pending" : ""}`}
                        style={{ top: `${top}px`, height: `${height}px` }}
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
                        aria-label={`Cita ${item.publicCode || item.id} ${
                          item.client?.fullName || ""
                        }`}
                      >
                        <span className="rooms-grid-event-time">
                          {formatClock(item.startsAt, timezone)} – {formatClock(item.endsAt, timezone)}
                        </span>
                        <span className="rooms-grid-event-name">
                          {item.client?.fullName || "Sin cliente"}
                        </span>
                        {showMeta ? (
                          <span className="rooms-grid-event-meta">
                            {item.service?.name || "Servicio"}
                            {item.therapist?.name ? ` · ${shortFirstName(item.therapist.name)}` : ""}
                          </span>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
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
            <h2>{appointment?.publicCode || "Cita"}</h2>
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
  const detailPayloadRef = useRef(null);
  const clientDetailPayloadRef = useRef(null);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    clientsPayloadRef.current = clientsPayload;
  }, [clientsPayload]);

  useEffect(() => {
    detailPayloadRef.current = detailPayload;
  }, [detailPayload]);

  useEffect(() => {
    clientDetailPayloadRef.current = clientDetailPayload;
  }, [clientDetailPayload]);

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

  const timezone = payload?.center?.timezone || clientsPayload?.center?.timezone || "America/La_Paz";
  const generatedAtLabel = payload ? formatDateTime(payload.generatedAt, timezone) : "-";
  const clientsGeneratedAtLabel = clientsPayload
    ? formatDateTime(clientsPayload.generatedAt, timezone)
    : "-";
  const controlRefreshLabel = lastRefreshedAt
    ? `Datos actualizados ${formatClock(lastRefreshedAt, timezone)}`
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
    if (sectionId !== "control" && sectionId !== "clientes") {
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
    setDeleteAppointmentsError("");
    setDeleteAppointmentsLoading(false);
    setSelectedAppointmentIds([]);
    setArmedDeleteAppointmentId(null);
    setConfirmBulkAppointmentsDelete(false);
    setClientsPayload(null);
    setClientsLoading(false);
    setClientsRefreshing(false);
    setClientsError("");
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

  async function handleStatusChange(nextStatus) {
    if (!selectedAppointmentId || mutationLoading) {
      return;
    }

    if (TERMINAL_ACTIONS.has(nextStatus)) {
      const confirmed = window.confirm(
        `Confirma cambiar estado a "${ACTION_LABELS[nextStatus] || nextStatus}". Esta accion es terminal.`
      );

      if (!confirmed) {
        return;
      }
    }

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
    }
  }

  const handleRoomKanbanMove = useCallback(
    async (appointmentId, nextRoomId, roomLabel) => {
      if (!authToken || !appointmentId || !nextRoomId || kanbanMoving) {
        return;
      }
      const numericRoomId = Number(nextRoomId);
      const numericAppointmentId = Number(appointmentId);
      if (!Number.isInteger(numericAppointmentId) || numericAppointmentId <= 0) return;
      if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) return;

      const confirmLabel = roomLabel
        ? `¿Mover esta cita a Sala ${roomLabel}?`
        : "¿Mover esta cita de sala?";
      const confirmed = window.confirm(confirmLabel);
      if (!confirmed) return;

      setKanbanError("");
      setKanbanMoving(true);
      setKanbanPending({ appointmentId: numericAppointmentId, roomId: numericRoomId });

      try {
        const response = await fetch(
          `/api/admin/appointments/${numericAppointmentId}/room`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({ roomId: numericRoomId })
          }
        );

        const responsePayload = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(responsePayload));
        }

        setRefreshTick((value) => value + 1);
        if (
          drawerOpen &&
          Number(selectedAppointmentId) === numericAppointmentId &&
          responsePayload?.appointment
        ) {
          setDetailPayload(responsePayload);
        }
      } catch (error) {
        setKanbanError(error.message || "No se pudo mover la cita.");
      } finally {
        setKanbanMoving(false);
        setKanbanPending(null);
      }
    },
    [
      authToken,
      drawerOpen,
      handleUnauthorized,
      kanbanMoving,
      selectedAppointmentId
    ]
  );

  async function handleRoomChange(nextRoomId) {
    if (!selectedAppointmentId || !nextRoomId || roomMutationLoading) {
      return;
    }

    setRoomMutationLoading(true);
    setRoomMutationError("");

    try {
      const response = await fetch(`/api/admin/appointments/${selectedAppointmentId}/room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ roomId: nextRoomId })
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
      setRoomMutationError(mutationRequestError.message || "No se pudo cambiar la sala.");
    } finally {
      setRoomMutationLoading(false);
    }
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

  const sectionTitle = activeSection === "clientes" ? "Clientes" : "Control";
  const sectionCenterName =
    payload?.center?.displayName || clientsPayload?.center?.displayName || "-";
  const hasControlData = Boolean(payload);
  const hasClientsData = Boolean(clientsPayload);
  const canOpenSection = (sectionId) => sectionId === "control" || sectionId === "clientes";
  const isControlSection = activeSection === "control";
  const isClientsSection = activeSection === "clientes";

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
                    <p>
                      Fecha: <strong>{payload?.filters?.date || "today"}</strong>
                    </p>
                    <p>
                      Upcoming: <strong>{toBoolLabel(includeUpcoming)}</strong>
                    </p>
                    <p>
                      Ultima carga: <strong>{generatedAtLabel}</strong>
                    </p>
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

                  {isLoading && !hasControlData ? <p className="feedback">Cargando tablero...</p> : null}
                  {error && !hasControlData ? <p className="feedback error">{error}</p> : null}
                  {error && hasControlData ? (
                    <p className="feedback error">No se pudo actualizar el tablero. Mostrando ultima carga valida.</p>
                  ) : null}
                  {deleteAppointmentsError ? (
                    <p className="feedback error">{deleteAppointmentsError}</p>
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
                            <h2>Salas</h2>
                            <p>
                              {listAppointments.length} citas · arrastra una cita para moverla de
                              sala
                            </p>
                          </div>
                          {kanbanError ? (
                            <p className="feedback error compact-feedback">{kanbanError}</p>
                          ) : null}
                          <RoomsKanban
                            appointments={listAppointments}
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

      <GlobalSearchModal
        open={searchOpen && Boolean(authToken)}
        onClose={() => setSearchOpen(false)}
        authToken={authToken}
        onUnauthorized={handleUnauthorized}
        onResolveAction={handleSearchAction}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
