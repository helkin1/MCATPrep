import { useState } from "react";
import { signIn, signUp, resetPassword } from "@/lib/supabase";
import { Button, Input, Label } from "@/components/ui";

export function SignIn() {
  const [mode, setMode] = useState("signin");
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
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-bg overflow-hidden">
      {/* Soft gradient mesh — atmospheric, not loud */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(800px 480px at 20% 10%, rgba(124,156,255,0.10), transparent 60%), radial-gradient(700px 420px at 85% 110%, rgba(95,211,148,0.06), transparent 60%)",
        }}
      />

      <form
        onSubmit={submit}
        className="relative w-full max-w-[400px] bg-surface-1/80 backdrop-blur-xl border border-border rounded-2xl p-7 shadow-xl space-y-5"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-accent-strong shadow-sm" />
            <span className="font-display text-[14px] font-semibold tracking-tight text-text-1">
              Atara's MCAT Prep
            </span>
          </div>
          <h1 className="font-display text-[24px] font-semibold tracking-tight text-text-1 leading-tight">
            {mode === "signin" && "Welcome back."}
            {mode === "signup" && "Create your account."}
            {mode === "reset" && "Reset your password."}
          </h1>
          <p className="text-[13px] text-text-2 leading-relaxed">
            {mode === "signin" && "Plan every minute to MCAT day."}
            {mode === "signup" && "A focused planner from now until exam day."}
            {mode === "reset" && "We'll email you a reset link."}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          {mode !== "reset" && (
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="text-[12px] text-danger bg-[color:var(--danger-soft)] border border-danger/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="text-[12px] text-success bg-[color:var(--success-soft)] border border-success/30 rounded-md px-3 py-2">
            {info}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          {loading
            ? "…"
            : mode === "signin"
            ? "Sign in"
            : mode === "signup"
            ? "Create account"
            : "Send reset email"}
        </Button>

        <div className="flex items-center justify-between text-[12px] text-text-2 pt-1">
          {mode === "signin" ? (
            <>
              <button
                type="button"
                className="hover:text-text-1 transition-colors"
                onClick={() => setMode("signup")}
              >
                Create account
              </button>
              <button
                type="button"
                className="hover:text-text-1 transition-colors"
                onClick={() => setMode("reset")}
              >
                Forgot password?
              </button>
            </>
          ) : (
            <button
              type="button"
              className="hover:text-text-1 transition-colors"
              onClick={() => setMode("signin")}
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
