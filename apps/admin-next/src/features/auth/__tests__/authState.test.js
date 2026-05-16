import assert from "node:assert/strict";
import test from "node:test";

import { authStateFromSession } from "../authState.js";

test("authStateFromSession exposes authenticated admin state", () => {
  const admin = {
    id: "admin-1",
    email: "daniel@example.com",
    role: "owner"
  };

  assert.deepEqual(authStateFromSession({ token: "token-123", admin }), {
    admin,
    token: "token-123",
    isAuthenticated: true
  });
});

test("authStateFromSession handles missing sessions as logged out", () => {
  assert.deepEqual(authStateFromSession(null), {
    admin: null,
    token: null,
    isAuthenticated: false
  });
});

test("authStateFromSession requires a token to be authenticated", () => {
  assert.deepEqual(authStateFromSession({ admin: { id: "admin-1" } }), {
    admin: { id: "admin-1" },
    token: null,
    isAuthenticated: false
  });
});
