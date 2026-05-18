import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreateRoomPayload,
  buildUpdateRoomPayload,
  filterRooms,
  resourcesRefreshLabel,
  roomsForSettings,
  roomSummary
} from "../roomUtils.js";

const payload = {
  settings: {
    rooms: [
      { id: 1, name: "Sala Fenix", status: "ACTIVE" },
      { id: 2, name: "Sala Sur", status: "INACTIVE" }
    ]
  }
};

test("roomsForSettings reads rooms from resources settings payload", () => {
  assert.deepEqual(roomsForSettings(payload), payload.settings.rooms);
  assert.deepEqual(roomsForSettings({}), []);
});

test("roomSummary counts total and active rooms", () => {
  assert.deepEqual(roomSummary(payload), {
    total: 2,
    active: 1
  });
});

test("filterRooms applies a compact local query", () => {
  assert.deepEqual(
    filterRooms([
      { id: 1, name: "Sala Norte", featuresLabel: "Camilla" },
      { id: 2, name: "Sala Sur", featuresLabel: "Mesa" }
    ], "sur"),
    [{ id: 2, name: "Sala Sur", featuresLabel: "Mesa" }]
  );
});

test("buildCreateRoomPayload maps checkbox fields to featureKeys", () => {
  assert.deepEqual(
    buildCreateRoomPayload({ name: " Sala Norte ", capacity: 2, camilla: "on", mesa: undefined }),
    { name: "Sala Norte", capacity: 2, featureKeys: ["camilla"] }
  );
});

test("buildUpdateRoomPayload maps active status to boolean", () => {
  assert.deepEqual(
    buildUpdateRoomPayload({ name: "Sala Norte", capacity: "2", camilla: "on", isActive: "false" }),
    { name: "Sala Norte", capacity: 2, featureKeys: ["camilla"], isActive: false }
  );
});

test("resourcesRefreshLabel separates initial and background states", () => {
  assert.equal(resourcesRefreshLabel({ isFetching: true, isLoading: false }), "Actualizando");
  assert.equal(resourcesRefreshLabel({ isFetching: false, isLoading: false, dataUpdatedAt: 0 }), "Sin datos");
});
