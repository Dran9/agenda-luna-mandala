import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreateTherapistPayload,
  buildUpdateTherapistPayload,
  serviceAssignmentRows,
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

test("serviceAssignmentRows maps drawer services to checkbox rows", () => {
  assert.deepEqual(
    serviceAssignmentRows({
      availableServices: [
        {
          id: 4,
          name: "Masaje",
          durationMinutes: 60,
          relationIsActive: 1,
          serviceStatus: "ACTIVE",
          serviceStatusLabel: "Activo"
        },
        {
          id: 5,
          name: "Reiki",
          durationMinutes: 45,
          relationIsActive: 0,
          isActive: false
        }
      ]
    }),
    [
      {
        id: 4,
        name: "Masaje",
        durationLabel: "60 min",
        isAssigned: true,
        isServiceActive: true,
        statusLabel: "Activo"
      },
      {
        id: 5,
        name: "Reiki",
        durationLabel: "45 min",
        isAssigned: false,
        isServiceActive: false,
        statusLabel: "Servicio inactivo"
      }
    ]
  );
});

test("therapistsRefreshLabel separates initial and background states", () => {
  assert.equal(therapistsRefreshLabel({ isFetching: true, isLoading: false }), "Actualizando");
  assert.equal(therapistsRefreshLabel({ isFetching: false, isLoading: false, dataUpdatedAt: 0 }), "Sin datos");
});
