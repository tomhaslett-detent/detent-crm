import { useState } from "react";
import { LogIn } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { safeReturnTo } from "@/lib/authReturnTo";

export function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fields.get("email"), password: fields.get("password") }),
      });
      if (response.ok) window.location.assign(safeReturnTo());
      else setError(response.status === 401 ? "Email or password was not accepted." : "Sign-in is temporarily unavailable.");
    } catch {
      setError("Could not reach Detent CRM.");
    } finally {
      setBusy(false);
    }
  }
  return <AuthLayout icon={LogIn} title="Sign in to Detent CRM" subtitle="Use your provisioned work account.">
    <form onSubmit={signIn} className="space-y-4">
      <label className="block text-sm">Work email<Input name="email" type="email" autoComplete="username" maxLength={320} required /></label>
      <label className="block text-sm">Password<Input name="password" type="password" autoComplete="current-password" maxLength={200} required /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  </AuthLayout>;
}
