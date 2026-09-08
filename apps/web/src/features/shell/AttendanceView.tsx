import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { ToastContainer } from "../../components/Toast.js";
import { useToasts } from "../../lib/use-toasts.js";
import { FormField, EmptyState, LoadingState } from "../../lib/ui-helpers.js";
import { Users } from "lucide-react";
import type { ClassSection, AttendanceStudent, AttendanceStatus } from "../../types/index.js";

export function AttendanceView({ membership }: { membership: any }) {
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toasts, addToast, removeToast } = useToasts();

  const statusColors: Record<AttendanceStatus, string> = {
    PRESENT: "bg-accent/10 text-accent border-accent/30",
    ABSENT: "bg-destructive/10 text-destructive border-destructive/30",
    LATE: "bg-foreground/10 text-foreground border-foreground/30",
    EXCUSED: "bg-muted text-muted-foreground border-muted",
  };

  useEffect(() => {
    loadClassSections();
  }, []);

  async function loadClassSections() {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: ClassSection[] }>("/class-sections", { tenantId: membership.tenantId });
      setClassSections(res.items);
      if (res.items.length > 0) setSelectedSection(res.items[0]!.id);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to load class sections", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedSection) loadStudents();
  }, [selectedSection, attendanceDate]);

  async function loadStudents() {
    try {
      const res = await apiFetch<{ items: AttendanceStudent[] }>(`/class-sections/${selectedSection}/students-for-attendance`, { tenantId: membership.tenantId });
      setStudents(res.items); setAttendance({}); setCurrentIndex(0);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to load students", "error");
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedSection || students.length === 0) return;
      const key = e.key.toUpperCase();
      const statusMap: Record<string, AttendanceStatus> = { P: "PRESENT", A: "ABSENT", L: "LATE", E: "EXCUSED" };
      if (key in statusMap) {
        e.preventDefault();
        const status = statusMap[key]!;
        const studentId = students[currentIndex]?.id;
        if (studentId) {
          setAttendance((prev) => ({ ...prev, [studentId]: status }));
          if (currentIndex < students.length - 1) setCurrentIndex(currentIndex + 1);
        }
      } else if (key === "ARROWDOWN" || key === "ARROWRIGHT") {
        e.preventDefault();
        if (currentIndex < students.length - 1) setCurrentIndex(currentIndex + 1);
      } else if (key === "ARROWUP" || key === "ARROWLEFT") {
        e.preventDefault();
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, selectedSection, students]);

  async function handleSubmit() {
    if (!selectedSection || Object.keys(attendance).length === 0) {
      addToast("Please mark attendance for at least one student", "error"); return;
    }
    setSubmitting(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({ studentId, status, clientRecordId: `${Date.now()}-${Math.random().toString(36).substring(7)}` }));
      await apiFetch("/attendance", { method: "POST", body: JSON.stringify({ classSectionId: selectedSection, date: attendanceDate, records }), tenantId: membership.tenantId });
      addToast(`Attendance submitted for ${records.length} student${records.length !== 1 ? "s" : ""}`, "success");
      setAttendance({}); setCurrentIndex(0);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to submit attendance", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStudent = students[currentIndex];

  return (
    <div className="space-y-4 pb-12">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-3 md:space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground md:text-2xl">Attendance</h3>
          <p className="text-sm text-muted-foreground">Mark attendance with keyboard: P=Present, A=Absent, L=Late, E=Excused</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Class Section">
            <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" disabled={loading}>
              <option value="">Select a class...</option>
              {classSections.map((s) => (
                <option key={s.id} value={s.id}>{s.classLevel.name} - {s.name} ({s._count.students} students)</option>
              ))}
            </select>
          </FormField>
          <FormField label="Date">
            <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="w-full h-10" />
          </FormField>
        </div>
      </div>

      {!loading && students.length > 0 && (
        <div className="space-y-2 md:space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{Object.keys(attendance).length} of {students.length} marked</span>
              <span>Current: {currentIndex + 1}/{students.length}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-accent h-full transition-all" style={{ width: `${(Object.keys(attendance).length / students.length) * 100}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            {students.map((student, index) => {
              const isCurrentStudent = index === currentIndex;
              const status = attendance[student.id];
              const isMarked = !!status;
              return (
                <button key={student.id} onClick={() => setCurrentIndex(index)} className={`w-full p-3 md:p-4 rounded-lg border-2 transition-all text-left ${isCurrentStudent ? "border-accent bg-accent/5 ring-2 ring-accent/20" : isMarked ? `border ${statusColors[status]}` : "border-border hover:border-accent/50 hover:bg-muted/30"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.admissionNo}</p>
                    </div>
                    {isMarked ? (
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm ${statusColors[status]}`}>{status[0]}</div>
                    ) : (
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">—</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {currentStudent && (
            <Card className="sticky bottom-0 bg-card/95 backdrop-blur">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground text-center">{currentStudent.firstName} {currentStudent.lastName}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((status) => (
                      <Button key={status} onClick={() => { setAttendance((prev) => ({ ...prev, [currentStudent.id]: status })); if (currentIndex < students.length - 1) setCurrentIndex(currentIndex + 1); }} variant={attendance[currentStudent.id] === status ? "default" : "outline"} className={`h-12 md:h-10 text-xs md:text-sm font-semibold ${attendance[currentStudent.id] === status ? statusColors[status] : ""}`}>
                        {status[0]} ({status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : status === "LATE" ? "L" : "E"})
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleSubmit} disabled={submitting || Object.keys(attendance).length === 0} className="w-full h-12 md:h-10 font-semibold">
            {submitting ? "Submitting..." : `Submit Attendance (${Object.keys(attendance).length})`}
          </Button>
        </div>
      )}

      {!loading && students.length === 0 && selectedSection && (
        <Card><CardContent className="py-12"><EmptyState icon={<Users />} title="No students in this class" description="This class section has no enrolled students yet. Add students to start marking attendance." /></CardContent></Card>
      )}

      {!selectedSection && !loading && (
        <Card><CardContent className="py-12"><EmptyState title="Select a class section" description="Choose a class section and date to begin marking attendance for your students" /></CardContent></Card>
      )}

      {loading && (
        <Card><CardContent className="py-12"><LoadingState message="Loading class sections…" /></CardContent></Card>
      )}
    </div>
  );
}
