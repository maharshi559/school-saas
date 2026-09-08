# Claude Code Setup for iSchool

Complete automation setup to eliminate back-and-forth development and ensure code quality.

---

## 🎯 Problem Solved

**Before Setup:**
```
User: "Fix bug X"
Me: "Done!"
User: "Tests fail..."
Me: "Oh, I didn't test offline sync"
(repeat 3x)
```

**After Setup:**
```
User: "Fix bug X"
Me: "Questions first..." → "Here's the spec, confirm?"
User: "Confirmed"
Me: "Building..." → "Verifying..." → "ALL CHECKS PASS → DONE"
(zero back-and-forth)
```

---

## 📦 What's Included

### Gates (Block Premature Work)
| Gate | File | Purpose | Blocks |
|------|------|---------|--------|
| **clarify-before-coding** | `.claude/skills/clarify-before-coding/SKILL.md` | Ask questions BEFORE coding | Prevents coding without clarity |
| **verify-before-done** | `.claude/skills/verify-before-done/SKILL.md` | Verify ALL checks AFTER coding | Prevents claiming "done" prematurely |

### Skills (Background Knowledge)
| Skill | File | Purpose |
|-------|------|---------|
| **project-conventions** | `.claude/skills/project-conventions/SKILL.md` | Tenant isolation, design system, roles (auto-loaded) |

### Agents (Specialized Review)
| Agent | File | Purpose | Invoke |
|-------|------|---------|--------|
| **security-reviewer** | `.claude/agents/security-reviewer.md` | Deep security audit | `/code-review <branch> --agent security-reviewer` |

### Hooks (Auto-Run)
| Hook | Setting | Purpose | Trigger |
|------|---------|---------|---------|
| **TypeScript check** | `.claude/settings.json` | Catch type errors | After every Edit |
| **Block .env** | `.claude/settings.json` | Prevent config leaks | Before Edit of .env |

### MCP Servers (External Tools)
| Server | Config | Purpose | Use |
|--------|--------|---------|-----|
| **context7** | `.mcp.json` | Reference docs | Ask: "How do I use Prisma?" |
| **Playwright** | `.mcp.json` | Browser testing | Ask: "Click X and screenshot" |

---

## 🚀 How to Use: Complete Workflow

### Step 1: Report Issue/Feature
```
You: "Fix: Users can't log in after registering"
```

### Step 2: I Ask Clarifying Questions (Gate 1)
```
Me: 
Q: What's the business requirement? (Why can't they log in?)
Q: What's the test case? (How do we know it's fixed?)
Q: What error message should show?
Q: Should we log anything to console?
Q: Form validation: phone format, password constraints?
Q: Any tenant isolation implications?

(I don't code yet — waiting for YOUR answers)
```

### Step 3: You Confirm Understanding
```
You: 
A: They should log in immediately with phone + password
A: Test: Register → immediately login with same credentials
A: Error: "Invalid credentials"
A: Console: log JWT failures in dev only
A: Validation: phone +91XXXXXXXXXX, password min 8 chars
A: No tenant isolation (auth is platform-level)
```

### Step 4: I Generate Comprehensive Prompt
```
Me: "I'll implement:
- Validation: phone +91XXXXXXXXXX, password min 8
- Error: 'Invalid credentials' (generic, no data leakage)
- Tests: register → login happy path, invalid password, unregistered phone
- Console: log JWT validation failures (dev only)
- Manual: register in UI, immediate login verification
- Offline: not applicable

Confirm this is correct?"
```

### Step 5: You Confirm Prompt
```
You: "Yes, that's exactly what I need."
```

### Step 6: I Code + Verify (Gate 2)
```
Me: [implementation]

Before claiming done, verifying:
✅ TypeScript compiles
✅ Tests pass (all 3 scenarios)
✅ Payload validation: phone + password checked in Zod
✅ Form errors: inline below fields (not just console)
✅ Error message specific: "Invalid credentials"
✅ No data leakage (generic error for all failure modes)
✅ Console logging implemented (dev only)
✅ Manual verification: register → login works

READY TO MERGE (zero back-and-forth)
```

### Step 7: You Review + Merge
```
You: Checks pull request, all tests pass, merges
```

---

## ✅ The Verification Checklist (Gate 2)

Before I claim ANY work is done:

### Universal (Every Change)
- [ ] TypeScript compiles — `npm run typecheck`
- [ ] No linting issues — `npm run lint`
- [ ] Git status clean
- [ ] Tests pass (or added if new)

### Tenant Isolation (API/DB changes)
- [ ] Every query filters by tenantId
- [ ] No systemPrisma outside platform work
- [ ] User membership validated
- [ ] Role check tenant-scoped, not global
- [ ] Error responses generic (no data leakage)

### Design System (UI changes)
- [ ] No hardcoded colors (CSS tokens only)
- [ ] No Tailwind built-in colors (bg-blue-500, text-slate-600, etc.)
- [ ] Works in light + dark modes
- [ ] Responsive: 320px - 1024px+
- [ ] SVG icons only (no emoji)

### Payload & Form (Any endpoint/form)
- [ ] Zod schema validates all constraints
- [ ] Error messages specific + helpful
- [ ] Form errors inline (not console-only)
- [ ] Invalid input rejected with reason
- [ ] Phone format: +91XXXXXXXXXX
- [ ] No console.log() in production

