# 01 — Actors, Roles & Permissions

## 1. Identity Model

- A **User** is a person-level account (phone and/or email), global across the platform.
- A **Membership** links a User to a **School** with one or more **Roles**. This lets a parent have children in two schools and a teacher work at two schools.
- **Guardian ↔ Student** is an explicit relationship (type, primary payer flag, can-pay, can-view-results).
- **Phone number is the primary identity for parents** (USSD identifies by MSISDN). Email is optional.
- Student accounts are optional; students log in with a school-issued student ID + PIN/OTP via guardian phone until old enough to hold their own.

## 2. Roles

### Platform level
| Role | Description |
|------|-------------|
| **Platform Owner** | Full control; manages other platform staff, global config |
| **Platform Support** | Read-mostly, time-boxed impersonation with consent + audit |
| **Platform Finance** | Settlements, payouts, commission reports, SaaS billing |
| **Platform Ops** | Provider health, alert credits, feature flags |

### School level
| Role | Description |
|------|-------------|
| **School Owner/Head** | Highest school role, approves results, manages admins |
| **School Admin** | Day-to-day: school info, classes, users, communications |
| **Bursar / Accountant** | Fees, payments, reconciliation, receipts, reports |
| **Registrar** | Admissions, student records, enrolment |
| **Class Teacher** | Teacher + owns a class: attendance, remarks, parent comms for that class |
| **Subject Teacher** | Enters grades for assigned subject/class only |
| **Guardian (Parent)** | Views linked children only; pays fees; receives alerts |
| **Student** | Own data, study tools, age-appropriate |

Roles are additive (a teacher can also be a parent). Custom roles are P2; start with fixed roles plus per-school permission toggles for sensitive actions.

## 3. Permission Matrix

Legend: **C** create, **R** read, **U** update, **D** delete/void, **A** approve/publish, **—** none.
Scope abbreviations: *own* = linked children/own records, *asg* = assigned classes/subjects, *all* = whole school.

| Capability | Platform Admin | School Head | School Admin | Bursar | Registrar | Class Teacher | Subject Teacher | Guardian | Student |
|---|---|---|---|---|---|---|---|---|---|
| Create / suspend schools | CRUD | — | — | — | — | — | — | — | — |
| Platform plans & SaaS billing | CRUD | R (own) | — | — | — | — | — | — | — |
| School profile & branding | R | CRU | CRU | R | R | R | R | R | R |
| Academic years / terms | R | CRU | CRU | R | R | R | R | — | — |
| Classes, subjects, timetable | R | CRUD | CRUD | R | CRU | R (asg) | R (asg) | R (own) | R (own) |
| Staff accounts | R | CRUD | CRU | — | — | — | — | — | — |
| Student records | R | CRUD | CRUD | R | CRUD | R (asg) | R (asg) | R/U (own, limited) | R (own) |
| Guardian ↔ student links | R | CRUD | CRUD | R | CRUD | R (asg) | — | R (own) | — |
| Admissions | — | A | CRU | R | CRUD | — | — | C (apply) | — |
| Fee structures | R | A | CRU | CRUD | R | — | — | R (own) | — |
| Invoices | R | R | R | CRUD | R | — | — | R (own) | — |
| Payments (view) | R | R | R | R | — | — | — | R (own) | — |
| Payments (initiate) | — | — | — | C (cash/manual) | — | — | — | C (web/USSD) | — |
| Void / refund payment | — | A | — | CU (request) → A | — | — | — | — | — |
| Reconciliation & settlement | CRU | R | — | CRU | — | — | — | — | — |
| Attendance | R | R | R | — | R | CRU (asg) | CRU (asg) | R (own) | R (own) |
| Enter grades | — | — | R | — | — | CRU (asg) | CRU (asg) | — | — |
| Edit grades after lock | — | A (with reason) | — | — | — | request | request | — | — |
| Approve / publish results | — | A | A | — | — | submit | submit | — | — |
| View results | R | R | R | R* | R | R (asg) | R (asg) | R (own, if published & policy allows) | R (own) |
| Report card generation | — | A | CRU | — | R | CRU (asg) | R | R (own) | R (own) |
| Announcements → parents | — | CRU | CRU | CRU (fees) | — | CRU (class) | — | R | R |
| Messages → all teachers | — | CRU | CRU | — | — | R | R | — | — |
| Two-way parent ↔ teacher chat | — | R (audit) | R (audit) | — | — | CRU | CRU | CRU | — |
| Alert templates & channels | R | A | CRU | — | — | — | — | Prefs only | — |
| Alert credit top-up | R | CRU | CRU | CRU | — | — | — | — | — |
| AI insights (class level) | — | R | R | — | — | R (asg) | R (asg) | — | — |
| AI insights (child level) | — | R | R | — | — | R (asg) | R (asg) | R (own) | R (own, student view) |
| AI tutor / study tools | — | — | — | — | — | — | — | — | CRU (own) |
| Audit log | R | R | R (limited) | R (finance) | — | — | — | — | — |
| Data export | R | A | CRU | R (finance) | R | — | — | R (own data) | — |

\* Bursar sees only the results *status* needed for fee-gating policy, not raw grades, unless granted.

## 4. Sensitive-Action Policies

| Action | Control |
|--------|---------|
| Grade edits after publish | Needs School Head approval + reason; versioned; parents notified of correction |
| Payment void/refund | Maker-checker: Bursar requests, Head approves; ledger reversal entry (never delete) |
| Results withheld for unpaid fees | **Per-school policy toggle**, default **off**; shows parent a neutral message, never humiliating wording; legally review per country |
| Platform impersonation | Requires school consent window, reason, banner shown, fully audited |
| Bulk SMS | Rate-limited; confirm cost; preview with merge fields; requires Admin/Head |
| Guardian link changes | Need verification (OTP to existing primary guardian or school verification) to prevent hijack |

## 5. Tenancy Boundary Rules

1. Every row in tenant tables carries `school_id`; Postgres RLS enforces it.
2. A request context always has `(user_id, school_id, role set)`; no cross-tenant queries from the app tier except in explicit platform-admin code paths.
3. Guardian switching between schools uses a school switcher; tokens are scoped to one school at a time.
4. Platform admin endpoints are a separate route namespace and separate auth policy.

## 6. Authentication Matrix

| Actor | Methods | Notes |
|-------|---------|-------|
| Platform staff | Email + password + mandatory MFA (TOTP/passkey) | IP allowlist optional |
| School staff | Email or phone + password; OTP fallback; MFA for Head/Bursar | Lockout + rate limits |
| Guardian (web) | Phone number + SMS/WhatsApp OTP (passwordless); email optional | Remember device 30d |
| Guardian (USSD) | MSISDN (network-asserted) + 4-digit PIN for money actions | PIN hashed; lockout after 3 fails |
| Student | Student ID + OTP to guardian phone, or school-issued PIN; SSO later | Age-appropriate consent |
