import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentSummaryLabel,
  clientContact,
  clientDetailFromPayload,
  clientDisplayName,
  clientOnboardingLabel,
  clientOnboardingTone,
  clientSummary,
  clientsForAdmin,
  clientsRefreshLabel
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

test("clientsRefreshLabel separates initial and background states", () => {
  assert.equal(clientsRefreshLabel({ isFetching: true, isLoading: false }), "Actualizando");
  assert.equal(clientsRefreshLabel({ isFetching: false, isLoading: false, dataUpdatedAt: 0 }), "Sin datos");
});
