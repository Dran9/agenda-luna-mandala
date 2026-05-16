import assert from "node:assert/strict";
import test from "node:test";

import { buttonClassName } from "../buttonUtils.js";

test("buttonClassName builds the primary button class by default", () => {
  assert.equal(buttonClassName(), "button button-primary");
});

test("buttonClassName supports the secondary toolbar action", () => {
  assert.equal(buttonClassName({ variant: "secondary" }), "button button-secondary");
});

test("buttonClassName appends caller classes without extra spaces", () => {
  assert.equal(
    buttonClassName({ variant: "secondary", className: "toolbar-action" }),
    "button button-secondary toolbar-action"
  );
});

test("buttonClassName falls back for unknown variants", () => {
  assert.equal(buttonClassName({ variant: "danger" }), "button button-primary");
});
