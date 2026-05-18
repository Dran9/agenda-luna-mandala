export const SESSION_STORAGE_KEY = "adminNextSession";
export const TOKEN_STORAGE_KEY = "adminNextToken";

function getStorage(storage) {
  return storage || globalThis.window?.localStorage || null;
}

export function readStoredSession(storage) {
  const targetStorage = getStorage(storage);
  if (!targetStorage) {
    return null;
  }

  try {
    const raw = targetStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistSession(session, storage) {
  const targetStorage = getStorage(storage);
  if (!targetStorage) {
    return;
  }

  targetStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  targetStorage.setItem(TOKEN_STORAGE_KEY, session.token);
}

export function clearSession(storage) {
  const targetStorage = getStorage(storage);
  if (!targetStorage) {
    return;
  }

  targetStorage.removeItem(SESSION_STORAGE_KEY);
  targetStorage.removeItem(TOKEN_STORAGE_KEY);
}
