import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentDetailFromPayload,
  activePaymentForAppointment,
  detailValue,
  latestPaymentForAppointment,
  paymentActionState,
  paymentAmountLabel,
  paymentStatusLabel,
  paymentStatusTone,
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

test("payment helpers expose active payment and latest row", () => {
  const rejected = { id: 1, status: "rejected" };
  const pending = { id: 2, status: "pending" };
  const appointment = { payments: [rejected, pending] };

  assert.equal(latestPaymentForAppointment(appointment), rejected);
  assert.equal(activePaymentForAppointment(appointment), pending);
});

test("payment helpers localize canceled as Anulado", () => {
  assert.equal(paymentStatusLabel("canceled"), "Anulado");
  assert.equal(paymentStatusLabel("cancelled"), "Anulado");
  assert.equal(paymentStatusTone("canceled"), "cancelled");
});

test("paymentAmountLabel formats BOB snapshots", () => {
  assert.match(paymentAmountLabel({ amount: 250, currencyCode: "BOB" }), /250/);
  assert.equal(paymentAmountLabel(null), "-");
});

test("paymentActionState follows C0 manual state machine", () => {
  assert.equal(paymentActionState(null), "create");
  assert.equal(paymentActionState({ status: "pending" }), "submit");
  assert.equal(paymentActionState({ status: "rejected" }), "submit");
  assert.equal(paymentActionState({ status: "submitted" }), "review");
  assert.equal(paymentActionState({ status: "approved" }), "readonly");
});
