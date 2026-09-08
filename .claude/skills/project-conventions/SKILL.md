---
name: project-conventions
description: iSchool non-negotiables - tenant isolation, design system, roles, AI guardrails
user-invocable: false
---

# iSchool Project Conventions

Critical patterns and constraints that define this multi-tenant school SaaS platform.

## 🔒 Tenant Isolation (Non-Negotiable)

Every business table has `tenantId`. Every query is filtered by it via the tenant extension in `packages/db/src/tenant.ts`.

**Rules:**
- Use `prisma` (scoped, tenant-filtered) in request handlers
- Use `systemPrisma` (unscoped) only for platform-wide work (user auth, app roles)
- Never write `where: { tenantId }` by hand — the tenant extension handles it
- Every API response must respect tenant boundaries
- Test tenant isolation — verify one tenant cannot see another's data

**Example (WRONG):**
```ts
// ❌ Manual tenantId in query = tenant extension bypassed
const students = await prisma.student.findMany({
  where: { classId, tenantId: userTenantId }
});
```

**Example (RIGHT):**
```ts
// ✅ Tenant extension auto-filters
const students = await prisma.student.findMany({
  where: { classId }
});
```

## 🎨 Design System (Theme Tokens Only)

All colors and spacing come from CSS custom properties in `apps/web/src/index.css`. Never use Tailwind's built-in colors.

**Token List:**
- `--background`, `--foreground` (page background + text)
- `--card` (card/panel background)
- `--muted` (muted text, disabled state)
- `--accent` (primary CTA, highlights)
- `--border` (dividers, outlines)
- `--input` (form input background)
- `--destructive` (delete, error states)
- `--ring` (focus ring, selection)

**Rules:**
- All colors in CSS: `color: var(--foreground);`
- All backgrounds: `background: var(--card);`
- Never: `text-slate-600`, `bg-blue-500`, hardcoded `#hex`
- If a new color is needed, add it to the theme tokens first
- Light/dark mode via `data-theme` attribute + `prefers-color-scheme` media query

**Example (WRONG):**
```tsx
// ❌ Hardcoded Tailwind color
<button className="bg-blue-500 text-white">Save</button>
```

**Example (RIGHT):**
```tsx
// ✅ Uses theme tokens
<button className="bg-[var(--accent)] text-[var(--background)]">Save</button>
```

## 👥 Role System (App-Level + Tenant-Level)

**App-Level Roles** (UserRole model — global):
- `APP_ADMIN` — Platform access, manage schools, system config
- `APP_SUPPORT` — Support team, view-only across all tenants

**Tenant-Level Roles** (Membership model — per school):
- `SCHOOL_ADMIN` — Full school management
- `PRINCIPAL` — Lead school, view all data
- `FINANCE_MANAGER` — Fees, payments, expenses
- `ACCOUNTANT` — View/record transactions (read-mostly)
- `TEACHER` — Mark attendance, view students
- `PARENT` — View own child's data only
- `STAFF` — General school staff

**Authorization Pattern:**
```ts
// Check app-level role
const isAppAdmin = user.userRoles.some(r => r.role === 'APP_ADMIN');

// Check tenant-level role
const membership = user.memberships.find(m => m.tenantId === tenantId);
const isSchoolAdmin = membership?.role === 'SCHOOL_ADMIN';
```

## 🚫 AI is Assist-Only for Official Records

AI may detect, suggest, draft, flag, translate, batch-analyse — but **a human must confirm**:
- Any grade or exam score
- Admission decisions
- Attendance marks (P/A/L/E)
- Financial amounts (fees, payments)
- Disciplinary actions

**Workflow:**
1. AI drafts or flags (e.g., "unusually high absence rate")
2. Teacher/admin reviews and confirms
3. System records who confirmed and when (audit trail)

## 📱 Offline-First Attendance

The attendance write path must not gain a hard network dependency.

**Flow:**
1. Teacher marks attendance on mobile (works offline)
2. Records queue to IndexedDB (`apps/web/src/lib/offline-db.ts`)
3. On reconnect, syncs to server
4. Idempotent via `clientRecordId` (client generates UUID)

**Files:**
- `apps/web/src/lib/offline-db.ts` — IndexedDB schema
- `POST /attendance` endpoint — accepts batch with clientRecordId

## 🔐 DPDP Consent

Per Parent–Student pair, per scope (not a single checkbox):
- `general` — Basic school communication
- `AI` — AI-powered features (suggestions, analytics)
- `WhatsApp` — WhatsApp messaging
- `SMS` — SMS messaging

**Storage:** India data residency for any hosting/storage.

## 🌍 Localization

No hardcoded user-facing English. Hindi + English at MVP.

**Files:**
- `apps/web/src/lib/i18n.tsx` — i18n setup

**Pattern:**
```tsx
// ✅ Use i18n
const { t } = useI18n();
<label>{t('common.email')}</label>

// ❌ Never hardcode
<label>Email Address</label>
```

## 💰 Cost Discipline

Default AI calls to batch/cached, not live per-request.

- Use batch endpoints where available (e.g., Anthropic batch API)
- Use prompt caching for repeated patterns
- Log AI cost per tenant for billing
- Avoid per-request LLM calls in critical paths (attendance, fees)

## 🏗️ Architecture Conventions

- **ESM everywhere** — `"type": "module"` in all package.json
- **Import specifiers** — Use `.js` extensions in TS imports
- **Shared types** — `@iskool/shared` for request/response Zod schemas
- **API routes** — Fastify modules under `apps/api/src/modules/<name>/routes.ts`
- **npm workspaces** — No pnpm/turbo; run scripts from repo root

## 🚀 Development Gotchas

1. **Vite env cache** — Changes to `.env` won't take effect in `apps/web` until dev server restarts
2. **Database migrations** — Run from `packages/db` directory with `npm run migrate`
3. **API base URL** — Frontend needs `VITE_API_BASE_URL` env var (default `http://localhost:4000`)
