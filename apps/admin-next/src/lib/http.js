let unauthorizedHandler = null;
let unauthorizedInFlight = false;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function readAuthToken() {
  try {
    return window.localStorage.getItem("adminNextToken");
  } catch {
    return null;
  }
}

async function parseJson(response) {
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

function getErrorMessage(payload, fallback) {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return fallback;
}

function notifyUnauthorized() {
  if (!unauthorizedHandler || unauthorizedInFlight) {
    return;
  }

  unauthorizedInFlight = true;
  unauthorizedHandler();
  window.setTimeout(() => {
    unauthorizedInFlight = false;
  }, 0);
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
  const payload = await parseJson(response);

  if (response.status === 401) {
    notifyUnauthorized();
  }

  if (!response.ok) {
    const error = new Error(getErrorMessage(payload, "No se pudo procesar la solicitud."));
    error.status = response.status;
    error.code = payload?.error?.code || "HTTP_ERROR";
    error.details = payload?.error?.details || {};
    error.payload = payload;
    throw error;
  }

  return payload;
}
