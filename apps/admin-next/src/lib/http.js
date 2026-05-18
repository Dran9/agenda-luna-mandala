import { createHttpError, parseResponseBody, readAuthToken } from "./httpUtils.js";

let unauthorizedHandler = null;
let unauthorizedInFlight = false;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function notifyUnauthorized() {
  if (!unauthorizedHandler || unauthorizedInFlight) {
    return;
  }

  unauthorizedInFlight = true;
  unauthorizedHandler();
  window.queueMicrotask(() => {
    unauthorizedInFlight = false;
  });
}

export async function http(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = readAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers
  });
  const payload = await parseResponseBody(response);

  if (response.status === 401) {
    notifyUnauthorized();
  }

  if (!response.ok) {
    throw createHttpError({
      payload,
      status: response.status,
      fallback: "No se pudo procesar la solicitud."
    });
  }

  return payload;
}
