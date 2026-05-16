import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentDetailKey,
  appointmentsKey,
  resourcesKey,
  therapistsKey
} from "../queryKeys.js";

test("appointmentsKey scopes cached appointments by control date", () => {
  assert.deepEqual(appointmentsKey("2026-05-18"), ["appointments", "2026-05-18"]);
});

test("appointmentDetailKey scopes the selected drawer appointment", () => {
  assert.deepEqual(appointmentDetailKey(42), ["appointments", "detail", 42]);
});

test("resourcesKey keeps service and room options in one shared cache entry", () => {
  assert.deepEqual(resourcesKey(), ["resources"]);
});

test("therapistsKey scopes the modal options to active therapists", () => {
  assert.deepEqual(therapistsKey(), ["therapists", "active"]);
});
