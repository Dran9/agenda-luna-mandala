const assert = require("node:assert/strict");
const test = require("node:test");

const {
  paymentStatusLabel,
  paymentStatusToApi,
  paymentStatusToDb
} = require("../server/services/paymentStatus");

test("payment status maps API canceled to existing DB cancelled", () => {
  assert.equal(paymentStatusToDb("canceled"), "cancelled");
  assert.equal(paymentStatusToApi("cancelled"), "canceled");
});

test("payment status label uses Anulado for canceled to avoid payment wording ambiguity", () => {
  assert.equal(paymentStatusLabel("cancelled"), "Anulado");
  assert.equal(paymentStatusLabel("canceled"), "Anulado");
});

test("payment status mapping rejects unknown values", () => {
  assert.throws(() => paymentStatusToDb("requested"), /Estado de pago invalido/);
  assert.throws(() => paymentStatusToApi("requested"), /Estado de pago invalido/);
});
