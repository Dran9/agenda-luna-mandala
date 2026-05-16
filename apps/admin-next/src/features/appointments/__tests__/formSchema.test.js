import assert from "node:assert/strict";
import test from "node:test";

import { parseManualAppointmentForm } from "../formSchema.js";

const validForm = {
  serviceId: "service-1",
  clientFirstName: "Maria",
  clientLastName: "Gonzalez",
  phoneE164: "59171234567",
  therapistId: "",
  roomId: "",
  startsAt: "2026-05-18T09:00"
};

test("parseManualAppointmentForm accepts the manual appointment fields", () => {
  const parsed = parseManualAppointmentForm(validForm);

  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.data, validForm);
});

test("parseManualAppointmentForm requires a service", () => {
  const parsed = parseManualAppointmentForm({ ...validForm, serviceId: "" });

  assert.equal(parsed.success, false);
  assert.equal(parsed.error.flatten().fieldErrors.serviceId[0], "Servicio obligatorio");
});

test("parseManualAppointmentForm requires the client name, last name and WhatsApp", () => {
  const parsed = parseManualAppointmentForm({
    ...validForm,
    clientFirstName: "",
    clientLastName: "",
    phoneE164: ""
  });

  assert.equal(parsed.success, false);
  assert.equal(parsed.error.flatten().fieldErrors.clientFirstName[0], "Nombre obligatorio");
  assert.equal(parsed.error.flatten().fieldErrors.clientLastName[0], "Apellido obligatorio");
  assert.equal(parsed.error.flatten().fieldErrors.phoneE164[0], "WhatsApp obligatorio");
});

test("parseManualAppointmentForm requires the start date and time", () => {
  const parsed = parseManualAppointmentForm({ ...validForm, startsAt: "" });

  assert.equal(parsed.success, false);
  assert.equal(parsed.error.flatten().fieldErrors.startsAt[0], "Fecha y hora obligatoria");
});