### Offline-First (Attendance changes)
- [ ] Offline: data queues to IndexedDB
- [ ] Online: auto-sync within 5s
- [ ] clientRecordId prevents duplicates
- [ ] Manual test: offline → mark → online → verify DB

### Testing
- [ ] Tests exist and pass
- [ ] Happy path + edge cases covered
- [ ] No `.only` or `.skip` left
- [ ] Manual verification done in browser

---

## 🎓 Real Example: Add Student Fee Form

### User: "Add form to assign fees to students"

### Gate 1: Clarification
```
Q: Which roles can assign fees? (Only FINANCE_MANAGER?)
Q: Can a TEACHER see fees they didn't create? (Read-only?)
Q: Form validation: required fields? Min/max amounts?
Q: Show inline errors (not just console)?
Q: Tenant isolation: can one school see another's fees?
Q: Test case: Create fee, verify it appears for that school only?
```

### You Confirm
```
A: Only FINANCE_MANAGER
A: TEACHER can view (read-only)
A: Amount required, min 100, max 100000
A: Yes, inline errors below each field
A: Yes, strict isolation per school
A: Create fee for school A, verify school B can't see it
```

### Generated Spec
```
Task: Add Student Fee Assignment Form

Business: FINANCE_MANAGER creates recurring/one-time fees

Form Fields:
- Student: dropdown (enrolled students only)
- Fee Type: dropdown (TUITION, HOSTEL, TRANSPORT, etc.)
- Amount: number, min 100, max 100000 (required)
- Due Date: date picker (required)
- Notes: text, optional

Validation:
- All required fields must be filled
- Amount must be 100-100000
- Show errors inline below fields
- Submit button disabled until valid

Tenant Isolation:
- Only show students from THIS school
- Only FINANCE_MANAGER can see form
- Created fees tied to school tenantId

Tests:
- Happy: Create fee, appears in student's fee list
- Error: Invalid amount → shows "Amount must be 100-100000"
- Isolation: School A fee hidden from School B
- Offline: N/A (requires server)

Manual:
1. Login as FINANCE_MANAGER
2. Fill form: student, amount, date
3. Leave amount blank, try submit
4. Verify error shows: "Amount required"
5. Fill amount "50" (too low)
6. Verify error: "Amount must be minimum 100"
7. Fill correctly, submit
8. Verify fee appears in student's record
9. Login as different school
10. Verify fee NOT visible (isolation)
```

### Gate 2: Verify Before Done
```
✅ TypeScript compiles
✅ Form validation: Zod schema enforces min/max
✅ Form errors: inline below amount field
✅ Tenant isolation: WHERE tenantId filter on fees query
✅ Role check: FINANCE_MANAGER only via middleware
✅ Tests: validation errors, isolation, happy path
✅ Manual: verified all above steps
✅ Dark mode: form still readable
✅ Responsive: works on mobile (360px)

READY TO MERGE
```

---

## 🔧 Files in Your Repo

```
.claude/
├── settings.json           # Hooks: TypeScript check, block .env
├── skills/
│   ├── project-conventions/
│   │   └── SKILL.md        # Non-negotiables (tenant isolation, design system)
│   ├── clarify-before-coding/
│   │   └── SKILL.md        # Questions BEFORE coding (Gate 1)
│   └── verify-before-done/
│       └── SKILL.md        # Checks BEFORE "done" (Gate 2)
└── agents/
    └── security-reviewer.md    # Security audit for auth/tenant changes

.mcp.json                  # MCP servers: context7, Playwright
```

---

## 💡 Key Principles

1. **Clarify FIRST** — No assumptions, no coding without confirmation
2. **Verify BEFORE "DONE"** — All checks pass, not just "it compiles"
3. **Generate SPECS** — Answers → comprehensive implementation guide
4. **Prevent LEAKAGE** — Tenant isolation + error handling checked
5. **USER-VISIBLE ERRORS** — Form errors inline, not console-only
6. **ZERO BACK-AND-FORTH** — If verification fails, blocker + next steps

---

## 🚫 What I WON'T Do (Without Gate 1 Confirmation)

- ❌ Code without understanding the business requirement
- ❌ Skip asking about tenant isolation implications
- ❌ Implement without knowing test cases
- ❌ Make assumptions about form validation
- ❌ Proceed without knowing affected roles
- ❌ Claim "done" without running all verification checks

---

## ✨ Result

**Time to merge:** Fast (no waiting for back-and-forth)  
**Quality:** High (all checks pass)  
**Confidence:** High (business requirement confirmed upfront)  
**Tech Debt:** Minimal (verification prevents shortcuts)  

---

## 🆘 If You Get "BLOCKED"

Example:
```
❌ BLOCKED: Tests failing on tenant isolation

Error: School A can see School B's fees

Fix:
1. Add WHERE tenantId filter to fees query
2. Re-run: npm run test
3. Verify isolation again

Then I can claim done.
```

This is GOOD — it caught the bug before merge, not production.

---

## 🎯 Next Steps

1. **Create an issue** and follow the workflow above
2. **Add more checks** to verify-before-done as needed (e.g., DPDP consent)
3. **Customize clarification** questions for your team
4. **Share this doc** with your team so they know the workflow

**Questions?** Review the skill files:
- `.claude/skills/clarify-before-coding/SKILL.md` — All possible questions
- `.claude/skills/verify-before-done/SKILL.md` — All verification checks
