import assert from "node:assert/strict";
import test from "node:test";

import { clientDetailKey, clientsKey } from "../queryKeys.js";

test("clientsKey scopes the admin client list", () => {
  assert.deepEqual(clientsKey(), ["clients", "admin", { onboarding: "all", q: "" }]);
});

test("clientsKey scopes filter variants", () => {
  assert.deepEqual(
    clientsKey({ onboarding: "complete", q: " ana " }),
    ["clients", "admin", { onboarding: "complete", q: "ana" }]
  );
});

test("clientDetailKey scopes the selected client detail", () => {
  assert.deepEqual(clientDetailKey("9"), ["clients", "detail", 9]);
});
