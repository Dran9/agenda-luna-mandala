import assert from "node:assert/strict";
import test from "node:test";

import {
  createHttpError,
  httpErrorMessage,
  parseResponseBody,
  readAuthToken
} from "../httpUtils.js";

function responseWithText(text) {
  return {
    async text() {
      return text;
    }
  };
}

test("readAuthToken returns the admin token from storage", () => {
  const storage = {
    getItem(key) {
      return key === "adminNextToken" ? "token-123" : null;
    }
  };

  assert.equal(readAuthToken(storage), "token-123");
});

test("readAuthToken returns null when storage is unavailable", () => {
  assert.equal(readAuthToken(null), null);
  assert.equal(readAuthToken({ getItem: () => { throw new Error("blocked"); } }), null);
});

test("parseResponseBody handles json, text and empty responses", async () => {
  assert.deepEqual(await parseResponseBody(responseWithText('{"ok":true}')), { ok: true });
  assert.equal(await parseResponseBody(responseWithText("plain error")), "plain error");
  assert.equal(await parseResponseBody(responseWithText("")), null);
});

test("httpErrorMessage prefers backend error messages", () => {
  assert.equal(
    httpErrorMessage({ error: { message: "Slot ocupado" } }, "Fallback"),
    "Slot ocupado"
  );
  assert.equal(httpErrorMessage("Texto plano", "Fallback"), "Texto plano");
  assert.equal(httpErrorMessage(null, "Fallback"), "Fallback");
});

test("createHttpError preserves status, code, details and payload", () => {
  const payload = {
    error: {
      code: "SLOT_OCCUPIED",
      message: "Slot ocupado",
      details: { resourceType: "room" }
    }
  };
  const error = createHttpError({ payload, status: 409, fallback: "Fallback" });

  assert.equal(error.message, "Slot ocupado");
  assert.equal(error.status, 409);
  assert.equal(error.code, "SLOT_OCCUPIED");
  assert.deepEqual(error.details, { resourceType: "room" });
  assert.equal(error.payload, payload);
});
