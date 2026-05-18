import assert from "node:assert/strict";
import test from "node:test";

import { http, setUnauthorizedHandler } from "../http.js";

function installWindow(token = "token-demo") {
  const previousWindow = globalThis.window;

  globalThis.window = {
    localStorage: {
      getItem(key) {
        return key === "adminNextToken" ? token : null;
      }
    },
    queueMicrotask
  };

  return () => {
    globalThis.window = previousWindow;
  };
}

function jsonResponse({ ok = true, status = 200, payload = {} } = {}) {
  return {
    ok,
    status,
    async text() {
      return JSON.stringify(payload);
    }
  };
}

test("http attaches the stored admin bearer token", async () => {
  const restoreWindow = installWindow("stored-token");
  const previousFetch = globalThis.fetch;
  let receivedHeaders = null;

  globalThis.fetch = async (_path, options) => {
    receivedHeaders = options.headers;
    return jsonResponse({ payload: { ok: true } });
  };

  try {
    const payload = await http("/api/admin/appointments");
    assert.equal(payload.ok, true);
    assert.equal(receivedHeaders.get("Authorization"), "Bearer stored-token");
  } finally {
    globalThis.fetch = previousFetch;
    setUnauthorizedHandler(null);
    restoreWindow();
  }
});

test("http maps backend error payloads into thrown errors", async () => {
  const restoreWindow = installWindow();
  const previousFetch = globalThis.fetch;

  globalThis.fetch = async () => jsonResponse({
    ok: false,
    status: 409,
    payload: {
      error: {
        code: "SLOT_OCCUPIED",
        message: "Slot ocupado",
        details: { resourceType: "room" }
      }
    }
  });

  try {
    await assert.rejects(
      () => http("/api/admin/appointments"),
      (error) => {
        assert.equal(error.status, 409);
        assert.equal(error.code, "SLOT_OCCUPIED");
        assert.equal(error.message, "Slot ocupado");
        assert.deepEqual(error.details, { resourceType: "room" });
        return true;
      }
    );
  } finally {
    globalThis.fetch = previousFetch;
    setUnauthorizedHandler(null);
    restoreWindow();
  }
});

test("http coalesces concurrent 401 responses into one unauthorized callback", async () => {
  const restoreWindow = installWindow();
  const previousFetch = globalThis.fetch;
  let unauthorizedCount = 0;
  let releaseTexts = null;
  const textGate = new Promise((resolve) => {
    releaseTexts = resolve;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async text() {
      await textGate;
      return JSON.stringify({
        error: {
          code: "ADMIN_TOKEN_REQUIRED",
          message: "Token de admin requerido"
        }
      });
    }
  });
  setUnauthorizedHandler(() => {
    unauthorizedCount += 1;
  });

  try {
    const first = http("/api/admin/appointments");
    const second = http("/api/admin/resources");
    releaseTexts();

    const results = await Promise.allSettled([first, second]);
    assert.equal(results[0].status, "rejected");
    assert.equal(results[1].status, "rejected");
    assert.equal(unauthorizedCount, 1);
  } finally {
    globalThis.fetch = previousFetch;
    setUnauthorizedHandler(null);
    restoreWindow();
  }
});
