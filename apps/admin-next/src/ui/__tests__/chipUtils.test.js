import assert from "node:assert/strict";
import test from "node:test";

import { chipClassName } from "../chipUtils.js";

test("chipClassName builds known appointment status chip classes", () => {
  assert.equal(chipClassName("pending"), "chip chip-pending");
  assert.equal(chipClassName("confirmed"), "chip chip-confirmed");
  assert.equal(chipClassName("no_show"), "chip chip-no_show");
});

test("chipClassName falls back for unknown chip tones", () => {
  assert.equal(chipClassName(), "chip chip-default");
  assert.equal(chipClassName("rescheduled"), "chip chip-default");
});
