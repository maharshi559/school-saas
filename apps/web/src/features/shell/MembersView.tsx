import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { FormField, ErrorMessage, SuccessMessage, LoadingState } from "../../lib/ui-helpers.js";

export function MembersView({ membership }: { membership: any }) {
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
      .then((res) => { if (mounted) setPendingMembers(res.items); })
      .catch(() => { if (mounted) setPendingMembers([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [membership?.tenantId]);

  const handleAddInvite = () => {
    if (!formData.phone || !formData.name) { setFormError("Please fill in all fields"); return; }
    setFormError(undefined);
    setInvites([...invites, { id: Math.random().toString(), phone: formData.phone, name: formData.name, role: formData.role, link: null, status: "pending" }]);
    setFormData({ name: "", phone: "", role: "TEACHER" });
  };

  const handleGenerateLinks = async () => {
    const updated = await Promise.all(
      invites.filter((inv) => !inv.link).map(async (inv) => {
        try {
          const res = await apiFetch<any>("/invites", { tenantId: membership.tenantId, method: "POST", body: JSON.stringify({ phone: inv.phone }) });
          return { ...inv, link: res.inviteLink, status: "sent" };
        } catch (e) {
          return { ...inv, status: "error", error: e instanceof Error ? e.message : "Failed" };
        }
      })
    );
    setInvites([...invites.filter((inv) => inv.link), ...updated]);
  };

  const handleApprove = async (memberId: string) => {
    setApprovingId(memberId); setFormError(undefined);
    try {
      await apiFetch(`/members/${memberId}/approve`, { tenantId: membership.tenantId, method: "POST", body: JSON.stringify({ role: selectedRole }) });
      setPendingMembers(pendingMembers.filter((m) => m.id !== memberId));
      setSuccess("Member approved successfully"); setTimeout(() => setSuccess(undefined), 3000);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to approve member"); } finally { setApprovingId(null); }
  };

  const roleSelect = "h-8 px-2 border border-input rounded-md text-xs bg-background text-foreground";

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
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
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
            {loading ? <LoadingState message="Loading pending members…" /> : pendingMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30"><th className="px-4 py-3 text-left font-semibold">Name</th><th className="px-4 py-3 text-left font-semibold">Phone</th><th className="px-4 py-3 text-left font-semibold">Joined</th><th className="px-4 py-3 text-left font-semibold">Role</th><th className="px-4 py-3 text-center font-semibold">Action</th></tr></thead>
                  <tbody>
                    {pendingMembers.map((member) => (
                      <tr key={member.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{member.displayName || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{member.phone}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(member.joinedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className={roleSelect}>
                            <option value="TEACHER">Teacher</option><option value="PARENT">Parent</option><option value="STAFF">Staff</option><option value="PRINCIPAL">Principal</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button size="sm" onClick={() => handleApprove(member.id)} disabled={approvingId === member.id} className="h-8">
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
            <CardHeader><CardTitle className="text-lg">Add Members</CardTitle><CardDescription>Enter details and generate invite links</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Full Name" required>
                  <Input placeholder="e.g., John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </FormField>
                <FormField label="Phone (E.164)" required>
                  <Input placeholder="+919876543210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} inputMode="tel" />
                </FormField>
                <FormField label="Role">
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full h-10 px-3 border border-input rounded-md text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="TEACHER">Teacher</option><option value="PARENT">Parent</option><option value="STAFF">Staff</option><option value="PRINCIPAL">Principal</option>
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
                  <div><CardTitle className="text-lg">Pending Invites ({invites.length})</CardTitle><CardDescription>Generate and share links with these members</CardDescription></div>
                  {invites.some((inv) => !inv.link) && <Button onClick={handleGenerateLinks} className="ml-4">Generate All Links</Button>}
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
                        <Button size="sm" variant="ghost" onClick={() => setInvites(invites.filter((i) => i.id !== invite.id))} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10">✕</Button>
                      </div>
                      {invite.link ? (
                        <div className="bg-muted p-3 rounded text-xs font-mono break-all cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => { navigator.clipboard.writeText(invite.link); setSuccess("Invite link copied to clipboard"); setTimeout(() => setSuccess(undefined), 2000); }} title="Click to copy invite link">{invite.link}</div>
                      ) : invite.status === "error" ? (
                        <div className="bg-destructive/10 border border-destructive/30 rounded p-2"><p className="text-xs text-destructive">Error: {invite.error}</p></div>
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
