import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Alert, AlertDescription } from "../../components/ui/alert.js";
import { ToastContainer } from "../../components/Toast.js";
import { useToasts } from "../../lib/use-toasts.js";
import { FormField, ErrorMessage, EmptyState, StatusBadge } from "../../lib/ui-helpers.js";
import { Edit2, Plus, Check, X, Pencil, Users } from "lucide-react";
import type { Student, StudentFormData } from "../../types/index.js";

export function StudentsView({ membership, students, note }: { membership: any; students: Student[]; note?: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({ firstName: "", lastName: "", admissionNo: "", dateOfBirth: "", classSectionId: "", enrollmentStatus: "ENROLLED" });
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const { toasts, addToast, removeToast } = useToasts();
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
      .then((r) => { if (mounted) setSections(r.items); })
      .catch(() => { if (mounted) setSections([]); })
      .finally(() => { if (mounted) setLoadingSections(false); });
    return () => { mounted = false; };
  }, [membership?.tenantId]);

  if (membership?.role === "PARENT") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your children</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This section is coming soon. You'll see your children's information here.</p>
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
        await apiFetch(`/students/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        addToast(`Student "${formData.firstName} ${formData.lastName}" updated successfully`, "success");
      } else {
        await apiFetch("/students", { method: "POST", body: JSON.stringify(payload), tenantId: membership.tenantId });
        addToast(`Student "${formData.firstName} ${formData.lastName}" created successfully`, "success");
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ firstName: "", lastName: "", admissionNo: "", dateOfBirth: "", classSectionId: "", enrollmentStatus: "ENROLLED" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save student";
      setFormError(msg);
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(studentId: string, studentName: string) {
    if (!window.confirm(`Are you sure you want to delete "${studentName}"?`)) return;
    try {
      await apiFetch(`/students/${studentId}`, { method: "DELETE" });
      addToast(`Student "${studentName}" deleted successfully`, "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to delete student", "error");
    }
  }

  async function handleInlineUpdate(studentId: string, studentName: string) {
    if (!inlineEditValue) { addToast("Please enter a value", "error"); return; }
    setInlineUpdating(true);
    try {
      const updateData: Record<string, any> = {};
      if (inlineEditField === "status") updateData.enrollmentStatus = inlineEditValue;
      else if (inlineEditField === "classSection") updateData.classSectionId = inlineEditValue || null;
      await apiFetch(`/students/${studentId}`, { method: "PATCH", body: JSON.stringify(updateData) });
      addToast(`Student "${studentName}" ${inlineEditField === "status" ? "status" : "class section"} updated`, "success");
      setInlineEditingId(null); setInlineEditField(null); setInlineEditValue("");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to update student", "error");
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
      setFormData({ firstName: "", lastName: "", admissionNo: "", dateOfBirth: "", classSectionId: "", enrollmentStatus: "ENROLLED" });
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
          <p className="mt-1 text-sm text-muted-foreground">{students.length} {students.length === 1 ? "student" : "students"} enrolled</p>
        </div>
        {!showForm && (
          <Button onClick={() => openForm()} className="flex items-center gap-2"><Plus />Add Student</Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{editingId ? "Edit Student" : "Add New Student"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="First Name" required error={!formData.firstName && formError ? "Required" : undefined}>
                  <Input id="first-name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="e.g., Aarav" disabled={submitting} />
                </FormField>
                <FormField label="Last Name" required error={!formData.lastName && formError ? "Required" : undefined}>
                  <Input id="last-name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="e.g., Sharma" disabled={submitting} />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Admission Number" required hint={editingId ? "Cannot change admission number" : undefined} error={!formData.admissionNo && formError ? "Required" : undefined}>
                  <Input id="admission" value={formData.admissionNo} onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })} placeholder="e.g., ADM1001" disabled={submitting || !!editingId} />
                </FormField>
                <FormField label="Date of Birth">
                  <Input id="dob" type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} disabled={submitting} />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Class Section">
                  <select id="class-section" value={formData.classSectionId} onChange={(e) => setFormData({ ...formData, classSectionId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={submitting || loadingSections}>
                    <option value="">Select a class and section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.classLevel?.name} - {s.name} ({s.academicYear?.name})</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Enrollment Status">
                  <select id="enrollment" value={formData.enrollmentStatus} onChange={(e) => setFormData({ ...formData, enrollmentStatus: e.target.value as any })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={submitting}>
                    <option value="ENROLLED">Enrolled</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="GRADUATED">Graduated</option>
                    <option value="TRANSFERRED">Transferred</option>
                  </select>
                </FormField>
              </div>

              {formError && <ErrorMessage message={formError} />}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Update Student" : "Add Student"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }} disabled={submitting}>Cancel</Button>
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
                    <td className="px-6 py-4 text-foreground font-medium">{s.firstName} {s.lastName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{s.admissionNo}</td>
                    <td className="hidden sm:table-cell px-6 py-4 text-sm">
                      {inlineEditingId === s.id && inlineEditField === "classSection" ? (
                        <div className="flex gap-2">
                          <Input type="text" value={inlineEditValue} onChange={(e) => setInlineEditValue(e.target.value)} placeholder={s.classSection?.name || "Class section"} className="h-8 text-xs flex-1" disabled={inlineUpdating} />
                          <Button size="sm" onClick={() => handleInlineUpdate(s.id, `${s.firstName} ${s.lastName}`)} disabled={inlineUpdating} className="h-8 px-2"><Check /></Button>
                          <Button size="sm" variant="outline" onClick={() => { setInlineEditingId(null); setInlineEditField(null); setInlineEditValue(""); }} disabled={inlineUpdating} className="h-8 px-2"><X /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 group">
                          <span className="text-foreground">{s.classSection?.name || "—"}</span>
                          <Button size="sm" variant="ghost" onClick={() => { setInlineEditingId(s.id); setInlineEditField("classSection"); setInlineEditValue(s.classSectionId || ""); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil /></Button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {inlineEditingId === s.id && inlineEditField === "status" ? (
                        <div className="flex gap-2">
                          <select value={inlineEditValue} onChange={(e) => setInlineEditValue(e.target.value)} className="h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={inlineUpdating}>
                            <option value="ENROLLED">Enrolled</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="GRADUATED">Graduated</option>
                            <option value="TRANSFERRED">Transferred</option>
                          </select>
                          <Button size="sm" onClick={() => handleInlineUpdate(s.id, `${s.firstName} ${s.lastName}`)} disabled={inlineUpdating} className="h-8 px-2"><Check /></Button>
                          <Button size="sm" variant="outline" onClick={() => { setInlineEditingId(null); setInlineEditField(null); setInlineEditValue(""); }} disabled={inlineUpdating} className="h-8 px-2"><X /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 group">
                          <StatusBadge status={(s.enrollmentStatus || "").toLowerCase()} variant={s.enrollmentStatus === "ENROLLED" ? "success" : s.enrollmentStatus === "INACTIVE" ? "default" : "info"} />
                          <Button size="sm" variant="ghost" onClick={() => { setInlineEditingId(s.id); setInlineEditField("status"); setInlineEditValue(s.enrollmentStatus || ""); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil /></Button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openForm(s)} className="h-8 w-8 p-0 text-foreground hover:bg-muted"><Edit2 /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id, `${s.firstName} ${s.lastName}`)} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">✕</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon={<Users />} title="No students yet" description="Add your first student to get started managing attendance, grades, and communications" action={{ label: "Add the first student", onClick: () => openForm() }} />
          )}
        </div>
      </Card>

      {note && <Alert variant="destructive"><AlertDescription>{note}</AlertDescription></Alert>}
    </div>
  );
}
