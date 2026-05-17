import { useEffect, useMemo, useState } from "react";

import { firstFieldError } from "../appointments/formErrors";
import { Button } from "../../ui/Button";
import { Drawer } from "../../ui/Drawer";
import { Input } from "../../ui/Input";
import { Select } from "../../ui/Select";
import { useUpdateTherapistMutation, useUpdateTherapistServiceMutation } from "./mutations";
import { useTherapistDetailQuery } from "./queries";
import { therapistErrorToFieldErrors } from "./therapistErrors";
import { parseUpdateTherapistForm } from "./therapistSchema";
import { buildUpdateTherapistPayload, serviceAssignmentRows } from "./therapistUtils";

export function EditTherapistDrawer({ onClose, open, therapist }) {
  const updateMutation = useUpdateTherapistMutation();
  const serviceMutation = useUpdateTherapistServiceMutation();
  const detailQuery = useTherapistDetailQuery(open, therapist?.id);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serviceError, setServiceError] = useState("");
  const [pendingServiceId, setPendingServiceId] = useState(null);
  const detail = detailQuery.data;
  const displayTherapist = detail?.therapist || therapist;
  const services = useMemo(() => serviceAssignmentRows(detail), [detail]);

  useEffect(() => {
    setFieldErrors({});
    setServiceError("");
    setPendingServiceId(null);
  }, [therapist?.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseUpdateTherapistForm(Object.fromEntries(form.entries()));

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});

    try {
      await updateMutation.mutateAsync({
        therapistId: therapist.id,
        payload: buildUpdateTherapistPayload(parsed.data)
      });
      onClose();
    } catch (error) {
      setFieldErrors(therapistErrorToFieldErrors(error));
    }
  }

  async function handleServiceToggle(service, isActive) {
    setServiceError("");
    setPendingServiceId(service.id);

    try {
      await serviceMutation.mutateAsync({
        therapistId: therapist.id,
        serviceId: service.id,
        isActive
      });
    } catch (error) {
      setServiceError(error?.message || "No se pudo actualizar el servicio.");
      await detailQuery.refetch();
    } finally {
      setPendingServiceId(null);
    }
  }

  return (
    <Drawer open={open} title="Editar terapeuta" onClose={onClose}>
      <form className="drawer-section" onSubmit={handleSubmit}>
        <Input
          label="Nombre"
          name="fullName"
          defaultValue={displayTherapist?.fullName || ""}
          error={firstFieldError(fieldErrors, "fullName")}
        />
        <Input
          label="Nombre visible"
          name="displayName"
          defaultValue={displayTherapist?.displayName || ""}
          error={firstFieldError(fieldErrors, "displayName")}
        />
        <Input
          label="Telefono"
          name="phone"
          defaultValue={displayTherapist?.phone || ""}
          error={firstFieldError(fieldErrors, "phone")}
        />
        <Input
          label="Telegram"
          name="telegramChatId"
          defaultValue={displayTherapist?.telegramChatId || ""}
          error={firstFieldError(fieldErrors, "telegramChatId")}
        />
        <Select
          label="Estado"
          name="isActive"
          defaultValue={displayTherapist?.status === "INACTIVE" ? "false" : "true"}
          error={firstFieldError(fieldErrors, "isActive")}
        >
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </Select>
        {firstFieldError(fieldErrors, "form") ? (
          <p className="form-error">{firstFieldError(fieldErrors, "form")}</p>
        ) : null}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando" : "Guardar"}
          </Button>
        </div>
      </form>
      <section className="drawer-section">
        <h3 className="drawer-section-title">Servicios</h3>
        {detailQuery.error ? <p className="form-error">{detailQuery.error.message}</p> : null}
        {serviceError ? <p className="form-error">{serviceError}</p> : null}
        {detailQuery.isLoading ? <p className="drawer-muted">Cargando servicios</p> : null}
        {!detailQuery.isLoading && services.length === 0 ? (
          <p className="drawer-muted">Sin servicios configurados.</p>
        ) : null}
        {services.length > 0 ? (
          <div className="service-assignment-list" aria-label="Servicios del terapeuta">
            {services.map((service) => {
              const disabled = pendingServiceId === service.id
                || serviceMutation.isPending
                || (!service.isServiceActive && !service.isAssigned);

              return (
                <label key={service.id} className="service-assignment-row">
                  <input
                    type="checkbox"
                    checked={service.isAssigned}
                    disabled={disabled}
                    onChange={(event) => handleServiceToggle(service, event.target.checked)}
                  />
                  <span className="service-assignment-main">
                    <strong>{service.name}</strong>
                    <span>{service.durationLabel} · {service.statusLabel}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
      </section>
    </Drawer>
  );
}
