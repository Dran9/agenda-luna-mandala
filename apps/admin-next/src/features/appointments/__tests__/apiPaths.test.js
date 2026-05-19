import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentDetailPath,
  appointmentPaymentsPath,
  appointmentRoomPath,
  appointmentsPath,
  appointmentStatusPath,
  paymentApprovePath,
  paymentCancelPath,
  paymentRejectPath,
  paymentSubmitPath,
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

test("appointment detail paths target the selected appointment", () => {
  assert.equal(appointmentDetailPath(42), "/api/admin/appointments/42");
  assert.equal(appointmentStatusPath(42), "/api/admin/appointments/42/status");
  assert.equal(appointmentRoomPath(42), "/api/admin/appointments/42/room");
  assert.equal(appointmentPaymentsPath(42), "/api/admin/appointments/42/payments");
});

test("payment action paths target manual payment endpoints", () => {
  assert.equal(paymentSubmitPath(9), "/api/admin/payments/9/submit");
  assert.equal(paymentApprovePath(9), "/api/admin/payments/9/approve");
  assert.equal(paymentRejectPath(9), "/api/admin/payments/9/reject");
  assert.equal(paymentCancelPath(9), "/api/admin/payments/9/cancel");
});

test("therapistsPath targets active therapist options", () => {
  const url = new URL(therapistsPath(), "http://local.test");

  assert.equal(url.pathname, "/api/admin/therapists");
  assert.equal(url.searchParams.get("status"), "active");
  assert.equal(url.searchParams.get("limit"), "100");
});
