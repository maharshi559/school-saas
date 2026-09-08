# CLAUDE.md

Project-specific guidance for Claude Code. The **`school-management-saas` skill**
is the source of truth for product scope, tech-stack rationale, and market
context — consult it before proposing any deviation.

## Non-negotiables

- **Tenant isolation**: every business table has `tenantId`; every query is
  filtered by it via the tenant extension in `packages/db/src/tenant.ts`. Use
  `prisma` (scoped) in request handlers, `systemPrisma` (unscoped) only for
  platform work. Never hand-write `where: { tenantId }`.
- **AI is assist-only for official records**: AI may detect / suggest / draft /
  flag / translate / batch-analyse, but a human must confirm any grade,
  admission decision, or attendance mark.
- **Offline-first attendance**: the attendance write path must not gain a hard
  network dependency. Client queues to IndexedDB (`apps/web/src/lib/offline-db.ts`),
  syncs later, idempotent via `clientRecordId`.
- **DPDP consent**: per Parent–Student pair, per scope (general / AI / WhatsApp /
  SMS) — never a single checkbox. India data residency for any hosting/storage.
- **Localization**: no hardcoded user-facing English. Hindi + English at MVP.
- **Cost discipline**: default AI calls to batch/cached, not live per-request.

## Design System

- **Theme tokens only**: All colors and spacing come from CSS custom properties defined in `apps/web/src/index.css` (--background, --foreground, --card, --muted, --accent, --border, --input, --destructive, --ring). Never use Tailwind's built-in colors (slate-*, text-*, bg-*). The theme system supports light/dark mode via `data-theme` attribute and `prefers-color-scheme`.
- **Play within the theme**: All UI must use only the defined tokens. New components derive their colors from the same token set. If a new color is needed, add it to the theme tokens first, never as an inline hex value.
- **Icon library**: Use inline SVG icons (Lucide style: 24×24 viewBox, 2px stroke, `currentColor`), never emoji or Tailwind icon plugins.

## Role System (Flexible & Multi-Level)

- **App-Level Roles** (via UserRole model):
  - `APP_ADMIN` — Full platform access, manage schools, users, system config
  - `APP_SUPPORT` — Support team access (view-only access across all tenants)

- **Tenant-Level Roles** (via Membership model):
  - `SCHOOL_ADMIN` — Manage school, staff, students, finances, communications
  - `PRINCIPAL` — Lead school; view all data
  - `FINANCE_MANAGER` — Manage fees, payments, expenses
  - `ACCOUNTANT` — View/record transactions
  - `TEACHER` — Mark attendance, view students
  - `PARENT` — View own child's data
  - `STAFF` — Support staff (janitor, admin, etc.)

- **Architecture**:
  - User has many UserRole (app-level)
  - User has many Membership (tenant-level)
  - Membership includes role + tenant + status
  - Roles can be granted/revoked with audit trail (grantedAt, grantedBy, revokedAt)
  - Supports multiple roles per user per tenant

## Conventions

- ESM everywhere (`"type": "module"`), `.js` import specifiers in TS.
- Shared request/response shapes live in `@iskool/shared` as Zod schemas.
- Fastify modules under `apps/api/src/modules/<name>/routes.ts`.
- npm workspaces (no pnpm/turbo). Run scripts from repo root.

## Admin Role Management API

**App-Admin Only Endpoints:**
- `GET /admin/users/:phone/roles` — Get all roles for a user (app-level + tenant-level)
- `POST /admin/users/roles/grant` — Grant app-level role (APP_ADMIN, APP_SUPPORT)
- `POST /admin/users/roles/revoke` — Revoke app-level role (soft-delete with audit trail)
- `POST /admin/users/tenant-roles/grant` — Grant tenant-level role to user
- `GET /admin/users/with-roles` — List all users with app-level roles

## Admin Portal

- **App Admin Portal** (`/admin/tenants`): Lists all schools in a table with school name, admin name/phone, school code, status, student count
- **School Creation Form**: Captures school name, admin first/last name, admin phone, and initial status (TRIAL/ACTIVE/SUSPENDED/CANCELLED)
- **Soft Deletes**: School deletion sets `Tenant.deletedAt`; soft-deleted schools are excluded from API responses
- **Edit/Delete UI**: Each school row has edit (opens form with prefilled data) and delete (soft delete with confirmation) buttons
- **Admin Enrichment**: GET `/admin/tenants` joins school admin membership to return adminName and adminPhone alongside tenant data
- **Inline Admin Phone Editing**: Click pencil icon to edit school admin's phone number; next login uses new number

