# 11 — API Outline

REST + JSON over HTTPS, OpenAPI 3.1 as the contract (generated from code, published in CI). Versioned at `/v1`. This is an outline, not exhaustive.

## 1. Conventions

| Topic | Rule |
|-------|------|
| Auth | `Authorization: Bearer <jwt>`; token carries `sub`, `school_id`, `roles` |
| Tenancy | School from token (web/API) or route namespace `/platform/*` for platform admins |
| IDs | UUIDv7 strings |
| Money | `{ "amount": 50000, "currency": "GHS" }` in minor units |
| Time | ISO-8601 UTC |
| Pagination | Cursor: `?limit=50&cursor=...` → `{ data, next_cursor }` |
| Filtering | `?filter[class_id]=...&sort=-created_at` |
| Idempotency | `Idempotency-Key` header required on POSTs that move money or send messages |
| Errors | RFC 9457 problem+json: `type, title, status, detail, code, errors[]` |
| Rate limits | `429` with `Retry-After`; limits per user, per tenant, per IP |
| Webhooks (out) | Signed (HMAC), retried with backoff, event types versioned |
| i18n | `Accept-Language`; error codes are machine-readable and localisable |

## 2. Resource Groups

### Auth & Identity
```
POST   /v1/auth/otp/request          { phone | email }
POST   /v1/auth/otp/verify           → tokens
POST   /v1/auth/login                (staff email+password, MFA)
POST   /v1/auth/refresh | /logout
GET    /v1/me                        profile, memberships, linked children
POST   /v1/me/pin                    set/change USSD PIN
GET    /v1/me/preferences  PUT ...   channels, language, quiet hours
```

### Platform (admin only)
```
GET/POST    /platform/v1/schools
PATCH       /platform/v1/schools/{id}           suspend, plan, settings
GET/POST    /platform/v1/plans
GET         /platform/v1/billing/invoices
GET/POST    /platform/v1/providers              sms|whatsapp|email|payments|ussd
GET         /platform/v1/settlements  POST .../{id}/approve
GET         /platform/v1/reconciliation/exceptions
POST        /platform/v1/impersonation          consent-based, audited
GET         /platform/v1/metrics/overview
GET         /platform/v1/revenue/summary?from&to        streams, gross profit, contribution (see doc 15)
GET         /platform/v1/revenue/schools                per-school revenue breakdown; ?export=csv
GET         /platform/v1/health                         node + link status (see doc 16)
GET         /platform/v1/paths                          critical-path status, latency, last-mile reach
GET/POST    /platform/v1/incidents                      active/resolved incidents; POST .../{id}/resolve
```

### School Setup
```
GET/PATCH   /v1/school
CRUD        /v1/academic-years, /v1/terms, /v1/levels, /v1/classes, /v1/subjects
CRUD        /v1/class-subjects                  teacher assignment
CRUD        /v1/grading-schemes, /v1/assessment-types
POST        /v1/imports                         students|guardians|staff (CSV) → job
GET         /v1/imports/{id}                    status & error report
```

### People
```
CRUD   /v1/students            ?class_id&status&q
CRUD   /v1/guardians
POST   /v1/students/{id}/guardians              link
PATCH  /v1/guardian-links/{id}                  verify | revoke | set payer
CRUD   /v1/staff
GET    /v1/families/{guardianId}                household view (siblings, combined balance)
```

### Fees & Payments
```
CRUD   /v1/fee-structures  /v1/fee-structures/{id}/items
POST   /v1/invoices:generate                    bulk by class/term
GET    /v1/invoices ?student_id&status
POST   /v1/invoices/{id}/adjustments
POST   /v1/payment-intents                      web/USSD/pay-link  (Idempotency-Key)
GET    /v1/payment-intents/{id}                 status polling
POST   /v1/payments/manual                      bursar cash/bank entry
GET    /v1/payments  /v1/payments/{id}  /v1/receipts/{no}
POST   /v1/refunds        POST /v1/refunds/{id}/approve
GET    /v1/reports/fees ?type=arrears|collection|aging
GET    /v1/settlements    (school view)

POST   /webhooks/payments/{provider}            inbound, signature verified
```

### Academics
```
CRUD   /v1/assessments
GET    /v1/assessments/{id}/grades
PUT    /v1/assessments/{id}/grades:bulk         grid/CSV
POST   /v1/results/{classSubjectId}:submit
POST   /v1/results:approve   :publish   :lock
POST   /v1/grades/{id}/corrections  + /approve
GET    /v1/students/{id}/results ?term_id
POST   /v1/report-cards:generate        GET /v1/report-cards/{id}
POST   /v1/attendance:bulk     GET /v1/attendance ?class_id&date
```

### Communications
```
CRUD   /v1/message-templates
POST   /v1/messages:preview     → recipients, segments, cost
POST   /v1/messages             → send/schedule
GET    /v1/messages/{id}/deliveries
POST   /v1/messages/{id}:cancel
GET    /v1/inbox     PATCH /v1/inbox/{id}   read
GET/POST /v1/alert-wallet  + /topups
POST   /webhooks/messaging/{provider}           DLRs, WhatsApp inbound
```

### USSD (internal edge; not public)
```
POST   /ussd/{aggregator}                       session callback; normalised in adapter
```

### AI / Insights
```
GET    /v1/students/{id}/insights ?status=approved
GET    /v1/classes/{id}/insights
POST   /v1/insights/{id}:approve | :edit | :dismiss
GET    /v1/students/{id}/study-plan
POST   /v1/students/{id}/practice-attempts
POST   /v1/ai/feedback
POST   /v1/tutor/sessions      (P2)
```

### Audit & Export
```
GET    /v1/audit-log ?entity&actor&from&to
POST   /v1/exports    → async job → signed URL
POST   /v1/privacy/requests   (access, erasure)
```

## 3. Events Published (internal bus & optional outbound webhooks)

```
school.created            student.enrolled         guardian.linked
invoice.issued            invoice.overdue          payment.succeeded | failed | reversed
settlement.paid
assessment.created        grades.submitted | approved | published | corrected
attendance.marked
message.sent              delivery.updated
insight.generated | approved
```

Event envelope:
```json
{ "id": "evt_...", "type": "payment.succeeded", "version": 1, "school_id": "...",
  "occurred_at": "...", "actor": {"type":"system|user","id":"..."},
  "data": { ... }, "trace_id": "..." }
```

## 4. Example: Create Payment Intent

```http
POST /v1/payment-intents
Idempotency-Key: 7f3a...e91
Authorization: Bearer ...

{
  "student_id": "0190...",
  "allocations": [{ "invoice_id": "0190...", "amount": 50000 }],
  "currency": "GHS",
  "method": "momo",
  "msisdn": "+233241234567",
  "channel": "web"
}
```
```json
{
  "id": "pi_0190...",
  "status": "pending_provider",
  "amount": { "amount": 50000, "currency": "GHS" },
  "fees": { "convenience": { "amount": 0, "currency": "GHS" } },
  "next_action": { "type": "approve_on_phone", "expires_at": "2026-10-20T08:20:00Z" },
  "poll_url": "/v1/payment-intents/pi_0190..."
}
```
