import assert from "node:assert/strict";
import test from "node:test";

import { parseLoginForm } from "../loginForm.js";

test("parseLoginForm accepts a valid admin login payload", () => {
  const parsed = parseLoginForm({
    email: "daniel@example.com",
    password: "4747"
  });

  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.data, {
    email: "daniel@example.com",
    password: "4747"
  });
});

test("parseLoginForm rejects invalid email values", () => {
  const parsed = parseLoginForm({
    email: "daniel",
    password: "4747"
  });

  assert.equal(parsed.success, false);
  assert.equal(parsed.error.flatten().fieldErrors.email[0], "Email invalido");
});

test("parseLoginForm rejects empty passwords", () => {
  const parsed = parseLoginForm({
    email: "daniel@example.com",
    password: ""
  });

  assert.equal(parsed.success, false);
  assert.equal(parsed.error.flatten().fieldErrors.password[0], "Password obligatorio");
});
