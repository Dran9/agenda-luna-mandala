import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarCheck,
  CheckCircle,
  CircleNotch,
  ClockCountdown,
  Sparkle,
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
const PHONE_MIN_LENGTH = 8;
const BUSINESS_DAYS_TO_SHOW = 5;

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

function createVariantHref(tenantSlug, screenType) {
  const params = new URLSearchParams();
  params.set("tenantSlug", tenantSlug);

  if (screenType !== "default") {
    params.set("screenType", screenType);
  }

  return `/?${params.toString()}`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildBusinessDateStrip(count = BUSINESS_DAYS_TO_SHOW) {
  const days = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);

  while (days.length < count) {
    const weekday = cursor.getDay();
    if (weekday >= 1 && weekday <= 5) {
      const key = toDateKey(cursor);
      days.push({
        key,
        dayLabel: cursor.toLocaleDateString("es-BO", { weekday: "short" }),
        dateLabel: cursor.toLocaleDateString("es-BO", { day: "2-digit", month: "short" })
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
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

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatTime(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateTime(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("es-BO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
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
      message: "No pudimos conectar con el servidor. Reintenta en unos segundos."
    };
  }

  if (error?.status) {
    return {
      status: Number(error.status),
      code: error.code || "API_ERROR",
      message: error.message || "No se pudo completar la solicitud."
    };
  }

  return {
    status: 0,
    code: "UNKNOWN_ERROR",
    message: "Ocurrio un error inesperado. Reintenta."
  };
}

async function requestJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
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
    throw error;
  }

  return payload;
}

function filterAndGroupSlots(slots = []) {
  const now = Date.now();
  const futureSlots = slots.filter((slot) => {
    const startsAt = new Date(slot.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      return false;
    }

    const hour = startsAt.getHours();
    return startsAt.getTime() > now && hour >= 7 && hour < 20;
  });

  return {
    morning: futureSlots.filter((slot) => new Date(slot.startsAt).getHours() < 13),
    afternoon: futureSlots.filter((slot) => new Date(slot.startsAt).getHours() >= 13)
  };
}

function BookingApp() {
  const config = useMemo(readInitialConfig, []);
  const businessDays = useMemo(() => buildBusinessDateStrip(), []);

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
  const [selectedDateKey, setSelectedDateKey] = useState(businessDays[0]?.key || "");

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
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const catalog = catalogState.data;
  const services = catalog?.services || [];
  const selectedService = services.find((service) => service.id === selectedServiceId) || null;
  const compatibleTherapists = (catalog?.therapists || []).filter((therapist) => therapist.serviceIds.includes(selectedServiceId));
  const nextAppointment = identifyState.data?.nextAppointment || null;

  const slotGroups = useMemo(() => filterAndGroupSlots(availabilityState.data?.slots || []), [availabilityState.data]);

  const supportGuideHref = useMemo(
    () => buildWhatsappHref(config.supportWhatsapp, "Hola, quisiera orientacion para elegir una terapia en Luna Mandala."),
    [config.supportWhatsapp]
  );
  const supportManageHref = useMemo(
    () => buildWhatsappHref(config.supportWhatsapp, "Hola, necesito ayuda para gestionar mi cita."),
    [config.supportWhatsapp]
  );

  const supportFromConflictHref = useMemo(
    () => buildWhatsappHref(config.supportWhatsapp, "Hola, necesito apoyo para reagendar o cancelar mi cita en Luna Mandala."),
    [config.supportWhatsapp]
  );
  const hasActiveHold = Boolean(holdState) && confirmState.status !== "success";

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

        const firstReservableService = (response.services || []).find((service) => service.reservable);
        if (firstReservableService) {
          setSelectedServiceId(firstReservableService.id);
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

  function resetFromIdentifyDownstream() {
    setDecision("");
    setAvailabilityState({
      status: "idle",
      data: null,
      error: null
    });
    setHoldState(null);
    setHoldSecondsLeft(0);
    setHoldingSlotStartsAt("");
    setIdempotencyKey("");
    setConfirmState({
      status: "idle",
      data: null,
      error: null
    });
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

    const normalizedPhone = normalizePhone(phoneInput);
    if (normalizedPhone.length < PHONE_MIN_LENGTH) {
      setIdentifyState({
        status: "error",
        data: null,
        error: {
          status: 422,
          code: "PHONE_INVALID",
          message: "Ingresa un WhatsApp valido para continuar."
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
          phoneE164: normalizedPhone
        })
      });

      setIdentifyState({
        status: "success",
        data: response,
        error: null
      });
    } catch (error) {
      const mapped = normalizeRequestError(error);
      setIdentifyState({
        status: "error",
        data: null,
        error: mapped
      });
    }
  }

  async function loadAvailability(dateKey = selectedDateKey, skipDecisionCheck = false, preserveConfirmState = false) {
    const phoneValid = normalizePhone(phoneInput).length >= PHONE_MIN_LENGTH;
    const identifyReady = identifyState.status === "success";
    const decisionReady = skipDecisionCheck || Boolean(decision);

    if (!identifyReady || !phoneValid || !decisionReady || !selectedServiceId || hasActiveHold) {
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
      const response = await requestJson(`${config.apiBaseUrl}/public/booking/availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tenantSlug: config.tenantSlug,
          phoneE164: normalizePhone(phoneInput),
          serviceId: selectedServiceId,
          therapistId: selectedTherapistId || undefined,
          date: dateKey || undefined,
          timezone: catalog?.center?.timezone
        })
      });

      setAvailabilityState({
        status: "success",
        data: response,
        error: null
      });
    } catch (error) {
      const mapped = normalizeRequestError(error);
      setAvailabilityState({
        status: "error",
        data: null,
        error: mapped
      });
    }
  }

  async function handleDecisionReserveAnother() {
    setDecision("book_another");
    await loadAvailability(selectedDateKey, true);
  }

  async function handleDecisionContinue() {
    setDecision("book_now");
    await loadAvailability(selectedDateKey, true);
  }

  async function handleCreateHold(slot) {
    if (!slot?.startsAt || holdState) {
      return;
    }

    setHoldingSlotStartsAt(slot.startsAt);
    setConfirmState({
      status: "idle",
      data: null,
      error: null
    });

    try {
      const response = await requestJson(`${config.apiBaseUrl}/public/booking/hold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tenantSlug: config.tenantSlug,
          phoneE164: normalizePhone(phoneInput),
          serviceId: selectedServiceId,
          startsAt: slot.startsAt,
          therapistId: slot.therapistId,
          roomId: slot.roomId
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

    const requestKey = idempotencyKey || createIdempotencyKey();
    if (!idempotencyKey) {
      setIdempotencyKey(requestKey);
    }

    setConfirmState({
      status: "loading",
      data: null,
      error: null
    });

    try {
      const response = await requestJson(`${config.apiBaseUrl}/public/booking/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey
        },
        body: JSON.stringify({
          tenantSlug: config.tenantSlug,
          phoneE164: normalizePhone(phoneInput),
          holdToken: holdState.holdToken
        })
      });

      setConfirmState({
        status: "success",
        data: response,
        error: null
      });

      setHoldState(null);
      setHoldingSlotStartsAt("");
      setIdempotencyKey("");
    } catch (error) {
      const mapped = normalizeRequestError(error);
      setConfirmState({
        status: "error",
        data: null,
        error: mapped
      });

      if (mapped.code === "HOLD_EXPIRED" || mapped.status === 410) {
        setHoldState(null);
        setIdempotencyKey("");
      }

      if (mapped.code === "SLOT_NOT_AVAILABLE" || mapped.status === 409) {
        setHoldState(null);
        setIdempotencyKey("");
        await loadAvailability(selectedDateKey, false, true);
      }
    }
  }

  function formatAppointmentSummary(appointment) {
    if (!appointment) {
      return "--";
    }

    const service = appointment.serviceName || "Servicio";
    const therapist = appointment.therapistName || "Terapeuta";
    const room = appointment.roomName || "Sala";
    const dateText = formatDateTime(appointment.startsAt);
    return `${service} - ${dateText} con ${therapist} en ${room}`;
  }

  const activeHoldStartsAt = holdState?.startsAt || "";

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

        <nav className="variant-nav" aria-label="Variantes de Reserva publica">
          {Object.entries(SCREEN_TYPES).map(([value, label]) => {
            const isActive = config.screenType === value;

            return (
              <a
                key={value}
                href={createVariantHref(config.tenantSlug, value)}
                className={`variant-link${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {label}
              </a>
            );
          })}
        </nav>

        {config.screenType !== "default" ? (
          <p className="phase-note">
            En Fase 3B la UI conectada aplica solo al flujo default. Las variantes avanzadas quedan para la siguiente fase.
          </p>
        ) : null}

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
                        disabled={isDisabled || hasActiveHold}
                        onClick={() => {
                          if (hasActiveHold) {
                            return;
                          }
                          setSelectedServiceId(service.id);
                          setSelectedTherapistId("");
                          resetFromIdentifyDownstream();
                        }}
                      >
                        <span className="service-main">
                          <span className="service-name">
                            <CheckCircle size={15} weight={isSelected ? "fill" : "regular"} aria-hidden="true" />
                            {service.name}
                          </span>
                          <span className="service-meta">{service.durationMinutes} min</span>
                        </span>
                        <span className="service-note">
                          {service.therapistCount} terapeuta{service.therapistCount === 1 ? "" : "s"} disponible
                        </span>
                        {isDisabled ? <span className="service-note">No reservable por ahora</span> : null}
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
                    if (hasActiveHold) {
                      return;
                    }
                    setSelectedTherapistId(event.target.value);
                    resetFromIdentifyDownstream();
                  }}
                  disabled={!selectedServiceId || compatibleTherapists.length === 0 || hasActiveHold}
                >
                  <option value="">Recomendado automaticamente</option>
                  {compatibleTherapists.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="step">
              <p className="step-label">3. WhatsApp</p>
              <label className="field">
                <span>Numero WhatsApp</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phoneInput}
                  onChange={(event) => {
                    if (hasActiveHold) {
                      return;
                    }
                    setPhoneInput(normalizePhone(event.target.value));
                    setIdentifyState((current) => (current.status === "idle" ? current : { status: "idle", data: null, error: null }));
                    resetFromIdentifyDownstream();
                  }}
                  disabled={hasActiveHold}
                  placeholder="59170000000"
                />
              </label>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={identifyState.status === "loading" || hasActiveHold}
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

        {identifyState.status === "success" ? (
          <div className="identify-state">
            {nextAppointment ? (
              <>
                <div className="feedback feedback-warning" role="status">
                  <strong>Ya tienes cita</strong>
                  <span>{formatAppointmentSummary(nextAppointment)}</span>
                </div>
                <div className="actions">
                  <a className="btn btn-ghost" href={supportFromConflictHref} target="_blank" rel="noreferrer">
                    <WhatsappLogo size={18} weight="regular" aria-hidden="true" />
                    Reagendar/Cancelar (siguiente fase)
                  </a>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleDecisionReserveAnother}
                    disabled={hasActiveHold}
                  >
                    Reservar otra sesion
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleDecisionContinue} disabled={hasActiveHold}>
                Ver horarios disponibles
              </button>
            )}
          </div>
        ) : null}
      </section>

      {decision ? (
        <section className="surface" aria-labelledby="availability-title">
          <h2 id="availability-title">Horarios disponibles</h2>
          <p className="supporting">Solo se muestran despues de identificar WhatsApp y confirmar que deseas avanzar con la reserva.</p>

          <div className="date-strip" role="tablist" aria-label="Fechas disponibles">
            {businessDays.map((day) => (
              <button
                key={day.key}
                type="button"
                className={`date-chip${selectedDateKey === day.key ? " is-selected" : ""}`}
                disabled={hasActiveHold}
                onClick={async () => {
                  setSelectedDateKey(day.key);
                  if (decision) {
                    await loadAvailability(day.key);
                  }
                }}
              >
                <span>{day.dayLabel}</span>
                <strong>{day.dateLabel}</strong>
              </button>
            ))}
          </div>
          {hasActiveHold ? (
            <p className="hold-lock-note">Fecha bloqueada mientras el hold esta activo. Confirma o espera expiracion.</p>
          ) : null}

          {availabilityState.status === "loading" ? (
            <p className="inline-state" role="status">
              <CircleNotch size={18} className="spin" aria-hidden="true" />
              Cargando horarios...
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

          {availabilityState.status === "success" ? (
            <>
              {slotGroups.morning.length === 0 && slotGroups.afternoon.length === 0 ? (
                <p className="feedback feedback-info">No hay horarios disponibles para la fecha seleccionada.</p>
              ) : null}

              {slotGroups.morning.length > 0 ? (
                <div className="slot-group">
                  <p className="slot-group-title">Manana</p>
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
                              <strong>{formatTime(slot.startsAt)}</strong>
                              <span>
                                {slot.therapistName} · {slot.roomName}
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
                  <p className="slot-group-title">Tarde</p>
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
                              <strong>{formatTime(slot.startsAt)}</strong>
                              <span>
                                {slot.therapistName} · {slot.roomName}
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

          {holdState ? (
            <div className="feedback feedback-warning" role="status">
              <div className="hold-header">
                <strong>Hold activo</strong>
                <span>
                  <ClockCountdown size={16} aria-hidden="true" />
                  Expira en {toMinutesAndSeconds(holdSecondsLeft)}
                </span>
              </div>
              <span>
                {formatDateTime(holdState.startsAt)} · {holdState.therapistName} · {holdState.roomName}
              </span>
              <p className="hold-note">Mientras el hold esta activo no puedes elegir otro horario. Confirma o espera su expiracion.</p>
              <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={confirmState.status === "loading"}>
                {confirmState.status === "loading" ? (
                  <>
                    <CircleNotch size={18} className="spin" aria-hidden="true" />
                    Confirmando...
                  </>
                ) : (
                  "Confirmar cita"
                )}
              </button>
            </div>
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
        <section className="surface surface-success" aria-live="polite">
          <h2 className="section-title">
            <CalendarCheck size={20} weight="fill" aria-hidden="true" />
            Tu cita esta confirmada
          </h2>
          <p className="supporting">
            {formatDateTime(confirmState.data?.appointment?.startsAt)} · {confirmState.data?.appointment?.serviceName} con{" "}
            {confirmState.data?.appointment?.therapistName}
          </p>
          <p className="supporting">Codigo: {confirmState.data?.appointment?.publicCode || "--"}</p>
          <a className="btn btn-ghost" href={supportManageHref} target="_blank" rel="noreferrer">
            <WhatsappLogo size={18} weight="regular" aria-hidden="true" />
            Hablar con alguien
          </a>
        </section>
      ) : null}

    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BookingApp />
  </React.StrictMode>
);
