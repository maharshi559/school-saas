import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Label } from "../../components/ui/label.js";
import { Book, Plus } from "lucide-react";
import { ErrorMessage, SuccessMessage, EmptyState, LoadingState } from "../../lib/ui-helpers.js";

export function ClassesView({ membership }: { membership: any }) {
  const [sections, setSections] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<"year" | "level" | "section">("year");

  const [yearValue, setYearValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [levelName, setLevelName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
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
        if (mounted) { setSections(sectionsRes.items); setLevels(levelsRes.items); setYears(yearsRes.items); }
      })
      .catch(() => { if (mounted) { setSections([]); setLevels([]); setYears([]); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [membership?.tenantId]);

  const handleYearNext = async () => {
    setFormError(undefined);
    if (yearMode === "existing") {
      if (!selectedYearId) { setFormError("Please select an academic year"); return; }
      setFormStep("level");
    } else {
      if (!yearValue || !startDate || !endDate) { setFormError("Please fill in all fields"); return; }
      if (years.some((y) => y.name === yearValue)) { setFormError(`Academic year "${yearValue}" already exists`); return; }
      try {
        const res = await apiFetch<any>("/academic-years", { tenantId: membership.tenantId, method: "POST", body: JSON.stringify({ year: yearValue, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString() }) });
        setYears([...years, res]); setSelectedYearId(res.id); setYearValue(""); setStartDate(""); setEndDate("");
        setFormStep("level");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create academic year";
        setFormError(msg.includes("Unique constraint") ? `Academic year "${yearValue}" already exists for this school` : msg);
      }
    }
  };

  const handleLevelNext = async () => {
    setFormError(undefined);
    if (levelMode === "existing") {
      if (!selectedLevelId) { setFormError("Please select a class level"); return; }
      setFormStep("section");
    } else {
      if (!levelName) { setFormError("Please enter a class name"); return; }
      if (levels.some((l) => l.name === levelName)) { setFormError(`Class level "${levelName}" already exists`); return; }
      try {
        const res = await apiFetch<any>("/class-levels", { tenantId: membership.tenantId, method: "POST", body: JSON.stringify({ name: levelName, rank: levels.length + 1 }) });
        setLevels([...levels, res]); setSelectedLevelId(res.id); setLevelName(""); setFormStep("section");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create class level";
        setFormError(msg.includes("Unique constraint") ? `Class level "${levelName}" already exists for this school` : msg);
      }
    }
  };

  const handleSectionSubmit = async () => {
    setFormError(undefined);
    if (!sectionName || !selectedLevelId || !selectedYearId) { setFormError("Please fill in all fields"); return; }
    if (sections.some((s) => s.classLevelId === selectedLevelId && s.academicYearId === selectedYearId && s.name === sectionName)) {
      setFormError(`Section "${sectionName}" already exists for this class and year`); return;
    }
    try {
      const res = await apiFetch<any>("/class-sections", { tenantId: membership.tenantId, method: "POST", body: JSON.stringify({ classLevelId: selectedLevelId, academicYearId: selectedYearId, name: sectionName }) });
      setSections([...sections, res]); setSectionName(""); setSelectedLevelId(""); setSelectedYearId("");
      setShowForm(false); setFormStep("year"); setYearMode("existing"); setLevelMode("existing");
      setSuccessMessage("Section created successfully");
      setTimeout(() => setSuccessMessage(undefined), 3000);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create section");
    }
  };

  const selectClass = "w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Classes & Sections</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage class hierarchy</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <Plus />{showForm ? "Cancel" : "Add Class"}
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
                    {(["existing", "new"] as const).map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <input type="radio" id={`year-${m}`} name="yearMode" value={m} checked={yearMode === m} onChange={() => { setYearMode(m); if (m === "existing") { setYearValue(""); setStartDate(""); setEndDate(""); } else { setSelectedYearId(""); } }} className="h-4 w-4" />
                        <Label htmlFor={`year-${m}`} className="cursor-pointer font-normal">{m === "existing" ? "Use existing" : "Create new"}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                {yearMode === "existing" ? (
                  <div>
                    <Label htmlFor="yearSelect">Select Academic Year</Label>
                    <select id="yearSelect" value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)} className={selectClass}>
                      <option value="">Choose an academic year</option>
                      {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <>
                    <div><Label htmlFor="yearValue">Academic Year</Label><Input id="yearValue" placeholder="e.g., 2024-25" value={yearValue} onChange={(e) => setYearValue(e.target.value)} /></div>
                    <div><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div><Label htmlFor="endDate">End Date</Label><Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
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
                    {(["existing", "new"] as const).map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <input type="radio" id={`level-${m}`} name="levelMode" value={m} checked={levelMode === m} onChange={() => { setLevelMode(m); if (m === "existing") setLevelName(""); else setSelectedLevelId(""); }} className="h-4 w-4" />
                        <Label htmlFor={`level-${m}`} className="cursor-pointer font-normal">{m === "existing" ? "Use existing" : "Create new"}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                {levelMode === "existing" ? (
                  <div>
                    <Label htmlFor="levelSelect">Select Class Level</Label>
                    <select id="levelSelect" value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} className={selectClass}>
                      <option value="">Choose a class level</option>
                      {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div><Label htmlFor="levelName">Class Name</Label><Input id="levelName" placeholder="e.g., Grade 9" value={levelName} onChange={(e) => setLevelName(e.target.value)} /></div>
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
                  <Label>Class</Label>
                  <select value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} className={selectClass}>
                    <option value="">Select a class</option>
                    {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Academic Year</Label>
                  <select value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)} className={selectClass}>
                    <option value="">Select a year</option>
                    {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div><Label htmlFor="sectionName">Section Name</Label><Input id="sectionName" placeholder="e.g., Section A" value={sectionName} onChange={(e) => setSectionName(e.target.value)} /></div>
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
        <Card><CardContent className="py-12"><LoadingState message="Loading classes…" /></CardContent></Card>
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
            <EmptyState icon={<Book />} title="No classes yet" description="Create academic years, class levels, and sections to organize your school structure" action={{ label: "Create the first class", onClick: () => setShowForm(true) }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
