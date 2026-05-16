import { useEffect, useState } from "react";

import { firstFieldError } from "../appointments/formErrors";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { useCreateRoomMutation } from "./mutations";
import { buildCreateRoomPayload, ROOM_FEATURE_OPTIONS } from "./roomUtils";
import { roomErrorToFieldErrors } from "./roomErrors";
import { parseCreateRoomForm } from "./roomSchema";

export function CreateRoomModal({ open, onClose }) {
  const createMutation = useCreateRoomMutation();
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setFieldErrors({});
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseCreateRoomForm(Object.fromEntries(form.entries()));

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});

    try {
      await createMutation.mutateAsync(buildCreateRoomPayload(parsed.data));
      onClose();
    } catch (error) {
      setFieldErrors(roomErrorToFieldErrors(error));
    }
  }

  return (
    <Modal open={open} title="Nueva sala" onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <Input
          label="Nombre"
          name="name"
          error={firstFieldError(fieldErrors, "name")}
          placeholder="Ej. Sala Fenix"
        />
        <Input
          label="Capacidad"
          name="capacity"
          type="number"
          min="1"
          max="50"
          defaultValue="1"
          error={firstFieldError(fieldErrors, "capacity")}
        />
        <fieldset className="field checkbox-group">
          <legend>Recursos</legend>
          {ROOM_FEATURE_OPTIONS.map((feature) => (
            <label key={feature.key} className="checkbox-option">
              <input type="checkbox" name={feature.key} />
              <span>{feature.label}</span>
            </label>
          ))}
          {firstFieldError(fieldErrors, "featureKeys") ? (
            <small className="field-error">{firstFieldError(fieldErrors, "featureKeys")}</small>
          ) : null}
        </fieldset>
        {firstFieldError(fieldErrors, "form") ? (
          <p className="form-error">{firstFieldError(fieldErrors, "form")}</p>
        ) : null}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creando" : "Crear sala"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
