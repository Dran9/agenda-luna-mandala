import assert from "node:assert/strict";
import test from "node:test";

import { appointmentErrorToFieldErrors } from "../errorUtils.js";

test("appointmentErrorToFieldErrors maps WhatsApp validation to the phone field", () => {
  assert.deepEqual(
    appointmentErrorToFieldErrors(new Error("WhatsApp debe tener entre 7 y 15 digitos.")),
    { phoneE164: ["WhatsApp debe tener entre 7 y 15 digitos."] }
  );
});

test("appointmentErrorToFieldErrors maps backend clientFullName to the visible first name field", () => {
  const error = new Error("Nombre obligatorio");
  error.details = { field: "clientFullName" };

  assert.deepEqual(
    appointmentErrorToFieldErrors(error),
    { clientFirstName: ["Nombre obligatorio"] }
  );
});

test("appointmentErrorToFieldErrors preserves explicit backend field errors", () => {
  const error = new Error("Apellido obligatorio");
  error.details = { field: "clientLastName" };

  assert.deepEqual(
    appointmentErrorToFieldErrors(error),
    { clientLastName: ["Apellido obligatorio"] }
  );
});

test("appointmentErrorToFieldErrors maps HTTP 409 to startsAt", () => {
  const error = new Error("Horario ocupado");
  error.status = 409;

  assert.deepEqual(
    appointmentErrorToFieldErrors(error),
    { startsAt: ["Horario ocupado"] }
  );
});

test("appointmentErrorToFieldErrors maps SLOT_OCCUPIED to startsAt", () => {
  const error = new Error("Slot ocupado");
  error.code = "SLOT_OCCUPIED";

  assert.deepEqual(
    appointmentErrorToFieldErrors(error),
    { startsAt: ["Slot ocupado"] }
  );
});

test("appointmentErrorToFieldErrors maps unknown errors to the form message", () => {
  assert.deepEqual(
    appointmentErrorToFieldErrors(new Error("Error inesperado")),
    { form: ["Error inesperado"] }
  );
});
