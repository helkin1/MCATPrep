import { useState } from "react";
import { signIn, signUp, resetPassword } from "@/lib/supabase";

export function SignIn() {
  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else if (mode === "signup") {
        await signUp(email, password);
        setInfo("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else if (mode === "reset") {
        await resetPassword(email);
        setInfo("Password reset email sent.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight">MCAT Prep Planner</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {mode === "signin" && "Sign in to continue."}
            {mode === "signup" && "Create your account."}
            {mode === "reset" && "Reset your password."}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
            />
          </div>
          {mode !== "reset" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          )}
        </div>

        {error && <div className="text-sm text-red-400 bg-red-900/30 border border-red-900/60 rounded-md px-3 py-2">{error}</div>}
        {info && <div className="text-sm text-emerald-400 bg-emerald-900/30 border border-emerald-900/60 rounded-md px-3 py-2">{info}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-md text-sm transition-colors"
        >
          {loading ? "…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email"}
        </button>

        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
          {mode === "signin" ? (
            <>
              <button type="button" className="hover:text-zinc-100" onClick={() => setMode("signup")}>
                Create account
              </button>
              <button type="button" className="hover:text-zinc-100" onClick={() => setMode("reset")}>
                Forgot password?
              </button>
            </>
          ) : (
            <button type="button" className="hover:text-zinc-100" onClick={() => setMode("signin")}>
              ← Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
