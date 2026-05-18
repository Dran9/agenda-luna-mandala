import { useEffect, useState } from "react";

import { firstFieldError } from "../appointments/formErrors";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { useCreateTherapistMutation } from "./mutations";
import { therapistErrorToFieldErrors } from "./therapistErrors";
import { parseCreateTherapistForm } from "./therapistSchema";
import { buildCreateTherapistPayload } from "./therapistUtils";

export function CreateTherapistModal({ open, onClose }) {
  const createMutation = useCreateTherapistMutation();
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setFieldErrors({});
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseCreateTherapistForm(Object.fromEntries(form.entries()));

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});

    try {
      await createMutation.mutateAsync(buildCreateTherapistPayload(parsed.data));
      onClose();
    } catch (error) {
      setFieldErrors(therapistErrorToFieldErrors(error));
    }
  }

  return (
    <Modal open={open} title="Nuevo terapeuta" onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <Input label="Nombre" name="fullName" error={firstFieldError(fieldErrors, "fullName")} />
        <Input label="Nombre visible" name="displayName" error={firstFieldError(fieldErrors, "displayName")} />
        <Input label="Teléfono" name="phone" error={firstFieldError(fieldErrors, "phone")} />
        <Input label="Telegram" name="telegramChatId" error={firstFieldError(fieldErrors, "telegramChatId")} />
        {firstFieldError(fieldErrors, "form") ? (
          <p className="form-error">{firstFieldError(fieldErrors, "form")}</p>
        ) : null}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creando" : "Crear terapeuta"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
