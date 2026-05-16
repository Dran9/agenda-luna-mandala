import { useState } from "react";

import { firstFieldError } from "../appointments/formErrors";
import { Button } from "../../ui/Button";
import { Drawer } from "../../ui/Drawer";
import { Input } from "../../ui/Input";
import { Select } from "../../ui/Select";
import { useUpdateTherapistMutation } from "./mutations";
import { therapistErrorToFieldErrors } from "./therapistErrors";
import { parseUpdateTherapistForm } from "./therapistSchema";
import { buildUpdateTherapistPayload } from "./therapistUtils";

export function EditTherapistDrawer({ onClose, open, therapist }) {
  const updateMutation = useUpdateTherapistMutation();
  const [fieldErrors, setFieldErrors] = useState({});

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

  return (
    <Drawer open={open} title="Editar terapeuta" onClose={onClose}>
      <form className="drawer-section" onSubmit={handleSubmit}>
        <Input
          label="Nombre"
          name="fullName"
          defaultValue={therapist?.fullName || ""}
          error={firstFieldError(fieldErrors, "fullName")}
        />
        <Input
          label="Nombre visible"
          name="displayName"
          defaultValue={therapist?.displayName || ""}
          error={firstFieldError(fieldErrors, "displayName")}
        />
        <Input
          label="Telefono"
          name="phone"
          defaultValue={therapist?.phone || ""}
          error={firstFieldError(fieldErrors, "phone")}
        />
        <Input
          label="Telegram"
          name="telegramChatId"
          defaultValue={therapist?.telegramChatId || ""}
          error={firstFieldError(fieldErrors, "telegramChatId")}
        />
        <Select
          label="Estado"
          name="isActive"
          defaultValue={therapist?.status === "INACTIVE" ? "false" : "true"}
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
    </Drawer>
  );
}
