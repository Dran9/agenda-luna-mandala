import assert from "node:assert/strict";
import test from "node:test";

import {
  roomOptions,
  serviceOptions,
  therapistOptions
} from "../options.js";

test("serviceOptions reads services from resources settings", () => {
  const services = [{ id: "service-1", name: "Masaje" }];

  assert.deepEqual(serviceOptions({ settings: { services } }), services);
});

test("roomOptions reads rooms from resources settings", () => {
  const rooms = [{ id: "room-1", name: "Sala 1" }];

  assert.deepEqual(roomOptions({ settings: { rooms } }), rooms);
});

test("therapistOptions reads active therapist options", () => {
  const therapists = [{ id: "therapist-1", displayName: "Ana" }];

  assert.deepEqual(therapistOptions({ therapists }), therapists);
});

test("option helpers fall back to empty arrays while queries load", () => {
  assert.deepEqual(serviceOptions(undefined), []);
  assert.deepEqual(roomOptions(undefined), []);
  assert.deepEqual(therapistOptions(undefined), []);
});
