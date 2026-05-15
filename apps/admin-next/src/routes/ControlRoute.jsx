import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";

import { AppointmentTable } from "../features/appointments/AppointmentTable";
import { useAppointmentsQuery } from "../features/appointments/queries";
import { useAuth } from "../features/auth/AuthContext";
import { lunaMandalaLogoUrl } from "../lib/brand";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Toolbar } from "../ui/Toolbar";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function ControlRoute() {
  const { isAuthenticated, admin, logout } = useAuth();
  const [date, setDate] = useState(() => todayKey());
  const appointmentsQuery = useAppointmentsQuery(date, isAuthenticated);
  const appointments = useMemo(() => appointmentsQuery.data?.today || [], [appointmentsQuery.data]);

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
        <Toolbar>
          <Input
            label="Fecha"
            name="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <span className="refresh-state">
            {appointmentsQuery.isFetching && !appointmentsQuery.isLoading ? "Actualizando" : "Actualizado"}
          </span>
          <span className="toolbar-spacer" />
          <Button type="button" variant="secondary" onClick={() => appointmentsQuery.refetch()}>
            Actualizar
          </Button>
        </Toolbar>
        {appointmentsQuery.error ? <p className="form-error">{appointmentsQuery.error.message}</p> : null}
        <AppointmentTable
          appointments={appointments}
          isInitialLoading={appointmentsQuery.isLoading}
          isRefreshing={appointmentsQuery.isFetching && !appointmentsQuery.isLoading}
        />
      </section>
    </main>
  );
}
