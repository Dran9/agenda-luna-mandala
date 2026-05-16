export function authStateFromSession(session) {
  return {
    admin: session?.admin || null,
    token: session?.token || null,
    isAuthenticated: Boolean(session?.token)
  };
}
