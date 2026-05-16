import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreateTherapistPayload,
  buildUpdateTherapistPayload,
  therapistSummary,
  therapistsForSettings,
  therapistsRefreshLabel
} from "../therapistUtils.js";

const payload = {
  therapists: [
    { id: 1, displayName: "Ana", status: "ACTIVE" },
    { id: 2, displayName: "Sol", status: "INACTIVE" }
  ]
};

test("therapistsForSettings reads therapist payloads", () => {
  assert.deepEqual(therapistsForSettings(payload), payload.therapists);
  assert.deepEqual(therapistsForSettings({}), []);
});

test("therapistSummary counts total and active therapists", () => {
  assert.deepEqual(therapistSummary(payload), {
    total: 2,
    active: 1
  });
});

test("buildCreateTherapistPayload trims profile values", () => {
  assert.deepEqual(
    buildCreateTherapistPayload({
      fullName: " Ana Solar ",
      displayName: "",
      phone: " 77777777 ",
      telegramChatId: ""
    }),
    {
      fullName: "Ana Solar",
      displayName: null,
      phone: "77777777",
      telegramChatId: null,
      isActive: true
    }
  );
});

test("buildUpdateTherapistPayload maps active status to boolean", () => {
  assert.deepEqual(
    buildUpdateTherapistPayload({
      fullName: "Ana Solar",
      displayName: "Ana",
      phone: "",
      telegramChatId: "",
      isActive: "false"
    }),
    {
      fullName: "Ana Solar",
      displayName: "Ana",
      phone: null,
      telegramChatId: null,
      isActive: false
    }
  );
});

test("therapistsRefreshLabel separates initial and background states", () => {
  assert.equal(therapistsRefreshLabel({ isFetching: true, isLoading: false }), "Actualizando");
  assert.equal(therapistsRefreshLabel({ isFetching: false, isLoading: false, dataUpdatedAt: 0 }), "Sin datos");
});
