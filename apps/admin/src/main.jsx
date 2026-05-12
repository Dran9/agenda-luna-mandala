import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarCheck,
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
              <th>Cliente</th>
              <th>WhatsApp</th>
              <th>Fecha atencion</th>
              <th>Horario</th>
              <th>Terapeuta</th>
              <th>Terapia</th>
              <th>Sala</th>
              <th>Estado final</th>
              <th>Origen</th>
              <th>Creada</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((item) => (
              <tr key={`history-${item.id}`}>
                <td>{item.client.fullName || "Sin nombre"}</td>
                <td>{item.client.whatsapp || "-"}</td>
                <td>{formatDateTime(item.startsAt, timezone)}</td>
                <td>{formatClock(item.startsAt, timezone)} - {formatClock(item.endsAt, timezone)}</td>
                <td>{item.therapist.name || "-"}</td>
                <td>{item.service.name || "-"}</td>
                <td>{item.room.name || "-"}</td>
                <td>
                  <StatusChip status={item.status} />
                </td>
                <td>{item.source || "-"}</td>
                <td>{formatDateTime(item.createdAt, timezone)}</td>
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
            <p className="timeline-line">Sala: {item.room.name || "-"} · {item.publicCode || "-"}</p>
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
    onMoveToRoom?.(appointmentId, targetRoomId, column.roomName);
  }

  return (
    <div className="rooms-board" role="region" aria-label="Salas">
      <div className="rooms-board-track">
        {columns.map((column) => {
          const isHover = hoverRoomKey === column.key && draggable && column.roomId !== null;
          const count = column.appointments.length;
          return (
            <article
              key={column.key}
              className={`rooms-board-col${isHover ? " is-drop-target" : ""}${
                column.roomId === null ? " is-disabled-target" : ""
              }`}
              onDragOver={(event) => handleColumnDragOver(event, column)}
              onDragLeave={(event) => handleColumnDragLeave(event, column)}
              onDrop={(event) => handleColumnDrop(event, column)}
            >
              <header className="rooms-board-col-head">
                <h3 className="rooms-board-col-name">{column.roomName}</h3>
                <p className="rooms-board-col-stats">
                  {count} cita{count === 1 ? "" : "s"} hoy
                </p>
              </header>

              <div className="rooms-board-col-body">
                {count === 0 ? (
                  <p className="rooms-board-empty">
                    {column.roomId === null
                      ? "Citas sin sala asignada"
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
                        }${isPending ? " is-pending" : ""}`}
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
                          <span className="rooms-board-card-code">
                            {item.publicCode || `ID ${item.id}`}
                          </span>
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

function TherapistsTable({ therapists, onSelect }) {
  if (!therapists.length) {
    return <p className="empty-state">No hay terapeutas para este filtro.</p>;
  }

  return (
    <>
      <div className="table-wrap" role="region" aria-label="Tabla de terapeutas">
        <table className="appointments-table therapists-table">
          <thead>
            <tr>
              <th>Terapeuta</th>
              <th>Estado</th>
              <th>Servicios</th>
              <th>Telefono</th>
              <th>Telegram</th>
              <th>Horario base</th>
            </tr>
          </thead>
          <tbody>
            {therapists.map((therapist) => (
              <tr key={`therapist-${therapist.id}`}>
                <td>
                  <button
                    type="button"
                    className="table-open"
                    onClick={() => onSelect?.(therapist.id)}
                    title="Abrir ficha terapeuta"
                  >
                    {therapist.displayName || therapist.fullName || `Terapeuta ${therapist.id}`}
                  </button>
                </td>
                <td>
                  <StatusChip status={therapist.isActive ? "confirmed" : "cancelled"} />
                </td>
                <td>{therapist.services?.length ? therapist.services.join(", ") : "-"}</td>
                <td>{therapist.phone || "-"}</td>
                <td>{therapist.telegramChatId || "-"}</td>
                <td>
                  {therapist.schedules?.length
                    ? therapist.schedules.map((slot) => `${slot.dayLabel} ${slot.startTime}-${slot.endTime}`).join(" · ")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="appointments-cards" aria-label="Lista de terapeutas mobile">
        {therapists.map((therapist) => (
          <li key={`therapist-mobile-${therapist.id}`} className="appointment-card">
            <button type="button" className="card-open" onClick={() => onSelect?.(therapist.id)}>
              <span className="appointment-title">
                {therapist.displayName || therapist.fullName || `Terapeuta ${therapist.id}`}
              </span>
              <StatusChip status={therapist.isActive ? "confirmed" : "cancelled"} />
            </button>
            <p className="appointment-line">Servicios: {therapist.services?.length ? therapist.services.join(", ") : "-"}</p>
            <p className="appointment-line">Telefono: {therapist.phone || "-"}</p>
            <p className="appointment-line">Telegram: {therapist.telegramChatId || "-"}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

function TherapistDrawer({ open, detail, loading, error, onClose }) {
  if (!open) {
    return null;
  }

  const therapist = detail?.therapist || null;
  const services = detail?.services || [];
  const schedules = detail?.schedules || [];

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Ficha terapeuta"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p className="drawer-kicker">Ficha terapeuta</p>
            <h2>{therapist?.displayName || therapist?.fullName || "Terapeuta"}</h2>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Cerrar terapeuta">
            <X size={18} weight="bold" />
          </button>
        </header>

        {loading ? <p className="feedback drawer-feedback">Cargando terapeuta...</p> : null}
        {!loading && error ? <p className="feedback error drawer-feedback">{error}</p> : null}

        {!loading && !error && therapist ? (
          <div className="drawer-body">
            <DrawerSection title="Datos">
              <dl className="drawer-grid">
                <dt>Nombre</dt>
                <dd>{therapist.fullName || "-"}</dd>
                <dt>Display</dt>
                <dd>{therapist.displayName || "-"}</dd>
                <dt>Estado</dt>
                <dd>{therapist.isActive ? "Activo" : "Inactivo"}</dd>
                <dt>Telefono</dt>
                <dd>{therapist.phone || "-"}</dd>
                <dt>Telegram</dt>
                <dd>{therapist.telegramChatId || "-"}</dd>
              </dl>
            </DrawerSection>

            <DrawerSection title="Servicios asociados">
              {services.length ? (
                <ul className="drawer-list">
                  {services.map((service) => (
                    <li key={`therapist-service-${service.id}`}>
                      <span>{service.name}</span>
                      <span>{service.durationMinutes} min</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state compact">Sin servicios asociados.</p>
              )}
            </DrawerSection>

            <DrawerSection title="Horarios base (read-only)">
              {schedules.length ? (
                <ul className="drawer-list">
                  {schedules.map((slot) => (
                    <li key={`therapist-schedule-${slot.id}`}>
                      <span>{slot.dayLabel}</span>
                      <span>{slot.startTime} - {slot.endTime}</span>
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

function ResourcesReadonlyView({ resources }) {
  if (!resources) {
    return null;
  }

  const services = resources.services || [];
  const rooms = resources.rooms || [];
  const compatibilities = resources.serviceRoomCompatibilities || [];
  const schedules = resources.resourceSchedules || [];

  return (
    <>
      <section className="panel" aria-label="Servicios read-only">
        <div className="panel-heading">
          <h2>Servicios</h2>
          <p>{services.length} registros</p>
        </div>
        <div className="table-wrap">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Duracion</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={`service-${service.id}`}>
                  <td>{service.name}</td>
                  <td>{service.durationMinutes} min</td>
                  <td>{service.priceAmount} {service.currencyCode}</td>
                  <td><StatusChip status={service.isActive ? "confirmed" : "cancelled"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-label="Salas read-only">
        <div className="panel-heading">
          <h2>Salas</h2>
          <p>{rooms.length} registros</p>
        </div>
        <div className="table-wrap">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Sala</th>
                <th>Capacidad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={`room-${room.id}`}>
                  <td>{room.name}</td>
                  <td>{room.capacity}</td>
                  <td><StatusChip status={room.isActive ? "confirmed" : "cancelled"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-label="Compatibilidades servicio-sala read-only">
        <div className="panel-heading">
          <h2>Compatibilidades</h2>
          <p>{compatibilities.length} relaciones</p>
        </div>
        <div className="table-wrap">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Sala</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {compatibilities.map((entry, index) => (
                <tr key={`compat-${entry.serviceId}-${entry.roomId}-${index}`}>
                  <td>{entry.serviceName}</td>
                  <td>{entry.roomName}</td>
                  <td><StatusChip status={entry.isActive ? "confirmed" : "cancelled"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-label="Horarios base read-only">
        <div className="panel-heading">
          <h2>Horarios resource_schedules</h2>
          <p>{schedules.length} bloques</p>
        </div>
        <div className="table-wrap">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Recurso</th>
                <th>Dia</th>
                <th>Rango</th>
                <th>Slot</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((slot) => (
                <tr key={`schedule-${slot.id}`}>
                  <td>{slot.resourceType}</td>
                  <td>{slot.resourceName || slot.resourceId}</td>
                  <td>{slot.dayLabel}</td>
                  <td>{slot.startTime} - {slot.endTime}</td>
                  <td>{slot.slotMinutes} min</td>
                  <td><StatusChip status={slot.isActive ? "confirmed" : "cancelled"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
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
  const [therapistsDraft, setTherapistsDraft] = useState({
    q: "",
    status: "all",
    limit: 20
  });
  const [therapistsFilters, setTherapistsFilters] = useState({
    q: "",
    status: "all",
    limit: 20
  });
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
    clientFullName: "",
    phoneE164: "",
    serviceId: "",
    therapistId: "",
    roomId: "",
    startsAt: ""
  });
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
          : buildTherapistsQuery(therapistsFilters);
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
  }, [authToken, activeSection, therapistsFilters, therapistsRefreshTick, handleUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();

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

    loadResources();

    return () => {
      controller.abort();
    };
  }, [authToken, activeSection, resourcesRefreshTick, handleUnauthorized]);

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
    "America/La_Paz";
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
  const resourcesGeneratedAtLabel = resourcesPayload
    ? formatDateTime(resourcesPayload.generatedAt, timezone)
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
  const manualServices = useMemo(
    () => (resourcesPayload?.services || []).filter((service) => service.isActive),
    [resourcesPayload]
  );
  const manualRooms = useMemo(
    () => (resourcesPayload?.rooms || []).filter((room) => room.isActive),
    [resourcesPayload]
  );
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

  function handleTherapistsFiltersSubmit(event) {
    event.preventDefault();
    setTherapistsFilters({
      q: String(therapistsDraft.q || "").trim(),
      status: therapistsDraft.status || "all",
      limit: Number(therapistsDraft.limit) || 20
    });
  }

  function handleTherapistsFiltersReset() {
    const next = {
      q: "",
      status: "all",
      limit: 20
    };
    setTherapistsDraft(next);
    setTherapistsFilters(next);
    setTherapistsRefreshTick((value) => value + 1);
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
      const startsAtIso = manualDraft.startsAt
        ? new Date(manualDraft.startsAt).toISOString()
        : "";

      const payloadBody = {
        phoneE164: manualDraft.phoneE164,
        clientFullName: manualDraft.clientFullName || null,
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
        startsAt: "",
        roomId: ""
      }));
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

            {authToken && isTherapistsSection ? (
              <>
                <button
                  type="button"
                  className="refresh-button"
                  onClick={() => setTherapistsRefreshTick((value) => value + 1)}
                  disabled={therapistsLoading || therapistsRefreshing}
                >
                  {therapistsLoading || therapistsRefreshing ? "Actualizando..." : "Actualizar"}
                </button>
                <p className={`refresh-indicator${therapistsError ? " is-error" : ""}`}>
                  {therapistsRefreshing
                    ? "Actualizando terapeutas..."
                    : therapistsError
                      ? "Error en ultima actualizacion"
                      : "Terapeutas al dia"}
                </p>
              </>
            ) : null}

            {authToken && isSettingsSection ? (
              <>
                <button
                  type="button"
                  className="refresh-button"
                  onClick={() => setResourcesRefreshTick((value) => value + 1)}
                  disabled={resourcesLoading || resourcesRefreshing}
                >
                  {resourcesLoading || resourcesRefreshing ? "Actualizando..." : "Actualizar"}
                </button>
                <p className={`refresh-indicator${resourcesError ? " is-error" : ""}`}>
                  {resourcesRefreshing
                    ? "Actualizando recursos..."
                    : resourcesError
                      ? "Error en ultima actualizacion"
                      : "Recursos al dia"}
                </p>
              </>
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
                      <section className="panel" aria-label="Filtros historial admin">
                        <form className="history-command-bar" onSubmit={handleHistoryFiltersSubmit}>
                          <label className="client-filter-field" htmlFor="history-search">
                            <span>Buscar</span>
                            <input
                              id="history-search"
                              type="search"
                              value={historyDraft.q}
                              onChange={(event) =>
                                setHistoryDraft((value) => ({ ...value, q: event.target.value }))
                              }
                              placeholder="Nombre o WhatsApp"
                            />
                          </label>

                          <label className="client-filter-field" htmlFor="history-order">
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

                          <label className="client-filter-field" htmlFor="history-limit">
                            <span>Limit</span>
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

                          <div className="client-command-actions">
                            <button type="submit" className="refresh-button">Buscar</button>
                            <button
                              type="button"
                              className="logout-button"
                              onClick={handleHistoryFiltersReset}
                            >
                              Limpiar
                            </button>
                          </div>
                        </form>

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
                      </section>

                      <section className="panel" aria-label="Historial de atenciones">
                        <div className="panel-heading">
                          <h2>Historial</h2>
                          <p>{historyAppointments.length} visibles</p>
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

                          <section className="panel" aria-label="Nueva cita manual">
                            <div className="panel-heading">
                              <h2>Nueva cita manual</h2>
                              <p>Usa el mismo motor de claims y disponibilidad.</p>
                            </div>
                            <form className="manual-form-grid" onSubmit={handleCreateManualAppointment}>
                              <label className="client-filter-field" htmlFor="manual-client-name">
                                <span>Cliente</span>
                                <input
                                  id="manual-client-name"
                                  type="text"
                                  value={manualDraft.clientFullName}
                                  onChange={(event) =>
                                    setManualDraft((value) => ({
                                      ...value,
                                      clientFullName: event.target.value
                                    }))
                                  }
                                  placeholder="Nombre completo (opcional)"
                                />
                              </label>

                              <label className="client-filter-field" htmlFor="manual-phone">
                                <span>WhatsApp</span>
                                <input
                                  id="manual-phone"
                                  type="text"
                                  value={manualDraft.phoneE164}
                                  onChange={(event) =>
                                    setManualDraft((value) => ({
                                      ...value,
                                      phoneE164: event.target.value
                                    }))
                                  }
                                  placeholder="59171234567"
                                  required
                                />
                              </label>

                              <label className="client-filter-field" htmlFor="manual-service">
                                <span>Servicio</span>
                                <select
                                  id="manual-service"
                                  className="control-input"
                                  value={manualDraft.serviceId}
                                  onChange={(event) =>
                                    setManualDraft((value) => ({
                                      ...value,
                                      serviceId: event.target.value
                                    }))
                                  }
                                  required
                                >
                                  <option value="">Seleccionar servicio</option>
                                  {manualServices.map((service) => (
                                    <option key={`manual-service-${service.id}`} value={String(service.id)}>
                                      {service.name}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="client-filter-field" htmlFor="manual-therapist">
                                <span>Terapeuta</span>
                                <select
                                  id="manual-therapist"
                                  className="control-input"
                                  value={manualDraft.therapistId}
                                  onChange={(event) =>
                                    setManualDraft((value) => ({
                                      ...value,
                                      therapistId: event.target.value
                                    }))
                                  }
                                >
                                  <option value="">Automatico</option>
                                  {manualTherapists.map((therapist) => (
                                    <option
                                      key={`manual-therapist-${therapist.id}`}
                                      value={String(therapist.id)}
                                    >
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
                                  value={manualDraft.roomId}
                                  onChange={(event) =>
                                    setManualDraft((value) => ({
                                      ...value,
                                      roomId: event.target.value
                                    }))
                                  }
                                >
                                  <option value="">Automatica</option>
                                  {manualRooms.map((room) => (
                                    <option key={`manual-room-${room.id}`} value={String(room.id)}>
                                      {room.name}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="client-filter-field" htmlFor="manual-starts-at">
                                <span>Fecha y hora</span>
                                <input
                                  id="manual-starts-at"
                                  type="datetime-local"
                                  value={manualDraft.startsAt}
                                  onChange={(event) =>
                                    setManualDraft((value) => ({
                                      ...value,
                                      startsAt: event.target.value
                                    }))
                                  }
                                  required
                                />
                              </label>

                              <div className="manual-form-actions">
                                <button
                                  type="submit"
                                  className="refresh-button"
                                  disabled={manualCreateLoading || !manualServices.length}
                                >
                                  {manualCreateLoading ? "Creando..." : "Crear cita"}
                                </button>
                                {!manualServices.length ? (
                                  <p className="manual-form-note">
                                    Carga recursos para habilitar servicios activos.
                                  </p>
                                ) : null}
                              </div>
                            </form>

                            {manualCreateError ? (
                              <p className="feedback error compact-feedback">{manualCreateError}</p>
                            ) : null}
                            {manualCreateSuccess ? (
                              <p className="feedback subtle compact-feedback">{manualCreateSuccess}</p>
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
                            <p>Arrastra una cita entre salas para reasignarla.</p>
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
                  <section className="panel" aria-label="Filtros terapeutas">
                    <form className="client-command-bar" onSubmit={handleTherapistsFiltersSubmit}>
                      <label className="client-filter-field" htmlFor="therapists-search">
                        <span>Buscar</span>
                        <input
                          id="therapists-search"
                          type="search"
                          value={therapistsDraft.q}
                          onChange={(event) =>
                            setTherapistsDraft((value) => ({ ...value, q: event.target.value }))
                          }
                          placeholder="Nombre o telefono"
                        />
                      </label>

                      <label className="client-filter-field" htmlFor="therapists-status">
                        <span>Estado</span>
                        <select
                          id="therapists-status"
                          className="control-input"
                          value={therapistsDraft.status}
                          onChange={(event) =>
                            setTherapistsDraft((value) => ({
                              ...value,
                              status: event.target.value
                            }))
                          }
                        >
                          <option value="all">Todos</option>
                          <option value="active">Activos</option>
                          <option value="inactive">Inactivos</option>
                        </select>
                      </label>

                      <label className="client-filter-field" htmlFor="therapists-limit">
                        <span>Limit</span>
                        <select
                          id="therapists-limit"
                          className="control-input"
                          value={therapistsDraft.limit}
                          onChange={(event) =>
                            setTherapistsDraft((value) => ({
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
                          onClick={handleTherapistsFiltersReset}
                        >
                          Limpiar
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="meta-strip" aria-label="Filtros activos terapeutas">
                    <p>
                      Filtro q: <strong>{therapistsFilters.q || "-"}</strong>
                    </p>
                    <p>
                      Estado: <strong>{therapistsFilters.status}</strong>
                    </p>
                    <p>
                      Ultima carga: <strong>{therapistsGeneratedAtLabel}</strong>
                    </p>
                  </section>

                  {therapistsLoading && !hasTherapistsData ? (
                    <p className="feedback">Cargando terapeutas...</p>
                  ) : null}
                  {therapistsError && !hasTherapistsData ? (
                    <p className="feedback error">{therapistsError}</p>
                  ) : null}
                  {therapistsError && hasTherapistsData ? (
                    <p className="feedback error">No se pudo actualizar terapeutas. Mostrando ultima carga valida.</p>
                  ) : null}
                  {therapistsRefreshing ? (
                    <p className="feedback subtle">Actualizando terapeutas en segundo plano...</p>
                  ) : null}

                  {hasTherapistsData ? (
                    <section className="panel" aria-label="Listado de terapeutas">
                      <div className="panel-heading">
                        <h2>Terapeutas</h2>
                        <p>{listedTherapists.length} registros</p>
                      </div>
                      <TherapistsTable therapists={listedTherapists} onSelect={openTherapistDrawer} />
                    </section>
                  ) : null}
                </>
              ) : null}

              {isSettingsSection ? (
                <>
                  <section className="meta-strip" aria-label="Estado recursos read-only">
                    <p>
                      Recurso: <strong>{resourcesPayload?.filters?.resourceType || "all"}</strong>
                    </p>
                    <p>
                      Ultima carga: <strong>{resourcesGeneratedAtLabel}</strong>
                    </p>
                  </section>

                  {resourcesLoading && !hasResourcesData ? (
                    <p className="feedback">Cargando recursos...</p>
                  ) : null}
                  {resourcesError && !hasResourcesData ? (
                    <p className="feedback error">{resourcesError}</p>
                  ) : null}
                  {resourcesError && hasResourcesData ? (
                    <p className="feedback error">No se pudo actualizar recursos. Mostrando ultima carga valida.</p>
                  ) : null}
                  {resourcesRefreshing ? (
                    <p className="feedback subtle">Actualizando recursos en segundo plano...</p>
                  ) : null}

                  {hasResourcesData ? <ResourcesReadonlyView resources={resourcesPayload} /> : null}
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
