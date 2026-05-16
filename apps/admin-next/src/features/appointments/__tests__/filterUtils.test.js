import assert from "node:assert/strict";
import test from "node:test";

import {
  ALL_FILTER_VALUE,
  filterAppointments,
  resourceFilterOptions,
  STATUS_FILTER_OPTIONS
} from "../filterUtils.js";

const appointments = [
  {
    id: 1,
    status: "pending",
    therapist: { id: 10, name: "Ana" },
    room: { id: 20, name: "Sala 1" }
  },
  {
    id: 2,
    status: "confirmed",
    therapist: { id: 11, name: "Ruth" },
    room: { id: 20, name: "Sala 1" }
  }
];

test("STATUS_FILTER_OPTIONS includes the compact all option", () => {
  assert.equal(STATUS_FILTER_OPTIONS[0].value, ALL_FILTER_VALUE);
});

test("resourceFilterOptions builds unique resource options", () => {
  assert.deepEqual(
    resourceFilterOptions(appointments, (appointment) => appointment.room, "Todas"),
    [
      { value: "all", label: "Todas" },
      { value: "20", label: "Sala 1" }
    ]
  );
});

test("filterAppointments applies status, therapist and room filters", () => {
  assert.deepEqual(
    filterAppointments(appointments, {
      status: "pending",
      therapistId: "10",
      roomId: "20"
    }).map((appointment) => appointment.id),
    [1]
  );
});

test("filterAppointments keeps all rows for all filters", () => {
  assert.equal(
    filterAppointments(appointments, {
      status: "all",
      therapistId: "all",
      roomId: "all"
    }).length,
    2
  );
});
