import assert from "node:assert/strict";
import test from "node:test";

import { therapistErrorToFieldErrors } from "../therapistErrors.js";

test("therapistErrorToFieldErrors maps backend field errors", () => {
  assert.deepEqual(
    therapistErrorToFieldErrors({
      message: "Nombre requerido",
      details: { field: "fullName" }
    }),
    { fullName: ["Nombre requerido"] }
  );
});

test("therapistErrorToFieldErrors falls back to form errors", () => {
  assert.deepEqual(
    therapistErrorToFieldErrors({ message: "No se pudo crear" }),
    { form: ["No se pudo crear"] }
  );
});
