import assert from "node:assert/strict";
import test from "node:test";

import { clientDetailPath, clientsPath } from "../apiPaths.js";

test("clientsPath targets the admin client list", () => {
  const url = new URL(clientsPath(), "http://local.test");

  assert.equal(url.pathname, "/api/admin/clients");
  assert.equal(url.searchParams.get("onboarding"), "all");
  assert.equal(url.searchParams.get("limit"), "100");
});

test("clientsPath applies compact toolbar filters", () => {
  const url = new URL(clientsPath({ onboarding: "complete", q: "ana" }), "http://local.test");

  assert.equal(url.searchParams.get("onboarding"), "complete");
  assert.equal(url.searchParams.get("q"), "ana");
});

test("clientDetailPath targets client details", () => {
  assert.equal(clientDetailPath(9), "/api/admin/clients/9");
});
