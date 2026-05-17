import { useEffect, useState } from "react";

import { firstFieldError } from "../appointments/formErrors";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { useCreateServiceMutation } from "./mutations";
import { ROOM_FEATURE_OPTIONS } from "./roomUtils";
import { serviceErrorToFieldErrors } from "./serviceErrors";
import { parseCreateServiceForm } from "./serviceSchema";
import { buildCreateServicePayload } from "./serviceUtils";

export function CreateServiceModal({ open, onClose }) {
  const createMutation = useCreateServiceMutation();
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setFieldErrors({});
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseCreateServiceForm(Object.fromEntries(form.entries()));

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});

    try {
      await createMutation.mutateAsync(buildCreateServicePayload(parsed.data));
      onClose();
    } catch (error) {
      setFieldErrors(serviceErrorToFieldErrors(error));
    }
  }

  return (
    <Modal open={open} title="Nuevo servicio" onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <Input
          label="Nombre"
          name="name"
          error={firstFieldError(fieldErrors, "name")}
          placeholder="Ej. Masaje relajante"
        />
        <Input
          label="Duración"
          name="durationMinutes"
          type="number"
          min="15"
          max="480"
          step="15"
          defaultValue="60"
          error={firstFieldError(fieldErrors, "durationMinutes")}
        />
        <Input
          label="Precio"
          name="priceAmount"
          type="number"
          min="0"
          max="999999"
          step="0.01"
          defaultValue="0"
          error={firstFieldError(fieldErrors, "priceAmount")}
        />
        <fieldset className="field checkbox-group">
          <legend>Requisitos de sala</legend>
          {ROOM_FEATURE_OPTIONS.map((feature) => (
            <label key={feature.key} className="checkbox-option">
              <input type="checkbox" name={feature.key} />
              <span>{feature.label}</span>
            </label>
          ))}
          {firstFieldError(fieldErrors, "requiredFeatureKeys") ? (
            <small className="field-error">{firstFieldError(fieldErrors, "requiredFeatureKeys")}</small>
          ) : null}
        </fieldset>
        {firstFieldError(fieldErrors, "form") ? (
          <p className="form-error">{firstFieldError(fieldErrors, "form")}</p>
        ) : null}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creando" : "Crear servicio"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
