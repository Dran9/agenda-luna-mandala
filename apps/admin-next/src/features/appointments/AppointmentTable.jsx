import { Chip } from "../../ui/Chip";
import {
  appointmentClientName,
  appointmentClientWhatsapp,
  appointmentRoomName,
  appointmentServiceName,
  appointmentStatusLabel,
  appointmentStatusTone,
  appointmentTherapistName,
  formatAppointmentTime
} from "./tableUtils";

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

export function AppointmentTable({
  appointments,
  isInitialLoading,
  isRefreshing,
  onSelectAppointment,
  selectedAppointmentId
}) {
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
            <tr
              key={appointment.id}
              className={selectedAppointmentId === appointment.id ? "table-row-active" : ""}
              role="button"
              tabIndex="0"
              onClick={() => onSelectAppointment?.(appointment.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSelectAppointment?.(appointment.id);
                }
              }}
            >
              <td className="cell-time">{formatAppointmentTime(appointment.startsAt)}</td>
              <td>
                <strong>{appointmentClientName(appointment)}</strong>
                <span>{appointmentClientWhatsapp(appointment)}</span>
              </td>
              <td>{appointmentServiceName(appointment)}</td>
              <td>{appointmentTherapistName(appointment)}</td>
              <td>{appointmentRoomName(appointment)}</td>
              <td>
                <Chip tone={appointmentStatusTone(appointment.status)}>
                  {appointmentStatusLabel(appointment.status)}
                </Chip>
              </td>
            </tr>
          )) : null}
        </tbody>
      </table>
    </div>
  );
}
