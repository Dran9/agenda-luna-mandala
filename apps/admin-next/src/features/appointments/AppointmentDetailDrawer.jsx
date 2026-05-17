import { useEffect, useState } from "react";

import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { Drawer } from "../../ui/Drawer";
import { Select } from "../../ui/Select";
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
import {
  appointmentDetailFromPayload,
  detailValue,
  roomChangeAllowed,
  roomOptionsForAppointment,
  statusActionsForAppointment
} from "./detailUtils";
import { useAppointmentDetailQuery } from "./queries";
import {
  useUpdateAppointmentRoomMutation,
  useUpdateAppointmentStatusMutation
} from "./mutations";

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AppointmentDetailDrawer({ appointmentId, date, open, onClose }) {
  const detailQuery = useAppointmentDetailQuery(appointmentId);
  const statusMutation = useUpdateAppointmentStatusMutation(date);
  const roomMutation = useUpdateAppointmentRoomMutation(date);
  const appointment = appointmentDetailFromPayload(detailQuery.data);
  const actions = statusActionsForAppointment(appointment);
  const roomOptions = roomOptionsForAppointment(appointment);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const { reset: resetStatusMutation } = statusMutation;
  const { reset: resetRoomMutation } = roomMutation;
  const mutationError = statusMutation.error || roomMutation.error;

  useEffect(() => {
    setSelectedRoomId(appointment?.room?.id ? String(appointment.room.id) : "");
  }, [appointment?.room?.id]);

  useEffect(() => {
    if (!open) {
      resetStatusMutation();
      resetRoomMutation();
    }
  }, [open, resetRoomMutation, resetStatusMutation]);

  async function handleStatus(status) {
    try {
      await statusMutation.mutateAsync({ appointmentId, status });
    } catch {
      // The drawer renders mutation errors inline.
    }
  }

  async function handleRoomSubmit(event) {
    event.preventDefault();
    try {
      await roomMutation.mutateAsync({ appointmentId, roomId: selectedRoomId });
    } catch {
      // The drawer renders mutation errors inline.
    }
  }

  return (
    <Drawer open={open} title="Detalle de cita" onClose={onClose}>
      {detailQuery.isLoading ? (
        <div className="drawer-section">
          <span className="skeleton-cell skeleton-wide" />
          <span className="skeleton-cell skeleton-medium" />
          <span className="skeleton-cell skeleton-short" />
        </div>
      ) : null}

      {detailQuery.error ? (
        <p className="form-error drawer-error">{detailQuery.error.message}</p>
      ) : null}

      {appointment ? (
        <>
          <section className="drawer-section drawer-summary">
            <div>
              <span>{formatAppointmentTime(appointment.startsAt)}</span>
              <h3>{appointmentClientName(appointment)}</h3>
              <p>{appointmentClientWhatsapp(appointment)}</p>
            </div>
            <Chip tone={appointmentStatusTone(appointment.status)}>
              {appointmentStatusLabel(appointment.status)}
            </Chip>
          </section>

          <dl className="drawer-section detail-list">
            <DetailRow label="Servicio" value={appointmentServiceName(appointment)} />
            <DetailRow label="Terapeuta" value={appointmentTherapistName(appointment)} />
            <DetailRow label="Sala" value={appointmentRoomName(appointment)} />
            <DetailRow label="Código" value={detailValue(appointment.publicCode)} />
            <DetailRow label="Termina" value={formatAppointmentTime(appointment.endsAt)} />
            <DetailRow label="Cliente completo" value={appointment.client?.onboardingComplete ? "Sí" : "No"} />
          </dl>

          {roomChangeAllowed(appointment) && roomOptions.length ? (
            <form className="drawer-section drawer-room-form" onSubmit={handleRoomSubmit}>
              <Select
                label="Sala"
                name="roomId"
                value={selectedRoomId}
                onChange={(event) => setSelectedRoomId(event.target.value)}
              >
                {roomOptions.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
              <Button
                type="submit"
                variant="secondary"
                disabled={roomMutation.isPending || selectedRoomId === String(appointment.room?.id || "")}
              >
                Cambiar sala
              </Button>
            </form>
          ) : null}

          <section className="drawer-section drawer-actions" aria-label="Acciones de cita">
            {actions.length ? actions.map((action) => (
              <Button
                key={action.status}
                type="button"
                variant="secondary"
                disabled={statusMutation.isPending}
                onClick={() => handleStatus(action.status)}
              >
                {action.label}
              </Button>
            )) : (
              <p>Sin acciones disponibles para este estado.</p>
            )}
          </section>

          {mutationError ? (
            <p className="form-error drawer-error">{mutationError.message}</p>
          ) : null}
        </>
      ) : null}
    </Drawer>
  );
}
