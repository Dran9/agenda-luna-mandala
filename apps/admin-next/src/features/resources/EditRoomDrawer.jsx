import { useState } from "react";

import { firstFieldError } from "../appointments/formErrors";
import { Button } from "../../ui/Button";
import { Drawer } from "../../ui/Drawer";
import { Input } from "../../ui/Input";
import { Select } from "../../ui/Select";
import { useUpdateRoomMutation } from "./mutations";
import { roomErrorToFieldErrors } from "./roomErrors";
import { parseUpdateRoomForm } from "./roomSchema";
import { buildUpdateRoomPayload, ROOM_FEATURE_OPTIONS } from "./roomUtils";

export function EditRoomDrawer({ onClose, open, room }) {
  const updateMutation = useUpdateRoomMutation();
  const [fieldErrors, setFieldErrors] = useState({});
  const featureKeys = new Set(room?.featureKeys || []);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseUpdateRoomForm(Object.fromEntries(form.entries()));

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});

    try {
      await updateMutation.mutateAsync({
        roomId: room.id,
        payload: buildUpdateRoomPayload(parsed.data)
      });
      onClose();
    } catch (error) {
      setFieldErrors(roomErrorToFieldErrors(error));
    }
  }

  return (
    <Drawer open={open} title="Editar sala" onClose={onClose}>
      <form className="drawer-section" onSubmit={handleSubmit}>
        <Input
          label="Nombre"
          name="name"
          defaultValue={room?.name || ""}
          error={firstFieldError(fieldErrors, "name")}
        />
        <Input
          label="Capacidad"
          name="capacity"
          type="number"
          min="1"
          max="50"
          defaultValue={room?.capacity || 1}
          error={firstFieldError(fieldErrors, "capacity")}
        />
        <Select
          label="Estado"
          name="isActive"
          defaultValue={room?.status === "INACTIVE" ? "false" : "true"}
          error={firstFieldError(fieldErrors, "isActive")}
        >
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </Select>
        <fieldset className="field checkbox-group">
          <legend>Recursos</legend>
          {ROOM_FEATURE_OPTIONS.map((feature) => (
            <label key={feature.key} className="checkbox-option">
              <input type="checkbox" name={feature.key} defaultChecked={featureKeys.has(feature.key)} />
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
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando" : "Guardar"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
