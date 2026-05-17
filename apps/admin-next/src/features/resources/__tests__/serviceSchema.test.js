import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateServiceForm, parseUpdateServiceForm } from "../serviceSchema.js";

const validForm = {
  name: "Masaje relajante",
  durationMinutes: "60",
  priceAmount: "120",
  camilla: "on"
};

test("parseCreateServiceForm accepts service creation fields", () => {
  const parsed = parseCreateServiceForm(validForm);

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.name, "Masaje relajante");
  assert.equal(parsed.data.durationMinutes, 60);
  assert.equal(parsed.data.priceAmount, 120);
});

test("parseCreateServiceForm defaults empty price to zero", () => {
  const parsed = parseCreateServiceForm({ ...validForm, priceAmount: "" });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.priceAmount, 0);
});

test("parseCreateServiceForm requires name and bounded duration", () => {
  const parsed = parseCreateServiceForm({ ...validForm, name: "", durationMinutes: "5" });

  assert.equal(parsed.success, false);
  assert.equal(parsed.error.flatten().fieldErrors.name[0], "Nombre obligatorio");
  assert.equal(parsed.error.flatten().fieldErrors.durationMinutes[0], "Duración mínima 15");
});

test("parseUpdateServiceForm requires an active flag", () => {
  const parsed = parseUpdateServiceForm({ ...validForm, isActive: "false" });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.isActive, "false");
});
