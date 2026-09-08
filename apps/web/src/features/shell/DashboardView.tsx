import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Users, Users2, Book, Grid } from "lucide-react";

export function DashboardView({ membership }: { membership: any }) {
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, totalClasses: 0, totalSections: 0 });
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
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [membership?.tenantId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Students", value: stats.totalStudents, icon: <Users /> },
          { label: "Total Teachers", value: stats.totalTeachers, icon: <Users /> },
          { label: "Total Classes", value: stats.totalClasses, icon: <Book /> },
          { label: "Total Sections", value: stats.totalSections, icon: <Grid /> },
        ].map(({ label, value, icon }) => (
          <Card key={label} className="flex flex-col justify-between">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                  <p className="text-2xl font-semibold text-foreground font-mono">{loading ? "—" : value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Role & Status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="text-sm font-medium text-foreground capitalize">{membership?.role.toLowerCase().replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Organization</span>
                <span className="text-sm font-medium text-foreground">{membership?.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium text-accent capitalize">{membership?.status.toLowerCase()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Info</CardTitle></CardHeader>
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
