import assert from "node:assert/strict";
import test from "node:test";

import { fieldControlClassName } from "../fieldUtils.js";

test("fieldControlClassName returns the base control class", () => {
  assert.equal(fieldControlClassName(), "field-control");
  assert.equal(fieldControlClassName({ error: "" }), "field-control");
});

test("fieldControlClassName adds the error control class when visible", () => {
  assert.equal(
    fieldControlClassName({ error: "Campo obligatorio" }),
    "field-control field-control-error"
  );
});
