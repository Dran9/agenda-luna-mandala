import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { loginAdmin } from "./api";
import { clearSession, persistSession, readStoredSession } from "./storage";
import { setUnauthorizedHandler } from "../../lib/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    queryClient.clear();

    if (location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [location.pathname, navigate, queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const loginMutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess(nextSession) {
      persistSession(nextSession);
      setSession(nextSession);
      navigate("/control", { replace: true });
    }
  });

  const value = useMemo(() => ({
    admin: session?.admin || null,
    token: session?.token || null,
    isAuthenticated: Boolean(session?.token),
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    loginLoading: loginMutation.isPending,
    logout
  }), [loginMutation.error, loginMutation.isPending, loginMutation.mutateAsync, logout, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return value;
}
