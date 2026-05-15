import { Navigate } from "react-router-dom";

import { useAuth } from "../features/auth/AuthContext";
import { lunaMandalaLogoUrl } from "../lib/brand";

export function ControlRoute() {
  const { isAuthenticated, admin, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <img className="sidebar-logo" src={lunaMandalaLogoUrl} alt="Luna Mandala" />
        <nav aria-label="Admin">
          <a className="nav-item nav-item-active" href="/control">Control</a>
        </nav>
      </aside>
      <section className="workspace">
        <header className="page-header">
          <h1>Control</h1>
          <div className="admin-session">
            <span>{admin?.fullName || admin?.email}</span>
            <button type="button" onClick={logout}>Salir</button>
          </div>
        </header>
      </section>
    </main>
  );
}
