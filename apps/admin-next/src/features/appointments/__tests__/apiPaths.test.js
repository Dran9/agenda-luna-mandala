import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentsPath,
  resourcesPath,
  therapistsPath
} from "../apiPaths.js";

test("appointmentsPath requests the selected day with dense table limits", () => {
  const url = new URL(appointmentsPath({ date: "2026-05-18" }), "http://local.test");

  assert.equal(url.pathname, "/api/admin/appointments");
  assert.equal(url.searchParams.get("date"), "2026-05-18");
  assert.equal(url.searchParams.get("upcoming"), "0");
  assert.equal(url.searchParams.get("limit"), "80");
});

test("appointmentsPath omits empty date filters without changing table defaults", () => {
  const url = new URL(appointmentsPath({ date: "" }), "http://local.test");

  assert.equal(url.searchParams.has("date"), false);
  assert.equal(url.searchParams.get("upcoming"), "0");
  assert.equal(url.searchParams.get("limit"), "80");
});

test("resourcesPath targets service and room options", () => {
  assert.equal(resourcesPath(), "/api/admin/resources");
});

test("therapistsPath targets active therapist options", () => {
  const url = new URL(therapistsPath(), "http://local.test");

  assert.equal(url.pathname, "/api/admin/therapists");
  assert.equal(url.searchParams.get("status"), "active");
  assert.equal(url.searchParams.get("limit"), "100");
});
