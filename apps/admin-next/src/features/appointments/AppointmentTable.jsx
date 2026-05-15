import { Chip } from "../../ui/Chip";

const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistio"
};

function formatTime(value) {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "-";
}

function SkeletonRows() {
  return Array.from({ length: 8 }, (_, index) => (
    <tr key={index}>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-wide" /></td>
      <td><span className="skeleton-cell skeleton-medium" /></td>
      <td><span className="skeleton-cell skeleton-medium" /></td>
      <td><span className="skeleton-cell skeleton-medium" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
    </tr>
  ));
}

export function AppointmentTable({ appointments, isInitialLoading, isRefreshing }) {
  return (
    <div className="table-frame" data-refreshing={isRefreshing ? "true" : "false"}>
      <table className="appointments-table">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Terapeuta</th>
            <th>Sala</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {isInitialLoading ? <SkeletonRows /> : null}
          {!isInitialLoading && appointments.length === 0 ? (
            <tr>
              <td className="table-empty" colSpan="6">Sin citas para esta fecha.</td>
            </tr>
          ) : null}
          {!isInitialLoading ? appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td className="cell-time">{formatTime(appointment.startsAt)}</td>
              <td>
                <strong>{appointment.client?.fullName || "-"}</strong>
                <span>{appointment.client?.whatsapp || "-"}</span>
              </td>
              <td>{appointment.service?.name || "-"}</td>
              <td>{appointment.therapist?.name || "-"}</td>
              <td>{appointment.room?.name || "-"}</td>
              <td>
                <Chip tone={appointment.status}>{statusLabel(appointment.status)}</Chip>
              </td>
            </tr>
          )) : null}
        </tbody>
      </table>
    </div>
  );
}
