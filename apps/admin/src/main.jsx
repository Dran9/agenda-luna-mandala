import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarCheck,
  MagnifyingGlass,
  Moon,
  SlidersHorizontal,
  Sparkle,
  Sun,
  UserGear,
  UsersThree,
  Wallet
} from "@phosphor-icons/react";
import "./styles.css";

const MENU = [
  { id: "control", label: "Control", Icon: CalendarCheck },
  { id: "clientes", label: "Clientes", Icon: UsersThree },
  { id: "terapeutas", label: "Terapeutas", Icon: UserGear },
  { id: "finanzas", label: "Finanzas", Icon: Wallet },
  { id: "ajustes", label: "Ajustes", Icon: SlidersHorizontal }
];

const CONTROL_KPIS = [
  { label: "Citas hoy", value: "14", status: "estable", Icon: CalendarCheck },
  { label: "Pagos pendientes", value: "5", status: "atencion", Icon: Wallet },
  { label: "Salas en uso", value: "2/3", status: "ok", Icon: SlidersHorizontal },
  { label: "Proxima sesion", value: "10:30", status: "ok", Icon: Sparkle }
];

const TODAY_APPOINTMENTS = [
  { time: "09:00", service: "Reiki Integral", therapist: "Ana", room: "Sala Bosque", state: "confirmada" },
  { time: "10:30", service: "Masaje terapeutico", therapist: "Luis", room: "Sala Rio", state: "pendiente" },
  { time: "12:00", service: "Facial energetico", therapist: "Mara", room: "Sala Cielo", state: "confirmada" }
];

const ROOMS = [
  { name: "Sala Bosque", occupancy: "Ocupada hasta 10:00" },
  { name: "Sala Rio", occupancy: "Libre 11:15 - 13:00" },
  { name: "Sala Cielo", occupancy: "Ocupada hasta 12:50" }
];

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

function AdminApp() {
  const [theme, setTheme] = useState(readTheme);
  const [activeSection, setActiveSection] = useState("control");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("agenda-theme", theme);

    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [theme]);

  const currentLabel = useMemo(
    () => MENU.find((item) => item.id === activeSection)?.label || "Control",
    [activeSection]
  );

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-label="Luna Mandala">
          <Sparkle size={24} weight="fill" aria-hidden="true" />
        </div>

        <nav className="sidebar-nav" aria-label="Navegacion Admin">
          {MENU.map((item) => {
            const isActive = item.id === activeSection;
            const MenuIcon = item.Icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item${isActive ? " is-active" : ""}`}
                onClick={() => setActiveSection(item.id)}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                title={item.label}
              >
                <MenuIcon size={22} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        >
          {theme === "dark" ? (
            <Sun size={18} weight="regular" aria-hidden="true" />
          ) : (
            <Moon size={18} weight="regular" aria-hidden="true" />
          )}
        </button>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Agenda Luna Mandala</p>
            <h1>{currentLabel}</h1>
          </div>
          <label className="search-wrap">
            <MagnifyingGlass size={18} weight="regular" aria-hidden="true" />
            <input
              className="search"
              type="search"
              placeholder="Buscar cliente, terapeuta o cita"
              aria-label="Buscar en Admin"
            />
          </label>
        </header>

        <main className="canvas">
          <section className="kpi-strip" aria-label="Resumen operativo">
            {CONTROL_KPIS.map((kpi) => {
              const KpiIcon = kpi.Icon;

              return (
                <article className="kpi" key={kpi.label}>
                  <div className="kpi-heading">
                    <KpiIcon size={18} weight="regular" aria-hidden="true" />
                    <p className="kpi-label">{kpi.label}</p>
                  </div>
                  <p className="kpi-value">{kpi.value}</p>
                  <p className={`kpi-status status-${kpi.status}`}>{kpi.status}</p>
                </article>
              );
            })}
          </section>

          {activeSection === "control" ? (
            <>
              <section className="surface" aria-label="Citas de hoy">
                <h2>Hoy</h2>
                <ul className="rows">
                  {TODAY_APPOINTMENTS.map((row) => (
                    <li className="row" key={`${row.time}-${row.room}`}>
                      <span className="time">{row.time}</span>
                      <span className="summary">
                        {row.service} · {row.therapist}
                      </span>
                      <span className="room">{row.room}</span>
                      <span className={`state state-${row.state}`}>{row.state}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="surface" aria-label="Salas">
                <h2>Salas</h2>
                <ul className="rooms">
                  {ROOMS.map((room) => (
                    <li key={room.name}>
                      <p className="room-name">{room.name}</p>
                      <p className="room-occupancy">{room.occupancy}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <section className="surface" aria-label="Seccion placeholder">
              <h2>{currentLabel}</h2>
              <p>
                Placeholder visual de Fase 0.5 listo para evolucionar sin mezclar runtime, DB, autenticacion ni logica de negocio.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
