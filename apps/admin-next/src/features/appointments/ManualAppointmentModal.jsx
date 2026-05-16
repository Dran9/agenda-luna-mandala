import { useMemo, useState } from "react";

import { useCreateAppointmentMutation } from "./mutations";
import { roomOptions, serviceOptions, therapistOptions } from "./options";
import { parseManualAppointmentForm } from "./formSchema";
import { useResourcesQuery, useTherapistsQuery } from "./queries";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { Select } from "../../ui/Select";
import {
  buildManualAppointmentPayload,
  defaultStartsAt,
  formatPhoneDisplay
} from "./formUtils";

export function ManualAppointmentModal({ centerSlug, date, open, onClose }) {
  const resourcesQuery = useResourcesQuery(open);
  const therapistsQuery = useTherapistsQuery(open);
  const createMutation = useCreateAppointmentMutation(date);
  const [fieldErrors, setFieldErrors] = useState({});

  const services = useMemo(() => serviceOptions(resourcesQuery.data), [resourcesQuery.data]);
  const rooms = useMemo(() => roomOptions(resourcesQuery.data), [resourcesQuery.data]);
  const therapists = useMemo(() => therapistOptions(therapistsQuery.data), [therapistsQuery.data]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    const parsed = parseManualAppointmentForm(values);

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});

    try {
      await createMutation.mutateAsync(buildManualAppointmentPayload({
        centerSlug,
        values: parsed.data
      }));
      onClose();
    } catch (error) {
      if (error.message?.startsWith("WhatsApp")) {
        setFieldErrors({ phoneE164: [error.message] });
        return;
      }

      if (error.status === 409 || error.code === "SLOT_OCCUPIED") {
        setFieldErrors({ startsAt: [error.message] });
        return;
      }

      setFieldErrors({ form: [error.message || "No se pudo crear la cita."] });
    }
  }

  return (
    <Modal open={open} title="Nueva cita" onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <Select label="Servicio" name="serviceId" error={fieldErrors.serviceId?.[0]} required>
          <option value="">Seleccionar</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </Select>
        <Input label="Cliente" name="clientFullName" error={fieldErrors.clientFullName?.[0]} placeholder="Ej. Maria Gonzalez" />
        <Input
          label="WhatsApp"
          name="phoneE164"
          inputMode="tel"
          error={fieldErrors.phoneE164?.[0]}
          placeholder="591 7123 4567"
          onInput={(event) => {
            event.currentTarget.value = formatPhoneDisplay(event.currentTarget.value);
          }}
          onBlur={(event) => {
            event.currentTarget.value = formatPhoneDisplay(event.currentTarget.value);
          }}
        />
        <Select label="Terapeuta" name="therapistId" error={fieldErrors.therapistId?.[0]}>
          <option value="">Opcional</option>
          {therapists.map((therapist) => (
            <option key={therapist.id} value={therapist.id}>{therapist.displayName}</option>
          ))}
        </Select>
        <Select label="Sala" name="roomId" error={fieldErrors.roomId?.[0]}>
          <option value="">Opcional</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>{room.name}</option>
          ))}
        </Select>
        <Input
          label="Fecha y hora"
          name="startsAt"
          type="datetime-local"
          defaultValue={defaultStartsAt(date)}
          error={fieldErrors.startsAt?.[0]}
        />
        {fieldErrors.form?.[0] ? <p className="form-error">{fieldErrors.form[0]}</p> : null}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creando" : "Crear cita"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
