import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { ToastContainer } from "../../components/Toast.js";
import { useToasts } from "../../lib/use-toasts.js";
import { FormField, EmptyState, LoadingState, StatusBadge } from "../../lib/ui-helpers.js";
import { Users } from "lucide-react";
import type { UserWithRoles } from "../../types/index.js";

export function RoleManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(false);
  const [grantingPhone, setGrantingPhone] = useState("");
  const [grantingRole, setGrantingRole] = useState<"APP_ADMIN" | "APP_SUPPORT">("APP_ADMIN");
  const [revoking, setRevoking] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToasts();

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: UserWithRoles[] }>("/admin/users/with-roles");
      setUsers(res.items);
    } catch { addToast("Failed to load users", "error"); } finally { setLoading(false); }
  }

  async function handleGrantRole() {
    if (!grantingPhone.trim()) { addToast("Phone number required", "error"); return; }
    try {
      await apiFetch("/admin/users/roles/grant", { method: "POST", body: JSON.stringify({ phone: grantingPhone, role: grantingRole }) });
      addToast(`Role ${grantingRole} granted to ${grantingPhone}`, "success");
      setGrantingPhone(""); loadUsers();
    } catch (e) { addToast(e instanceof Error ? e.message : "Failed to grant role", "error"); }
  }

  async function handleRevokeRole(phone: string, role: string) {
    setRevoking(`${phone}-${role}`);
    try {
      await apiFetch("/admin/users/roles/revoke", { method: "POST", body: JSON.stringify({ phone, role }) });
      addToast(`Role ${role} revoked from ${phone}`, "success"); loadUsers();
    } catch (e) { addToast(e instanceof Error ? e.message : "Failed to revoke role", "error"); } finally { setRevoking(null); }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Roles & Users</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage app-level and tenant-level roles</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Grant App-Level Role</CardTitle><CardDescription>Assign APP_ADMIN or APP_SUPPORT role to a user</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="User Phone" required>
              <Input value={grantingPhone} onChange={(e) => setGrantingPhone(e.target.value)} placeholder="+919876543210" inputMode="tel" />
            </FormField>
            <FormField label="Role">
              <select value={grantingRole} onChange={(e) => setGrantingRole(e.target.value as "APP_ADMIN" | "APP_SUPPORT")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="APP_ADMIN">App Admin</option><option value="APP_SUPPORT">App Support</option>
              </select>
            </FormField>
            <div className="flex items-end"><Button onClick={handleGrantRole} className="w-full h-10">Grant Role</Button></div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="py-12"><LoadingState message="Loading users…" /></CardContent></Card>
      ) : users.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="hidden sm:table-cell px-6 py-3 text-left font-semibold text-foreground">Phone</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Display Name</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Roles</th>
                <th className="px-6 py-3 text-center font-semibold text-foreground">Actions</th>
              </tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="hidden sm:table-cell px-6 py-4 font-mono text-xs text-muted-foreground">{user.phone}</td>
                    <td className="px-6 py-4 text-foreground">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="sm:hidden text-xs font-mono text-muted-foreground">{user.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      {user.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">{user.roles.map((r) => <StatusBadge key={r.role} status={r.role.replace("APP_", "")} variant="info" />)}</div>
                      ) : <span className="text-xs text-muted-foreground">No roles</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.roles.length > 0 && (
                        <div className="flex items-center justify-center gap-2">
                          {user.roles.map((r) => (
                            <Button key={r.role} size="sm" variant="ghost" onClick={() => handleRevokeRole(user.phone, r.role)} disabled={revoking === `${user.phone}-${r.role}`} className="h-8 px-2 text-destructive hover:bg-destructive/10">
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
        <Card><CardContent className="py-12"><EmptyState icon={<Users />} title="No users with app-level roles yet" description="Use the form above to grant APP_ADMIN or APP_SUPPORT roles to users" /></CardContent></Card>
      )}
    </div>
  );
}
