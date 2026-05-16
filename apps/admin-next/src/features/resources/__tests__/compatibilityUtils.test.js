import assert from "node:assert/strict";
import test from "node:test";

import {
  compatibilitiesForSettings,
  filterCompatibilityRows,
  compatibilityRowsForService,
  compatibilitySummary,
  selectedServiceIdForCompatibility
} from "../compatibilityUtils.js";

const payload = {
  settings: {
    compatibilities: [
      { id: "1-10", serviceId: 1, roomId: 10, status: "ACTIVE" },
      { id: "1-11", serviceId: 1, roomId: 11, status: "INACTIVE" }
    ]
  }
};

test("compatibilitiesForSettings reads compatibility settings", () => {
  assert.deepEqual(compatibilitiesForSettings(payload), payload.settings.compatibilities);
  assert.deepEqual(compatibilitiesForSettings({}), []);
});

test("compatibilitySummary counts total and active compatibilities", () => {
  assert.deepEqual(compatibilitySummary(payload), {
    total: 2,
    active: 1
  });
});

test("compatibilityRowsForService maps rooms to toggle rows", () => {
  assert.deepEqual(
    compatibilityRowsForService({
      serviceId: 1,
      rooms: [
        { id: 10, name: "Sala Norte", status: "ACTIVE", capacityLabel: "2 personas", featuresLabel: "Camilla" },
        { id: 12, name: "Sala Sur", status: "ACTIVE", capacityLabel: "1 persona", featuresLabel: "-" }
      ],
      compatibilities: payload.settings.compatibilities
    }),
    [
      {
        id: "1-10",
        roomId: 10,
        roomName: "Sala Norte",
        roomStatus: "ACTIVE",
        capacityLabel: "2 personas",
        featuresLabel: "Camilla",
        isActive: true
      },
      {
        id: "1-12",
        roomId: 12,
        roomName: "Sala Sur",
        roomStatus: "ACTIVE",
        capacityLabel: "1 persona",
        featuresLabel: "-",
        isActive: false
      }
    ]
  );
});

test("filterCompatibilityRows applies a compact local query", () => {
  assert.deepEqual(
    filterCompatibilityRows([
      { id: "1-10", roomName: "Sala Norte", featuresLabel: "Camilla" },
      { id: "1-11", roomName: "Sala Sur", featuresLabel: "Mesa" }
    ], "mesa"),
    [{ id: "1-11", roomName: "Sala Sur", featuresLabel: "Mesa" }]
  );
});

test("selectedServiceIdForCompatibility falls back to the first service", () => {
  const services = [{ id: 5 }, { id: 6 }];

  assert.equal(selectedServiceIdForCompatibility({ requestedServiceId: "6", services }), 6);
  assert.equal(selectedServiceIdForCompatibility({ requestedServiceId: "99", services }), 5);
  assert.equal(selectedServiceIdForCompatibility({ requestedServiceId: "", services: [] }), "");
});
