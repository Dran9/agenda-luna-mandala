import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";

import { CreateTherapistModal } from "../features/therapists/CreateTherapistModal";
import { EditTherapistDrawer } from "../features/therapists/EditTherapistDrawer";
import { TherapistTable } from "../features/therapists/TherapistTable";
import { useTherapistsSettingsQuery } from "../features/therapists/queries";
import {
  therapistSummary,
  therapistsForSettings,
  therapistsRefreshLabel
} from "../features/therapists/therapistUtils";
import { useAuth } from "../features/auth/AuthContext";
import { Button } from "../ui/Button";
import { Toolbar } from "../ui/Toolbar";
import { AdminShell } from "./AdminShell";

export function TherapistsRoute() {
  const { isAuthenticated } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [filters, setFilters] = useState({ q: "", status: "all" });
  const therapistsQuery = useTherapistsSettingsQuery(isAuthenticated, filters);
  const therapists = useMemo(() => therapistsForSettings(therapistsQuery.data), [therapistsQuery.data]);
  const summary = useMemo(() => therapistSummary(therapistsQuery.data), [therapistsQuery.data]);
  const refreshStateLabel = therapistsRefreshLabel({
    isFetching: therapistsQuery.isFetching,
    isLoading: therapistsQuery.isLoading,
    dataUpdatedAt: therapistsQuery.dataUpdatedAt
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setFilters({
      q: String(form.get("q") || "").trim(),
      status: String(form.get("status") || "all")
    });
  }

  return (
    <AdminShell title="Terapeutas">
      <Toolbar>
        <div className="settings-summary" aria-label="Resumen de terapeutas">
          <strong>{summary.total}</strong>
          <span>{summary.active} activos</span>
        </div>
        <form className="settings-filter-form" onSubmit={handleFilterSubmit}>
          <label className="settings-compact-input">
            <span>Buscar</span>
            <input name="q" defaultValue={filters.q} />
          </label>
          <label className="settings-compact-select">
            <span>Estado</span>
            <select name="status" defaultValue={filters.status}>
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
          <Button type="submit" variant="secondary">Filtrar</Button>
        </form>
        <span className="refresh-state">{refreshStateLabel}</span>
        <span className="toolbar-spacer" />
        <Button type="button" variant="secondary" onClick={() => therapistsQuery.refetch()}>
          Actualizar
        </Button>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Nuevo terapeuta
        </Button>
      </Toolbar>
      {therapistsQuery.error ? <p className="form-error">{therapistsQuery.error.message}</p> : null}
      <TherapistTable
        therapists={therapists}
        isInitialLoading={therapistsQuery.isLoading}
        isRefreshing={therapistsQuery.isFetching && !therapistsQuery.isLoading}
        onEditTherapist={setSelectedTherapist}
      />
      <CreateTherapistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <EditTherapistDrawer
        key={selectedTherapist?.id || "therapist-drawer"}
        therapist={selectedTherapist}
        open={Boolean(selectedTherapist)}
        onClose={() => setSelectedTherapist(null)}
      />
    </AdminShell>
  );
}
