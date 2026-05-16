import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";

import { AppointmentTable } from "../features/appointments/AppointmentTable";
import { ManualAppointmentModal } from "../features/appointments/ManualAppointmentModal";
import { useAppointmentsQuery } from "../features/appointments/queries";
import { useAuth } from "../features/auth/AuthContext";
import { lunaMandalaLogoUrl } from "../lib/brand";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Toolbar } from "../ui/Toolbar";
import { refreshLabel, todayKey } from "./controlUtils";

export function ControlRoute() {
  const { isAuthenticated, admin, logout } = useAuth();
  const [date, setDate] = useState(() => todayKey());
  const [manualOpen, setManualOpen] = useState(false);
  const appointmentsQuery = useAppointmentsQuery(date, isAuthenticated);
  const appointments = useMemo(() => appointmentsQuery.data?.today || [], [appointmentsQuery.data]);
  const centerSlug = appointmentsQuery.data?.center?.slug || "";
  const refreshStateLabel = refreshLabel({
    isFetching: appointmentsQuery.isFetching,
    isLoading: appointmentsQuery.isLoading,
    dataUpdatedAt: appointmentsQuery.dataUpdatedAt
  });

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
            onInput={(event) => setDate(event.currentTarget.value)}
          />
          <span className="refresh-state">
            {refreshStateLabel}
          </span>
          <span className="toolbar-spacer" />
          <Button type="button" variant="secondary" onClick={() => appointmentsQuery.refetch()}>
            Actualizar
          </Button>
          <Button type="button" onClick={() => setManualOpen(true)}>
            Nueva cita
          </Button>
        </Toolbar>
        {appointmentsQuery.error ? <p className="form-error">{appointmentsQuery.error.message}</p> : null}
        <AppointmentTable
          appointments={appointments}
          isInitialLoading={appointmentsQuery.isLoading}
          isRefreshing={appointmentsQuery.isFetching && !appointmentsQuery.isLoading}
        />
        <ManualAppointmentModal
          centerSlug={centerSlug}
          date={date}
          open={manualOpen}
          onClose={() => setManualOpen(false)}
        />
      </section>
    </main>
  );
}
