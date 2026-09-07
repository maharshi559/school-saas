"""
School AI Service — attendance flags, fee reminders, exam insights, message drafts.

LLM backend (set via env):
  LLM_PROVIDER=ollama   → http://localhost:11434  (default, fully free)
  LLM_PROVIDER=groq     → https://api.groq.com/openai/v1  (free tier)
  LLM_PROVIDER=gemini   → https://generativelanguage.googleapis.com/v1beta (free tier)

Both use the OpenAI-compatible /v1/chat/completions endpoint.
Service auth: main API passes AI_SERVICE_KEY in X-Service-Key header.
"""

import os, re
from contextlib import contextmanager
from typing import Optional

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Depends
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv("../../.env")

# ── LLM client ────────────────────────────────────────────────────────────────

PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()

_LLM_CONFIGS = {
    "ollama": {
        "base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        "api_key": "ollama",
        "model": os.getenv("LLM_MODEL", "llama3.2"),
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key": os.getenv("GROQ_API_KEY", ""),
        "model": os.getenv("LLM_MODEL", "llama-3.1-8b-instant"),
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "api_key": os.getenv("GEMINI_API_KEY", ""),
        "model": os.getenv("LLM_MODEL", "gemini-1.5-flash"),
    },
}

cfg = _LLM_CONFIGS.get(PROVIDER, _LLM_CONFIGS["ollama"])
llm = OpenAI(base_url=cfg["base_url"], api_key=cfg["api_key"])


def ask(prompt: str, max_tokens: int = 512) -> str:
    resp = llm.chat.completions.create(
        model=cfg["model"],
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return (resp.choices[0].message.content or "").strip()


# ── DB connection ─────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "")

@contextmanager
def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()


# ── Auth ──────────────────────────────────────────────────────────────────────

SERVICE_KEY = os.getenv("AI_SERVICE_KEY", "")


def require_service_key(x_service_key: str = Header(default="")):
    if SERVICE_KEY and x_service_key != SERVICE_KEY:
        raise HTTPException(status_code=401, detail="unauthorized")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="School AI Service", docs_url="/docs")


@app.get("/health")
def health():
    return {"ok": True, "provider": PROVIDER, "model": cfg["model"]}


# ── 1. Attendance anomaly flagging ────────────────────────────────────────────

class AttendanceFlagRequest(BaseModel):
    tenantId: str
    thresholdDays: int = Field(default=14, ge=1, le=90)
    thresholdPct: float = Field(default=40.0, ge=0, le=100)


