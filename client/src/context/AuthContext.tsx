"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

/** Hardcoded demo user — bypasses Supabase auth entirely */
const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@univoice.dev",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as const;

interface AuthUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Always "logged in" as demo user — no Supabase calls
  const [user] = useState<AuthUser>(DEMO_USER);
  const loading = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    return null;
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    return null;
  }, []);

  const signOut = useCallback(async () => {}, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
