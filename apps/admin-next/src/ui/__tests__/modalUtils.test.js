import assert from "node:assert/strict";
import test from "node:test";

import { shouldCloseModalOnKey } from "../modalUtils.js";

test("shouldCloseModalOnKey closes only on Escape", () => {
  assert.equal(shouldCloseModalOnKey({ key: "Escape" }), true);
  assert.equal(shouldCloseModalOnKey({ key: "Enter" }), false);
  assert.equal(shouldCloseModalOnKey({ key: "Esc" }), false);
});

test("shouldCloseModalOnKey handles missing events", () => {
  assert.equal(shouldCloseModalOnKey(null), false);
});
