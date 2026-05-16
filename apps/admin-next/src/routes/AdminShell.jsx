import { NavLink } from "react-router-dom";

import { useAuth } from "../features/auth/AuthContext";
import { lunaMandalaLogoUrl } from "../lib/brand";
import { adminSessionLabel } from "./controlUtils";

export function AdminShell({ children, title }) {
  const { admin, logout } = useAuth();

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <img className="sidebar-logo" src={lunaMandalaLogoUrl} alt="Luna Mandala" />
        <nav aria-label="Admin">
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " nav-item-active" : ""}`}
            to="/control"
          >
            Control
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " nav-item-active" : ""}`}
            to="/ajustes"
          >
            Ajustes
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " nav-item-active" : ""}`}
            to="/terapeutas"
          >
            Terapeutas
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " nav-item-active" : ""}`}
            to="/clientes"
          >
            Clientes
          </NavLink>
        </nav>
      </aside>
      <section className="workspace">
        <header className="page-header">
          <h1>{title}</h1>
          <div className="admin-session">
            <span>{adminSessionLabel(admin)}</span>
            <button type="button" onClick={logout}>Salir</button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
