import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import type { SessionUser } from "@iskool/shared";
import { apiFetch, getToken, setToken } from "./lib/api.js";
import { LanguageProvider } from "./lib/i18n.js";
import { LoadingState } from "./lib/ui-helpers.js";
import { LoginPage } from "./features/auth/LoginPage.js";
import { RegisterPage } from "./features/auth/RegisterPage.js";
import { AppShell } from "./features/shell/AppShell.js";
import { AdminPortal } from "./features/admin/AdminPortal.js";

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingState message="Loading…" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!getToken()) return setBooting(false);
    apiFetch<{ user: SessionUser }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogout = () => { setToken(null); setUser(null); navigate("/login"); };

  if (booting) return <LoadingShell />;

  const searchParams = new URLSearchParams(location.search);
  const inviteToken = searchParams.get("token");
  const schoolCode = searchParams.get("schoolCode");

  const isAppAdmin = user?.appRoles?.includes("APP_ADMIN") ?? false;
  const hasSchoolMembership = user?.memberships.some((m) => m.status === "ACTIVE") ?? false;

  const defaultAfterLogin = isAppAdmin || !hasSchoolMembership ? "/admin" : "/app/dashboard";

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to={defaultAfterLogin} replace /> : <LoginPage onDone={(u) => { setUser(u); }} />
      } />
      <Route path="/register" element={
        inviteToken && schoolCode
          ? <RegisterPage token={inviteToken} schoolCode={schoolCode} />
          : <Navigate to="/login" replace />
      } />
      <Route path="/admin/*" element={
        !user ? <Navigate to="/login" replace /> : (
          <LanguageProvider>
            <AdminPortal user={user} theme={theme} onThemeChange={setTheme} onLogout={handleLogout} />
          </LanguageProvider>
        )
      } />
      <Route path="/app/*" element={
        !user ? <Navigate to="/login" replace /> :
        isAppAdmin || !hasSchoolMembership ? <Navigate to="/admin" replace /> : (
          <LanguageProvider>
            <AppShell user={user} theme={theme} onThemeChange={setTheme} onLogout={handleLogout} />
          </LanguageProvider>
        )
      } />
      <Route path="*" element={
        !user ? <Navigate to="/login" replace /> : <Navigate to={defaultAfterLogin} replace />
      } />
    </Routes>
  );
}
