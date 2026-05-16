import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import {
  appointmentSummaryLabel,
  clientContact,
  clientDisplayName,
  clientOnboardingLabel,
  clientOnboardingTone
} from "./clientUtils";

function ClientSkeletonRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={`client-skeleton-${index}`}>
      <td><span className="skeleton-cell skeleton-wide" /></td>
      <td><span className="skeleton-cell skeleton-medium" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-medium" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
    </tr>
  ));
}

export function ClientTable({ clients, isInitialLoading, isRefreshing, onOpenClient }) {
  return (
    <div className="table-frame settings-table-frame" data-refreshing={isRefreshing ? "true" : "false"}>
      <table className="appointments-table settings-table settings-service-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>WhatsApp</th>
            <th>Ficha</th>
            <th>Proxima cita</th>
            <th>Citas</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          {isInitialLoading ? <ClientSkeletonRows /> : null}
          {!isInitialLoading && clients.length === 0 ? (
            <tr>
              <td className="table-empty" colSpan="6">Sin clientes.</td>
            </tr>
          ) : null}
          {!isInitialLoading && clients.map((client) => (
            <tr key={client.id}>
              <td>
                <strong>{clientDisplayName(client)}</strong>
                <span>{client.city || client.source || "-"}</span>
              </td>
              <td>{clientContact(client)}</td>
              <td>
                <Chip tone={clientOnboardingTone(client)}>
                  {clientOnboardingLabel(client)}
                </Chip>
              </td>
              <td>{appointmentSummaryLabel(client.nextAppointment)}</td>
              <td>{client.stats?.totalAppointments || 0}</td>
              <td>
                <Button type="button" variant="secondary" onClick={() => onOpenClient(client.id)}>
                  Ver
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
