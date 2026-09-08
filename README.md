# iskool

Multi-tenant school management platform for India's K-12 market (budget private,
rural, and tier-2/3 schools). See the `school-management-saas` skill for the full
product/architecture rationale.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite, Tailwind, vite-plugin-pwa (Workbox), Dexie (IndexedDB) |
| Backend | Node + TypeScript, Fastify 5, Prisma 6 |
| Database | PostgreSQL 16 (shared DB, pool model — `tenantId` on every business table) |
| Cache/Queue | Redis 7 + BullMQ *(not wired yet)* |
| Auth | Phone OTP (console provider in dev; MSG91 for staging/prod) |

## Layout

```
apps/
  api/     Fastify API  (@iskool/api)
  web/     React PWA     (@iskool/web)
packages/
  db/      Prisma schema + tenant-isolation extension  (@iskool/db)
  shared/  Zod contracts, enums, roles                 (@iskool/shared)
```

## First-time setup

Database is a **hosted Postgres** (Neon or Supabase free tier). Redis is expected
locally on `:6379` but isn't load-bearing yet.

1. Create a free Postgres:
   - **Neon** — https://neon.tech → new project → copy the connection string.
   - **Supabase** — https://supabase.com → new project (pick the **ap-south-1 /
     Mumbai** region) → Settings ▸ Database ▸ Connection string ▸ URI. Use the
     **direct** connection on port `5432`, not the pooled `6543` one.
2. Then:

```bash
npm install
cp .env.example .env
# paste your connection string into DATABASE_URL in .env
npm run db:migrate               # create schema (name it "init")
npm run db:seed                  # demo school + admin/teacher/parent
npm run dev                      # API on :4000, web on :5173
```

Dev login: request an OTP for `9999900001` (admin), `9999900002` (teacher) or
`9999900003` (parent); the code is printed in the API console.

### Local Postgres instead (optional, needs Docker)

`docker-compose.yml` runs Postgres + Redis. If you use it, set
`DATABASE_URL="postgresql://school:school@localhost:5432/iskool?sslmode=disable"`
and run `npm run infra:up` before the migrate step.

## Tenant isolation — read before adding a model

Every tenant-scoped table has `tenantId`, and **every query must be filtered by
it**. That is enforced centrally, not per call site:

- Request handlers call `app.tenantScope([roles])` as a preHandler. It verifies
  the caller's membership and enters a tenant context.
- Inside that context, import `prisma` from `@school/db` — a Prisma client
  extension injects `tenantId` into every `where`/`data`. Never hand-write
  `where: { tenantId }`.
- `systemPrisma` is the unscoped client — platform/billing/super-admin only.
- New tenant-scoped model? Add `tenantId`, a `@@unique`/`@@index` that leads with
  `tenantId`, and leave it **out** of `GLOBAL_MODELS` in `packages/db/src/tenant.ts`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | API + web in parallel |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | reseed demo data |
| `npm run typecheck` | all workspaces |
| `npm run infra:up` / `infra:down` | Docker services |
