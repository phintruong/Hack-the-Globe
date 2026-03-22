"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      if (mode === "signup") {
        const err = await signUp(email, password);
        if (err) {
          setError(err);
        } else {
          setSignupDone(true);
        }
      } else {
        const err = await signIn(email, password);
        if (err) {
          setError(err);
        } else {
          router.push("/training");
        }
      }

      setLoading(false);
    },
    [mode, email, password, signIn, signUp, router]
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-[Helvetica_Neue,Helvetica,Arial,sans-serif]">
      {/* Header */}
      <header className="px-8 py-5 border-b border-[#caf0f8]">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-[#0077b6]"
        >
          VIBE
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {signupDone ? (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-[#03045e]">Check your email</h2>
              <p className="text-sm text-[#023e8a]/60">
                We sent a confirmation link to <strong>{email}</strong>.
                Confirm your email then{" "}
                <button
                  onClick={() => { setSignupDone(false); setMode("login"); }}
                  className="text-[#0077b6] underline"
                >
                  sign in
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex mb-8 border border-[#caf0f8] rounded-sm overflow-hidden">
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className={`flex-1 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                    mode === "login"
                      ? "bg-[#0077b6] text-white"
                      : "text-[#023e8a]/60 hover:bg-[#caf0f8]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMode("signup"); setError(null); }}
                  className={`flex-1 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                    mode === "signup"
                      ? "bg-[#0077b6] text-white"
                      : "text-[#023e8a]/60 hover:bg-[#caf0f8]"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-[#caf0f8] rounded-sm px-3 py-2.5 text-sm text-[#03045e] outline-none focus:border-[#0077b6] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#023e8a]/60 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-[#caf0f8] rounded-sm px-3 py-2.5 text-sm text-[#03045e] outline-none focus:border-[#0077b6] transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0077b6] hover:bg-[#023e8a] text-white font-semibold text-sm uppercase tracking-wider py-3 rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading
                    ? "Please wait…"
                    : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
