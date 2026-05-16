import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";

import { ClientDetailDrawer } from "../features/clients/ClientDetailDrawer";
import { ClientTable } from "../features/clients/ClientTable";
import { useClientsQuery } from "../features/clients/queries";
import {
  clientSummary,
  clientsForAdmin,
  clientsRefreshLabel
} from "../features/clients/clientUtils";
import { useAuth } from "../features/auth/AuthContext";
import { Button } from "../ui/Button";
import { Toolbar } from "../ui/Toolbar";
import { AdminShell } from "./AdminShell";

export function ClientsRoute() {
  const { isAuthenticated } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [filters, setFilters] = useState({ onboarding: "all", q: "" });
  const clientsQuery = useClientsQuery(isAuthenticated, filters);
  const clients = useMemo(() => clientsForAdmin(clientsQuery.data), [clientsQuery.data]);
  const summary = useMemo(() => clientSummary(clientsQuery.data), [clientsQuery.data]);
  const refreshStateLabel = clientsRefreshLabel({
    isFetching: clientsQuery.isFetching,
    isLoading: clientsQuery.isLoading,
    dataUpdatedAt: clientsQuery.dataUpdatedAt
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setFilters({
      onboarding: String(form.get("onboarding") || "all"),
      q: String(form.get("q") || "").trim()
    });
  }

  return (
    <AdminShell title="Clientes">
      <Toolbar>
        <div className="settings-summary" aria-label="Resumen de clientes">
          <strong>{summary.total}</strong>
          <span>{summary.complete} fichas completas</span>
        </div>
        <form className="settings-filter-form" onSubmit={handleFilterSubmit}>
          <label className="settings-compact-input">
            <span>Buscar</span>
            <input name="q" defaultValue={filters.q} />
          </label>
          <label className="settings-compact-select">
            <span>Ficha</span>
            <select name="onboarding" defaultValue={filters.onboarding}>
              <option value="all">Todas</option>
              <option value="complete">Completas</option>
              <option value="incomplete">Incompletas</option>
            </select>
          </label>
          <Button type="submit" variant="secondary">Filtrar</Button>
        </form>
        <span className="refresh-state">{refreshStateLabel}</span>
        <span className="toolbar-spacer" />
        <Button type="button" variant="secondary" onClick={() => clientsQuery.refetch()}>
          Actualizar
        </Button>
      </Toolbar>
      {clientsQuery.error ? <p className="form-error">{clientsQuery.error.message}</p> : null}
      <ClientTable
        clients={clients}
        isInitialLoading={clientsQuery.isLoading}
        isRefreshing={clientsQuery.isFetching && !clientsQuery.isLoading}
        onOpenClient={setSelectedClientId}
      />
      <ClientDetailDrawer
        clientId={selectedClientId}
        open={Boolean(selectedClientId)}
        onClose={() => setSelectedClientId(null)}
      />
    </AdminShell>
  );
}
