# Project status — handoff

_Last updated: 2026-09-07_

## Done

- Full npm-workspaces monorepo scaffolded and **type-checking clean** (`npm run typecheck`).
  - `apps/api` — Fastify 5, phone-OTP auth (console provider in dev), health checks,
    `students` module demonstrating tenant scoping.
  - `apps/web` — React + Vite + Tailwind + vite-plugin-pwa + Dexie, OTP login + dashboard.
  - `packages/db` — Prisma 6 schema (MVP slice) + central tenant-isolation extension
    (`packages/db/src/tenant.ts`). `prisma generate` has been run.
  - `packages/shared` — Zod contracts, roles, enums.
- `npm install` done. Git initialised, all files staged, **no commits yet**.
- Redis is already running locally as a Windows service on :6379 (not load-bearing yet).

## Blocked / not done

- **No working Postgres.** Decisions flip-flopped (hosted → local). A `winget install
  PostgreSQL.PostgreSQL.17` was attempted and **hung on a GUI dialog** — binaries got
  extracted to `C:\Program Files\PostgreSQL\17` but `initdb` never ran, no service, nothing
  on :5432. The stuck installer process may still need to be cancelled/killed.
- Therefore `db:migrate` and `db:seed` have **not** run; the app has not been started end to end.

## Next step — pick a Postgres and finish bootstrap

Option A (recommended, no admin): wire `embedded-postgres` into `packages/db`, point
`npm run infra:up`/`infra:down` at it, set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/iskool`.

Option B: finish the native install — cancel the stuck installer, run
`winget install -e --id PostgreSQL.PostgreSQL.17` in a normal PowerShell, click through the
GUI (password, port 5432, no Stack Builder), then
`& "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres iskool`.

Option C: hosted Neon/Supabase — paste the direct connection string into `.env`.

Then:

```bash
cd C:\Projects\school-saas
# set DATABASE_URL in .env
npm run db:migrate      # name it "init"
npm run db:seed
npm run dev             # API :4000, web :5173
```

Dev login OTP is printed in the API console. Seed users: admin `9999900001`,
teacher `9999900002`, parent `9999900003`.

## Then — first MVP module

Per `CLAUDE.md` / the `school-management-saas` skill, MVP order is:
Tenant onboarding → Auth & roles → SIS → Attendance → Homework (thin) → Fees →
Communication → Consent → Admin dashboard → Engagement.
Auth + a thin SIS slice already exist; **Attendance (offline-first)** is the natural next build.

---

## Post-MVP Roadmap

Benchmarked against Skolaro (56 modules, 1,800+ schools). Grouped by priority.

### Tier 1 — High-value, schools evaluate first

| Feature | Description |
|---|---|
| **Admissions pipeline** | Enquiry capture, counsellor follow-ups, funnel view, merit list, digital offer letters, online fee collection at admission |
| **Timetable** | Auto-generation from constraints (teacher load, rooms, labs), drag-drop editing, conflict detection, substitution management |
| **Parent mobile app** | Branded PWA/native shell; push + WhatsApp + SMS; 2-way messaging; absence alerts within 5 min |
| **Period-wise attendance** | Per-period marking for secondary/senior classes; biometric/RFID/QR integration hooks |
| **Report cards** | Grade boundary config, custom card template designer, bulk publish to parents |

### Tier 2 — Operational depth

| Feature | Description |
|---|---|
| **Payroll** | Attendance-linked salary calc; PF/ESI/TDS (India statutory); payslip distribution; Form 16 / Form 24Q |
| **Library** | Book catalogue, barcode check-in/out, fine calculation, OPAC search via app, fine billing to fee module |
| **Transport** | Route/stop planning, live GPS tracking, RFID boarding capture, parent arrival notifications, route-based fee billing |
| **Analytics & Reports** | 200+ pre-built reports, custom drag-drop builder, scheduled delivery (PDF/Excel), Power BI integration |
| **Inventory & Assets** | Asset lifecycle tracking, stock-in/out, PO generation, vendor master, depreciation calc |

### Tier 3 — Supporting modules

| Feature | Description |
|---|---|
| Gate pass | Visitor logbook, parent pickup verification, student exit approvals |
| Hostel management | Room allocation, mess fee, warden dashboard |
| Health / infirmary | Visit log, medication tracking, parent notification |
| Front office | Visitor log, reception dashboard |
| LMS | Lesson upload, question banks, online timed tests, assignment submission, live class links |
| College ERP | CBCS course catalog, elective scheduling, exam hall tickets, placements, AICTE/UGC reports |

### Out of scope (for now)

- Virtual reality classrooms
- Multi-country statutory compliance (UAE end-of-service, etc.) — revisit when expanding beyond India

---

## Competitor Weaknesses — Market Entry Points

Benchmarked against Teachmint, Entab (CampusCare), Fedena, and Edunext. These are the specific gaps iskool can exploit.

### Teachmint
- **Frankenstein UX**: Built by acquisition — admin tools (fee restructuring, inventory) don't connect to the classroom tool
- **Poor parent support**: Teacher features updated constantly; parent bug pipeline is slow
- **Too fast to update**: Dashboards change overnight without warning, confusing non-tech staff

### Entab (CampusCare) — legacy leader for elite schools
- **Training-heavy**: Built like a 2010 corporate ERP; requires formal training for clerks and teachers
- **Mobile lag**: App is slow and feels outdated; parents complain consistently
- **Overpriced**: Locked out of smaller and budget private schools

### Fedena
- **Self-hosting complexity**: Requires server management; crashes during high-traffic events (report card day, fee day)
- **Hidden cost invoicing**: Cheap base, heavy add-on invoices for library, hostel, support
- **Language barrier**: English-only — non-teaching staff (bus drivers, guards, local-language teachers) can't use it

### Edunext
- **Notification fatigue**: Separate app notifications for homework, attendance, GPS, fee reminders — not consolidated
- **Closed ecosystem**: Forces schools into proprietary stack; hard to connect with Google Workspace or Tally

### iskool's winning angles (from this analysis)
1. **Zero-training UX**: A 50-year-old teacher who knows WhatsApp should be able to take attendance in 2 taps — no manual
2. **Native WhatsApp/SMS failover**: Route report cards and fee UPI payment links directly via WhatsApp Business API instead of requiring a heavy native app
3. **Flat-rate transparent pricing**: No surprise module invoices; one predictable subscription with everything included
4. **Language-first**: Hindi + English at MVP; local-language staff can navigate without English literacy