## Attendance Portal (Mobile-First)

- **Keyboard Shortcuts** (for teachers marking attendance):
  - **P** = PRESENT (green)
  - **A** = ABSENT (red)
  - **L** = LATE (gray)
  - **E** = EXCUSED (muted)
  - **Arrow keys** = navigate between students
- **Mobile-First Design**: Vertical stack on mobile, 2-column on tablet/desktop; large h-12 touch targets
- **Class Section & Date Selector**: Dropdown to select class, date picker (max today)
- **Student List**: Shows name, admission number; color-coded status badges
- **Progress Bar**: Visual indicator of marked vs total students
- **Submit Button**: Batches all attendance records with `clientRecordId` for idempotent offline sync
- **API Endpoints**:
  - `GET /class-sections` — List all class sections for the school
  - `GET /class-sections/:sectionId/students-for-attendance` — Get enrolled students
  - `GET /attendance-session?classSectionId=X&date=YYYY-MM-DD` — Fetch or auto-create session
  - `POST /attendance` — Submit batch attendance records (idempotent via clientRecordId)
  - `GET /students/:studentId/attendance` — View attendance history

## Finance Module

- **Fee Structures**: Create reusable fee templates (annual/semester/monthly) with amount and due date
- **Student Fees**: Assign fees to students; track amount due, paid, status (PENDING/PARTIAL/PAID/OVERDUE)
- **Payments**: Record payments with method (CASH/CHECK/BANK_TRANSFER/CARD/UPI/OTHER), reference, and date
- **Expenses**: Track school expenses by category (SALARY, UTILITIES, MAINTENANCE, SUPPLIES, TRANSPORTATION, FOOD, EQUIPMENT, OTHER)
- **FinanceSummary**: Cached summary of total fees, paid amount, expenses, and overdue amounts (updated on each transaction)
- **API Endpoints**:
  - `GET/POST /fee-structures` — CRUD for fee templates
  - `GET /students/:studentId/fees` — Student's fee records with payment history
  - `POST /student-fees` — Assign fee to student
  - `POST /payments` — Record payment (auto-updates StudentFee status)
  - `GET /expenses` — List expenses with category breakdown
  - `POST /expenses` — Record new expense
  - `GET /finance/summary` — Dashboard totals (fees, paid, expenses, overdue)
  - `GET /finance/pending-fees` — Students with unpaid/overdue fees
  - `GET /finance/expense-report` — Expense breakdown by category for date range

## Communication Module

- **Message Templates**: Pre-built templates for UPDATE, HOLIDAY, CLOSURE, ANNOUNCEMENT, EMERGENCY, OTHER
- **Template Variables**: Support `{{variable}}` placeholders (e.g., `{{schoolName}}`, `{{date}}`, `{{reason}}`)
- **Multi-Channel**: WhatsApp, SMS, Email (extensible)
- **Recipient Targeting**: PARENT, TEACHER, STUDENT, or ALL
- **Draft & Schedule**: Save as draft or schedule for later sending
- **Communication Log**: Track all messages sent with status (DRAFT/SCHEDULED/SENT/FAILED/DELIVERED)
- **WhatsApp Config**: Store WhatsApp Business API credentials per tenant
- **API Endpoints**:
  - `GET /communication/templates` — List active templates
  - `POST /communication/templates` — Create template
  - `PATCH /communication/templates/:id` — Update template
  - `DELETE /communication/templates/:id` — Soft-delete template
  - `POST /communication/send` — Send message (logs to CommunicationLog, counts recipients)
  - `GET /communication/history` — View all sent messages with filtering
  - `GET /communication/stats` — Dashboard stats (by status, channel, role, total recipients)

## Development Gotchas

- **Vite env cache**: Changes to `.env` won't take effect in `apps/web` until dev server restarts. Always restart after `.env` changes: `npm run -w apps/web dev`
- **Database migrations**: Run from `packages/db` directory with `npm run migrate` (interactive). After migration, reseed with `npm run seed`.
- **API base URL**: Frontend (`apps/web`) needs `VITE_API_BASE_URL` env var to point to API (default `http://localhost:4000`). Web server is `http://localhost:5173`.

## MVP module order

Tenant onboarding → Auth & roles → SIS → Attendance → Homework (thin) → Fees →
Communication → Consent → Admin dashboard → Engagement. Everything else is
fast-follow or deferred — check the skill before starting one.
