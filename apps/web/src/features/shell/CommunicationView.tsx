import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { FormField, ErrorMessage, SuccessMessage, StatusBadge } from "../../lib/ui-helpers.js";
import { Select } from "../../components/ui/select.js";
import { SparklesIcon, CloseIcon } from "lucide-react";

export function CommunicationView({ membership }: { membership: any }) {
  const [tab, setTab] = useState<"suggestions" | "send" | "templates" | "history">("suggestions");
  const [templates, setTemplates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  const [sendForm, setSendForm] = useState({ templateId: "", customMessage: "", recipientRole: "PARENT", channel: "WHATSAPP", scheduleDate: "" });
  const [tplForm, setTplForm] = useState({ name: "", type: "UPDATE", content: "", channel: "WHATSAPP" });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestChannel, setSuggestChannel] = useState("WHATSAPP");
  const [suggestMsg, setSuggestMsg] = useState<string>();

  useEffect(() => {
    if (!membership) return;
    let mounted = true;
    Promise.all([
      apiFetch<{ items: any[] }>("/communication/templates", { tenantId: membership.tenantId }),
      apiFetch<{ items: any[] }>("/communication/history", { tenantId: membership.tenantId }),
    ])
      .then(([tplRes, histRes]) => { if (mounted) { setTemplates(tplRes.items); setHistory(histRes.items); } })
      .catch(() => { if (mounted) { setTemplates([]); setHistory([]); } });
    return () => { mounted = false; };
  }, [membership?.tenantId]);

  const handleCreateTemplate = async () => {
    setError(undefined);
    if (!tplForm.name || !tplForm.content) { setError("Template name and content are required"); return; }
    setCreating(true);
    try {
      const res = await apiFetch<any>("/communication/templates", { tenantId: membership.tenantId, method: "POST", body: JSON.stringify({ type: tplForm.type, channel: tplForm.channel, content: tplForm.content, name: tplForm.name, recipientRole: "ALL" }) });
      setTemplates([...templates, res]);
      setTplForm({ name: "", type: "UPDATE", content: "", channel: "WHATSAPP" });
      setSuccess("Template created successfully"); setTimeout(() => setSuccess(undefined), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to create template"); } finally { setCreating(false); }
  };

  const handleSendMessage = async () => {
    setError(undefined);
    if (!sendForm.customMessage && !sendForm.templateId) { setError("Please select a template or enter a message"); return; }
    setSending(true);
    try {
      const res = await apiFetch<any>("/communication/send", { tenantId: membership.tenantId, method: "POST", body: JSON.stringify({ templateId: sendForm.templateId || undefined, customContent: sendForm.customMessage || undefined, recipientRole: sendForm.recipientRole, channel: sendForm.channel, scheduleFor: sendForm.scheduleDate || undefined }) });
      setHistory([res, ...history]);
      setSendForm({ ...sendForm, customMessage: "", templateId: "" });
      setSuccess(sendForm.scheduleDate ? "Message scheduled successfully" : "Message sent successfully");
      setTimeout(() => setSuccess(undefined), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to send message"); } finally { setSending(false); }
  };

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true); setSuggestMsg(undefined); setSuggestions([]);
    try {
      const res = await apiFetch<{ suggestions: any[]; message?: string }>(`/ai/communication/suggestions?days=30&channel=${suggestChannel}`, { tenantId: membership.tenantId });
      setSuggestions(res.suggestions ?? []);
      if (!res.suggestions?.length) setSuggestMsg(res.message ?? "No upcoming events found for the next 30 days.");
    } catch (e) { setSuggestMsg(e instanceof Error ? e.message : "AI service unavailable"); } finally { setLoadingSuggestions(false); }
  };

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <div>
        <h2 className="text-2xl font-semibold text-foreground">Communication</h2>
        <p className="mt-1 text-sm text-muted-foreground">Send notifications and messages to parents, teachers, and students</p>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {(["suggestions", "send", "templates", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "suggestions" && <SparklesIcon />}
            {t === "suggestions" ? "AI Suggestions" : t === "send" ? "Send Message" : t === "templates" ? "Templates" : "History"}
          </button>
        ))}
      </div>

      {tab === "suggestions" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-accent" />AI Communication Suggestions</CardTitle>
                <CardDescription>AI analyses your upcoming school events and suggests ready-to-send notifications</CardDescription>
              </div>
              <Select value={suggestChannel} onChange={(e) => setSuggestChannel(e.target.value)} className="h-9 w-auto shrink-0">
                <option value="WHATSAPP">WhatsApp</option><option value="SMS">SMS</option><option value="EMAIL">Email</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={fetchSuggestions} disabled={loadingSuggestions} className="w-full sm:w-auto">{loadingSuggestions ? "Generating…" : "Generate Suggestions"}</Button>
            {suggestMsg && <p className="text-sm text-muted-foreground">{suggestMsg}</p>}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{s.eventTitle}</p>
                      <span className={`shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${s.priority === "HIGH" ? "bg-destructive/10 text-destructive" : s.priority === "MEDIUM" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>{s.priority}</span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.message}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">To: {s.recipientRole?.toLowerCase()}</span>
                      <Button size="sm" variant="outline" onClick={() => { setSendForm({ ...sendForm, customMessage: s.message ?? "", recipientRole: s.recipientRole ?? "PARENT" }); setTab("send"); }} className="ml-auto">Use this</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "send" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Send Message</CardTitle><CardDescription>Send notifications to your school community</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <FormField label="Use Template (Optional)">
              <Select value={sendForm.templateId} onChange={(e) => setSendForm({ ...sendForm, templateId: e.target.value })}>
                <option value="">Custom Message</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </FormField>
            {!sendForm.templateId && (
              <FormField label="Message" required>
                <textarea placeholder="Type your message here..." value={sendForm.customMessage} onChange={(e) => setSendForm({ ...sendForm, customMessage: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md text-sm h-24 bg-background text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </FormField>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Send To">
                <Select value={sendForm.recipientRole} onChange={(e) => setSendForm({ ...sendForm, recipientRole: e.target.value })}>
                  <option value="PARENT">Parents</option><option value="TEACHER">Teachers</option><option value="STUDENT">Students</option><option value="ALL">All</option>
                </Select>
              </FormField>
              <FormField label="Channel">
                <Select value={sendForm.channel} onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })}>
                  <option value="WHATSAPP">WhatsApp</option><option value="SMS">SMS</option><option value="EMAIL">Email</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Schedule (Optional)" hint="Leave empty to send immediately">
              <Input type="datetime-local" value={sendForm.scheduleDate} onChange={(e) => setSendForm({ ...sendForm, scheduleDate: e.target.value })} />
            </FormField>
            <Button onClick={handleSendMessage} disabled={sending} className="w-full">{sending ? "Sending…" : sendForm.scheduleDate ? "Schedule Message" : "Send Now"}</Button>
          </CardContent>
        </Card>
      )}

      {tab === "templates" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Message Templates</CardTitle><CardDescription>Create reusable message templates</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-6 border-b border-border pb-6 mb-6">
              <FormField label="Template Name" required>
                <Input placeholder="e.g., Holiday Announcement" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} disabled={creating} />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Type">
                  <Select value={tplForm.type} onChange={(e) => setTplForm({ ...tplForm, type: e.target.value })} disabled={creating}>
                    <option value="UPDATE">Update</option><option value="HOLIDAY">Holiday</option><option value="CLOSURE">Closure</option><option value="ANNOUNCEMENT">Announcement</option><option value="EMERGENCY">Emergency</option>
                  </Select>
                </FormField>
                <FormField label="Channel">
                  <Select value={tplForm.channel} onChange={(e) => setTplForm({ ...tplForm, channel: e.target.value })} disabled={creating}>
                    <option value="WHATSAPP">WhatsApp</option><option value="SMS">SMS</option><option value="EMAIL">Email</option>
                  </Select>
                </FormField>
              </div>
              <FormField label="Template Content" required hint='Use {{variable}} for placeholders (e.g., {{schoolName}}, {{date}})'>
                <textarea placeholder="Dear {{name}}, {{schoolName}} will be closed on {{date}} due to {{reason}}." value={tplForm.content} onChange={(e) => setTplForm({ ...tplForm, content: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md text-sm h-20 bg-background text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={creating} />
              </FormField>
              <Button onClick={handleCreateTemplate} disabled={creating} className="w-full">{creating ? "Creating…" : "Create Template"}</Button>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-sm mb-4">Existing Templates</h3>
              {templates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-muted/30"><th className="px-4 py-3 text-left font-semibold">Name</th><th className="hidden sm:table-cell px-4 py-3 text-left font-semibold">Type</th><th className="px-4 py-3 text-left font-semibold">Channel</th><th className="px-4 py-3 text-center font-semibold">Action</th></tr></thead>
                    <tbody>
                      {templates.map((t) => (
                        <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{t.name}</td>
                          <td className="hidden sm:table-cell px-4 py-3 text-xs text-muted-foreground">{t.type}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{t.channel}</td>
                          <td className="px-4 py-3 text-center"><Button size="sm" variant="ghost" onClick={() => setSelectedTemplate(t)} className="text-xs">View</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No templates created yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first template above to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Message History</CardTitle><CardDescription>View all sent and scheduled messages</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.length > 0 ? history.map((msg) => (
                <div key={msg.id} className="p-4 border border-border rounded-md text-sm hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{msg.recipientRole}</p>
                        <StatusBadge status={msg.status.toLowerCase()} variant={msg.status === "SENT" ? "success" : msg.status === "SCHEDULED" ? "info" : msg.status === "FAILED" ? "destructive" : "default"} />
                      </div>
                      <p className="text-xs text-muted-foreground">{msg.channel} · {msg.recipientCount} recipients</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No messages sent yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Messages you send will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                <CardDescription>{selectedTemplate.type} · {selectedTemplate.channel}</CardDescription>
              </div>
              <button onClick={() => setSelectedTemplate(null)} className="text-muted-foreground hover:text-foreground p-1"><CloseIcon className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Template Content</p>
                <div className="mt-2 p-3 bg-muted rounded-md border border-border text-sm whitespace-pre-wrap">{selectedTemplate.content}</div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>Close</Button>
                <Button onClick={() => { setSendForm({ ...sendForm, templateId: selectedTemplate.id }); setTab("send"); setSelectedTemplate(null); }}>Use This Template</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