@app.post("/ai/attendance/flags", dependencies=[Depends(require_service_key)])
def attendance_flags(req: AttendanceFlagRequest):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                ar."studentId",
                s."firstName" || ' ' || s."lastName"  AS name,
                s."admissionNo",
                COUNT(*)                               AS total,
                COUNT(*) FILTER (WHERE ar.status = 'ABSENT') AS absent
            FROM "AttendanceRecord" ar
            JOIN "AttendanceSession" sess ON sess.id = ar."sessionId"
            JOIN "Student" s ON s.id = ar."studentId"
            WHERE ar."tenantId" = %s
              AND sess.date >= NOW() - (%s || ' days')::INTERVAL
            GROUP BY ar."studentId", s."firstName", s."lastName", s."admissionNo"
            """,
            (req.tenantId, req.thresholdDays),
        )
        rows = cur.fetchall()

    flagged = [
        {
            "studentId": r["studentId"],
            "name": r["name"],
            "admissionNo": r["admissionNo"],
            "absentDays": int(r["absent"]),
            "totalDays": int(r["total"]),
            "absenceRate": round(int(r["absent"]) / int(r["total"]) * 100) if r["total"] else 0,
        }
        for r in rows
        if (int(r["absent"]) / int(r["total"]) * 100 if r["total"] else 0) >= req.thresholdPct
    ]
    flagged.sort(key=lambda x: x["absenceRate"], reverse=True)

    if not flagged:
        return {"flagged": [], "summary": "No students flagged — attendance looks healthy."}

    lines = "\n".join(
        f"{s['name']} ({s['admissionNo']}): {s['absenceRate']}% absent ({s['absentDays']}/{s['totalDays']} days)"
        for s in flagged
    )
    summary = ask(
        f"Summarize these school attendance concerns in 2-3 concise sentences for a school administrator. "
        f"Be factual and actionable.\n\nFlagged students (last {req.thresholdDays} days, >{req.thresholdPct}% absent):\n{lines}"
    )
    return {"flagged": flagged, "summary": summary}


# ── 2. Fee reminder drafting ──────────────────────────────────────────────────

class FeeReminderRequest(BaseModel):
    tenantId: str
    channel: str = Field(default="WHATSAPP", pattern="^(WHATSAPP|SMS|EMAIL)$")
    studentIds: Optional[list[str]] = None


@app.post("/ai/finance/draft-reminder", dependencies=[Depends(require_service_key)])
def draft_fee_reminder(req: FeeReminderRequest):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT name FROM \"Tenant\" WHERE id = %s", (req.tenantId,))
        tenant = cur.fetchone()
        school_name = tenant["name"] if tenant else "the school"

        id_filter = ""
        params: list = [req.tenantId]
        if req.studentIds:
            placeholders = ",".join(["%s"] * len(req.studentIds))
            id_filter = f'AND sf."studentId" IN ({placeholders})'
            params.extend(req.studentIds)

        cur.execute(
            f"""
            SELECT
                s."firstName" || ' ' || s."lastName" AS student_name,
                fs.name AS fee_name,
                sf.amount - sf."amountPaid" AS outstanding
            FROM "StudentFee" sf
            JOIN "Student" s ON s.id = sf."studentId"
            JOIN "FeeStructure" fs ON fs.id = sf."feeStructureId"
            WHERE sf."tenantId" = %s
              AND sf."deletedAt" IS NULL
              AND sf.status IN ('PENDING','OVERDUE','PARTIAL')
              {id_filter}
            LIMIT 50
            """,
            params,
        )
        fees = cur.fetchall()

    if not fees:
        return {"message": "No outstanding fees found.", "recipientCount": 0}

    total = sum(float(f["outstanding"]) for f in fees)
    sample = "\n".join(
        f"{f['student_name']} — {f['fee_name']}: ₹{float(f['outstanding']):.0f}"
        for f in fees[:10]
    )
    guidance = {
        "WHATSAPP": "conversational, polite, 160-200 chars, use ₹ symbol",
        "SMS": "very short under 140 chars, plain text only",
        "EMAIL": "professional 3-4 sentences with formal salutation",
    }
    message = ask(
        f"Draft a fee reminder for {school_name} to send via {req.channel}. "
        f"Style: {guidance[req.channel]}.\n"
        f"Total outstanding: ₹{total:.0f} from {len(fees)} student(s).\n"
        f"Examples:\n{sample}\n\nWrite only the message text, no subject line."
    )
    return {"message": message, "recipientCount": len(fees)}


# ── 3. Exam score insights ─────────────────────────────────────────────────────

class ExamInsightsRequest(BaseModel):
    tenantId: str
    classSectionId: str
    examName: Optional[str] = None
    subject: Optional[str] = None


@app.post("/ai/exam/insights", dependencies=[Depends(require_service_key)])
def exam_insights(req: ExamInsightsRequest):
    with get_db() as conn:
        cur = conn.cursor()

        # Verify class section belongs to tenant
        cur.execute(
            """SELECT cs.name, cl.name AS level
               FROM "ClassSection" cs
               JOIN "ClassLevel" cl ON cl.id = cs."classLevelId"
               WHERE cs.id = %s AND cs."tenantId" = %s""",
            (req.classSectionId, req.tenantId),
        )
        section = cur.fetchone()
        if not section:
            raise HTTPException(status_code=404, detail="Class section not found")

        filters = 'WHERE es."tenantId" = %s AND s."classSectionId" = %s AND es."deletedAt" IS NULL'
        params: list = [req.tenantId, req.classSectionId]
        if req.examName:
            filters += ' AND es."examName" = %s'
            params.append(req.examName)
        if req.subject:
            filters += " AND es.subject = %s"
            params.append(req.subject)

        cur.execute(
            f"""
            SELECT es."examName", es.subject,
                   ROUND(AVG(es.percentage)::numeric, 2) AS avg,
                   ROUND(MAX(es.percentage)::numeric, 2) AS max,
                   ROUND(MIN(es.percentage)::numeric, 2) AS min,
                   COUNT(*)                               AS n
            FROM "ExamScore" es
            JOIN "Student" s ON s.id = es."studentId"
            {filters}
            GROUP BY es."examName", es.subject
            ORDER BY es."examName", es.subject
            """,
            params,
        )
        stats = [dict(r) for r in cur.fetchall()]

    if not stats:
        return {"insights": "No exam scores found for this class.", "stats": []}

    class_name = f"{section['level']} {section['name']}".strip()
    stats_text = "\n".join(
        f"{s['examName']} – {s['subject']}: avg {s['avg']}%, max {s['max']}%, min {s['min']}%, n={s['n']}"
        for s in stats
    )
    insights = ask(
        f"Write 3-4 concise insights for a teacher reviewing {class_name}'s exam results. "
        f"Focus on what needs attention and what's going well. Be specific with numbers.\n\nStats:\n{stats_text}"
    )
    return {"insights": insights, "stats": stats}


# ── 4. Communication message drafting ─────────────────────────────────────────

class CommDraftRequest(BaseModel):
    tenantId: str
    brief: str = Field(min_length=5, max_length=500)
    channel: str = Field(pattern="^(WHATSAPP|SMS|EMAIL)$")
    recipientRole: str = Field(default="PARENT", pattern="^(PARENT|TEACHER|STUDENT|ALL)$")


@app.post("/ai/communication/draft", dependencies=[Depends(require_service_key)])
def draft_message(req: CommDraftRequest):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT name FROM "Tenant" WHERE id = %s', (req.tenantId,))
        tenant = cur.fetchone()
        school_name = tenant["name"] if tenant else "the school"

    guidance = {
        "WHATSAPP": "conversational, polite, 160-200 chars, use ₹ for amounts",
        "SMS": "very short under 140 chars, plain text only",
        "EMAIL": "professional 3-5 sentences with formal salutation and sign-off",
    }
    audience = {
        "PARENT": "parents/guardians",
        "TEACHER": "teaching staff",
        "STUDENT": "students",
        "ALL": "all school community members",
    }
    message = ask(
        f"Draft a school communication for {school_name}.\n"
        f"Channel: {req.channel} ({guidance[req.channel]})\n"
        f"Audience: {audience[req.recipientRole]}\n"
        f"Brief: {req.brief}\n\n"
        f"Write only the message text. No subject line. No commentary."
    )
    return {"message": message}


# ── 5. Communication suggestions from upcoming events ─────────────────────────

class EventItem(BaseModel):
    title: str
    eventType: str
    startDate: str
    endDate: str
    description: Optional[str] = None


class CommSuggestRequest(BaseModel):
    tenantId: str
    events: list[EventItem]
    channel: str = Field(default="WHATSAPP", pattern="^(WHATSAPP|SMS|EMAIL)$")


@app.post("/ai/communication/suggest", dependencies=[Depends(require_service_key)])
def suggest_communications(req: CommSuggestRequest):
    if not req.events:
        return {"suggestions": []}

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT name FROM "Tenant" WHERE id = %s', (req.tenantId,))
        tenant = cur.fetchone()
        school_name = tenant["name"] if tenant else "the school"

    guidance = {
        "WHATSAPP": "conversational, polite, 160-200 chars",
        "SMS": "under 140 chars, plain text only",
        "EMAIL": "professional, 3-4 sentences with salutation",
    }

    event_list = "\n".join(
        f"- {e.title} ({e.eventType}): {e.startDate} to {e.endDate}"
        + (f" — {e.description}" if e.description else "")
        for e in req.events
    )

    raw = ask(
        f"You are helping {school_name} plan parent communications for upcoming events.\n"
        f"Channel: {req.channel} ({guidance[req.channel]})\n\n"
        f"Upcoming events:\n{event_list}\n\n"
        f"For each event that warrants a parent notification (skip internal-only meetings), "
        f"write a ready-to-send message. Format your response as a JSON array:\n"
        f'[{{"eventTitle":"...","recipientRole":"PARENT","message":"...","priority":"HIGH|MEDIUM|LOW"}}]\n'
        f"Return only the JSON array, no markdown, no commentary.",
        max_tokens=1024,
    )

    # Parse the JSON the model returned; fall back to empty list on bad output
    import json, re as _re
    try:
        # Strip any accidental markdown fences
        clean = _re.sub(r"```[a-z]*\n?", "", raw).strip()
        suggestions = json.loads(clean)
        if not isinstance(suggestions, list):
            suggestions = []
    except Exception:
        suggestions = []

    return {"suggestions": suggestions}
