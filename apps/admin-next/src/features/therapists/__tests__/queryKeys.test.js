import assert from "node:assert/strict";
import test from "node:test";

import { activeTherapistsKey, adminTherapistsBaseKey, adminTherapistsKey } from "../queryKeys.js";

test("adminTherapistsBaseKey invalidates all admin therapist filters", () => {
  assert.deepEqual(adminTherapistsBaseKey(), ["therapists", "admin"]);
});

test("adminTherapistsKey scopes the full admin therapist list", () => {
  assert.deepEqual(adminTherapistsKey(), ["therapists", "admin", { q: "", status: "all" }]);
});

test("adminTherapistsKey scopes filter variants", () => {
  assert.deepEqual(
    adminTherapistsKey({ q: " ana ", status: "active" }),
    ["therapists", "admin", { q: "ana", status: "active" }]
  );
});

test("activeTherapistsKey matches the appointment modal cache", () => {
  assert.deepEqual(activeTherapistsKey(), ["therapists", "active"]);
});
