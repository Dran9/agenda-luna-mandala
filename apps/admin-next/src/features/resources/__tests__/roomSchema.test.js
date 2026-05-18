import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateRoomForm, parseUpdateRoomForm } from "../roomSchema.js";

const validForm = {
  name: "Sala Norte",
  capacity: "2",
  camilla: "on",
  mesa: "on"
};

test("parseCreateRoomForm accepts room creation fields", () => {
  const parsed = parseCreateRoomForm(validForm);

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.name, "Sala Norte");
  assert.equal(parsed.data.capacity, 2);
});

test("parseCreateRoomForm requires name and bounded capacity", () => {
  const parsed = parseCreateRoomForm({ ...validForm, name: "", capacity: "0" });

  assert.equal(parsed.success, false);
  assert.equal(parsed.error.flatten().fieldErrors.name[0], "Nombre obligatorio");
  assert.equal(parsed.error.flatten().fieldErrors.capacity[0], "Capacidad minima 1");
});

test("parseCreateRoomForm rejects non-integer capacity", () => {
  const parsed = parseCreateRoomForm({ ...validForm, capacity: "1.5" });

  assert.equal(parsed.success, false);
  assert.equal(parsed.error.flatten().fieldErrors.capacity[0], "Capacidad invalida");
});

test("parseUpdateRoomForm requires an active flag", () => {
  const parsed = parseUpdateRoomForm({ ...validForm, isActive: "false" });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.isActive, "false");
});
