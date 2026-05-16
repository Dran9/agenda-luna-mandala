import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateTherapistForm, parseUpdateTherapistForm } from "../therapistSchema.js";

const validForm = {
  fullName: "Ana Solar",
  displayName: "Ana",
  phone: "77777777",
  telegramChatId: "12345"
};

test("parseCreateTherapistForm accepts therapist profile fields", () => {
  const parsed = parseCreateTherapistForm(validForm);

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.fullName, "Ana Solar");
});

test("parseCreateTherapistForm requires fullName", () => {
  const parsed = parseCreateTherapistForm({ ...validForm, fullName: "" });

  assert.equal(parsed.success, false);
  assert.equal(parsed.error.flatten().fieldErrors.fullName[0], "Nombre obligatorio");
});

test("parseUpdateTherapistForm requires status", () => {
  const parsed = parseUpdateTherapistForm({ ...validForm, isActive: "false" });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.isActive, "false");
});
