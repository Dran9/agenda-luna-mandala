import assert from "node:assert/strict";
import test from "node:test";

import { ZodError } from "zod";

import { parseLoginResponse } from "../schema.js";

test("parseLoginResponse accepts the backend admin session contract", () => {
  const session = {
    token: "token-123",
    admin: {
      id: "admin-1",
      email: "daniel@example.com",
      fullName: null,
      role: "owner"
    }
  };

  assert.deepEqual(parseLoginResponse(session), session);
});

test("parseLoginResponse accepts an omitted optional fullName", () => {
  const session = {
    token: "token-123",
    admin: {
      id: "admin-1",
      email: "daniel@example.com",
      role: "owner"
    }
  };

  assert.deepEqual(parseLoginResponse(session), session);
});

test("parseLoginResponse rejects sessions without a token", () => {
  assert.throws(
    () => parseLoginResponse({
      token: "",
      admin: {
        id: "admin-1",
        email: "daniel@example.com",
        role: "owner"
      }
    }),
    ZodError
  );
});
