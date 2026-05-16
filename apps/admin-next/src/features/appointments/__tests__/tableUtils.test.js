import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentStatusLabel,
  formatAppointmentTime
} from "../tableUtils.js";

test("appointmentStatusLabel maps known backend statuses", () => {
  assert.equal(appointmentStatusLabel("pending"), "Pendiente");
  assert.equal(appointmentStatusLabel("confirmed"), "Confirmada");
  assert.equal(appointmentStatusLabel("completed"), "Completada");
  assert.equal(appointmentStatusLabel("no_show"), "No asistio");
});

test("appointmentStatusLabel preserves unknown non-empty statuses", () => {
  assert.equal(appointmentStatusLabel("rescheduled"), "rescheduled");
});

test("appointmentStatusLabel returns dash for empty statuses", () => {
  assert.equal(appointmentStatusLabel(""), "-");
  assert.equal(appointmentStatusLabel(null), "-");
});

test("formatAppointmentTime returns a compact local time", () => {
  assert.match(formatAppointmentTime("2026-05-16T13:00:00.000Z"), /\d{2}:\d{2}/);
});

test("formatAppointmentTime returns placeholder for empty values", () => {
  assert.equal(formatAppointmentTime(""), "--:--");
});
