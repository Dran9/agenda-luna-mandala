import assert from "node:assert/strict";
import test from "node:test";

import { serviceErrorToFieldErrors } from "../serviceErrors.js";

test("serviceErrorToFieldErrors maps backend field errors", () => {
  assert.deepEqual(
    serviceErrorToFieldErrors({
      message: "Duracion invalida",
      details: { field: "durationMinutes" }
    }),
    { durationMinutes: ["Duracion invalida"] }
  );
});

test("serviceErrorToFieldErrors falls back to form errors", () => {
  assert.deepEqual(
    serviceErrorToFieldErrors({ message: "No se pudo crear" }),
    { form: ["No se pudo crear"] }
  );
});
