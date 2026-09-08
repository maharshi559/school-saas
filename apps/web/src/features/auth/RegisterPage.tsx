import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Label } from "../../components/ui/label.js";
import { Alert, AlertDescription } from "../../components/ui/alert.js";

export function RegisterPage({ token, schoolCode }: { token: string; schoolCode: string }) {
  const [stage, setStage] = useState<"info" | "confirming" | "done">("info");
  const [formData, setFormData] = useState({ phone: "", displayName: "" });
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  useEffect(() => {
    apiFetch<any>(`/invites/${token}/validate?schoolCode=${schoolCode}`)
      .then((res) => {
        setSchoolInfo(res);
        setFormData((prev) => ({ ...prev, phone: res.phone }));
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : "Invalid invite link");
      });
  }, [token, schoolCode]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.displayName) {
      setErr("Please enter your name");
      return;
    }
    setErr(undefined);
    setBusy(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ token, phone: formData.phone, displayName: formData.displayName, schoolCode }),
      });
      setStage("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (!schoolInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          {err ? (
            <Card>
              <CardContent className="pt-6">
                <Alert variant="destructive">
                  <AlertDescription>{err}</AlertDescription>
                </Alert>
                <Button onClick={() => window.location.href = "/"} className="w-full mt-4">Back to Login</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Join {schoolInfo.schoolName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Complete your registration</p>
        </div>

        <Card>
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Registration</CardTitle>
            <CardDescription>School: {schoolInfo.schoolName}</CardDescription>
          </CardHeader>
          <CardContent>
            {stage === "done" ? (
              <div className="space-y-4">
                <Alert variant="default">
                  <AlertDescription>
                    Registration successful! Your request has been sent to the school admin for approval. You'll be able to login once approved.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => window.location.href = "/"} className="w-full">Back to Login</Button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={formData.phone} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Phone verified via invite link</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter your full name" value={formData.displayName} onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} disabled={busy} autoFocus />
                </div>

                {err && (
                  <Alert variant="destructive">
                    <AlertDescription>{err}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Registering…" : "Complete Registration"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
