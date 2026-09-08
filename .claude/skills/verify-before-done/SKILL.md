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

## 📋 Form Error Checks (Frontend validation)

**Mandatory for every form change**

**Checklist:**
- [ ] All required fields marked visually (red asterisk or label)
- [ ] Validation errors appear inline below field (not in console)
- [ ] Error messages specific (not "Error" or "Bad input")
- [ ] Submit button disabled until form valid
- [ ] No `console.log()` for production (dev only)
- [ ] Console shows errors for debugging (dev, not prod)
- [ ] Error messages match backend error messages
- [ ] Form clears errors when user corrects input
- [ ] Mobile: error text readable on small screens

**How to verify:**

```bash
# 1. Open DevTools → Console tab
# 2. Load the form, check console is clean (no errors/warnings)
# 3. Try to submit empty form:
#    ✅ Inline error appears: "Phone required"
#    ❌ Only console.log() (user doesn't see)
# 4. Enter invalid phone "123":
#    ✅ Error updates: "Phone must be +91 followed by 10 digits"
#    ✅ Submit button disabled
# 5. Enter valid phone:
#    ✅ Error disappears
#    ✅ Submit button enabled
# 6. Test on mobile (DevTools → Mobile view):
#    ✅ Errors still readable and positioned correctly
```

**Example: Good Form Validation**
```tsx
// ✅ Good: Errors visible, specific, inline
<form>
  <div>
    <label>Phone *</label>
    <input 
      value={phone}
      onChange={(e) => {
        setPhone(e.target.value);
        // Clear error when user starts typing
        if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
      }}
      aria-invalid={!!errors.phone}
    />
    {errors.phone && (
      <span className="text-destructive text-sm">{errors.phone}</span>
    )}
  </div>
  
  <button type="submit" disabled={!isFormValid}>
    Register
  </button>
</form>

// Console output:
// ✅ Nothing logged in production
// (or only: "Form validation triggered" in dev)
```

**Example: Bad Form Validation**
```tsx
// ❌ Bad: Error only in console, user doesn't see
<form>
  <input value={phone} />
  <button onClick={() => {
    if (!phone.match(/^\+91\d{10}$/)) {
      console.log("Invalid phone"); // ← User doesn't see this!
    }
  }}>
    Submit
  </button>
</form>
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

## 🔍 Payload Verification Checks (API endpoints)

**Mandatory for every new endpoint or changed payload**

**Checklist:**
- [ ] Required fields validated (no optional required fields)
- [ ] Field types enforced (string, number, boolean, enum)
- [ ] Field constraints enforced (min/max length, pattern, range)
- [ ] Invalid input rejected with specific error message
- [ ] All field validations in Zod schema (no inline checks)
- [ ] Error message reveals no sensitive data
- [ ] Phone format: +91XXXXXXXXXX (India context)
- [ ] Email format validated
- [ ] Enum values documented

**How to verify:**

```bash
# 1. Check Zod schema in routes file
grep -A 20 "z.object" apps/api/src/modules/<name>/routes.ts

# 2. Schema should include:
CreateStudentSchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/),  // ✅ Pattern
  email: z.string().email().optional(),      // ✅ Optional
  name: z.string().min(2).max(100),          // ✅ Constraints
  classId: z.string().cuid(),                // ✅ Type
  role: z.enum(['TEACHER', 'STUDENT']),      // ✅ Enum
})

# 3. Test invalid payloads:
curl -X POST http://localhost:4000/api/v1/students \
  -d '{ "phone": "123" }' \  # ❌ Too short
# Should return: { error: "Phone must be +91 followed by 10 digits" }

curl -X POST http://localhost:4000/api/v1/students \
  -d '{ "name": "" }' \      # ❌ Empty
# Should return: { error: "Name required, min 2 characters" }

curl -X POST http://localhost:4000/api/v1/students \
  -d '{ "role": "ADMIN" }' \ # ❌ Invalid enum
# Should return: { error: "Role must be TEACHER or STUDENT" }

# 4. Verify responses in DevTools Network tab
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
