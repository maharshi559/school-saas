---
name: verify-before-done
description: Pre-merge verification checklist for iSchool - enforced before claiming "done"
user-invocable: false
context: fork
---

# Verification Before Done

**GATE**: Claude must verify ALL checkboxes before claiming a fix/feature is complete. If any fail, report the blocker and stop.

---

## 🎯 Universal Checks (Every Change)

- [ ] **TypeScript compiles** — `npm run typecheck` passes with no errors
- [ ] **No linting issues** — `npm run lint` passes (or documented exceptions)
- [ ] **Git status clean** — No uncommitted files left behind
- [ ] **Commit message clear** — Describes WHAT changed and WHY

---

## 🔐 Tenant Isolation Checks (Any API/DB changes)

Only required if the change touches:
- `packages/db/src/` (Prisma schema, migrations)
- `apps/api/src/modules/*/routes.ts` (API endpoints)
- `apps/api/src/plugins/auth.ts` (Auth logic)

**Checklist:**
- [ ] Every `prisma.` query filters by `tenantId` (or uses tenant extension)
- [ ] No `systemPrisma` outside of platform work
- [ ] User membership validated before access
- [ ] Role checks are tenant-scoped, not global
- [ ] Response doesn't leak data from other tenants
- [ ] Soft-deleted records (`deletedAt`) excluded from queries

**How to verify:**
```bash
# 1. Search for prisma queries:
grep -r "prisma\." apps/api/src/modules/<name>/

# 2. Check each query has where: { ... } with tenantId
# 3. Run: /code-review <file> --agent security-reviewer
```

---

## 🎨 Design System Checks (Any UI changes)

Only required if the change touches:
- `apps/web/src/components/**/*.tsx`
- `apps/web/src/features/**/*.tsx`
- `apps/web/src/index.css` (theme tokens)

**Checklist:**
- [ ] No hardcoded colors (use CSS custom properties only)
- [ ] All colors from `--background`, `--foreground`, `--card`, `--accent`, etc.
- [ ] No Tailwind built-in colors (`text-slate-600`, `bg-blue-500`, etc.)
- [ ] Theme tokens support light/dark mode via `data-theme`
- [ ] No emoji icons (use inline SVG, Lucide style)
- [ ] Responsive: mobile first, works on 320px+ width

**How to verify:**
```bash
# 1. Visual check in browser:
npm run -w apps/web dev
# Open http://localhost:5173, test light/dark mode toggle

# 2. Grep for hardcoded colors:
grep -r "bg-\|text-\|#[0-9a-f]\|rgb(" apps/web/src/components/

# 3. Should return 0 results (or only in comments)
```

---

## 📱 Offline-First Checks (Attendance changes)

Only required if the change touches:
- `apps/web/src/lib/offline-db.ts` (IndexedDB)
- `POST /attendance` endpoint
- Attendance marking UI

**Checklist:**
- [ ] Attendance writes queue to IndexedDB if offline
- [ ] Sync to server happens on reconnect
- [ ] `clientRecordId` prevents duplicate records
- [ ] Works offline → mark attendance → go online → auto-syncs
- [ ] No hard network dependency in write path

**How to verify:**
```bash
# 1. Open DevTools → Network tab
# 2. Throttle to "Offline"
# 3. Mark attendance for a student
# 4. Verify it queues to IndexedDB (not errored)
# 5. Go back online → auto-sync happens
```

---

## 🧪 Testing Checks (Feature/Bug fix)

Required for:
- New features
- Bug fixes
- API changes
- Business logic changes

**Checklist:**
- [ ] Tests exist and pass — `npm run test` (or `npm run -w apps/api test`)
- [ ] Tests cover happy path + edge cases
- [ ] No `.only` or `.skip` left in test files
- [ ] Manual verification done in browser (golden path)

**How to verify:**
```bash
# Run tests
npm run test

# If no tests exist, create a minimal one:
# apps/api/src/modules/<name>/<name>.test.ts
```

---

## 📚 API Contract Checks (Backend changes)

Only required if the change touches API routes.

**Checklist:**
- [ ] Response shape matches `@iskool/shared` Zod schema
- [ ] Error responses include `message` and `code`
- [ ] Request body validated with Zod
- [ ] Endpoint documented (comments or OpenAPI)
- [ ] Tested with curl or Postman

**How to verify:**
```bash
# Check the route file for Zod schemas
cat apps/api/src/modules/<name>/routes.ts | grep "z.object"

# Test endpoint:
curl -X POST http://localhost:4000/api/v1/<endpoint> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "field": "value" }'
```

---

## 🔄 Dependency Changes Checks

Only required if `package.json` or lockfile changed.

**Checklist:**
- [ ] Dependency added only if necessary (not "just in case")
- [ ] No major security vulnerabilities — `npm audit`
- [ ] Lockfile committed (reproducible builds)
- [ ] Build still succeeds — `npm run build`

---

## 🚀 Pre-Merge Final Check

Before you (the user) merge to main:

- [ ] All CI checks pass (GitHub Actions, if configured)
- [ ] Commit history is clean (logical commits, good messages)
- [ ] No `console.log()`, `debugger`, or `.only` left
- [ ] Squash fixup commits if any
- [ ] Peer review completed (if team process requires it)

---

## When This Blocker Applies

**I claim "done" ONLY if:**
1. The specific change category is completed (feature, fix, refactor)
2. ALL applicable checkboxes above are verified ✅
3. I've tested the golden path manually
4. No edge cases or regressions introduced

**If any check fails:**
```
❌ BLOCKER: Tests failing in attendance module
   Error: clientRecordId validation fails on duplicate marks

   Next steps:
   1. Fix the validation logic
   2. Re-run: npm run -w apps/api test
   3. Verify sync works offline
```

---

## Examples

### ✅ Good: Feature Complete with Verification
```
Added student fee assignment UI:
- ✅ TypeScript compiles
- ✅ Design system (all colors use CSS tokens)
- ✅ Tests pass (happy path + edge case: no fees assigned)
- ✅ Tested in browser: desktop + mobile, light/dark modes
- ✅ API contract validated against StudentFeeSchema

Ready to merge.
```

### ❌ Bad: Incomplete Claim (Would Be Blocked)
```
"Fixed attendance sync bug"
- ❌ Tests still failing: offline queue not flushing
- ❌ Tenant isolation check not run
- ❌ Manual verification: sync doesn't work on reconnect

NOT DONE. Cannot claim complete until above pass.
```

---

## Custom Project Notes

- **iSchool multi-tenant**: Every fix must not break tenant isolation
- **Offline-first attendance**: No hard network dependency allowed
- **Design system**: Theme tokens are non-negotiable
- **India context**: No hardcoded English, DPDP compliance
