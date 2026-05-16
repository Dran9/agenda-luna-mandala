import assert from "node:assert/strict";
import test from "node:test";

import {
  compatibilityPath,
  resourcesPath,
  roomPath,
  roomsPath,
  servicePath,
  servicesPath
} from "../apiPaths.js";

test("resourcesPath targets admin resources settings", () => {
  assert.equal(resourcesPath(), "/api/admin/resources");
});

test("roomsPath targets room creation", () => {
  assert.equal(roomsPath(), "/api/admin/resources/rooms");
});

test("roomPath targets room updates", () => {
  assert.equal(roomPath(42), "/api/admin/resources/rooms/42");
});

test("servicesPath targets service creation", () => {
  assert.equal(servicesPath(), "/api/admin/resources/services");
});

test("servicePath targets service updates", () => {
  assert.equal(servicePath(42), "/api/admin/resources/services/42");
});

test("compatibilityPath targets service room compatibility updates", () => {
  assert.equal(compatibilityPath(4, 9), "/api/admin/resources/compatibilities/4/9");
});
