import assert from "node:assert/strict";
import test from "node:test";

import { therapistPath, therapistsPath } from "../apiPaths.js";

test("therapistsPath targets the admin therapist list", () => {
  const url = new URL(therapistsPath(), "http://local.test");

  assert.equal(url.pathname, "/api/admin/therapists");
  assert.equal(url.searchParams.get("status"), "all");
  assert.equal(url.searchParams.get("limit"), "100");
});

test("therapistsPath applies compact toolbar filters", () => {
  const url = new URL(therapistsPath({ q: "ana", status: "active" }), "http://local.test");

  assert.equal(url.searchParams.get("q"), "ana");
  assert.equal(url.searchParams.get("status"), "active");
});

test("therapistPath targets profile updates", () => {
  assert.equal(therapistPath(8), "/api/admin/therapists/8");
});
