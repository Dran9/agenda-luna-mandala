import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentDetailFromPayload,
  detailValue,
  roomChangeAllowed,
  roomOptionsForAppointment,
  statusActionsForAppointment
} from "../detailUtils.js";

test("appointmentDetailFromPayload reads the selected appointment detail", () => {
  const appointment = { id: 42 };

  assert.equal(appointmentDetailFromPayload({ appointment }), appointment);
  assert.equal(appointmentDetailFromPayload(null), null);
});

test("statusActionsForAppointment exposes allowed pending actions", () => {
  assert.deepEqual(
    statusActionsForAppointment({ status: "pending" }).map((action) => action.status),
    ["confirmed", "completed", "cancelled", "no_show"]
  );
});

test("statusActionsForAppointment exposes allowed confirmed actions", () => {
  assert.deepEqual(
    statusActionsForAppointment({ status: "confirmed" }).map((action) => action.status),
    ["completed", "cancelled", "no_show"]
  );
});

test("statusActionsForAppointment hides actions for terminal statuses", () => {
  assert.deepEqual(statusActionsForAppointment({ status: "completed" }), []);
  assert.deepEqual(statusActionsForAppointment(null), []);
});

test("detailValue keeps drawer fields compact", () => {
  assert.equal(detailValue("ABC123"), "ABC123");
  assert.equal(detailValue(""), "-");
});

test("roomChangeAllowed follows backend mutable statuses", () => {
  assert.equal(roomChangeAllowed({ status: "pending" }), true);
  assert.equal(roomChangeAllowed({ status: "confirmed" }), true);
  assert.equal(roomChangeAllowed({ status: "completed" }), false);
});

test("roomOptionsForAppointment reads backend room options", () => {
  const roomOptions = [{ id: 1, name: "Sala 1" }];

  assert.equal(roomOptionsForAppointment({ roomOptions }), roomOptions);
  assert.deepEqual(roomOptionsForAppointment(null), []);
});
