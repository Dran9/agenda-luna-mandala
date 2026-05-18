import assert from "node:assert/strict";
import test from "node:test";

import {
  clearSession,
  persistSession,
  readStoredSession,
  SESSION_STORAGE_KEY,
  TOKEN_STORAGE_KEY
} from "../storage.js";

function createStorage(seed = {}) {
  const state = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    },
    removeItem(key) {
      state.delete(key);
    }
  };
}

test("readStoredSession returns the persisted admin session", () => {
  const session = {
    token: "token-123",
    admin: {
      id: "admin-1",
      email: "daniel@example.com",
      role: "owner"
    }
  };

  const storage = createStorage({
    [SESSION_STORAGE_KEY]: JSON.stringify(session)
  });

  assert.deepEqual(readStoredSession(storage), session);
});

test("readStoredSession returns null when storage is empty or malformed", () => {
  assert.equal(readStoredSession(createStorage()), null);
  assert.equal(readStoredSession(createStorage({ [SESSION_STORAGE_KEY]: "{" })), null);
});

test("persistSession stores both the session and token", () => {
  const storage = createStorage();
  const session = {
    token: "token-123",
    admin: {
      id: "admin-1",
      email: "daniel@example.com",
      role: "owner"
    }
  };

  persistSession(session, storage);

  assert.deepEqual(JSON.parse(storage.getItem(SESSION_STORAGE_KEY)), session);
  assert.equal(storage.getItem(TOKEN_STORAGE_KEY), "token-123");
});

test("clearSession removes all auth storage keys", () => {
  const storage = createStorage({
    [SESSION_STORAGE_KEY]: "{}",
    [TOKEN_STORAGE_KEY]: "token-123"
  });

  clearSession(storage);

  assert.equal(storage.getItem(SESSION_STORAGE_KEY), null);
  assert.equal(storage.getItem(TOKEN_STORAGE_KEY), null);
});
