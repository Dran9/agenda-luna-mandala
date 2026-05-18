import assert from "node:assert/strict";
import test from "node:test";

import { firstFieldError } from "../formErrors.js";

test("firstFieldError returns the first zod field error", () => {
  assert.equal(
    firstFieldError({ startsAt: ["Horario ocupado", "Segundo error"] }, "startsAt"),
    "Horario ocupado"
  );
});

test("firstFieldError returns plain string form errors", () => {
  assert.equal(firstFieldError({ form: "No se pudo crear la cita." }, "form"), "No se pudo crear la cita.");
});

test("firstFieldError returns an empty string for missing errors", () => {
  assert.equal(firstFieldError({}, "serviceId"), "");
  assert.equal(firstFieldError(null, "serviceId"), "");
});
