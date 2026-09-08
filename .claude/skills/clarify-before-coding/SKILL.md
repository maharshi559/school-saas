---
name: clarify-before-coding
description: Mandatory clarification gate - ask business requirements questions BEFORE any code changes
user-invocable: false
context: fork
---

# Clarify Before Coding

**GATE**: I MUST ask clarifying questions and confirm understanding BEFORE writing any code.

No assumptions. No proceeding until YOU confirm I understand the requirement correctly.

---

## 🎯 The Process

When you report an issue/feature, I:

1. **STOP** — Do not code yet
2. **ASK** — Questions below (all that apply)
3. **WAIT** — You confirm understanding
4. **CODE** — Only then do I implement
5. **VERIFY** — Run through verify-before-done checks

---

## ❓ Universal Questions (Every Change)

### 1. Business Requirement
```
Q: What is the business problem this solves?
   (Not the technical fix — the actual user/business need)

Example:
❌ "Fix attendance sync offline"
✅ "Teachers mark attendance during poor signal,
   need data to sync when connection returns"
```

### 2. Acceptance Criteria
```
Q: How do we know this is fixed? What's the test?

Example:
✅ "Teacher marks 10 students offline, goes online, 
   all 10 records appear in the database within 5s"
```

### 3. Affected Roles
```
Q: Which roles/users does this affect?
   (TEACHER, PARENT, SCHOOL_ADMIN, FINANCE_MANAGER, etc.)

Example:
✅ "TEACHER marking attendance, SCHOOL_ADMIN reviewing"
```

### 4. Scope Boundaries
```
Q: What are the limits? What's OUT of scope?

Example:
✅ In scope: Offline attendance sync
❌ Out of scope: Video uploads, large file sync
```

---

## 🔐 Tenant Isolation Questions (API/DB changes)

Ask if the change touches: routes, database, permissions

### 1. Multi-Tenant Behavior
```
Q: Does this endpoint access one school's data or multiple schools?

Example:
✅ "GET /students/:id returns only THIS school's students"
❌ "GET /students returns students from all schools"
```

### 2. Authorization Boundary
```
Q: What role is required? Can users cross-tenant access this?

Example:
✅ "TEACHER can view their own school's students only"
❌ "Anyone can view any student"
```

### 3. Data Leakage Risk
```
Q: Could one school see another's data in error messages or responses?

Example:
❌ Response: "Student 'Rajesh' not found" 
   (reveals that Rajesh exists in system)
✅ Response: "Student not found or unauthorized"
```

---

## 📱 Offline-First Questions (Attendance/mobile changes)

Ask if the change affects attendance or mobile workflows

### 1. Offline Requirement
```
Q: Does this feature need to work offline?

Example:
✅ "Yes, teacher marks attendance with no network"
❌ "No, always online"
```

### 2. Sync Strategy
```
Q: How should data sync back to server?

Example:
✅ "Queue to IndexedDB, auto-sync on reconnect via clientRecordId"
❌ "Retry until success" (could duplicate)
```

### 3. Conflict Resolution
```
Q: What if data changes on server while offline?

Example:
✅ "Attendance record locked after submission, 
   no conflict possible"
```

---

## 🎨 UI/Design Questions (Frontend changes)

Ask if the change affects the UI

### 1. Responsive Design
```
Q: Which screen sizes must this support?

Example:
✅ "Mobile (320px), tablet (768px), desktop (1024px+)"
```

### 2. Dark Mode
```
Q: Does this work in both light and dark modes?

Example:
✅ "Yes, uses CSS tokens for both themes"
```

### 3. Form Validation
```
Q: What validation errors should the form show?

Example:
✅ "Phone: required, format, already registered
   Password: required, min 8 chars
   Email: required, format (optional field)"
```

---

## ✅ Form & API Validation Questions

Ask if the change adds/modifies forms or endpoints

### 1. Payload Validation
```
Q: What fields are required vs optional?
   What are the constraints (min/max, format, enum values)?

Example:
✅ Required: phone (format: +91XXXXXXXXXX)
   Optional: email (format: valid email)
   Constraints: 
     - phone length: 10 digits
     - email: max 255 chars
     - tenantId: must belong to authenticated user
```

### 2. Error Handling
```
Q: How should the system respond to invalid input?

Example:
✅ Input: phone "123" (too short)
   Response: { error: "Phone must be 10 digits" }
   
❌ Input: phone "123"
   Response: { error: "Bad request" } (too vague)
```

