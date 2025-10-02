import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { loginUser, registerUser } from "../lib/api";
import type { AuthResponse, UserSummary } from "../types/api";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

type AuthState = {
  status: AuthStatus;
  user: UserSummary | null;
  errorMessage?: string;
};

type AuthContextValue = {
  state: AuthState;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (displayName: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "unauthenticated", user: null });

  const login = useCallback(async (email: string, password: string) => {
    setState((previous) => ({ ...previous, status: "checking", errorMessage: undefined }));
    try {
      const response = await loginUser(email, password);
      setState({ status: "authenticated", user: response.user, errorMessage: undefined });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connexion impossible.";
      setState({ status: "unauthenticated", user: null, errorMessage: message });
      throw error;
    }
  }, []);

  const register = useCallback(async (displayName: string, email: string, password: string) => {
    setState((previous) => ({ ...previous, status: "checking", errorMessage: undefined }));
    try {
      const response = await registerUser({ display_name: displayName, email, password });
      setState({ status: "authenticated", user: response.user, errorMessage: undefined });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inscription impossible.";
      setState({ status: "unauthenticated", user: null, errorMessage: message });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setState({ status: "unauthenticated", user: null, errorMessage: undefined });
  }, []);

  const clearError = useCallback(() => {
    setState((previous) => ({ ...previous, errorMessage: undefined }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login,
      register,
      logout,
      clearError,
    }),
    [state, login, register, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}
