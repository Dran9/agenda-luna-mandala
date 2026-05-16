import { useMemo, useState } from "react";
import { z } from "zod";

import { useCreateAppointmentMutation } from "./mutations";
import { useResourcesQuery, useTherapistsQuery } from "./queries";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { Select } from "../../ui/Select";
import {
  defaultStartsAt,
  emptyToNull,
  formatPhoneDisplay,
  normalizePhone,
  toIsoDateTime
} from "./formUtils";

const formSchema = z.object({
  serviceId: z.string().min(1, "Servicio obligatorio"),
  clientFullName: z.string().min(2, "Nombre obligatorio"),
  phoneE164: z.string().min(1, "WhatsApp obligatorio"),
  therapistId: z.string().optional(),
  roomId: z.string().optional(),
  startsAt: z.string().min(1, "Fecha y hora obligatoria")
});

export function ManualAppointmentModal({ centerSlug, date, open, onClose }) {
  const resourcesQuery = useResourcesQuery(open);
  const therapistsQuery = useTherapistsQuery(open);
  const createMutation = useCreateAppointmentMutation(date);
  const [fieldErrors, setFieldErrors] = useState({});

  const services = useMemo(() => resourcesQuery.data?.settings?.services || [], [resourcesQuery.data]);
  const rooms = useMemo(() => resourcesQuery.data?.settings?.rooms || [], [resourcesQuery.data]);
  const therapists = useMemo(() => therapistsQuery.data?.therapists || [], [therapistsQuery.data]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    const parsed = formSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});

    try {
      const phoneE164 = normalizePhone(parsed.data.phoneE164);
      await createMutation.mutateAsync({
        tenantSlug: centerSlug,
        phoneE164,
        clientFullName: parsed.data.clientFullName.trim(),
        serviceId: parsed.data.serviceId,
        therapistId: emptyToNull(parsed.data.therapistId),
        roomId: emptyToNull(parsed.data.roomId),
        startsAt: toIsoDateTime(parsed.data.startsAt)
      });
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
