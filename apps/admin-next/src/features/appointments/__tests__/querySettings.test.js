import assert from "node:assert/strict";
import test from "node:test";

import {
  APPOINTMENT_OPTIONS_STALE_TIME_MS,
  APPOINTMENTS_REFETCH_INTERVAL_MS
} from "../querySettings.js";

test("appointments refetch interval keeps control fresh without reloads", () => {
  assert.equal(APPOINTMENTS_REFETCH_INTERVAL_MS, 30_000);
});

test("appointment option queries reuse modal options briefly", () => {
  assert.equal(APPOINTMENT_OPTIONS_STALE_TIME_MS, 60_000);
});
