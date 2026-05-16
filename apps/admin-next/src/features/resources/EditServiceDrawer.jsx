import { useState } from "react";

import { firstFieldError } from "../appointments/formErrors";
import { Button } from "../../ui/Button";
import { Drawer } from "../../ui/Drawer";
import { Input } from "../../ui/Input";
import { Select } from "../../ui/Select";
import { useUpdateServiceMutation } from "./mutations";
import { ROOM_FEATURE_OPTIONS } from "./roomUtils";
import { serviceErrorToFieldErrors } from "./serviceErrors";
import { parseUpdateServiceForm } from "./serviceSchema";
import { buildUpdateServicePayload } from "./serviceUtils";

export function EditServiceDrawer({ onClose, open, service }) {
  const updateMutation = useUpdateServiceMutation();
  const [fieldErrors, setFieldErrors] = useState({});
  const requiredFeatureKeys = new Set(service?.requiredFeatureKeys || []);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseUpdateServiceForm(Object.fromEntries(form.entries()));

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});

    try {
      await updateMutation.mutateAsync({
        serviceId: service.id,
        payload: buildUpdateServicePayload(parsed.data)
      });
      onClose();
    } catch (error) {
      setFieldErrors(serviceErrorToFieldErrors(error));
    }
  }

  return (
    <Drawer open={open} title="Editar servicio" onClose={onClose}>
      <form className="drawer-section" onSubmit={handleSubmit}>
        <Input
          label="Nombre"
          name="name"
          defaultValue={service?.name || ""}
          error={firstFieldError(fieldErrors, "name")}
        />
        <Input
          label="Duracion"
          name="durationMinutes"
          type="number"
          min="15"
          max="480"
          step="15"
          defaultValue={service?.durationMinutes || 60}
          error={firstFieldError(fieldErrors, "durationMinutes")}
        />
        <Input
          label="Precio"
          name="priceAmount"
          type="number"
          min="0"
          max="999999"
          step="0.01"
          defaultValue={service?.priceAmount || 0}
          error={firstFieldError(fieldErrors, "priceAmount")}
        />
        <Select
          label="Estado"
          name="isActive"
          defaultValue={service?.status === "INACTIVE" ? "false" : "true"}
          error={firstFieldError(fieldErrors, "isActive")}
        >
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </Select>
        <fieldset className="field checkbox-group">
          <legend>Requisitos de sala</legend>
          {ROOM_FEATURE_OPTIONS.map((feature) => (
            <label key={feature.key} className="checkbox-option">
              <input type="checkbox" name={feature.key} defaultChecked={requiredFeatureKeys.has(feature.key)} />
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
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando" : "Guardar"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
