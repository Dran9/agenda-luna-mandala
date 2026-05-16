import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";

function TherapistSkeletonRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={`therapist-skeleton-${index}`}>
      <td><span className="skeleton-cell skeleton-wide" /></td>
      <td><span className="skeleton-cell skeleton-medium" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
    </tr>
  ));
}

export function TherapistTable({ isInitialLoading, isRefreshing, onEditTherapist, therapists }) {
  return (
    <div className="table-frame settings-table-frame" data-refreshing={isRefreshing ? "true" : "false"}>
      <table className="appointments-table settings-table settings-service-table">
        <thead>
          <tr>
            <th>Terapeuta</th>
            <th>Contacto</th>
            <th>Servicios</th>
            <th>Salas</th>
            <th>Estado</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          {isInitialLoading ? <TherapistSkeletonRows /> : null}
          {!isInitialLoading && therapists.length === 0 ? (
            <tr>
              <td className="table-empty" colSpan="6">Sin terapeutas.</td>
            </tr>
          ) : null}
          {!isInitialLoading && therapists.map((therapist) => (
            <tr key={therapist.id}>
              <td>
                <strong>{therapist.displayName || therapist.fullName}</strong>
                <span>{therapist.fullName}</span>
              </td>
              <td>{therapist.contactSummary || "-"}</td>
              <td>{therapist.servicesCount || 0}</td>
              <td>{therapist.compatibleRoomsCount || 0}</td>
              <td>
                <Chip tone={therapist.status === "ACTIVE" ? "confirmed" : "cancelled"}>
                  {therapist.statusLabel || "Sin estado"}
                </Chip>
              </td>
              <td>
                <Button type="button" variant="secondary" onClick={() => onEditTherapist(therapist)}>
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
