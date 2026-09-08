import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { SessionUser } from "@iskool/shared";
import { apiFetch, getToken } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Alert, AlertDescription } from "../../components/ui/alert.js";
import { Avatar } from "../../components/ui/avatar.js";
import { useLanguage } from "../../lib/i18n.js";
import { BackButton } from "../../lib/ui-helpers.js";
import { LayoutDashboard, Users, Users2, Book, CheckSquare2, MessageSquare, Wallet, Shield, Settings, Bell, Edit2, Sun, Moon } from "lucide-react";
import { DashboardView } from "./DashboardView.js";
import { StudentsView } from "./StudentsView.js";
import { TeachersView } from "./TeachersView.js";
import { ClassesView } from "./ClassesView.js";
import { AttendanceView } from "./AttendanceView.js";
import { FinanceView } from "./FinanceView.js";
import { CommunicationView } from "./CommunicationView.js";
import { MembersView } from "./MembersView.js";
import type { Student, SidebarView } from "../../types/index.js";

const VALID_VIEWS = ["dashboard", "students", "teachers", "classes", "attendance", "finance", "consent", "communication", "members", "account", "settings"];
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export function AppShell({ user, theme, onThemeChange, onLogout }: { user: SessionUser; theme: "light" | "dark"; onThemeChange: (t: "light" | "dark") => void; onLogout: () => void; }) {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const params = useParams<{ "*": string }>();
  const routeView = params["*"];
  const active = user.memberships.filter((m) => m.status === "ACTIVE");
  const [tenantId, setTenantId] = useState(active[0]?.tenantId ?? "");
  const activeView = (routeView && VALID_VIEWS.includes(routeView) ? routeView : "dashboard") as SidebarView;
  const setActiveView = (view: SidebarView) => { navigate(`/app/${view}`); };
  const [students, setStudents] = useState<Student[]>([]);
  const [note, setNote] = useState<string>();
  const [showOrgSwitch, setShowOrgSwitch] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    let delay = 5_000;
    async function connect() {
      const token = getToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/api/v1/notifications/stream`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.body || cancelled) return;
        delay = 5_000; // reset backoff on successful connect
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n"); buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try { const n = JSON.parse(line.slice(6)); if (!n?.id) continue; setNotifications((prev) => [n, ...prev.filter((x) => x.id !== n.id)]); if (!n.readAt) setUnreadCount((c) => c + 1); } catch { /* ignore */ }
          }
        }
      } catch { /* fall through to reconnect */ }
      if (!cancelled) { setTimeout(connect, delay); delay = Math.min(delay * 2, 60_000); }
    }
    connect();
    return () => { cancelled = true; };
  }, [tenantId]);

  const markAllRead = async () => {
    const token = getToken();
    if (!token) return;
    await fetch(`${API_BASE}/api/v1/notifications/read-all`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const membership = active.find((m) => m.tenantId === tenantId);
  const initials = (user.displayName || user.phone).substring(0, 2).toUpperCase();


  useEffect(() => {
    if (activeView !== "students" || !tenantId || !membership || membership.role === "PARENT") { setStudents([]); return; }
    let mounted = true;
    apiFetch<{ items: Student[] }>("/students?limit=50", { tenantId })
      .then((r) => { if (mounted) setStudents(r.items); })
      .catch((e) => { if (mounted) setNote(e instanceof Error ? e.message : "Failed to load students"); });
    return () => { mounted = false; };
  }, [activeView, tenantId, membership?.tenantId]);

  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: <LayoutDashboard /> },
    { id: "members" as const, label: "Members", icon: <Users /> },
    { id: "students" as const, label: "Students", icon: <Users /> },
    { id: "teachers" as const, label: "Teachers", icon: <Users /> },
    { id: "classes" as const, label: "Classes", icon: <Book /> },
  ];

  const sidebarGroups = [
    { group: "Overview", items: [{ id: "dashboard" as const, label: "Dashboard", icon: <LayoutDashboard /> }] },
    { group: "People", items: [{ id: "members" as const, label: "Members", icon: <Users /> }, { id: "students" as const, label: "Students", icon: <Users /> }, { id: "teachers" as const, label: "Teachers", icon: <Users /> }] },
    { group: "Academic", items: [{ id: "classes" as const, label: "Classes", icon: <Book /> }, { id: "attendance" as const, label: "Attendance", icon: <CheckSquare2 /> }] },
    { group: "Operations", items: [{ id: "communication" as const, label: "Communication", icon: <MessageSquare /> }, { id: "finance" as const, label: "Finance", icon: <Wallet /> }, { id: "consent" as const, label: "Consent", icon: <Shield /> }] },
    { group: "Admin", items: [{ id: "settings" as const, label: "Org Settings", icon: <Settings /> }] },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground font-bold text-base">क</div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">{membership?.tenantName || "School"}</h1>
                {active.length > 1 && <Button variant="ghost" size="sm" onClick={() => setShowOrgSwitch(!showOrgSwitch)} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"><Edit2 /></Button>}
              </div>
              {showOrgSwitch && active.length > 1 && (
                <select className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={tenantId} onChange={(e) => { setTenantId(e.target.value); setShowOrgSwitch(false); }}>
                  {active.map((m) => <option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveView("account")} className="lg:hidden h-9 w-9 rounded-full hover:opacity-80 transition-opacity">
              <Avatar initials={initials} name={user.displayName || undefined} className="h-9 w-9" />
            </button>
            <div className="hidden sm:flex sm:items-center sm:gap-3">
              <Avatar initials={initials} name={user.displayName || undefined} className="h-9 w-9" />
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.displayName ?? user.phone}</p>
                <p className="text-xs text-muted-foreground">{membership?.role.toLowerCase().replace("_", " ")}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === "en" ? "hi" : "en")} className="text-muted-foreground text-xs font-medium hidden sm:flex">{language === "en" ? "EN" : "हिंदी"}</Button>
            <Button variant="ghost" size="sm" onClick={() => onThemeChange(theme === "light" ? "dark" : "light")} className="text-muted-foreground hidden sm:flex">{theme === "light" ? <Moon /> : <Sun />}</Button>
            <div className="relative">
              <button onClick={() => setShowNotifPanel((v) => !v)} className="relative h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Notifications">
                <Bell />
                {unreadCount > 0 && <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              {showNotifPanel && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
                  <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-border bg-card shadow-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">Notifications</span>
                      {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-accent hover:underline">Mark all read</button>}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</p> : notifications.slice(0, 15).map((n) => (
                        <div key={n.id} className={`px-4 py-3 ${!n.readAt ? "bg-accent/5" : ""}`}>
                          <p className={`text-sm font-medium ${!n.readAt ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button variant="ghost" onClick={onLogout} className="text-sm hidden sm:block">{t("nav.signOut", "Sign out")}</Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`hidden lg:flex bg-background overflow-y-auto border-r border-border transition-all duration-300 ease-out ${sidebarExpanded ? "lg:w-64" : "lg:w-16"}`} onMouseEnter={() => setSidebarExpanded(true)} onMouseLeave={() => setSidebarExpanded(false)}>
          <nav className="w-full space-y-6 p-4">
            {sidebarGroups.map((group) => (
              <div key={group.group}>
                <p className={`px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap overflow-hidden transition-opacity ${sidebarExpanded ? "opacity-100" : "opacity-0"}`}>{group.group}</p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button key={item.id} onClick={() => setActiveView(item.id)} className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeView === item.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`} title={item.label}>
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6">{item.icon}</span>
                      <span className={`whitespace-nowrap overflow-hidden transition-opacity ${sidebarExpanded ? "opacity-100" : "opacity-0"}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto pb-20 lg:pb-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 lg:py-8">
            {active.length === 0 ? (
              <Alert variant="default"><AlertDescription>Your number isn't linked to a school yet. Ask your school admin to add you.</AlertDescription></Alert>
            ) : (
              <div className="space-y-8">
                {activeView === "dashboard" && <DashboardView membership={membership} />}
                {activeView === "students" && <div className="space-y-6"><BackButton onClick={() => setActiveView("dashboard")} /><StudentsView membership={membership} students={students} note={note} /></div>}
                {activeView === "teachers" && <div className="space-y-6"><BackButton onClick={() => setActiveView("dashboard")} /><TeachersView membership={membership} /></div>}
                {activeView === "classes" && <div className="space-y-6"><BackButton onClick={() => setActiveView("dashboard")} /><ClassesView membership={membership} /></div>}
                {activeView === "attendance" && <div className="space-y-6"><BackButton onClick={() => setActiveView("dashboard")} /><AttendanceView membership={membership} /></div>}
                {activeView === "finance" && <div className="space-y-6"><BackButton onClick={() => setActiveView("dashboard")} /><FinanceView membership={membership} /></div>}
                {activeView === "consent" && <div className="space-y-6"><BackButton onClick={() => setActiveView("dashboard")} /><Card><CardHeader><CardTitle className="text-lg">Consent Management</CardTitle><CardDescription>Manage DPDP consent preferences</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Consent management coming soon. Parents can manage their data processing preferences through the parent portal.</p></CardContent></Card></div>}
                {activeView === "communication" && <div className="space-y-6"><BackButton onClick={() => setActiveView("dashboard")} /><CommunicationView membership={membership} /></div>}
                {activeView === "members" && <div className="space-y-6"><BackButton onClick={() => setActiveView("dashboard")} /><MembersView membership={membership} /></div>}
                {activeView === "account" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <Card>
                      <CardHeader><CardTitle className="text-2xl">My Account</CardTitle><CardDescription>View and manage your profile</CardDescription></CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                          <Avatar initials={initials} name={user.displayName || undefined} className="h-16 w-16" />
                          <div><p className="text-lg font-semibold text-foreground">{user.displayName || "User"}</p><p className="text-sm text-muted-foreground">{user.phone}</p></div>
                        </div>
                        <div className="space-y-4 border-t border-border pt-6">
                          <div><p className="text-sm font-medium text-foreground mb-1">School</p><p className="text-sm text-muted-foreground">{membership?.tenantName}</p></div>
                          <div><p className="text-sm font-medium text-foreground mb-1">Role</p><p className="text-sm text-muted-foreground capitalize">{membership?.role.toLowerCase().replace("_", " ")}</p></div>
                          <div><p className="text-sm font-medium text-foreground mb-1">Status</p><p className="text-sm text-muted-foreground capitalize">{membership?.status.toLowerCase()}</p></div>
                        </div>
                        <div className="space-y-3 border-t border-border pt-6">
                          <Button variant="outline" onClick={() => setLanguage(language === "en" ? "hi" : "en")} className="w-full justify-center">Language: {language === "en" ? "English" : "हिंदी"}</Button>
                          <Button variant="outline" onClick={() => onThemeChange(theme === "light" ? "dark" : "light")} className="w-full justify-center">Theme: {theme === "light" ? "Light" : "Dark"}</Button>
                          <Button variant="destructive" onClick={onLogout} className="w-full">Sign Out</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {activeView === "settings" && (
                  <div className="space-y-6">
                    <BackButton onClick={() => setActiveView("dashboard")} />
                    <Card><CardHeader><CardTitle className="text-lg">Organization Settings</CardTitle><CardDescription>Manage school organization details</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Organization settings coming soon.</p></CardContent></Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background px-0">
        <div className="flex items-center justify-around h-16 overflow-x-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)} className={`flex flex-col items-center justify-center h-16 min-w-16 transition-colors ${activeView === item.id ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}>
              <div className="text-xl">{item.icon}</div>
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