### 3. Form Errors Display
```
Q: Where/how should validation errors appear?

Example:
✅ Below each field in red text
   With specific error message
   Form submit button disabled until fixed
   
❌ Just a console.log (users don't see it)
```

### 4. Console Warnings/Errors
```
Q: Should this log anything to console?

Example:
✅ Errors: only critical issues
   Warnings: deprecated API usage
   Debug logs: OFF in production
   
❌ console.log() everywhere (leaks sensitive data)
```

---

## 💾 Database Questions (Schema/migration changes)

Ask if the change modifies the database

### 1. Data Migration
```
Q: What about existing data?

Example:
❌ "Add NOT NULL column without default"
   (existing rows fail)
   
✅ "Add NOT NULL column with default value,
   backfill existing rows, then add constraint"
```

### 2. Backward Compatibility
```
Q: Can old API clients still work after this?

Example:
✅ "Add new optional field, keep old field"
❌ "Rename field, break old clients"
```

### 3. Soft Delete Behavior
```
Q: Should deleted records be soft-deleted?

Example:
✅ "Student.deletedAt = null initially,
   set to now() on delete, exclude from queries"
```

---

## 🧪 Testing Questions

Ask for every feature/fix

### 1. Test Scenarios
```
Q: What test cases should I write?

Example:
✅ Happy path: Valid phone → login succeeds
   Error path: Invalid phone → shows error
   Edge case: Already registered phone → shows different error
   Offline: No network → queues to IndexedDB
   Reconnect: Network returns → auto-syncs
```

### 2. Manual Verification
```
Q: How should I test this manually?

Example:
✅ "Open app, go offline (DevTools), mark 5 students,
   verify IndexedDB has records, go online,
   check database received all 5 records"
```

---

## 🚨 Questions I Always Ask

Before ANY change, I ask:

- [ ] What's the business requirement? (not tech requirement)
- [ ] How do we know this is done? (acceptance criteria)
- [ ] Who is affected? (roles/users)
- [ ] What's out of scope? (boundaries)

**For API/DB changes:**
- [ ] Could one tenant see another's data?
- [ ] Is the role check correct?
- [ ] How should errors respond? (no data leakage)

**For UI changes:**
- [ ] Mobile responsive?
- [ ] Dark mode works?
- [ ] Form validation visible to user?

**For any endpoint:**
- [ ] What fields required vs optional?
- [ ] Validation constraints?
- [ ] Error messages helpful?

**For any database change:**
- [ ] Existing data migration strategy?
- [ ] Backward compatible?

**For any feature:**
- [ ] Test cases?
- [ ] Manual verification steps?

---

## 🚫 What I DON'T Do Until You Confirm

- ❌ Write code
- ❌ Run git commands
- ❌ Make assumptions about requirements
- ❌ Skip over edge cases
- ❌ Guess business logic

---

## Example Conversation

### User Request
```
"Fix: Users can't log in after registering"
```

### My Clarification (BEFORE coding)
```
Q1: What happens when they try to log in?
    (Error message? Blank page? Redirect?)

Q2: After registration, can they log in immediately?
    Or is there a delay/email verification?

Q3: Does this affect all users or specific roles?

Q4: Test case: After registration, 
    can they log in with the same phone + password?
    Expected result?

Q5: Should we log this issue in console? 
    (For debugging, not user-facing)

Q6: Form validation: 
    - Phone required? Format +91XXXXXXXXXX?
    - Password required? Min length?
    - Already registered? What error message?
```

### You Confirm
```
A1: Error message: "Invalid credentials"
A2: Immediately (no email verification yet)
A3: All users
A4: Yes, they should be able to log in right after signup
A5: Yes, log to console if JWT validation fails
A6: Phone required, +91XXXXXXXXXX, 
    Password required, min 8 chars,
    If already registered: "Phone already registered, use login"
```

### Only Then I Code
```
Me: "Got it. I'll:
1. Check registration saves phone + password hash
2. Debug why login with same credentials fails
3. Verify JWT validation + error logging
4. Test: Register → immediate login works
5. Test: Register duplicate phone → shows correct error

Proceeding with fix..."
```

---

## Saved Patterns for iSchool

For **iSchool**, I auto-ask about:

