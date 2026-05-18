import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentSummaryLabel,
  appointmentHistoryLabel,
  clientContact,
  clientDetailFromPayload,
  clientDisplayName,
  clientOnboardingLabel,
  clientOnboardingTone,
  clientProfileRows,
  clientSummary,
  clientStatsRows,
  clientsForAdmin,
  clientsRefreshLabel,
  paymentSummaryLabel
} from "../clientUtils.js";

const clients = [
  { id: 1, fullName: "Ana Solar", whatsapp: "59177777777", onboardingComplete: true },
  { id: 2, firstName: "Luz", lastName: "Norte", onboardingComplete: false }
];

test("clientsForAdmin reads admin client payloads", () => {
  assert.deepEqual(clientsForAdmin({ clients }), clients);
  assert.deepEqual(clientsForAdmin({}), []);
});

test("clientDetailFromPayload reads selected client detail", () => {
  assert.deepEqual(clientDetailFromPayload({ client: clients[0] }), clients[0]);
  assert.equal(clientDetailFromPayload({}), null);
});

test("clientSummary counts total and complete profiles", () => {
  assert.deepEqual(clientSummary({ clients }), {
    total: 2,
    complete: 1
  });
});

test("client display helpers keep table cells compact", () => {
  assert.equal(clientDisplayName(clients[0]), "Ana Solar");
  assert.equal(clientDisplayName(clients[1]), "Luz Norte");
  assert.equal(clientContact(clients[1]), "-");
  assert.equal(clientOnboardingLabel(clients[0]), "Completo");
  assert.equal(clientOnboardingTone(clients[1]), "pending");
});

test("appointmentSummaryLabel returns a readable next appointment", () => {
  assert.match(
    appointmentSummaryLabel({ startsAt: "2026-05-16T15:00:00.000Z", serviceName: "Masaje" }),
    /Masaje/
  );
  assert.equal(appointmentSummaryLabel(null), "-");
});

test("appointmentHistoryLabel renders appointment status labels", () => {
  assert.equal(
    appointmentHistoryLabel({ serviceName: "Masaje", status: "no_show" }),
    "Masaje · No asistió"
  );
  assert.equal(appointmentHistoryLabel(null), "-");
});

test("clientProfileRows exposes read-only drawer profile fields", () => {
  const rows = clientProfileRows({
    fullName: "Ana Solar",
    whatsapp: "59177777777",
    age: 34,
    city: "La Paz",
    source: "Instagram",
    createdAt: "2026-05-16T15:00:00.000Z",
    onboardingCompletedAt: null
  });

  assert.deepEqual(rows.slice(0, 5), [
    ["Nombre", "Ana Solar"],
    ["WhatsApp", "59177777777"],
    ["Edad", 34],
    ["Ciudad", "La Paz"],
    ["Origen", "Instagram"]
  ]);
  assert.deepEqual(rows[6], ["Ficha completa", "-"]);
});

test("clientStatsRows keeps appointment breakdown compact", () => {
  assert.deepEqual(
    clientStatsRows({ totalAppointments: 4, pendingCount: 1, completedCount: 2 }),
    [
      ["Total", 4],
      ["Pendientes", 1],
      ["Confirmadas", 0],
      ["Completadas", 2],
      ["Canceladas", 0],
      ["No asistió", 0]
    ]
  );
});

test("paymentSummaryLabel summarizes read-only payment rows", () => {
  assert.match(
    paymentSummaryLabel({
      amount: 120,
      status: "approved",
      appointment: { startsAt: "2026-05-16T15:00:00.000Z" }
    }),
    /Aprobado/
  );
  assert.equal(paymentSummaryLabel(null), "-");
});

test("clientsRefreshLabel separates initial and background states", () => {
  assert.equal(clientsRefreshLabel({ isFetching: true, isLoading: false }), "Actualizando");
  assert.equal(clientsRefreshLabel({ isFetching: false, isLoading: false, dataUpdatedAt: 0 }), "Sin datos");
});
