import assert from "node:assert/strict";
import test from "node:test";

import { roomErrorToFieldErrors } from "../roomErrors.js";

test("roomErrorToFieldErrors maps backend field errors", () => {
  assert.deepEqual(
    roomErrorToFieldErrors({ message: "Nombre obligatorio", details: { field: "name" } }),
    { name: ["Nombre obligatorio"] }
  );
});

test("roomErrorToFieldErrors falls back to form errors", () => {
  assert.deepEqual(
    roomErrorToFieldErrors({ message: "No se pudo guardar" }),
    { form: ["No se pudo guardar"] }
  );
});
