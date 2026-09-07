import { useEffect, useState } from "react";
import { UserShield } from "lucide-react";
import type { SessionUser } from "@school/shared";
import { apiFetch, auth, getToken, setToken } from "./lib/api.js";
import { Button } from "./components/ui/button.js";
import { Input } from "./components/ui/input.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card.js";
import { Label } from "./components/ui/label.js";
import { Alert, AlertDescription } from "./components/ui/alert.js";
import { Avatar } from "./components/ui/avatar.js";
import { ToastContainer, type Toast } from "./components/Toast.js";
import { LanguageProvider, useLanguage } from "./lib/i18n.js";
import { BackButton } from "./lib/ui-helpers.js";
import { EmptyState, LoadingState, FormField, StatusBadge, SuccessMessage, ErrorMessage } from "./lib/ui-helpers.js";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  dateOfBirth?: string;
  classSectionId?: string;
  enrollmentStatus?: string;
  classSection?: { id: string; name: string };
};
type SidebarView = "dashboard" | "students" | "teachers" | "classes" | "attendance" | "finance" | "consent" | "communication" | "members" | "account" | "settings";

const SunIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 1v6m0 6v6m11-11h-6m-6 0H1m15.66-8.66l-4.24 4.24m5.96 5.96l-4.24-4.24m-11.32 0l-4.24 4.24m5.96 5.96l4.24-4.24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MoonIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DashboardIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UsersIcon = ({ className = "h-5 w-5" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TeachersIcon = ({ className = "h-5 w-5" }: { className?: string } = {}) => (
  <UserShield className={className} strokeWidth={2} />
);

const CheckSquareIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="9 11 12 14 22 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 10h22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BuildingsIcon = ({ className = "h-5 w-5" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="9 22 9 12 15 12 15 22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BookIcon = ({ className = "h-5 w-5" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WalletIcon = ({ className = "h-5 w-5" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 10h22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GridIcon = ({ className = "h-5 w-5" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MessageIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6m-16.78 7.78l4.24-4.24m5.08-5.08l4.24-4.24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = ({ className = "h-4 w-4" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = ({ className = "h-4 w-4" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PencilIcon = ({ className = "h-4 w-4" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BellIcon = ({ className = "h-5 w-5" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SparklesIcon = ({ className = "h-4 w-4" }: { className?: string } = {}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Check if user is on registration page
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get("token");
  const schoolCode = urlParams.get("schoolCode");
  const isRegisterPage = inviteToken && schoolCode;

  useEffect(() => {
    if (!getToken()) return setBooting(false);
    apiFetch<{ user: SessionUser }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  if (booting) return <LoadingShell />;
  if (isRegisterPage) return <RegisterPage token={inviteToken!} schoolCode={schoolCode!} />;
  if (!user) return <LoginPage onDone={setUser} />;

  // Platform admins always see admin portal
  const isAppAdmin = user.phone === "+919999900000";

  // If user has no school memberships (or is app admin), show admin portal
  const hasSchoolMembership = user.memberships.some((m) => m.status === "ACTIVE");

  if (isAppAdmin || !hasSchoolMembership) {
    return (
      <LanguageProvider>
        <AdminPortal
          user={user}
          theme={theme}
          onThemeChange={setTheme}
          onLogout={() => (setToken(null), setUser(null))}
        />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <AppShell
        user={user}
        theme={theme}
        onThemeChange={setTheme}
        onLogout={() => (setToken(null), setUser(null))}
      />
    </LanguageProvider>
  );
}

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

function LoginPage({ onDone }: { onDone: (u: SessionUser) => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    setBusy(true);
    try {
      if (stage === "phone") {
        await auth.requestOtp(phone);
        setStage("code");
      } else {
        const res = await auth.verifyOtp(phone, code);
        setToken(res.token);
        onDone(res.user);
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
          <h1 className="text-3xl font-semibold text-foreground">School Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your school</p>
        </div>

        <Card>
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Enter your phone number to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4001"
                  inputMode="tel"
                  disabled={stage === "code"}
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">Enter a phone number in E.164 format or 10 digits</p>
              </div>

              {stage === "code" && (
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    className="text-center tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">
                    Check the API console for your verification code
                  </p>
                </div>
              )}

              {err && (
                <Alert variant="destructive">
                  <AlertDescription>{err}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Processing…" : stage === "phone" ? "Send code" : "Sign in"}
              </Button>

              {stage === "code" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStage("phone");
                    setCode("");
                  }}
                  className="w-full text-sm"
                >
                  Use different number
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Test accounts available in demo
        </p>
      </div>
    </div>
  );
}

function RegisterPage({ token, schoolCode }: { token: string; schoolCode: string }) {
  const [stage, setStage] = useState<"info" | "confirming" | "done">("info");
  const [formData, setFormData] = useState({ phone: "", displayName: "" });
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  useEffect(() => {
    // Validate invite token
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
        body: JSON.stringify({
          token,
          phone: formData.phone,
          displayName: formData.displayName,
          schoolCode,
        }),
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
                <Button onClick={() => window.location.href = "/"} className="w-full mt-4">
                  Back to Login
                </Button>
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
                <Button onClick={() => window.location.href = "/"} className="w-full">
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Phone verified via invite link</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    disabled={busy}
                    autoFocus
                  />
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

function AppShell({
  user,
  theme,
  onThemeChange,
  onLogout,
}: {
  user: SessionUser;
  theme: "light" | "dark";
  onThemeChange: (t: "light" | "dark") => void;
  onLogout: () => void;
}) {
  const { language, setLanguage, t } = useLanguage();
  const active = user.memberships.filter((m) => m.status === "ACTIVE");
  const [tenantId, setTenantId] = useState(active[0]?.tenantId ?? "");
  const [activeView, setActiveViewState] = useState<SidebarView>(() => {
    const hash = window.location.hash.slice(1);
    const validViews = ["dashboard", "students", "teachers", "classes", "attendance", "finance", "consent", "communication", "members", "account", "settings"];
    return (hash && validViews.includes(hash) ? hash : "dashboard") as SidebarView;
  });

  const setActiveView = (view: SidebarView) => {
    setActiveViewState(view);
    window.location.hash = view;
    try {
      localStorage.setItem("adminViewActive", view);
    } catch {
      // localStorage not available
    }
  };
  const [students, setStudents] = useState<Student[]>([]);
  const [note, setNote] = useState<string>();
  const [showOrgSwitch, setShowOrgSwitch] = useState(false);

  // ── In-app notifications ─────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    async function connect() {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api/v1/notifications/stream`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.body || cancelled) return;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const n = JSON.parse(line.slice(6));
              if (!n?.id) continue;
              setNotifications((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
              if (!n.readAt) setUnreadCount((c) => c + 1);
            } catch { /* ignore malformed frames */ }
          }
        }
      } catch {
        if (!cancelled) setTimeout(connect, 5000);
      }
    }

    connect();
    return () => { cancelled = true; };
  }, [tenantId]);

  const markAllRead = async () => {
    const token = getToken();
    if (!token) return;
    await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api/v1/notifications/read-all`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const membership = active.find((m) => m.tenantId === tenantId);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validViews = ["dashboard", "students", "teachers", "classes", "attendance", "finance", "consent", "communication", "members", "account", "settings"];
      if (hash && validViews.includes(hash)) {
        setActiveViewState(hash as SidebarView);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    // Only load students when on students view
    if (activeView !== "students" || !tenantId || !membership || membership.role === "PARENT") {
      setStudents([]);
      return;
    }

    let mounted = true;
    apiFetch<{ items: Student[] }>("/students?limit=50", { tenantId })
      .then((r) => {
        if (mounted) setStudents(r.items);
      })
      .catch((e) => {
        if (mounted) setNote(e instanceof Error ? e.message : "Failed to load students");
      });

    return () => {
      mounted = false;
    };
  }, [activeView, tenantId, membership?.tenantId]);

  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: <DashboardIcon /> },
    { id: "members" as const, label: "Members", icon: <UsersIcon /> },
    { id: "students" as const, label: "Students", icon: <UsersIcon /> },
    { id: "teachers" as const, label: "Teachers", icon: <TeachersIcon /> },
    { id: "classes" as const, label: "Classes", icon: <BookIcon /> },
  ];

  const sidebarGroups = [
    {
      group: "Overview",
      items: [
        { id: "dashboard" as const, label: "Dashboard", icon: <DashboardIcon /> },
      ],
    },
    {
      group: "People",
      items: [
        { id: "members" as const, label: "Members", icon: <UsersIcon /> },
        { id: "students" as const, label: "Students", icon: <UsersIcon /> },
        { id: "teachers" as const, label: "Teachers", icon: <TeachersIcon /> },
      ],
    },
    {
      group: "Academic",
      items: [
        { id: "classes" as const, label: "Classes", icon: <BookIcon /> },
        { id: "attendance" as const, label: "Attendance", icon: <CheckSquareIcon /> },
      ],
    },
    {
      group: "Operations",
      items: [
        { id: "communication" as const, label: "Communication", icon: <MessageIcon /> },
        { id: "finance" as const, label: "Finance", icon: <WalletIcon /> },
        { id: "consent" as const, label: "Consent", icon: <ShieldIcon /> },
      ],
    },
    {
      group: "Admin",
      items: [
        { id: "settings" as const, label: "Org Settings", icon: <SettingsIcon /> },
      ],
    },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground font-semibold">
              S
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">{membership?.tenantName || "School"}</h1>
                {active.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOrgSwitch(!showOrgSwitch)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <EditIcon />
                  </Button>
                )}
              </div>
              {showOrgSwitch && active.length > 1 && (
                <select
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={tenantId}
                  onChange={(e) => {
                    setTenantId(e.target.value);
                    setShowOrgSwitch(false);
                  }}
                >
                  {active.map((m) => (
                    <option key={m.tenantId} value={m.tenantId}>
                      {m.tenantName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Avatar - Clickable on mobile, visible on all sizes */}
            <button
              onClick={() => setActiveView("account")}
              className="lg:hidden h-9 w-9 rounded-full hover:opacity-80 transition-opacity"
            >
              <Avatar
                initials={(user.displayName || user.phone).substring(0, 2).toUpperCase()}
                name={user.displayName || undefined}
                className="h-9 w-9"
              />
            </button>

            {/* User details - Hidden on mobile */}
            <div className="hidden sm:flex sm:items-center sm:gap-3">
              <Avatar
                initials={(user.displayName || user.phone).substring(0, 2).toUpperCase()}
                name={user.displayName || undefined}
                className="h-9 w-9"
              />
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.displayName ?? user.phone}</p>
                <p className="text-xs text-muted-foreground">
                  {membership?.role.toLowerCase().replace("_", " ")}
                </p>
              </div>
            </div>

            {/* Settings buttons - Language and Theme */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              className="text-muted-foreground text-xs font-medium hidden sm:flex"
              title={`Switch to ${language === "en" ? "Hindi" : "English"}`}
            >
              {language === "en" ? "हिंदी" : "EN"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
              className="text-muted-foreground hidden sm:flex"
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </Button>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifPanel((v) => !v); if (showNotifPanel) {} }}
                className="relative h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Notifications"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
                  {/* Panel */}
                  <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-border bg-card shadow-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-accent hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
                      ) : (
                        notifications.slice(0, 15).map((n) => (
                          <div
                            key={n.id}
                            className={`px-4 py-3 ${!n.readAt ? "bg-accent/5" : ""}`}
                          >
                            <p className={`text-sm font-medium ${!n.readAt ? "text-foreground" : "text-muted-foreground"}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sign out - Hidden on mobile */}
            <Button
              variant="ghost"
              onClick={onLogout}
              className="text-sm hidden sm:block"
            >
              {t("nav.signOut", "Sign out")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content with sidebar (desktop) and bottom nav (mobile) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden lg:flex lg:w-64 bg-background overflow-y-auto">
          <nav className="w-full space-y-6 p-4">
            {sidebarGroups.map((group) => (
              <div key={group.group}>
                <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={`w-full flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        activeView === item.id
                          ? "bg-accent text-accent-foreground border-l-2 border-accent"
                          : "text-foreground hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 lg:py-8">
            {active.length === 0 ? (
              <Alert variant="default">
                <AlertDescription>
                  Your number isn't linked to a school yet. Ask your school admin to add you.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-8">
                {/* Content by View */}
                {activeView === "dashboard" && <DashboardView membership={membership} />}
                {activeView === "students" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <StudentsView
                      membership={membership}
                      students={students}
                      note={note}
                    />
                  </div>
                )}
                {activeView === "teachers" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <TeachersView membership={membership} />
                  </div>
                )}
                {activeView === "classes" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <ClassesView membership={membership} />
                  </div>
                )}
                {activeView === "attendance" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <AttendanceView membership={membership} />
                  </div>
                )}
                {activeView === "finance" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <FinanceView membership={membership} />
                  </div>
                )}
                {activeView === "consent" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Consent Management</CardTitle>
                        <CardDescription>Manage DPDP consent preferences</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Consent management coming soon. Parents can manage their data processing preferences through the parent portal.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {activeView === "communication" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <CommunicationView membership={membership} />
                  </div>
                )}
                {activeView === "members" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <MembersView membership={membership} />
                  </div>
                )}
                {activeView === "account" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-2xl">My Account</CardTitle>
                        <CardDescription>View and manage your profile</CardDescription>
                      </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-4">
                        <Avatar
                          initials={(user.displayName || user.phone).substring(0, 2).toUpperCase()}
                          name={user.displayName || undefined}
                          className="h-16 w-16"
                        />
                        <div>
                          <p className="text-lg font-semibold text-foreground">{user.displayName || "User"}</p>
                          <p className="text-sm text-muted-foreground">{user.phone}</p>
                        </div>
                      </div>
                      <div className="space-y-4 border-t border-border pt-6">
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">School</p>
                          <p className="text-sm text-muted-foreground">{membership?.tenantName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Role</p>
                          <p className="text-sm text-muted-foreground capitalize">{membership?.role.toLowerCase().replace("_", " ")}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Status</p>
                          <p className="text-sm text-muted-foreground capitalize">{membership?.status.toLowerCase()}</p>
                        </div>
                      </div>
                      <div className="space-y-3 border-t border-border pt-6">
                        <Button
                          variant="outline"
                          onClick={() => setLanguage(language === "en" ? "hi" : "en")}
                          className="w-full justify-center"
                        >
                          Language: {language === "en" ? "English" : "हिंदी"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
                          className="w-full justify-center"
                        >
                          Theme: {theme === "light" ? "Light" : "Dark"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={onLogout}
                          className="w-full"
                        >
                          Sign Out
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                    </div>
                )}
                {activeView === "settings" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Organization Settings</CardTitle>
                      <CardDescription>Manage school organization details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Organization settings coming soon.
                      </p>
                    </CardContent>
                  </Card>
                    </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - Visible only on mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background px-0">
        <div className="flex items-center justify-around h-16 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center h-16 min-w-16 transition-colors ${
                activeView === item.id
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="text-xl">{item.icon}</div>
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function DashboardView({ membership }: { membership: any }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSections: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership) return;
    let mounted = true;

    Promise.all([
      apiFetch<{ items: any[] }>("/students?limit=1000", { tenantId: membership.tenantId }).catch(() => ({ items: [] })),
      apiFetch<{ items: any[] }>("/teachers", { tenantId: membership.tenantId }).catch(() => ({ items: [] })),
      apiFetch<{ items: any[] }>("/class-sections", { tenantId: membership.tenantId }).catch(() => ({ items: [] })),
      apiFetch<{ items: any[] }>("/class-levels", { tenantId: membership.tenantId }).catch(() => ({ items: [] })),
    ])
      .then(([studentsRes, teachersRes, sectionsRes, levelsRes]) => {
        if (mounted) {
          setStats({
            totalStudents: studentsRes.items.length,
            totalTeachers: teachersRes.items.length,
            totalClasses: levelsRes.items.length,
            totalSections: sectionsRes.items.length,
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [membership?.tenantId]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Students</p>
                <p className="text-2xl font-semibold text-foreground font-mono">{loading ? "—" : stats.totalStudents}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <UsersIcon />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Teachers</p>
                <p className="text-2xl font-semibold text-foreground font-mono">{loading ? "—" : stats.totalTeachers}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <TeachersIcon />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Classes</p>
                <p className="text-2xl font-semibold text-foreground font-mono">{loading ? "—" : stats.totalClasses}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <BookIcon />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Sections</p>
                <p className="text-2xl font-semibold text-foreground font-mono">{loading ? "—" : stats.totalSections}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <GridIcon />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Role & Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="text-sm font-medium text-foreground capitalize">
                  {membership?.role.toLowerCase().replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Organization</span>
                <span className="text-sm font-medium text-foreground">{membership?.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium text-accent capitalize">
                  {membership?.status.toLowerCase()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">School</span>
                <span className="text-sm font-medium text-foreground">{membership?.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tenant ID</span>
                <span className="text-xs font-mono text-muted-foreground">{membership?.tenantId.slice(0, 8)}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="text-sm font-medium text-foreground">Connected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type StudentFormData = {
  firstName: string;
  lastName: string;
  admissionNo: string;
  dateOfBirth: string;
  classSectionId: string;
  enrollmentStatus: "ENROLLED" | "INACTIVE" | "GRADUATED" | "TRANSFERRED";
};

function StudentsView({
  membership,
  students,
  note,
}: {
  membership: any;
  students: Student[];
  note?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    firstName: "",
    lastName: "",
    admissionNo: "",
    dateOfBirth: "",
    classSectionId: "",
    enrollmentStatus: "ENROLLED",
  });
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditField, setInlineEditField] = useState<"status" | "classSection" | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");
  const [inlineUpdating, setInlineUpdating] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    if (!membership) return;
    let mounted = true;
    setLoadingSections(true);

    apiFetch<{ items: any[] }>("/class-sections", { tenantId: membership.tenantId })
      .then((r) => {
        if (mounted) setSections(r.items);
      })
      .catch(() => {
        if (mounted) setSections([]);
      })
      .finally(() => {
        if (mounted) setLoadingSections(false);
      });

    return () => {
      mounted = false;
    };
  }, [membership?.tenantId]);

  function addToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (membership?.role === "PARENT") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your children</CardTitle>
          <CardDescription>View attendance, grades, and messages</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section is coming soon. You'll see your children's information here.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.admissionNo) {
      setFormError("First name, last name, and admission number are required");
      return;
    }

    setSubmitting(true);
    setFormError(undefined);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        admissionNo: formData.admissionNo,
        dateOfBirth: formData.dateOfBirth || null,
        classSectionId: formData.classSectionId || null,
        enrollmentStatus: formData.enrollmentStatus,
      };

      if (editingId) {
        await apiFetch(`/students/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        addToast(`Student "${formData.firstName} ${formData.lastName}" updated successfully`, "success");
      } else {
        await apiFetch("/students", {
          method: "POST",
          body: JSON.stringify(payload),
          tenantId: membership.tenantId,
        });
        addToast(`Student "${formData.firstName} ${formData.lastName}" created successfully`, "success");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        firstName: "",
        lastName: "",
        admissionNo: "",
        dateOfBirth: "",
        classSectionId: "",
        enrollmentStatus: "ENROLLED",
      });
      // Reload students would need parent state management
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to save student";
      setFormError(errorMsg);
      addToast(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(studentId: string, studentName: string) {
    if (!window.confirm(`Are you sure you want to delete "${studentName}"?`)) {
      return;
    }

    try {
      await apiFetch(`/students/${studentId}`, {
        method: "DELETE",
      });
      addToast(`Student "${studentName}" deleted successfully`, "success");
      // Reload students would need parent state management
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to delete student";
      addToast(errorMsg, "error");
    }
  }

  async function handleInlineUpdate(studentId: string, studentName: string) {
    if (!inlineEditValue) {
      addToast("Please enter a value", "error");
      return;
    }

    setInlineUpdating(true);
    try {
      const updateData: Record<string, any> = {};
      if (inlineEditField === "status") {
        updateData.enrollmentStatus = inlineEditValue;
      } else if (inlineEditField === "classSection") {
        updateData.classSectionId = inlineEditValue || null;
      }

      await apiFetch(`/students/${studentId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      addToast(
        `Student "${studentName}" ${inlineEditField === "status" ? "status" : "class section"} updated`,
        "success"
      );
      setInlineEditingId(null);
      setInlineEditField(null);
      setInlineEditValue("");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to update student";
      addToast(errorMsg, "error");
    } finally {
      setInlineUpdating(false);
    }
  }

  function openForm(student?: Student) {
    if (student) {
      setEditingId(student.id);
      setFormData({
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNo: student.admissionNo,
        dateOfBirth: (student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split("T")[0] : "") as string,
        classSectionId: student.classSectionId || "",
        enrollmentStatus: (student.enrollmentStatus as any) || "ENROLLED",
      });
    } else {
      setEditingId(null);
      setFormData({
        firstName: "",
        lastName: "",
        admissionNo: "",
        dateOfBirth: "",
        classSectionId: "",
        enrollmentStatus: "ENROLLED",
      });
    }
    setFormError(undefined);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Students</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {students.length} {students.length === 1 ? "student" : "students"} enrolled
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => openForm()} className="flex items-center gap-2">
            <PlusIcon />
            Add Student
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? "Edit Student" : "Add New Student"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="First Name" required error={!formData.firstName && formError ? "Required" : undefined}>
                  <Input
                    id="first-name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g., Aarav"
                    disabled={submitting}
                  />
                </FormField>
                <FormField label="Last Name" required error={!formData.lastName && formError ? "Required" : undefined}>
                  <Input
                    id="last-name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g., Sharma"
                    disabled={submitting}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Admission Number" required hint={editingId ? "Cannot change admission number" : undefined} error={!formData.admissionNo && formError ? "Required" : undefined}>
                  <Input
                    id="admission"
                    value={formData.admissionNo}
                    onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                    placeholder="e.g., ADM1001"
                    disabled={submitting || !!editingId}
                  />
                </FormField>
                <FormField label="Date of Birth">
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    disabled={submitting}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Class Section">
                  <select
                    id="class-section"
                    value={formData.classSectionId}
                    onChange={(e) => setFormData({ ...formData, classSectionId: e.target.value })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={submitting || loadingSections}
                  >
                    <option value="">Select a class and section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.classLevel?.name} - {s.name} ({s.academicYear?.name})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Enrollment Status">
                  <select
                    id="enrollment"
                    value={formData.enrollmentStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        enrollmentStatus: e.target.value as any,
                      })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={submitting}
                  >
                    <option value="ENROLLED">Enrolled</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="GRADUATED">Graduated</option>
                    <option value="TRANSFERRED">Transferred</option>
                  </select>
                </FormField>
              </div>

              {formError && <ErrorMessage message={formError} />}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : editingId ? "Update Student" : "Add Student"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          {students.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Admission No.</th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left font-semibold text-foreground">Class Section</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-center font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-foreground font-medium">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{s.admissionNo}</td>
                    <td className="hidden sm:table-cell px-6 py-4 text-sm">
                      {inlineEditingId === s.id && inlineEditField === "classSection" ? (
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            placeholder={s.classSection?.name || "Class section"}
                            className="h-8 text-xs flex-1"
                            disabled={inlineUpdating}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleInlineUpdate(s.id, `${s.firstName} ${s.lastName}`)}
                            disabled={inlineUpdating}
                            className="h-8 px-2"
                          >
                            <CheckIcon />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setInlineEditingId(null);
                              setInlineEditField(null);
                              setInlineEditValue("");
                            }}
                            disabled={inlineUpdating}
                            className="h-8 px-2"
                          >
                            <CloseIcon />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 group">
                          <span className="text-foreground">{s.classSection?.name || "—"}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setInlineEditingId(s.id);
                              setInlineEditField("classSection");
                              setInlineEditValue(s.classSectionId || "");
                            }}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <PencilIcon />
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {inlineEditingId === s.id && inlineEditField === "status" ? (
                        <div className="flex gap-2">
                          <select
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            className="h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            disabled={inlineUpdating}
                          >
                            <option value="ENROLLED">Enrolled</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="GRADUATED">Graduated</option>
                            <option value="TRANSFERRED">Transferred</option>
                          </select>
                          <Button
                            size="sm"
                            onClick={() => handleInlineUpdate(s.id, `${s.firstName} ${s.lastName}`)}
                            disabled={inlineUpdating}
                            className="h-8 px-2"
                          >
                            <CheckIcon />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setInlineEditingId(null);
                              setInlineEditField(null);
                              setInlineEditValue("");
                            }}
                            disabled={inlineUpdating}
                            className="h-8 px-2"
                          >
                            <CloseIcon />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 group">
                          <StatusBadge
                            status={(s.enrollmentStatus || "").toLowerCase()}
                            variant={s.enrollmentStatus === "ENROLLED" ? "success" : s.enrollmentStatus === "INACTIVE" ? "default" : "info"}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setInlineEditingId(s.id);
                              setInlineEditField("status");
                              setInlineEditValue(s.enrollmentStatus || "");
                            }}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <PencilIcon />
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openForm(s)}
                          className="h-8 w-8 p-0 text-foreground hover:bg-muted"
                        >
                          <EditIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(s.id, `${s.firstName} ${s.lastName}`)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          ✕
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<UsersIcon />}
              title="No students yet"
              description="Add your first student to get started managing attendance, grades, and communications"
              action={{ label: "Add the first student", onClick: () => openForm() }}
            />
          )}
        </div>
      </Card>

      {note && (
        <Alert variant="destructive">
          <AlertDescription>{note}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

type ClassSection = {
  id: string;
  name: string;
  classLevel: { name: string };
  _count: { students: number };
};

type AttendanceStudent = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
};

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

function TeachersView({ membership }: { membership: any }) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!membership) return;

    let mounted = true;
    setLoading(true);
    apiFetch<{ items: any[] }>("/teachers", { tenantId: membership.tenantId })
      .then((r) => {
        if (mounted) setTeachers(r.items);
      })
      .catch(() => {
        if (mounted) setTeachers([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [membership?.tenantId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Teachers</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage teachers in your school</p>
        </div>
        <Button className="flex items-center gap-2">
          <PlusIcon />
          Add Teacher
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <LoadingState message="Loading teachers…" />
          </CardContent>
        </Card>
      ) : teachers.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left font-semibold">Phone</th>
                  <th className="px-6 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{teacher.displayName}</td>
                    <td className="hidden sm:table-cell px-6 py-4 font-mono text-xs text-muted-foreground">{teacher.phone}</td>
                    <td className="px-6 py-4 text-center">
                      <Button size="sm" variant="ghost" className="text-xs">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<UsersIcon />}
              title="No teachers yet"
              description="Add teachers to manage classes, mark attendance, and communicate with parents"
              action={{ label: "Add the first teacher", onClick: () => {} }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ClassesView({ membership }: { membership: any }) {
  const [sections, setSections] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<"year" | "level" | "section">("year");

  // Form state
  const [yearValue, setYearValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [levelName, setLevelName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");

  // Mode tracking
  const [yearMode, setYearMode] = useState<"new" | "existing">("existing");
  const [levelMode, setLevelMode] = useState<"new" | "existing">("existing");
  const [formError, setFormError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  useEffect(() => {
    if (!membership) return;
    let mounted = true;
    setLoading(true);

    Promise.all([
      apiFetch<{ items: any[] }>("/class-sections", { tenantId: membership.tenantId }),
      apiFetch<{ items: any[] }>("/class-levels", { tenantId: membership.tenantId }),
      apiFetch<{ items: any[] }>("/academic-years", { tenantId: membership.tenantId }),
    ])
      .then(([sectionsRes, levelsRes, yearsRes]) => {
        if (mounted) {
          setSections(sectionsRes.items);
          setLevels(levelsRes.items);
          setYears(yearsRes.items);
        }
      })
      .catch(() => {
        if (mounted) {
          setSections([]);
          setLevels([]);
          setYears([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [membership?.tenantId]);

  const handleYearNext = async () => {
    setFormError(undefined);
    if (yearMode === "existing") {
      if (!selectedYearId) {
        setFormError("Please select an academic year");
        return;
      }
      setFormStep("level");
    } else {
      if (!yearValue || !startDate || !endDate) {
        setFormError("Please fill in all fields");
        return;
      }
      if (years.some((y) => y.name === yearValue)) {
        setFormError(`Academic year "${yearValue}" already exists`);
        return;
      }
      try {
        const res = await apiFetch<any>("/academic-years", {
          tenantId: membership.tenantId,
          method: "POST",
          body: JSON.stringify({ year: yearValue, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString() }),
        });
        setYears([...years, res]);
        setSelectedYearId(res.id);
        setYearValue("");
        setStartDate("");
        setEndDate("");
        setFormStep("level");
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Failed to create academic year";
        setFormError(errorMsg.includes("Unique constraint") ? `Academic year "${yearValue}" already exists for this school` : errorMsg);
      }
    }
  };

  const handleLevelNext = async () => {
    setFormError(undefined);
    if (levelMode === "existing") {
      if (!selectedLevelId) {
        setFormError("Please select a class level");
        return;
      }
      setFormStep("section");
    } else {
      if (!levelName) {
        setFormError("Please enter a class name");
        return;
      }
      if (levels.some((l) => l.name === levelName)) {
        setFormError(`Class level "${levelName}" already exists`);
        return;
      }
      try {
        const res = await apiFetch<any>("/class-levels", {
          tenantId: membership.tenantId,
          method: "POST",
          body: JSON.stringify({ name: levelName, rank: levels.length + 1 }),
        });
        setLevels([...levels, res]);
        setSelectedLevelId(res.id);
        setLevelName("");
        setFormStep("section");
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Failed to create class level";
        setFormError(errorMsg.includes("Unique constraint") ? `Class level "${levelName}" already exists for this school` : errorMsg);
      }
    }
  };

  const handleSectionSubmit = async () => {
    setFormError(undefined);
    if (!sectionName || !selectedLevelId || !selectedYearId) {
      setFormError("Please fill in all fields");
      return;
    }

    if (sections.some((s) => s.classLevelId === selectedLevelId && s.academicYearId === selectedYearId && s.name === sectionName)) {
      setFormError(`Section "${sectionName}" already exists for this class and year`);
      return;
    }

    try {
      const res = await apiFetch<any>("/class-sections", {
        tenantId: membership.tenantId,
        method: "POST",
        body: JSON.stringify({ classLevelId: selectedLevelId, academicYearId: selectedYearId, name: sectionName }),
      });
      setSections([...sections, res]);
      setSectionName("");
      setSelectedLevelId("");
      setSelectedYearId("");
      setShowForm(false);
      setFormStep("year");
      setYearMode("existing");
      setLevelMode("existing");
      setSuccessMessage("Section created successfully");
      setTimeout(() => setSuccessMessage(undefined), 3000);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to create section";
      setFormError(errorMsg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Classes & Sections</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage class hierarchy</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <PlusIcon />
          {showForm ? "Cancel" : "Add Class"}
        </Button>
      </div>

      {successMessage && <SuccessMessage message={successMessage} />}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {formStep === "year" ? "Step 1: Academic Year" : formStep === "level" ? "Step 2: Class Level" : "Step 3: Section"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && <ErrorMessage message={formError} />}
            {formStep === "year" && (
              <>
                <div className="space-y-3">
                  <Label>Select or create an academic year</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="yearExisting"
                        name="yearMode"
                        value="existing"
                        checked={yearMode === "existing"}
                        onChange={() => {
                          setYearMode("existing");
                          setYearValue("");
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="yearExisting" className="cursor-pointer font-normal">Use existing</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="yearNew"
                        name="yearMode"
                        value="new"
                        checked={yearMode === "new"}
                        onChange={() => {
                          setYearMode("new");
                          setSelectedYearId("");
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="yearNew" className="cursor-pointer font-normal">Create new</Label>
                    </div>
                  </div>
                </div>

                {yearMode === "existing" ? (
                  <div>
                    <Label htmlFor="yearSelect">Select Academic Year</Label>
                    <select id="yearSelect" value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground">
                      <option value="">Choose an academic year</option>
                      {years.map((y) => (
                        <option key={y.id} value={y.id}>{y.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="yearValue">Academic Year</Label>
                      <Input id="yearValue" placeholder="e.g., 2024-25" value={yearValue} onChange={(e) => setYearValue(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </>
                )}

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button onClick={handleYearNext}>Next</Button>
                </div>
              </>
            )}

            {formStep === "level" && (
              <>
                <div className="space-y-3">
                  <Label>Select or create a class level</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="levelExisting"
                        name="levelMode"
                        value="existing"
                        checked={levelMode === "existing"}
                        onChange={() => {
                          setLevelMode("existing");
                          setLevelName("");
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="levelExisting" className="cursor-pointer font-normal">Use existing</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="levelNew"
                        name="levelMode"
                        value="new"
                        checked={levelMode === "new"}
                        onChange={() => {
                          setLevelMode("new");
                          setSelectedLevelId("");
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="levelNew" className="cursor-pointer font-normal">Create new</Label>
                    </div>
                  </div>
                </div>

                {levelMode === "existing" ? (
                  <div>
                    <Label htmlFor="levelSelect">Select Class Level</Label>
                    <select id="levelSelect" value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground">
                      <option value="">Choose a class level</option>
                      {levels.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="levelName">Class Name</Label>
                    <Input id="levelName" placeholder="e.g., Grade 9" value={levelName} onChange={(e) => setLevelName(e.target.value)} />
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => setFormStep("year")}>Back</Button>
                  <Button onClick={handleLevelNext}>Next</Button>
                </div>
              </>
            )}

            {formStep === "section" && (
              <>
                <div>
                  <Label htmlFor="levelSelect">Class</Label>
                  <select id="levelSelect" value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground">
                    <option value="">Select a class</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="yearSelect">Academic Year</Label>
                  <select id="yearSelect" value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground">
                    <option value="">Select a year</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="sectionName">Section Name</Label>
                  <Input id="sectionName" placeholder="e.g., Section A" value={sectionName} onChange={(e) => setSectionName(e.target.value)} />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => setFormStep("level")}>Back</Button>
                  <Button onClick={handleSectionSubmit}>Create Section</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <LoadingState message="Loading classes…" />
          </CardContent>
        </Card>
      ) : sections.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left font-semibold">Class</th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left font-semibold">Section</th>
                  <th className="px-6 py-3 text-left font-semibold">Year</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <tr key={section.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{section.classLevel?.name}</td>
                    <td className="hidden sm:table-cell px-6 py-4">{section.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{section.academicYear?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<BookIcon />}
              title="No classes yet"
              description="Create academic years, class levels, and sections to organize your school structure"
              action={{ label: "Create the first class", onClick: () => setShowForm(true) }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CommunicationView({ membership }: { membership: any }) {
  const [tab, setTab] = useState<"suggestions" | "send" | "templates" | "history">("suggestions");
  const [templates, setTemplates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  // Form state for sending messages
  const [templateId, setTemplateId] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [recipientRole, setRecipientRole] = useState("PARENT");
  const [channel, setChannel] = useState("WHATSAPP");
  const [scheduleDate, setScheduleDate] = useState("");

  // AI suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestChannel, setSuggestChannel] = useState("WHATSAPP");
  const [suggestMsg, setSuggestMsg] = useState<string>();

  // Form state for creating templates
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("UPDATE");
  const [templateContent, setTemplateContent] = useState("");
  const [templateChannel, setTemplateChannel] = useState("WHATSAPP");

  useEffect(() => {
    if (!membership) return;
    let mounted = true;

    Promise.all([
      apiFetch<{ items: any[] }>("/communication/templates", { tenantId: membership.tenantId }),
      apiFetch<{ items: any[] }>("/communication/history", { tenantId: membership.tenantId }),
    ])
      .then(([templatesRes, historyRes]) => {
        if (mounted) {
          setTemplates(templatesRes.items);
          setHistory(historyRes.items);
        }
      })
      .catch(() => {
        if (mounted) {
          setTemplates([]);
          setHistory([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [membership?.tenantId]);

  const handleCreateTemplate = async () => {
    setError(undefined);
    if (!templateName || !templateContent) {
      setError("Template name and content are required");
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch<any>("/communication/templates", {
        tenantId: membership.tenantId,
        method: "POST",
        body: JSON.stringify({
          type: templateType,
          channel: templateChannel,
          content: templateContent,
          name: templateName,
          recipientRole: "ALL",
        }),
      });
      setTemplates([...templates, res]);
      setTemplateName("");
      setTemplateContent("");
      setTemplateType("UPDATE");
      setTemplateChannel("WHATSAPP");
      setSuccess("Template created successfully");
      setTimeout(() => setSuccess(undefined), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async () => {
    setError(undefined);
    if (!customMessage && !templateId) {
      setError("Please select a template or enter a message");
      return;
    }
    setSending(true);
    try {
      const res = await apiFetch<any>("/communication/send", {
        tenantId: membership.tenantId,
        method: "POST",
        body: JSON.stringify({
          templateId: templateId || undefined,
          customContent: customMessage || undefined,
          recipientRole,
          channel,
          scheduleFor: scheduleDate || undefined,
        }),
      });
      setHistory([res, ...history]);
      setCustomMessage("");
      setTemplateId("");
      setSuccess(scheduleDate ? "Message scheduled successfully" : "Message sent successfully");
      setTimeout(() => setSuccess(undefined), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    setSuggestMsg(undefined);
    setSuggestions([]);
    try {
      const res = await apiFetch<{ suggestions: any[]; message?: string }>(
        `/ai/communication/suggestions?days=30&channel=${suggestChannel}`,
        { tenantId: membership.tenantId }
      );
      setSuggestions(res.suggestions ?? []);
      if (!res.suggestions?.length) setSuggestMsg(res.message ?? "No upcoming events found for the next 30 days.");
    } catch (e) {
      setSuggestMsg(e instanceof Error ? e.message : "AI service unavailable");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const useSuggestion = (s: any) => {
    setCustomMessage(s.message ?? "");
    setRecipientRole(s.recipientRole ?? "PARENT");
    setTab("send");
  };

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <div>
        <h2 className="text-2xl font-semibold text-foreground">Communication</h2>
        <p className="mt-1 text-sm text-muted-foreground">Send notifications and messages to parents, teachers, and students</p>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {(["suggestions", "send", "templates", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              tab === t ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "suggestions" && <SparklesIcon />}
            {t === "suggestions" ? "AI Suggestions" : t === "send" ? "Send Message" : t === "templates" ? "Templates" : "History"}
          </button>
        ))}
      </div>

      {tab === "suggestions" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-accent" />
                  AI Communication Suggestions
                </CardTitle>
                <CardDescription>
                  AI analyses your upcoming school events and suggests ready-to-send notifications
                </CardDescription>
              </div>
              <select
                value={suggestChannel}
                onChange={(e) => setSuggestChannel(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground shrink-0"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={fetchSuggestions} disabled={loadingSuggestions} className="w-full sm:w-auto">
              {loadingSuggestions ? "Generating…" : "Generate Suggestions"}
            </Button>

            {suggestMsg && (
              <p className="text-sm text-muted-foreground">{suggestMsg}</p>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{s.eventTitle}</p>
                      <span className={`shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        s.priority === "HIGH"
                          ? "bg-destructive/10 text-destructive"
                          : s.priority === "MEDIUM"
                          ? "bg-accent/10 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {s.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.message}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">To: {s.recipientRole?.toLowerCase()}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => useSuggestion(s)}
                        className="ml-auto"
                      >
                        Use this
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "send" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Send Message</CardTitle>
            <CardDescription>Send notifications to your school community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField label="Use Template (Optional)">
              <select
                id="useTemplate"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground"
              >
                <option value="">Custom Message</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </FormField>

            {!templateId && (
              <FormField label="Message" required>
                <textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm h-24 bg-background text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </FormField>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Send To">
                <select
                  id="recipient"
                  value={recipientRole}
                  onChange={(e) => setRecipientRole(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="PARENT">Parents</option>
                  <option value="TEACHER">Teachers</option>
                  <option value="STUDENT">Students</option>
                  <option value="ALL">All</option>
                </select>
              </FormField>

              <FormField label="Channel">
                <select
                  id="channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">Email</option>
                </select>
              </FormField>
            </div>

            <FormField label="Schedule (Optional)" hint="Leave empty to send immediately">
              <Input
                id="schedule"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </FormField>

            <Button onClick={handleSendMessage} disabled={sending} className="w-full">
              {sending ? "Sending…" : scheduleDate ? "Schedule Message" : "Send Now"}
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "templates" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Message Templates</CardTitle>
            <CardDescription>Create reusable message templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-6 border-b border-border pb-6 mb-6">
              <FormField label="Template Name" required>
                <Input
                  id="templateName"
                  placeholder="e.g., Holiday Announcement"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  disabled={creating}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Type">
                  <select
                    id="type"
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={creating}
                  >
                    <option value="UPDATE">Update</option>
                    <option value="HOLIDAY">Holiday</option>
                    <option value="CLOSURE">Closure</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </FormField>

                <FormField label="Channel">
                  <select
                    id="tplChannel"
                    value={templateChannel}
                    onChange={(e) => setTemplateChannel(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={creating}
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Template Content" required hint="Use {{variable}} for placeholders (e.g., {{schoolName}}, {{date}})">
                <textarea
                  id="templateContent"
                  placeholder="Dear {{name}}, {{schoolName}} will be closed on {{date}} due to {{reason}}."
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm h-20 bg-background text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={creating}
                />
              </FormField>

              <Button onClick={handleCreateTemplate} disabled={creating} className="w-full">
                {creating ? "Creating…" : "Create Template"}
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-sm mb-4">Existing Templates</h3>
              {templates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left font-semibold">Type</th>
                        <th className="px-4 py-3 text-left font-semibold">Channel</th>
                        <th className="px-4 py-3 text-center font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((t) => (
                        <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{t.name}</td>
                          <td className="hidden sm:table-cell px-4 py-3 text-xs text-muted-foreground">{t.type}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{t.channel}</td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedTemplate(t)}
                              className="text-xs"
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No templates created yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first template above to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Message History</CardTitle>
            <CardDescription>View all sent and scheduled messages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((msg) => (
                  <div key={msg.id} className="p-4 border border-border rounded-md text-sm hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{msg.recipientRole}</p>
                          <StatusBadge
                            status={msg.status.toLowerCase()}
                            variant={msg.status === "SENT" ? "success" : msg.status === "SCHEDULED" ? "info" : msg.status === "FAILED" ? "destructive" : "default"}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{msg.channel} · {msg.recipientCount} recipients</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No messages sent yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Messages you send will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                <CardDescription>
                  {selectedTemplate.type} · {selectedTemplate.channel}
                </CardDescription>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Template Content</p>
                <div className="mt-2 p-3 bg-muted rounded-md border border-border text-sm whitespace-pre-wrap">
                  {selectedTemplate.content}
                </div>
              </div>

              {selectedTemplate.content.includes("{{") && (
                <div>
                  <p className="text-sm font-medium">Available Variables</p>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>Use these placeholders in your template:</p>
                    <ul className="list-disc pl-5 font-mono text-xs">
                      <li>{'{{schoolName}}'} - School name</li>
                      <li>{'{{date}}'} - Current date</li>
                      <li>{'{{time}}'} - Current time</li>
                      <li>{'{{reason}}'} - Custom reason</li>
                      <li>{'{{name}}'} - Recipient name</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setTemplateId(selectedTemplate.id);
                  setTab("send");
                  setSelectedTemplate(null);
                }}>
                  Use This Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MembersView({ membership }: { membership: any }) {
  const [tab, setTab] = useState<"pending" | "invite">("pending");
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", role: "TEACHER" });
  const [invites, setInvites] = useState<any[]>([]);
  const [formError, setFormError] = useState<string>();
  const [selectedRole, setSelectedRole] = useState<string>("TEACHER");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string>();

  useEffect(() => {
    if (!membership) return;
    let mounted = true;
    setLoading(true);

    apiFetch<{ items: any[] }>("/pending-members", { tenantId: membership.tenantId })
      .then((res) => {
        if (mounted) setPendingMembers(res.items);
      })
      .catch(() => {
        if (mounted) setPendingMembers([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [membership?.tenantId]);

  const handleAddInvite = () => {
    if (!formData.phone || !formData.name) {
      setFormError("Please fill in all fields");
      return;
    }
    setFormError(undefined);

    // Add to local list
    setInvites([
      ...invites,
      {
        id: Math.random().toString(),
        phone: formData.phone,
        name: formData.name,
        role: formData.role,
        link: null,
        status: "pending",
      },
    ]);

    setFormData({ name: "", phone: "", role: "TEACHER" });
  };

  const handleRemoveInvite = (id: string) => {
    setInvites(invites.filter((inv) => inv.id !== id));
  };

  const handleGenerateLinks = async () => {
    try {
      const updatedInvites = await Promise.all(
        invites
          .filter((inv) => !inv.link)
          .map(async (inv) => {
            try {
              const res = await apiFetch<any>("/invites", {
                tenantId: membership.tenantId,
                method: "POST",
                body: JSON.stringify({ phone: inv.phone }),
              });
              return { ...inv, link: res.inviteLink, status: "sent" };
            } catch (e) {
              return { ...inv, status: "error", error: e instanceof Error ? e.message : "Failed" };
            }
          })
      );

      setInvites([
        ...invites.filter((inv) => inv.link),
        ...updatedInvites,
      ]);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to generate links");
    }
  };

  const handleApprove = async (memberId: string) => {
    setApprovingId(memberId);
    setFormError(undefined);
    try {
      await apiFetch(`/members/${memberId}/approve`, {
        tenantId: membership.tenantId,
        method: "POST",
        body: JSON.stringify({ role: selectedRole }),
      });
      setPendingMembers(pendingMembers.filter((m) => m.id !== memberId));
      setSuccess("Member approved successfully");
      setTimeout(() => setSuccess(undefined), 3000);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to approve member");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {formError && <ErrorMessage message={formError} />}
      {success && <SuccessMessage message={success} />}

      <div>
        <h2 className="text-2xl font-semibold text-foreground">Members</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage school members and invitations</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(["pending", "invite"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              tab === t ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "pending" ? `Pending Approval (${pendingMembers.length})` : `Send Invites (${invites.length})`}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Member Approvals</CardTitle>
            <CardDescription>Users who have registered and are waiting for approval</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState message="Loading pending members…" />
            ) : pendingMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold">Joined</th>
                      <th className="px-4 py-3 text-left font-semibold">Role</th>
                      <th className="px-4 py-3 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingMembers.map((member) => (
                      <tr key={member.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{member.displayName || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{member.phone}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(member.joinedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="h-8 px-2 border border-input rounded-md text-xs bg-background text-foreground"
                          >
                            <option value="TEACHER">Teacher</option>
                            <option value="PARENT">Parent</option>
                            <option value="STAFF">Staff</option>
                            <option value="PRINCIPAL">Principal</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(member.id)}
                            disabled={approvingId === member.id}
                            className="h-8"
                          >
                            {approvingId === member.id ? "…" : "Approve"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No pending approvals</p>
                <p className="text-xs text-muted-foreground mt-1">Members will appear here when they request to join</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "invite" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Members</CardTitle>
              <CardDescription>Enter details and generate invite links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Full Name" required>
                  <Input
                    id="name"
                    placeholder="e.g., John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </FormField>
                <FormField label="Phone (E.164)" required>
                  <Input
                    id="phone"
                    placeholder="+919876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    inputMode="tel"
                  />
                </FormField>
                <FormField label="Role">
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 px-3 border border-input rounded-md text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="TEACHER">Teacher</option>
                    <option value="PARENT">Parent</option>
                    <option value="STAFF">Staff</option>
                    <option value="PRINCIPAL">Principal</option>
                  </select>
                </FormField>
              </div>
              <Button onClick={handleAddInvite} className="w-full">+ Add to List</Button>
            </CardContent>
          </Card>

          {invites.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Pending Invites ({invites.length})</CardTitle>
                    <CardDescription>Generate and share links with these members</CardDescription>
                  </div>
                  {invites.some((inv) => !inv.link) && (
                    <Button onClick={handleGenerateLinks} className="ml-4">
                      Generate All Links
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div key={invite.id} className="border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-foreground">{invite.name}</p>
                          <p className="text-xs text-muted-foreground">{invite.phone} • {invite.role}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveInvite(invite.id)}
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        >
                          ✕
                        </Button>
                      </div>
                      {invite.link ? (
                        <div
                          className="bg-muted p-3 rounded text-xs font-mono break-all cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(invite.link);
                            setSuccess("Invite link copied to clipboard");
                            setTimeout(() => setSuccess(undefined), 2000);
                          }}
                          title="Click to copy invite link"
                        >
                          {invite.link}
                        </div>
                      ) : invite.status === "error" ? (
                        <div className="bg-destructive/10 border border-destructive/30 rounded p-2">
                          <p className="text-xs text-destructive">Error: {invite.error}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Click "Generate All Links" to create invite</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function FinanceView({ membership }: { membership: any }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Finance</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage fees, payments, and expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Total Fees</p>
                <p className="text-2xl font-semibold text-foreground font-mono">₹2,45,000</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <WalletIcon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Collected</p>
                <p className="text-2xl font-semibold text-foreground font-mono">₹1,80,000</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <WalletIcon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Pending</p>
                <p className="text-2xl font-semibold text-destructive font-mono">₹65,000</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <WalletIcon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance Management</CardTitle>
          <CardDescription>Manage fee structures, payments, and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-center">Manage Fee Structures</Button>
            <Button variant="outline" className="justify-center">Record Payment</Button>
            <Button variant="outline" className="justify-center">Track Expenses</Button>
            <Button variant="outline" className="justify-center">View Reports</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceView({ membership }: { membership: any }) {
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const statusColors: Record<AttendanceStatus, string> = {
    PRESENT: "bg-accent/10 text-accent border-accent/30",
    ABSENT: "bg-destructive/10 text-destructive border-destructive/30",
    LATE: "bg-foreground/10 text-foreground border-foreground/30",
    EXCUSED: "bg-muted text-muted-foreground border-muted",
  };

  function addToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    loadClassSections();
  }, []);

  async function loadClassSections() {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: ClassSection[] }>("/class-sections", { tenantId: membership.tenantId });
      setClassSections(res.items);
      if (res.items.length > 0) {
        setSelectedSection(res.items[0]!.id);
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to load class sections", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedSection) {
      loadStudents();
    }
  }, [selectedSection, attendanceDate]);

  async function loadStudents() {
    try {
      const res = await apiFetch<{ items: AttendanceStudent[] }>(
        `/class-sections/${selectedSection}/students-for-attendance`,
        { tenantId: membership.tenantId }
      );
      setStudents(res.items);
      setAttendance({});
      setCurrentIndex(0);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to load students", "error");
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedSection || students.length === 0) return;

      const key = e.key.toUpperCase();
      const statusMap: Record<string, AttendanceStatus> = {
        P: "PRESENT",
        A: "ABSENT",
        L: "LATE",
        E: "EXCUSED",
      };

      if (key in statusMap) {
        e.preventDefault();
        const status = statusMap[key]!;
        const studentId = students[currentIndex]?.id;
        if (studentId) {
          setAttendance((prev) => ({ ...prev, [studentId]: status }));
          // Move to next student
          if (currentIndex < students.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
        }
      } else if (key === "ARROWDOWN" || key === "ARROWRIGHT") {
        e.preventDefault();
        if (currentIndex < students.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      } else if (key === "ARROWUP" || key === "ARROWLEFT") {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, selectedSection, students]);

  async function handleSubmit() {
    if (!selectedSection || Object.keys(attendance).length === 0) {
      addToast("Please mark attendance for at least one student", "error");
      return;
    }

    setSubmitting(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
        clientRecordId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      }));

      await apiFetch("/attendance", {
        method: "POST",
        body: JSON.stringify({
          classSectionId: selectedSection,
          date: attendanceDate,
          records,
        }),
        tenantId: membership.tenantId,
      });

      addToast(
        `Attendance submitted for ${records.length} student${records.length !== 1 ? "s" : ""}`,
        "success"
      );
      setAttendance({});
      setCurrentIndex(0);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to submit attendance", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStudent = students[currentIndex];
  const section = classSections.find((s) => s.id === selectedSection);

  return (
    <div className="space-y-4 pb-12">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Mobile-First Header */}
      <div className="space-y-3 md:space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground md:text-2xl">Attendance</h3>
          <p className="text-sm text-muted-foreground">Mark attendance with keyboard: P=Present, A=Absent, L=Late, E=Excused</p>
        </div>

        {/* Class Section & Date Selectors - Stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Class Section">
            <select
              id="section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={loading}
            >
              <option value="">Select a class...</option>
              {classSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.classLevel.name} - {s.name} ({s._count.students} students)
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Date">
            <Input
              id="date"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full h-10"
            />
          </FormField>
        </div>
      </div>

      {/* Student List - Mobile-First Vertical Stack */}
      {!loading && students.length > 0 && (
        <div className="space-y-2 md:space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {Object.keys(attendance).length} of {students.length} marked
              </span>
              <span>Current: {currentIndex + 1}/{students.length}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent h-full transition-all"
                style={{ width: `${(Object.keys(attendance).length / students.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Student Cards - Large touch targets for mobile */}
          <div className="space-y-2">
            {students.map((student, index) => {
              const isCurrentStudent = index === currentIndex;
              const status = attendance[student.id];
              const isMarked = !!status;

              return (
                <button
                  key={student.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-full p-3 md:p-4 rounded-lg border-2 transition-all text-left ${
                    isCurrentStudent
                      ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                      : isMarked
                        ? `border ${statusColors[status]}`
                        : "border-border hover:border-accent/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{student.admissionNo}</p>
                    </div>
                    {isMarked ? (
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm ${statusColors[status]}`}
                      >
                        {status[0]}
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">
                        —
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Status Buttons - Large for mobile touch */}
          {currentStudent && (
            <Card className="sticky bottom-0 bg-card/95 backdrop-blur">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground text-center">
                    {currentStudent.firstName} {currentStudent.lastName}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((status) => (
                      <Button
                        key={status}
                        onClick={() => {
                          setAttendance((prev) => ({ ...prev, [currentStudent.id]: status }));
                          if (currentIndex < students.length - 1) {
                            setCurrentIndex(currentIndex + 1);
                          }
                        }}
                        variant={attendance[currentStudent.id] === status ? "default" : "outline"}
                        className={`h-12 md:h-10 text-xs md:text-sm font-semibold ${
                          attendance[currentStudent.id] === status ? statusColors[status] : ""
                        }`}
                      >
                        {status[0]} ({status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : status === "LATE" ? "L" : "E"})
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(attendance).length === 0}
            className="w-full h-12 md:h-10 font-semibold"
          >
            {submitting ? "Submitting..." : `Submit Attendance (${Object.keys(attendance).length})`}
          </Button>
        </div>
      )}

      {!loading && students.length === 0 && selectedSection && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<UsersIcon />}
              title="No students in this class"
              description="This class section has no enrolled students yet. Add students to start marking attendance."
            />
          </CardContent>
        </Card>
      )}

      {!selectedSection && !loading && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              title="Select a class section"
              description="Choose a class section and date to begin marking attendance for your students"
            />
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12">
            <LoadingState message="Loading class sections…" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type Tenant = {
  id: string;
  name: string;
  slug: string;
  schoolCode: string;
  status: string;
  createdAt: string;
  _count: { memberships: number; students: number };
  adminPhone?: string;
  adminName?: string;
};

type SchoolFormData = {
  schoolName: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
};

type UserWithRoles = {
  id: string;
  phone: string;
  displayName: string;
  roles: Array<{ role: "APP_ADMIN" | "APP_SUPPORT"; grantedAt: string }>;
};

function RoleManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [grantingPhone, setGrantingPhone] = useState("");
  const [grantingRole, setGrantingRole] = useState<"APP_ADMIN" | "APP_SUPPORT">("APP_ADMIN");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: UserWithRoles[] }>("/admin/users/with-roles");
      setUsers(res.items);
    } catch (e) {
      addToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGrantRole() {
    if (!grantingPhone.trim()) {
      addToast("Phone number required", "error");
      return;
    }
    try {
      await apiFetch("/admin/users/roles/grant", {
        method: "POST",
        body: JSON.stringify({ phone: grantingPhone, role: grantingRole }),
      });
      addToast(`Role ${grantingRole} granted to ${grantingPhone}`, "success");
      setGrantingPhone("");
      loadUsers();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to grant role", "error");
    }
  }

  async function handleRevokeRole(phone: string, role: string) {
    setRevoking(`${phone}-${role}`);
    try {
      await apiFetch("/admin/users/roles/revoke", {
        method: "POST",
        body: JSON.stringify({ phone, role }),
      });
      addToast(`Role ${role} revoked from ${phone}`, "success");
      loadUsers();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to revoke role", "error");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={() => {}} />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Roles & Users</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage app-level and tenant-level roles</p>
      </div>

      {/* Grant Role Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Grant App-Level Role</CardTitle>
          <CardDescription>Assign APP_ADMIN or APP_SUPPORT role to a user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="User Phone" required>
              <Input
                id="grant-phone"
                value={grantingPhone}
                onChange={(e) => setGrantingPhone(e.target.value)}
                placeholder="+919876543210"
                inputMode="tel"
              />
            </FormField>
            <FormField label="Role">
              <select
                id="grant-role"
                value={grantingRole}
                onChange={(e) => setGrantingRole(e.target.value as "APP_ADMIN" | "APP_SUPPORT")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="APP_ADMIN">App Admin</option>
                <option value="APP_SUPPORT">App Support</option>
              </select>
            </FormField>
            <div className="flex items-end">
              <Button onClick={handleGrantRole} className="w-full h-10">
                Grant Role
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <LoadingState message="Loading users…" />
          </CardContent>
        </Card>
      ) : users.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="hidden sm:table-cell px-6 py-3 text-left font-semibold text-foreground">Phone</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Display Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Roles</th>
                  <th className="px-6 py-3 text-center font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="hidden sm:table-cell px-6 py-4 font-mono text-xs text-muted-foreground">{user.phone}</td>
                    <td className="px-6 py-4 text-foreground">
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="sm:hidden text-xs font-mono text-muted-foreground">{user.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {user.roles.map((r) => (
                            <StatusBadge
                              key={r.role}
                              status={r.role.replace("APP_", "")}
                              variant="info"
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.roles.length > 0 && (
                        <div className="flex items-center justify-center gap-2">
                          {user.roles.map((r) => (
                            <Button
                              key={r.role}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRevokeRole(user.phone, r.role)}
                              disabled={revoking === `${user.phone}-${r.role}`}
                              className="h-8 px-2 text-destructive hover:bg-destructive/10"
                            >
                              {revoking === `${user.phone}-${r.role}` ? "…" : "Revoke"}
                            </Button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<UsersIcon />}
              title="No users with app-level roles yet"
              description="Use the form above to grant APP_ADMIN or APP_SUPPORT roles to users"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AdminPortal({
  user,
  theme,
  onThemeChange,
  onLogout,
}: {
  user: SessionUser;
  theme: "light" | "dark";
  onThemeChange: (t: "light" | "dark") => void;
  onLogout: () => void;
}) {
  const { language, setLanguage, t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SchoolFormData>({
    schoolName: "",
    adminFirstName: "",
    adminLastName: "",
    adminPhone: "",
    status: "TRIAL",
  });
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<"schools" | "roles">("schools");

  function addToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: Tenant[] }>("/admin/tenants");
      setTenants(res.items);
      setError(undefined);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to load schools";
      setError(errorMsg);
      addToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  }

  function openForm(tenant?: Tenant) {
    if (tenant) {
      setEditingId(tenant.id);
      setFormData({
        schoolName: tenant.name,
        adminFirstName: tenant.adminName?.split(" ")[0] || "",
        adminLastName: tenant.adminName?.split(" ").slice(1).join(" ") || "",
        adminPhone: tenant.adminPhone || "",
        status: (tenant.status as "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED") || "TRIAL",
      });
    } else {
      setEditingId(null);
      setFormData({
        schoolName: "",
        adminFirstName: "",
        adminLastName: "",
        adminPhone: "",
        status: "TRIAL",
      });
    }
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.schoolName || !formData.adminFirstName || !formData.adminLastName || !formData.adminPhone) {
      addToast("All fields are required", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await apiFetch(`/admin/tenants/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.schoolName,
            status: formData.status,
          }),
        });
        setTenants(
          tenants.map((t) =>
            t.id === editingId
              ? {
                  ...t,
                  name: formData.schoolName,
                  status: formData.status,
                }
              : t
          )
        );
        addToast(`School "${formData.schoolName}" updated successfully`, "success");
      } else {
        const res = await apiFetch<Tenant>("/admin/tenants", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        setTenants([res, ...tenants]);
        addToast(`School "${res.name}" created successfully`, "success");
      }
      setShowForm(false);
      setEditingId(null);
      setError(undefined);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to save school";
      setError(errorMsg);
      addToast(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(tenantId: string, tenantName: string) {
    if (!window.confirm(`Are you sure you want to delete "${tenantName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiFetch(`/admin/tenants/${tenantId}`, {
        method: "DELETE",
      });
      setTenants(tenants.filter((t) => t.id !== tenantId));
      addToast(`School "${tenantName}" deleted successfully`, "success");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to delete school";
      addToast(errorMsg, "error");
    }
  }

  async function handleUpdateAdminPhone(tenantId: string) {
    if (!newAdminPhone) {
      addToast("Please enter a phone number", "error");
      return;
    }

    setUpdatingPhone(true);
    try {
      const res = await apiFetch<{ adminName: string; adminPhone: string }>(
        `/admin/tenants/${tenantId}/admin-phone`,
        {
          method: "PATCH",
          body: JSON.stringify({ adminPhone: newAdminPhone }),
        }
      );
      setTenants(
        tenants.map((t) =>
          t.id === tenantId
            ? {
                ...t,
                adminPhone: res.adminPhone,
                adminName: res.adminName,
              }
            : t
        )
      );
      addToast("Admin phone number updated successfully", "success");
      setEditingPhoneId(null);
      setNewAdminPhone("");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to update phone";
      addToast(errorMsg, "error");
    } finally {
      setUpdatingPhone(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground font-semibold">
              A
            </div>
            <h1 className="text-lg font-semibold text-foreground">Admin Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user.displayName ?? user.phone}</p>
              <p className="text-xs text-muted-foreground">Platform Admin</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              className="text-muted-foreground text-xs font-medium"
              title={`Switch to ${language === "en" ? "Hindi" : "English"}`}
            >
              {language === "en" ? "हिंदी" : "EN"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
              className="text-muted-foreground"
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </Button>
            <Button variant="ghost" onClick={onLogout} className="text-sm">
              {t("nav.signOut", "Sign out")}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="space-y-6">
            {/* Tab Switcher */}
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab("schools")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "schools"
                    ? "border-b-accent text-foreground"
                    : "border-b-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Schools
              </button>
              <button
                onClick={() => setActiveTab("roles")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "roles"
                    ? "border-b-accent text-foreground"
                    : "border-b-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Roles & Users
              </button>
            </div>

            {/* Schools Tab */}
            {activeTab === "schools" && (
              <>
                {/* Header Section */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">Schools</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Manage all schools in your platform</p>
                  </div>
                  {!showForm && (
                    <Button onClick={() => openForm()} className="flex items-center gap-2">
                      <PlusIcon />
                      Add School
                    </Button>
                  )}
                </div>

                {/* Create/Edit Form */}
                {showForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingId ? "Edit School" : "Create New School"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {error && <ErrorMessage message={error} />}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="School Name" required>
                          <Input
                            id="school-name"
                            value={formData.schoolName}
                            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                            placeholder="e.g., St. Xavier's Academy"
                            disabled={submitting}
                          />
                        </FormField>

                        <FormField label="Status">
                          <select
                            id="status"
                            value={formData.status}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                status: e.target.value as "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED",
                              })
                            }
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            disabled={submitting}
                          >
                            <option value="TRIAL">Trial</option>
                            <option value="ACTIVE">Active</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </FormField>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Admin First Name" required>
                          <Input
                            id="admin-first"
                            value={formData.adminFirstName}
                            onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                            placeholder="e.g., John"
                            disabled={submitting}
                          />
                        </FormField>

                        <FormField label="Admin Last Name" required>
                          <Input
                            id="admin-last"
                            value={formData.adminLastName}
                            onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                            placeholder="e.g., Doe"
                            disabled={submitting}
                          />
                        </FormField>
                      </div>

                      <FormField label="Admin Phone" required hint={editingId ? "Phone cannot be changed for existing schools" : undefined}>
                        <Input
                          id="admin-phone"
                          value={formData.adminPhone}
                          onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                          placeholder="+919876543210"
                          inputMode="tel"
                          disabled={submitting || !!editingId}
                        />
                      </FormField>

                      <div className="flex gap-3 pt-2">
                        <Button type="submit" disabled={submitting}>
                          {submitting ? "Saving…" : editingId ? "Update School" : "Create School"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowForm(false);
                            setEditingId(null);
                            setError(undefined);
                          }}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
              </Card>
            )}

            {/* Schools Table */}
            {loading ? (
              <Card>
                <CardContent className="py-12">
                  <LoadingState message="Loading schools…" />
                </CardContent>
              </Card>
            ) : tenants.length > 0 ? (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-6 py-3 text-left font-semibold text-foreground">School Name</th>
                        <th className="hidden sm:table-cell px-6 py-3 text-left font-semibold text-foreground">Admin</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Phone</th>
                        <th className="hidden md:table-cell px-6 py-3 text-left font-semibold text-foreground">Code</th>
                        <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                        <th className="hidden md:table-cell px-6 py-3 text-center font-semibold text-foreground">Students</th>
                        <th className="px-6 py-3 text-center font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((tenant) => (
                        <tr
                          key={tenant.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-6 py-4 text-foreground font-medium">{tenant.name}</td>
                          <td className="hidden sm:table-cell px-6 py-4 text-foreground text-sm">{tenant.adminName || "—"}</td>
                          <td className="px-6 py-4">
                            {editingPhoneId === tenant.id ? (
                              <div className="flex gap-2">
                                <Input
                                  type="tel"
                                  value={newAdminPhone}
                                  onChange={(e) => setNewAdminPhone(e.target.value)}
                                  placeholder={tenant.adminPhone}
                                  className="h-8 text-xs flex-1"
                                  disabled={updatingPhone}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateAdminPhone(tenant.id)}
                                  disabled={updatingPhone}
                                  className="h-8 px-2"
                                >
                                  <CheckIcon />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingPhoneId(null);
                                    setNewAdminPhone("");
                                  }}
                                  disabled={updatingPhone}
                                  className="h-8 px-2"
                                >
                                  <CloseIcon />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 group">
                                <span className="font-mono text-xs text-muted-foreground">{tenant.adminPhone}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingPhoneId(tenant.id);
                                    setNewAdminPhone("");
                                  }}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <PencilIcon />
                                </Button>
                              </div>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 font-mono text-xs text-muted-foreground">
                            {tenant.schoolCode}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              status={tenant.status.toLowerCase()}
                              variant={tenant.status === "ACTIVE" ? "success" : tenant.status === "TRIAL" ? "info" : tenant.status === "SUSPENDED" ? "warning" : "default"}
                            />
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 text-center font-mono text-foreground font-medium">
                            {tenant._count.students}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openForm(tenant)}
                                className="h-8 w-8 p-0 text-foreground hover:bg-muted"
                              >
                                <EditIcon />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(tenant.id, tenant.name)}
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <CloseIcon />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <EmptyState
                        icon={<BuildingsIcon />}
                        title="No schools yet"
                        description="Create and manage schools on your platform"
                        action={{ label: "Create the first school", onClick: () => openForm() }}
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Roles Tab */}
            {activeTab === "roles" && (
              <RoleManagement />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
