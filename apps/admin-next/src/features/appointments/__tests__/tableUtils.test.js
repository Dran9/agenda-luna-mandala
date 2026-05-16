import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentClientName,
  appointmentClientWhatsapp,
  appointmentRoomName,
  appointmentServiceName,
  appointmentStatusLabel,
  appointmentTherapistName,
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

test("appointment table accessors read nested backend fields", () => {
  const appointment = {
    client: { fullName: "Maria Gonzalez", whatsapp: "59171234567" },
    service: { name: "Masaje" },
    therapist: { name: "Ana" },
    room: { name: "Sala 1" }
  };

  assert.equal(appointmentClientName(appointment), "Maria Gonzalez");
  assert.equal(appointmentClientWhatsapp(appointment), "59171234567");
  assert.equal(appointmentServiceName(appointment), "Masaje");
  assert.equal(appointmentTherapistName(appointment), "Ana");
  assert.equal(appointmentRoomName(appointment), "Sala 1");
});

test("appointment table accessors return compact placeholders for missing fields", () => {
  const appointment = {};

  assert.equal(appointmentClientName(appointment), "-");
  assert.equal(appointmentClientWhatsapp(appointment), "-");
  assert.equal(appointmentServiceName(appointment), "-");
  assert.equal(appointmentTherapistName(appointment), "-");
  assert.equal(appointmentRoomName(appointment), "-");
});
