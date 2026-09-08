import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { UsersIcon, PlusIcon } from "lucide-react";
import { LoadingState, EmptyState } from "../../lib/ui-helpers.js";

export function TeachersView({ membership }: { membership: any }) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!membership) return;
    let mounted = true;
    setLoading(true);
    apiFetch<{ items: any[] }>("/teachers", { tenantId: membership.tenantId })
      .then((r) => { if (mounted) setTeachers(r.items); })
      .catch(() => { if (mounted) setTeachers([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [membership?.tenantId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Teachers</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage teachers in your school</p>
        </div>
        <Button className="flex items-center gap-2"><PlusIcon />Add Teacher</Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12"><LoadingState message="Loading teachers…" /></CardContent></Card>
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
