import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarCheck,
  CircleNotch,
  Clock,
  Door,
  Moon,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  Sun,
  Table,
  UserCircle,
  UserGear,
  UsersThree,
  Wallet,
  X
} from "@phosphor-icons/react";
import "./styles.css";

const MENU = [
  { id: "control", label: "Control", Icon: CalendarCheck, phase: "Activo" },
  { id: "clientes", label: "Clientes", Icon: UsersThree, phase: "Fase 4B" },
  { id: "terapeutas", label: "Terapeutas", Icon: UserGear, phase: "Fase 4B" },
  { id: "finanzas", label: "Finanzas", Icon: Wallet, phase: "Fase 5" },
  { id: "ajustes", label: "Ajustes", Icon: SlidersHorizontal, phase: "Fase 4B" }
];

const VIEW_TABS = [
  { id: "today", label: "Hoy", Icon: CalendarCheck },
  { id: "timeline", label: "Timeline", Icon: Clock },
  { id: "rooms", label: "Salas", Icon: Door },
  { id: "list", label: "Lista", Icon: Table }
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

function AppointmentTable({ appointments, timezone, onSelect }) {
  if (!appointments.length) {
    return <p className="empty-state">No hay citas para este bloque.</p>;
  }

  return (
    <>
      <div className="table-wrap" role="region" aria-label="Tabla de citas">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Fecha/Hora</th>
              <th>WhatsApp</th>
              <th>Servicio</th>
              <th>Terapeuta</th>
              <th>Sala</th>
              <th>Estado</th>
              <th>Public code</th>
              <th>Creada</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((item) => (
              <tr key={item.id}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="appointments-cards" aria-label="Lista de citas mobile">
        {appointments.map((item) => (
          <li key={`mobile-${item.id}`} className="appointment-card">
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

function RoomsView({ appointments, timezone, onSelect }) {
  const groups = useMemo(() => {
    const map = new Map();

    for (const item of appointments) {
      const key = item.room?.name || "Sin sala";

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(item);
    }

    return Array.from(map.entries()).map(([roomName, roomAppointments]) => ({
      roomName,
      appointments: sortByStartsAt(roomAppointments)
    }));
  }, [appointments]);

  if (!groups.length) {
    return <p className="empty-state">No hay citas para agrupar por sala.</p>;
  }

  return (
    <div className="rooms-grid">
      {groups.map((group) => (
        <article key={group.roomName} className="room-panel">
          <div className="panel-heading">
            <h3>{group.roomName}</h3>
            <p>{group.appointments.length} citas</p>
          </div>
          <ul className="room-list">
            {group.appointments.map((item) => (
              <li key={`room-${group.roomName}-${item.id}`}>
                <button type="button" className="room-item" onClick={() => onSelect(item.id)}>
                  <span className="room-hour">{formatClock(item.startsAt, timezone)}</span>
                  <span className="room-client">{item.client.fullName || "Sin nombre"}</span>
                  <StatusChip status={item.status} />
                </button>
              </li>
            ))}
          </ul>
        </article>
      ))}
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
  mutationLoading,
  mutationError
}) {
  if (!open) {
    return null;
  }

  const appointment = detail?.appointment || null;
  const client = appointment?.client || {};
  const service = appointment?.service || {};
  const therapist = appointment?.therapist || {};
  const room = appointment?.room || {};
  const claims = appointment?.claims || [];
  const payments = appointment?.payments || [];
  const paymentsSummary = appointment?.paymentsSummary || null;

  const nextActions = appointment ? STATUS_ACTIONS[appointment.status] || [] : [];
  const whatsappDigits = sanitizePhoneForWa(client.whatsapp);

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
              </dl>
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

function AdminApp() {
  const [theme, setTheme] = useState(readTheme);
  const [authToken, setAuthToken] = useState(readStoredToken);
  const [authAdmin, setAuthAdmin] = useState(readStoredProfile);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState("today");
  const [includeUpcoming, setIncludeUpcoming] = useState(true);
  const [limit, setLimit] = useState(20);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailPayload, setDetailPayload] = useState(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("agenda-theme", theme);

    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [theme]);

  const handleUnauthorized = useCallback(() => {
    clearAuthStorage();
    setAuthToken("");
    setAuthAdmin(null);
    setPayload(null);
    setDrawerOpen(false);
    setSelectedAppointmentId(null);
    setDetailPayload(null);
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

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      if (!authToken) {
        setPayload(null);
        setIsLoading(false);
        setError("");
        return;
      }

      setIsLoading(true);
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
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return;
        }

        setPayload(null);
        setError(fetchError.message || "No se pudo cargar el tablero de admin.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();

    return () => {
      controller.abort();
    };
  }, [authToken, includeUpcoming, limit, refreshTick, handleUnauthorized]);

  useEffect(() => {
    if (!drawerOpen || !selectedAppointmentId || !authToken) {
      return;
    }

    const controller = new AbortController();

    async function loadDetail() {
      setDetailLoading(true);
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

        setDetailPayload(null);
        setDetailError(fetchError.message || "No se pudo cargar el detalle de la cita.");
      } finally {
        setDetailLoading(false);
      }
    }

    loadDetail();

    return () => {
      controller.abort();
    };
  }, [drawerOpen, selectedAppointmentId, authToken, fetchAppointmentDetail]);

  const timezone = payload?.center?.timezone || "America/La_Paz";
  const generatedAtLabel = payload ? formatDateTime(payload.generatedAt, timezone) : "-";

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

  const openDrawer = useCallback((appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setDrawerOpen(true);
    setDetailPayload(null);
    setDetailError("");
    setMutationError("");
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedAppointmentId(null);
    setDetailPayload(null);
    setDetailError("");
    setMutationLoading(false);
    setMutationError("");
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
    setLoginPassword("");
    setError("");
    setAuthError("");
    setDrawerOpen(false);
    setSelectedAppointmentId(null);
    setDetailPayload(null);
    setDetailError("");
    setMutationError("");
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

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-label="Luna Mandala">
          <Sparkle size={24} weight="fill" aria-hidden="true" />
        </div>

        <nav className="sidebar-nav" aria-label="Menu Admin">
          {MENU.map((item) => {
            const MenuIcon = item.Icon;
            const isActive = item.id === "control";

            return (
              <div className={`nav-item${isActive ? " is-active" : ""}`} key={item.id} aria-current={isActive ? "page" : undefined}>
                <MenuIcon size={20} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
                <p className="nav-label">{item.label}</p>
                <span className={`nav-phase${isActive ? " nav-phase-active" : ""}`}>{item.phase}</span>
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
          {theme === "dark" ? <Sun size={18} weight="regular" aria-hidden="true" /> : <Moon size={18} weight="regular" aria-hidden="true" />}
        </button>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Agenda Luna Mandala</p>
            <h1>Control</h1>
            <p className="subtle-line">Centro: {payload?.center?.displayName || "-"}</p>
          </div>

          <div className="controls">
            {authToken && authAdmin ? (
              <div className="auth-chip" aria-label="Sesion activa">
                <UserCircle size={18} weight="regular" aria-hidden="true" />
                <span>{authAdmin.fullName || authAdmin.email || "Admin"}</span>
              </div>
            ) : null}

            {authToken ? (
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

                <button type="button" className="refresh-button" onClick={() => setRefreshTick((value) => value + 1)}>
                  Actualizar
                </button>

                <button type="button" className="logout-button" onClick={handleLogout}>
                  <SignOut size={16} weight="regular" aria-hidden="true" />
                  <span>Salir</span>
                </button>
              </>
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

              {isLoading ? <p className="feedback">Cargando tablero...</p> : null}
              {!isLoading && error ? <p className="feedback error">{error}</p> : null}

              {!isLoading && !error && payload ? (
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
                    <section className="panel" aria-label="Vista por salas">
                      <div className="panel-heading">
                        <h2>Salas</h2>
                        <p>{listAppointments.length} citas visibles</p>
                      </div>
                      <RoomsView
                        appointments={listAppointments}
                        timezone={timezone}
                        onSelect={openDrawer}
                      />
                    </section>
                  ) : null}

                  {activeTab === "list" ? (
                    <section className="panel" aria-label="Lista completa">
                      <div className="panel-heading">
                        <h2>Lista</h2>
                        <p>{listAppointments.length} citas</p>
                      </div>
                      <AppointmentTable
                        appointments={listAppointments}
                        timezone={timezone}
                        onSelect={openDrawer}
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
        mutationLoading={mutationLoading}
        mutationError={mutationError}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
