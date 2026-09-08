import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { SessionUser } from "@iskool/shared";
import { apiFetch } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { ToastContainer } from "../../components/Toast.js";
import { useToasts } from "../../lib/use-toasts.js";
import { FormField, EmptyState, LoadingState, StatusBadge, ErrorMessage } from "../../lib/ui-helpers.js";
import { Select } from "../../components/ui/select.js";
import { useLanguage } from "../../lib/i18n.js";
import { BuildingsIcon, UsersIcon, WalletIcon, CreditCardIcon, ShieldIcon, PlusIcon, EditIcon, CloseIcon, PencilIcon, CheckIcon, SunIcon, MoonIcon } from "lucide-react";
import { RoleManagement } from "./RoleManagement.js";
import type { Tenant, SchoolFormData } from "../../types/index.js";

const ADMIN_TABS = ["schools", "roles", "sales", "finances", "account"] as const;
type AdminTab = typeof ADMIN_TABS[number];

export function AdminPortal({ user, theme, onThemeChange, onLogout }: { user: SessionUser; theme: "light" | "dark"; onThemeChange: (t: "light" | "dark") => void; onLogout: () => void; }) {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { "*": tabParam } = useParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const emptyForm: SchoolFormData = { schoolName: "", adminFirstName: "", adminLastName: "", adminPhone: "", status: "TRIAL", email: "", address: "", city: "", state: "", pincode: "", website: "", schoolType: "", board: "", establishedYear: "" };
  const [formData, setFormData] = useState<SchoolFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { toasts, addToast, removeToast } = useToasts();
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const activeTab = ((ADMIN_TABS as readonly string[]).includes(tabParam ?? "") ? tabParam : "schools") as AdminTab;
  const [accountFirstName, setAccountFirstName] = useState((user as any).firstName || user.displayName?.split(" ")[0] || "");
  const [accountLastName, setAccountLastName] = useState((user as any).lastName || user.displayName?.split(" ").slice(1).join(" ") || "");
  const [accountEmail, setAccountEmail] = useState((user as any).email || "");
  const [savingAccount, setSavingAccount] = useState(false);

  function setActiveTab(tab: AdminTab) { navigate(`/admin/${tab}`); }

  useEffect(() => { loadTenants(); }, []);

  async function loadTenants() {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: Tenant[] }>("/admin/tenants");
      setTenants(res.items); setError(undefined);
    } catch (e) { const msg = e instanceof Error ? e.message : "Failed to load schools"; setError(msg); addToast(msg, "error"); } finally { setLoading(false); }
  }

  function openForm(tenant?: Tenant) {
    if (tenant) {
      setEditingId(tenant.id);
      setFormData({ schoolName: tenant.name, adminFirstName: tenant.adminName?.split(" ")[0] || "", adminLastName: tenant.adminName?.split(" ").slice(1).join(" ") || "", adminPhone: tenant.adminPhone || "", status: (tenant.status as SchoolFormData["status"]) || "TRIAL", email: tenant.email || "", address: tenant.address || "", city: tenant.city || "", state: tenant.state || "", pincode: tenant.pincode || "", website: tenant.website || "", schoolType: tenant.schoolType || "", board: tenant.board || "", establishedYear: tenant.establishedYear?.toString() || "" });
    } else { setEditingId(null); setFormData(emptyForm); }
    setShowForm(true);
    requestAnimationFrame(() => { formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.schoolName || (!editingId && (!formData.adminFirstName || !formData.adminLastName || !formData.adminPhone))) { addToast("All fields are required", "error"); return; }
    const businessPayload = { email: formData.email, address: formData.address, city: formData.city, state: formData.state, pincode: formData.pincode, website: formData.website, schoolType: formData.schoolType || undefined, board: formData.board || undefined, establishedYear: formData.establishedYear ? parseInt(formData.establishedYear) : undefined };
    setSubmitting(true);
    try {
      if (editingId) {
        await apiFetch(`/admin/tenants/${editingId}`, { method: "PATCH", body: JSON.stringify({ name: formData.schoolName, status: formData.status, adminFirstName: formData.adminFirstName || undefined, adminLastName: formData.adminLastName || undefined, ...businessPayload }) });
        const newAdminName = formData.adminFirstName ? `${formData.adminFirstName} ${formData.adminLastName}`.trim() : undefined;
        setTenants(tenants.map((t) => t.id === editingId ? { ...t, name: formData.schoolName, status: formData.status, ...(newAdminName && { adminName: newAdminName }), ...businessPayload } : t));
        addToast(`School "${formData.schoolName}" updated successfully`, "success");
      } else {
        await apiFetch("/admin/tenants", { method: "POST", body: JSON.stringify({ name: formData.schoolName, adminFirstName: formData.adminFirstName, adminLastName: formData.adminLastName, adminPhone: formData.adminPhone, status: formData.status, ...businessPayload }) });
        await loadTenants();
        addToast(`School "${formData.schoolName}" created successfully`, "success");
      }
      setShowForm(false); setEditingId(null); setError(undefined); setFormData(emptyForm);
    } catch (e) { const msg = e instanceof Error ? e.message : "Failed to save school"; setError(msg); addToast(msg, "error"); } finally { setSubmitting(false); }
  }

  async function handleDelete(tenantId: string, tenantName: string) {
    if (!window.confirm(`Are you sure you want to delete "${tenantName}"? This action cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/tenants/${tenantId}`, { method: "DELETE" });
      setTenants(tenants.filter((t) => t.id !== tenantId)); addToast(`School "${tenantName}" deleted successfully`, "success");
    } catch (e) { addToast(e instanceof Error ? e.message : "Failed to delete school", "error"); }
  }

  async function handleUpdateAdminPhone(tenantId: string) {
    if (!newAdminPhone) { addToast("Please enter a phone number", "error"); return; }
    setUpdatingPhone(true);
    try {
      const res = await apiFetch<{ adminName: string; adminPhone: string }>(`/admin/tenants/${tenantId}/admin-phone`, { method: "PATCH", body: JSON.stringify({ adminPhone: newAdminPhone }) });
      setTenants(tenants.map((t) => t.id === tenantId ? { ...t, adminPhone: res.adminPhone, adminName: res.adminName } : t));
      addToast("Admin phone number updated successfully", "success"); setEditingPhoneId(null); setNewAdminPhone("");
    } catch (e) { addToast(e instanceof Error ? e.message : "Failed to update phone", "error"); } finally { setUpdatingPhone(false); }
  }

  async function saveAccount() {
    if (!accountFirstName.trim()) { addToast("First name is required", "error"); return; }
    setSavingAccount(true);
    try {
      await apiFetch("/auth/me", { method: "PATCH", body: JSON.stringify({ firstName: accountFirstName.trim(), lastName: accountLastName.trim(), email: accountEmail.trim() }) });
      addToast("Profile updated", "success");
    } catch (e) { addToast(e instanceof Error ? e.message : "Failed to update", "error"); } finally { setSavingAccount(false); }
  }

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; stub?: boolean }[] = [
    { id: "schools", label: "Schools", icon: <BuildingsIcon /> },
    { id: "roles", label: "Admin Users", icon: <UsersIcon /> },
    { id: "sales", label: "Sales", icon: <WalletIcon />, stub: true },
    { id: "finances", label: "Finances", icon: <CreditCardIcon />, stub: true },
    { id: "account", label: "My Account", icon: <ShieldIcon /> },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <header className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground font-bold text-base">क</div>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight">iskool</h1>
              <p className="text-xs text-muted-foreground leading-tight">Admin Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user.displayName ?? user.phone}</p>
              <p className="text-xs text-muted-foreground">iskool Admin</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === "en" ? "hi" : "en")} className="text-muted-foreground text-xs font-medium">{language === "en" ? "हिंदी" : "EN"}</Button>
            <Button variant="ghost" size="sm" onClick={() => onThemeChange(theme === "light" ? "dark" : "light")} className="text-muted-foreground">{theme === "light" ? <MoonIcon /> : <SunIcon />}</Button>
            <Button variant="ghost" onClick={onLogout} className="text-sm">{t("nav.signOut", "Sign out")}</Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-56 flex-shrink-0 border-r border-border bg-card flex flex-col">
          <div className="flex-1 py-4 px-3 space-y-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => !item.stub && setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left ${activeTab === item.id ? "bg-accent/10 text-accent" : item.stub ? "text-muted-foreground/50 cursor-default" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <span className={activeTab === item.id ? "text-accent" : ""}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.stub && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Soon</span>}
              </button>
            ))}
          </div>
          <div className="border-t border-border p-4"><p className="text-xs text-muted-foreground">iskool v0.1</p></div>
        </nav>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">
            <div className="space-y-6">

              {activeTab === "schools" && (
                <>
                  <div className="flex items-center justify-between">
                    <div><h2 className="text-2xl font-semibold text-foreground">Schools</h2><p className="mt-1 text-sm text-muted-foreground">Manage all schools in your platform</p></div>
                    {!showForm && <Button onClick={() => openForm()} className="flex items-center gap-2"><PlusIcon />Add School</Button>}
                  </div>

                  {showForm && (
                    <Card ref={formRef}>
                      <CardHeader><CardTitle className="text-lg">{editingId ? "Edit School" : "Create New School"}</CardTitle></CardHeader>
                      <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                          {error && <ErrorMessage message={error} />}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="School Name" required><Input value={formData.schoolName} onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })} placeholder="e.g., St. Xavier's Academy" disabled={submitting} /></FormField>
                            <FormField label="Status">
                              <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as SchoolFormData["status"] })} disabled={submitting}>
                                <option value="TRIAL">Trial</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="CANCELLED">Cancelled</option>
                              </Select>
                            </FormField>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Admin First Name" required><Input value={formData.adminFirstName} onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })} placeholder="e.g., John" disabled={submitting} /></FormField>
                            <FormField label="Admin Last Name" required><Input value={formData.adminLastName} onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })} placeholder="e.g., Doe" disabled={submitting} /></FormField>
                          </div>
                          <FormField label="Admin Phone" required hint={editingId ? "Phone cannot be changed for existing schools" : undefined}>
                            <Input value={formData.adminPhone} onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })} placeholder="+919876543210" inputMode="tel" disabled={submitting || !!editingId} />
                          </FormField>
                          <div className="border-t border-border pt-4">
                            <p className="text-sm font-medium text-foreground mb-3">Business Information</p>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="School Email"><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="principal@school.edu" disabled={submitting} /></FormField>
                                <FormField label="Website"><Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://school.edu" disabled={submitting} /></FormField>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="School Type">
                                  <Select value={formData.schoolType} onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })} disabled={submitting}>
                                    <option value="">Select type</option><option value="PRIMARY">Primary (1–5)</option><option value="SECONDARY">Secondary (6–10)</option><option value="SENIOR_SECONDARY">Senior Secondary (11–12)</option><option value="INTERNATIONAL">International</option><option value="OTHER">Other</option>
                                  </Select>
                                </FormField>
                                <FormField label="Board Affiliation">
                                  <Select value={formData.board} onChange={(e) => setFormData({ ...formData, board: e.target.value })} disabled={submitting}>
                                    <option value="">Select board</option><option value="CBSE">CBSE</option><option value="ICSE">ICSE</option><option value="IB">IB</option><option value="STATE">State Board</option><option value="OTHER">Other</option>
                                  </Select>
                                </FormField>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Established Year"><Input type="number" min="1800" max={new Date().getFullYear()} value={formData.establishedYear} onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })} placeholder="e.g., 1985" disabled={submitting} /></FormField>
                                <FormField label="Pincode"><Input value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} placeholder="e.g., 400001" inputMode="numeric" disabled={submitting} /></FormField>
                              </div>
                              <FormField label="Address"><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Street / Building" disabled={submitting} /></FormField>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="City"><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="e.g., Mumbai" disabled={submitting} /></FormField>
                                <FormField label="State"><Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="e.g., Maharashtra" disabled={submitting} /></FormField>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Update School" : "Create School"}</Button>
                            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setError(undefined); }} disabled={submitting}>Cancel</Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {loading ? (
                    <Card><CardContent className="py-12"><LoadingState message="Loading schools…" /></CardContent></Card>
                  ) : tenants.length > 0 ? (
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border bg-muted/30">
                            <th className="px-6 py-3 text-left font-semibold text-foreground">School Name</th>
                            <th className="hidden sm:table-cell px-6 py-3 text-left font-semibold text-foreground">Admin</th>
                            <th className="px-6 py-3 text-left font-semibold text-foreground">Phone</th>
                            <th className="hidden md:table-cell px-6 py-3 text-left font-semibold text-foreground">Code</th>
                            <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                            <th className="hidden md:table-cell px-6 py-3 text-center font-semibold text-foreground">Students</th>
                            <th className="px-6 py-3 text-center font-semibold text-foreground">Actions</th>
                          </tr></thead>
                          <tbody>
                            {tenants.map((tenant) => (
                              <tr key={tenant.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 text-foreground font-medium">{tenant.name}</td>
                                <td className="hidden sm:table-cell px-6 py-4 text-foreground text-sm">{tenant.adminName || "—"}</td>
                                <td className="px-6 py-4">
                                  {editingPhoneId === tenant.id ? (
                                    <div className="flex gap-2">
                                      <Input type="tel" value={newAdminPhone} onChange={(e) => setNewAdminPhone(e.target.value)} placeholder={tenant.adminPhone} className="h-8 text-xs flex-1" disabled={updatingPhone} />
                                      <Button size="sm" onClick={() => handleUpdateAdminPhone(tenant.id)} disabled={updatingPhone} className="h-8 px-2"><CheckIcon /></Button>
                                      <Button size="sm" variant="outline" onClick={() => { setEditingPhoneId(null); setNewAdminPhone(""); }} disabled={updatingPhone} className="h-8 px-2"><CloseIcon /></Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2 group">
                                      <span className="font-mono text-xs text-muted-foreground">{tenant.adminPhone}</span>
                                      <Button size="sm" variant="ghost" onClick={() => { setEditingPhoneId(tenant.id); setNewAdminPhone(""); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon /></Button>
                                    </div>
                                  )}
                                </td>
                                <td className="hidden md:table-cell px-6 py-4 font-mono text-xs text-muted-foreground">{tenant.schoolCode}</td>
                                <td className="px-6 py-4"><StatusBadge status={tenant.status.toLowerCase()} variant={tenant.status === "ACTIVE" ? "success" : tenant.status === "TRIAL" ? "info" : tenant.status === "SUSPENDED" ? "warning" : "default"} /></td>
                                <td className="hidden md:table-cell px-6 py-4 text-center font-mono text-foreground font-medium">{tenant._count.students}</td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => openForm(tenant)} className="h-8 w-8 p-0 text-foreground hover:bg-muted"><EditIcon /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(tenant.id, tenant.name)} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"><CloseIcon /></Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  ) : (
                    <Card><CardContent className="py-12"><EmptyState icon={<BuildingsIcon />} title="No schools yet" description="Create and manage schools on your platform" action={{ label: "Create the first school", onClick: () => openForm() }} /></CardContent></Card>
                  )}
                </>
              )}

              {activeTab === "roles" && <RoleManagement />}

              {activeTab === "sales" && (
                <div>
                  <h2 className="text-2xl font-semibold text-foreground mb-1">Sales</h2>
                  <p className="text-sm text-muted-foreground mb-6">Trial conversions, subscription pipeline, and MRR tracking</p>
                  <Card><CardContent className="py-16 text-center"><WalletIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" /><p className="text-muted-foreground font-medium">Sales dashboard coming soon</p><p className="text-sm text-muted-foreground/70 mt-1">Track trials, conversions, and revenue growth</p></CardContent></Card>
                </div>
              )}

              {activeTab === "finances" && (
                <div>
                  <h2 className="text-2xl font-semibold text-foreground mb-1">Finances</h2>
                  <p className="text-sm text-muted-foreground mb-6">Platform-level billing, subscriptions, and payouts</p>
                  <Card><CardContent className="py-16 text-center"><CreditCardIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" /><p className="text-muted-foreground font-medium">Finance dashboard coming soon</p><p className="text-sm text-muted-foreground/70 mt-1">Monitor subscriptions, invoices, and platform revenue</p></CardContent></Card>
                </div>
              )}

              {activeTab === "account" && (
                <div className="max-w-lg">
                  <h2 className="text-2xl font-semibold text-foreground mb-1">My Account</h2>
                  <p className="text-sm text-muted-foreground mb-6">Manage your admin profile</p>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Profile</CardTitle><CardDescription>Changes take effect on your next sign-in</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label="Phone number"><Input value={user.phone} disabled className="font-mono text-muted-foreground" /></FormField>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="First name" required><Input value={accountFirstName} onChange={(e) => setAccountFirstName(e.target.value)} placeholder="First name" disabled={savingAccount} /></FormField>
                        <FormField label="Last name"><Input value={accountLastName} onChange={(e) => setAccountLastName(e.target.value)} placeholder="Last name" disabled={savingAccount} /></FormField>
                      </div>
                      <FormField label="Email address"><Input type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} placeholder="admin@example.com" disabled={savingAccount} /></FormField>
                      <div className="pt-1"><Button onClick={saveAccount} disabled={savingAccount || !accountFirstName.trim()}>{savingAccount ? "Saving…" : "Save changes"}</Button></div>
                      <div className="pt-2 border-t border-border"><p className="text-xs text-muted-foreground">Role: <span className="font-medium text-foreground">iskool Admin</span></p></div>
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
