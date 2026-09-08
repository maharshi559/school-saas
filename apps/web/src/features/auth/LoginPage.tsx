import { useState } from "react";
import type { SessionUser } from "@iskool/shared";
import { apiFetch, auth, setToken } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Label } from "../../components/ui/label.js";
import { Alert, AlertDescription } from "../../components/ui/alert.js";
import { ShieldIcon } from "lucide-react";

export function LoginPage({ onDone }: { onDone: (u: SessionUser) => void }) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [stage, setStage] = useState<"phone" | "code" | "pending">("phone");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  function switchMode(m: "signin" | "register") {
    setMode(m);
    setPhone(""); setCode(""); setRegFirstName(""); setRegLastName(""); setErr(undefined); setStage("phone");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    setBusy(true);
    try {
      if (stage === "phone") {
        if (mode === "register" && !regFirstName.trim()) {
          setErr("Please enter your first name");
          setBusy(false);
          return;
        }
        await auth.requestOtp(phone);
        setStage("code");
      } else {
        const res = await auth.verifyOtp(phone, code);
        setToken(res.token);
        if (mode === "register") {
          if (regFirstName.trim()) {
            await apiFetch("/auth/me", { method: "PATCH", body: JSON.stringify({ firstName: regFirstName.trim(), lastName: regLastName.trim() }) });
          }
          setStage("pending");
        } else {
          onDone(res.user);
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground font-bold text-lg">
              क
            </div>
            <span className="text-3xl font-bold text-foreground tracking-tight">iskool</span>
          </div>
          <p className="text-sm text-muted-foreground">School management for admins, teachers &amp; parents</p>
        </div>

        {stage === "pending" && (
          <Card>
            <CardContent className="py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 mx-auto mb-4">
                <ShieldIcon />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Account Created</h2>
              <p className="text-sm text-muted-foreground mb-4">Your account is pending approval by an iskool admin. You'll be able to sign in once access is granted.</p>
              <Button variant="outline" onClick={() => switchMode("signin")}>Back to Sign In</Button>
            </CardContent>
          </Card>
        )}

        {stage !== "pending" && <Card>
          <div className="flex border-b border-border">
            <button
              onClick={() => switchMode("signin")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === "signin" ? "text-foreground border-b-2 border-accent" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode("register")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === "register" ? "text-foreground border-b-2 border-accent" : "text-muted-foreground hover:text-foreground"}`}
            >
              Register
            </button>
          </div>

          <CardHeader className="pb-4 pt-5">
            <CardTitle className="text-xl">{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription>{mode === "signin" ? "Enter your phone number to continue" : "Register to request platform access"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              {mode === "register" && stage === "phone" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="regFirstName">First name <span className="text-destructive">*</span></Label>
                    <Input id="regFirstName" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} placeholder="Rohan" autoComplete="given-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regLastName">Last name</Label>
                    <Input id="regLastName" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} placeholder="Mehta" autoComplete="family-name" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" inputMode="tel" disabled={stage === "code"} autoComplete="tel" />
                <p className="text-xs text-muted-foreground">E.164 format or 10 digits</p>
              </div>

              {stage === "code" && (
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input id="otp" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" maxLength={6} autoFocus className="text-center tracking-widest" />
                  <p className="text-xs text-muted-foreground">Check the API console for your verification code</p>
                </div>
              )}

              {err && (
                <Alert variant="destructive">
                  <AlertDescription>{err}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Processing…" : stage === "phone" ? "Send code" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>

              {stage === "code" && (
                <Button type="button" variant="ghost" onClick={() => { setStage("phone"); setCode(""); }} className="w-full text-sm">
                  Use different number
                </Button>
              )}
            </form>
          </CardContent>
        </Card>}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "register" ? "Already have an account? " : "Need platform access? "}
          <button onClick={() => switchMode(mode === "signin" ? "register" : "signin")} className="text-accent underline underline-offset-2">
            {mode === "signin" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
