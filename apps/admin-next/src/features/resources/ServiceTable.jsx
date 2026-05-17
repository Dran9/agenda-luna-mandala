import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";

function ServiceSkeletonRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={`service-skeleton-${index}`}>
      <td><span className="skeleton-cell skeleton-wide" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-medium" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
    </tr>
  ));
}

export function ServiceTable({ isInitialLoading, isRefreshing, onEditService, services }) {
  return (
    <div className="table-frame settings-table-frame" data-refreshing={isRefreshing ? "true" : "false"}>
      <table className="appointments-table settings-table settings-service-table">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Duración</th>
            <th>Precio</th>
            <th>Requisitos</th>
            <th>Salas</th>
            <th>Terapeutas</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {isInitialLoading ? <ServiceSkeletonRows /> : null}
          {!isInitialLoading && services.length === 0 ? (
            <tr>
              <td className="table-empty" colSpan="8">Sin servicios.</td>
            </tr>
          ) : null}
          {!isInitialLoading && services.map((service) => (
            <tr key={service.id}>
              <td><strong>{service.name}</strong></td>
              <td>{service.durationLabel || `${service.durationMinutes || 0} min`}</td>
              <td>{service.priceLabel || "-"}</td>
              <td>{service.requiredFeaturesLabel || "Solo sillas"}</td>
              <td>{service.compatibleRoomsCount || 0}</td>
              <td>{service.activeTherapistsCount || 0}</td>
              <td>
                <Chip tone={service.status === "ACTIVE" ? "confirmed" : "cancelled"}>
                  {service.statusLabel || "Sin estado"}
                </Chip>
              </td>
              <td>
                <Button type="button" variant="secondary" onClick={() => onEditService(service)}>
                  Editar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
