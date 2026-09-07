# Project status — handoff

_Last updated: 2026-09-06_

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
`npm run infra:up`/`infra:down` at it, set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_saas`.

Option B: finish the native install — cancel the stuck installer, run
`winget install -e --id PostgreSQL.PostgreSQL.17` in a normal PowerShell, click through the
GUI (password, port 5432, no Stack Builder), then
`& "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres school_saas`.

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
