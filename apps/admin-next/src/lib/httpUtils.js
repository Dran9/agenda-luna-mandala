export function readAuthToken(storage = globalThis.window?.localStorage) {
  try {
    return storage?.getItem("adminNextToken") || null;
  } catch {
    return null;
  }
}

export async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function httpErrorMessage(payload, fallback) {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return fallback;
}

export function createHttpError({ payload, status, fallback }) {
  const error = new Error(httpErrorMessage(payload, fallback));
  error.status = status;
  error.code = payload?.error?.code || "HTTP_ERROR";
  error.details = payload?.error?.details || {};
  error.payload = payload;
  return error;
}