1. **Tenant Isolation** — Every API endpoint
2. **Offline Attendance** — Any attendance feature
3. **DPDP Consent** — Any data collection
4. **Design System** — All UI changes
5. **Role Hierarchy** — Any permission change

---

## Blocking Until Clear

This skill blocks me from coding. If unclear:

```
❌ BLOCKED: Need clarity before proceeding

Missing info:
- Q: How should offline sync handle conflicts?
  (Your answer needed)

- Q: Which roles can delete students?
  (Confirm: SCHOOL_ADMIN only?)

Please confirm so I can proceed.
```

---

## 📝 Build Comprehensive Prompt from Clarifications

Once I have clarity, I compile everything into an **extensive implementation prompt**.

This prompt includes:
- Business requirement + acceptance criteria
- All validation rules + constraints
- Error messages + edge cases
- Tenant isolation requirements
- Test cases + manual verification steps
- Console logging strategy
- All requirements from your answers above

**Example: From Your Answers → Comprehensive Prompt**

### Your Input (Scattered answers)
```
Q: Fix login after registration
A1: Error "Invalid credentials"
A2: Immediately after signup
A3: All users
A4: Phone + password should work
A5: Log JWT validation failures
A6: Phone required +91XXXXXXXXXX, password min 8
```

### My Generated Comprehensive Prompt
```
## Task: Fix Login After Registration Bug

### Business Requirement
Users cannot log in after just registering. They should be able to 
log in immediately with the phone and password they just provided.

### Acceptance Criteria
✅ User registers with phone + password
✅ User logs in immediately with same credentials
✅ Error message shown if login fails: "Invalid credentials"

### Validation Rules
Request: POST /auth/login
- phone: REQUIRED, format +91XXXXXXXXXX (regex validation)
- password: REQUIRED, min 8 characters

Response on success:
{
  "token": "jwt_token_here",
  "user": { "id": "...", "phone": "+91..." }
}

Response on error:
{
  "error": "Invalid credentials",
  "code": "AUTH_FAILED"
}

### Technical Requirements
- Check: Registration saves phone + password hash correctly
- Check: Login query matches phone + verifies password hash
- Check: JWT validation logs to console on failure (dev only)
- Check: Error message is generic (no data leakage)
- Tenant Isolation: User can only access their own data

### Test Cases
1. Happy path:
   - Register: phone=+919999999999, password=secure123
   - Login: same credentials → token returned ✅
   
2. Error cases:
   - Login: wrong password → "Invalid credentials"
   - Login: phone doesn't exist → "Invalid credentials"
   - Login: phone format invalid → "Invalid credentials"
   
3. Edge cases:
   - Uppercase/lowercase email handling
   - Extra spaces in input
   - Very long passwords (test boundary)

4. Offline case (if applicable):
   - N/A for login (requires server)

### Manual Verification
1. npm run -w apps/api dev
2. Register in UI: http://localhost:5173/register
3. Try to login with same credentials immediately
4. Verify: redirected to dashboard (token returned)
5. Open DevTools → Console
6. Try login with wrong password
7. Verify: Error message "Invalid credentials" shown on UI
8. Verify: Console shows JWT validation failure (dev)
9. Try login with unregistered phone
10. Verify: Same error message (no data leakage)

### Console Logging
- Dev: Log JWT validation failures to console
- Prod: No console logs for login (security)
- Error format: { error: "JWT validation failed", code: "... " }

### Affected Roles/Users
- All users (registering new)
- Immediate effect (no delay/verification)
```

### How I Generate This

I take your answers to clarification questions and expand them into:

1. **Business Context** — Why this matters
2. **Acceptance Criteria** — Clear pass/fail tests
3. **Validation Rules** — All constraints + formats
4. **Response Formats** — Exact JSON structure
5. **Test Cases** — Happy path + errors + edge cases
6. **Offline Behavior** — If applicable
7. **Console Strategy** — What logs, where, when
8. **Tenant Context** — Multi-tenant implications
9. **Manual Steps** — How to verify in browser
10. **Role Impact** — Who is affected

This becomes my **working spec** for implementation.

---

## Non-Negotiable Clarifications

I NEVER skip asking about:
- Business requirement (not just tech)
- Tenant isolation behavior
- Error handling strategy
- Test acceptance criteria
- Affected users/roles

Before I code, YOU confirm the comprehensive prompt is correct.
