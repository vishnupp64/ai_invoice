import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, registerGlobalLogout, setAuthToken } from "../lib/api";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "ai_invoice_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  async function fetchMe(authToken: string | null) {
    if (!authToken) {
      setUser(null);
      return null;
    }
    const res = await api.get<{ user: AuthUser }>("/me");
    setUser(res.data.user);
    return res.data.user;
  }

  useEffect(() => {
    fetchMe(token).catch(() => {
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    });
  }, [token]);

  async function login(newToken: string) {
    localStorage.setItem(STORAGE_KEY, newToken);
    setAuthToken(newToken);
    setToken(newToken);
    try {
      await fetchMe(newToken);
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
      setAuthToken(null);
      setToken(null);
      setUser(null);
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    registerGlobalLogout(logout);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ token, user, login, logout }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

