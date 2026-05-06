import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CalendarCheck, CheckCircle, Sparkle, UserCircleGear, WhatsappLogo } from "@phosphor-icons/react";
import "./styles.css";

const SCREEN_TYPES = {
  default: "Booking default",
  single_therapist: "Single therapist",
  hybrid_explore: "Hybrid explore"
};

const SERVICES = [
  { id: "svc_reiki", name: "Reiki Integral", duration: 60, note: "Regulacion emocional y descanso profundo" },
  { id: "svc_masaje", name: "Masaje terapeutico", duration: 75, note: "Descarga muscular y recuperacion corporal" },
  { id: "svc_facial", name: "Facial energetico", duration: 50, note: "Cuidado de piel y equilibrio de tension" }
];

const THERAPISTS = [
  { id: "ther_ana", name: "Ana", serviceIds: ["svc_reiki", "svc_facial"] },
  { id: "ther_luis", name: "Luis", serviceIds: ["svc_reiki", "svc_masaje"] },
  { id: "ther_mara", name: "Mara", serviceIds: ["svc_masaje", "svc_facial"] }
];

function resolveScreenType(rawValue) {
  if (!rawValue) {
    return "default";
  }

  return Object.hasOwn(SCREEN_TYPES, rawValue) ? rawValue : "default";
}

function readInitialConfig() {
  const params = new URLSearchParams(window.location.search);

  const tenantSlug = params.get("tenantSlug") || import.meta.env.VITE_TENANT_SLUG || "demo";
  const rawScreenType = params.get("screenType") || params.get("type") || import.meta.env.VITE_BOOKING_SCREEN_TYPE;
  const screenType = resolveScreenType(rawScreenType);
  const supportWhatsapp = params.get("supportWhatsapp") || import.meta.env.VITE_SUPPORT_WHATSAPP || "59170000000";

  return {
    tenantSlug,
    screenType,
    supportWhatsapp
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

function BookingApp() {
  const config = useMemo(readInitialConfig, []);
  const [selectedServiceId, setSelectedServiceId] = useState(SERVICES[0].id);
  const [showTherapists, setShowTherapists] = useState(false);
  const [selectedTherapistId, setSelectedTherapistId] = useState("");

  const selectedService = SERVICES.find((service) => service.id === selectedServiceId) || SERVICES[0];
  const compatibleTherapists = THERAPISTS.filter((therapist) => therapist.serviceIds.includes(selectedService.id));

  const recommendedTherapist = compatibleTherapists[0];
  const selectedTherapist = compatibleTherapists.find((therapist) => therapist.id === selectedTherapistId) || null;

  const whatsappMessage = encodeURIComponent("Hola, quisiera orientacion para elegir una terapia en Luna Mandala.");
  const supportHref = `https://wa.me/${config.supportWhatsapp}?text=${whatsappMessage}`;
  const manageHref = `https://wa.me/${config.supportWhatsapp}?text=${encodeURIComponent("Hola, necesito ayuda para gestionar mi cita.")}`;

  return (
    <main className="booking-app">
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

      <section className="surface" aria-labelledby="booking-title">
        <h2 id="booking-title">Reserva tu sesion</h2>
        <p className="supporting">Elige un servicio para continuar. Los horarios se habilitan despues de identificar WhatsApp.</p>

        <ul className="service-list" aria-label="Servicios destacados">
          {SERVICES.map((service) => {
            const isSelected = service.id === selectedService.id;

            return (
              <li key={service.id}>
                <button
                  type="button"
                  className={`service-item${isSelected ? " is-selected" : ""}`}
                  onClick={() => {
                    setSelectedServiceId(service.id);
                    setSelectedTherapistId("");
                  }}
                >
                  <span className="service-name">
                    <CheckCircle size={16} weight={isSelected ? "fill" : "regular"} aria-hidden="true" />
                    {service.name}
                  </span>
                  <span className="service-meta">{service.duration} min</span>
                  <span className="service-note">{service.note}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowTherapists((current) => !current)}>
            <UserCircleGear size={18} weight="regular" aria-hidden="true" />
            {showTherapists ? "Ocultar terapeutas" : "Elegir terapeuta"}
          </button>
          <a className="btn btn-ghost" href={supportHref} target="_blank" rel="noreferrer">
            <WhatsappLogo size={18} weight="regular" aria-hidden="true" />
            Buscar guia
          </a>
        </div>

        <a className="manage-link" href={manageHref} target="_blank" rel="noreferrer">
          <CalendarCheck size={16} weight="regular" aria-hidden="true" />
          Gestionar mi cita
        </a>
      </section>

      <section className="surface" aria-live="polite">
        <h2 className="section-title">
          <CheckCircle size={18} weight="fill" aria-hidden="true" />
          Servicio seleccionado
        </h2>
        <p className="supporting">
          Recomendado: <strong>{recommendedTherapist.name}</strong>. Disponible para este servicio y horario.
        </p>

        {showTherapists ? (
          <ul className="therapist-list" aria-label="Terapeutas compatibles">
            {compatibleTherapists.map((therapist) => {
              const isCurrent = therapist.id === selectedTherapist?.id;

              return (
                <li key={therapist.id}>
                  <button
                    type="button"
                    className={`therapist-item${isCurrent ? " is-selected" : ""}`}
                    onClick={() => setSelectedTherapistId(therapist.id)}
                  >
                    {therapist.name}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <p className="next-step">
          Siguiente paso visual de producto: identificacion por WhatsApp antes de mostrar disponibilidad real.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BookingApp />
  </React.StrictMode>
);
