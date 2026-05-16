import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultStartsAt,
  emptyToNull,
  formatPhoneDisplay,
  normalizePhone,
  toIsoDateTime
} from "../formUtils.js";

test("defaultStartsAt uses the selected control date at 09:00", () => {
  assert.equal(defaultStartsAt("2026-05-18"), "2026-05-18T09:00");
  assert.equal(defaultStartsAt(""), "");
});

test("normalizePhone keeps the backend payload digits-only", () => {
  assert.equal(normalizePhone("591 7123 4567"), "59171234567");
  assert.equal(normalizePhone("+591-712-34567"), "59171234567");
});

test("normalizePhone rejects impossible E.164 lengths", () => {
  assert.throws(
    () => normalizePhone("123"),
    /WhatsApp debe tener entre 7 y 15 digitos/
  );
});

test("formatPhoneDisplay groups Bolivian numbers without changing digits", () => {
  assert.equal(formatPhoneDisplay("59171234567"), "591 7123 4567");
  assert.equal(formatPhoneDisplay("+591 7123-4567"), "591 7123 4567");
});

test("emptyToNull preserves optional appointment fields", () => {
  assert.equal(emptyToNull("14"), "14");
  assert.equal(emptyToNull(""), null);
});

test("toIsoDateTime maps datetime-local values to ISO startsAt", () => {
  assert.match(toIsoDateTime("2026-05-18T09:00"), /^2026-05-18T/);
});
