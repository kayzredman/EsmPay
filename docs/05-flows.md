# 05 — Key Flows

All diagrams are Mermaid. State machines are normative; sequence diagrams show the happy path plus key failure branches.

## F1. School Onboarding

```mermaid
sequenceDiagram
  actor PA as Platform Admin
  actor SH as School Head
  participant API
  participant Jobs as Import/Verify Jobs
  PA->>API: Create school (name, country, plan, slug)
  API-->>SH: Invite email/SMS with setup link
  SH->>API: Set profile, logo, settlement account
  SH->>API: Configure terms, classes, subjects, grading scheme
  SH->>API: Upload students/guardians/staff CSV
  API->>Jobs: Validate (dry-run)
  Jobs-->>SH: Report: errors, duplicates, phones invalid
  SH->>API: Confirm import
  Jobs->>API: Create records, link guardians, normalise phones
  SH->>API: Define fee structures
  PA->>API: Verify settlement account (KYC)
  SH->>API: Invite staff; send guardian activation SMS
  API-->>PA: Checklist complete → Go-live
```

Onboarding checklist states: `profile → structure → people → fees → payments_verified → comms_ready → live`.

## F2. Guardian Activation & Linking

```mermaid
sequenceDiagram
  actor G as Guardian
  participant CH as Web / USSD
  participant API
  participant OTP as Alert Service
  Note over API: School imports guardian phone against student
  API->>OTP: Send welcome SMS (link + USSD code)
  G->>CH: Opens link or dials USSD
  CH->>API: Identify by phone
  API->>OTP: Send OTP (web) / verify MSISDN (USSD)
  G->>CH: Enter OTP / set PIN
  API-->>G: Linked children shown
  alt Unknown phone
    G->>CH: Enter school code + student code + DOB
    API-->>G: Pending school verification
    API->>API: Notify school admin to approve link
  end
```

Rules: a link stays `pending` until a school user approves or the phone matches an imported record. Changing a primary guardian phone requires OTP on the old number or school approval.

## F3. Grade Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Draft: Teacher enters scores
  Draft --> Submitted: Teacher submits class/subject
  Submitted --> Draft: Returned by Head/Class Teacher
  Submitted --> Approved: Head approves
  Approved --> Published: Publish (schedule or immediate)
  Published --> Locked: Term closed
  Published --> Correction: Correction requested
  Correction --> Published: Head approves (versioned, parents notified)
  Locked --> Correction: Head override w/ reason
```

```mermaid
sequenceDiagram
  actor T as Teacher
  actor H as Head
  participant API
  participant Q as Event Bus
  participant AL as Alerts
  participant AI as AI Service
  T->>API: Enter grades (grid/CSV)
  T->>API: Submit subject results
  API->>API: Validate ranges, missing students, compute totals
  H->>API: Review, remark, approve
  H->>API: Publish term results
  API->>API: Compute positions, averages, generate report cards
  API->>Q: grades.published
  Q->>AL: Notify guardians (policy: fee gating? channel prefs)
  Q->>AI: Update features, generate insights drafts
  AL-->>G: "Results for Ama are ready. View: link / dial *xxx#"
```

## F4. Fee Cycle

```mermaid
flowchart LR
  A[Bursar defines fee structure] --> B[Head approves]
  B --> C[Bulk invoice generation]
  C --> D[Invoices issued - alerts to guardians]
  D --> E{Payment?}
  E -- Web/USSD --> F[Payment intent]
  E -- Cash/Bank --> G[Bursar records]
  F --> H[Provider confirms]
  G --> I
  H --> I[Ledger posting + allocation]
  I --> J[Receipt + alert]
  J --> K[Balance updated]
  K --> L{Balance zero?}
  L -- No --> M[Reminder schedule]
  L -- Yes --> N[Cleared]
  M --> E
  I --> O[Daily reconciliation]
  O --> P[Settlement batch to school]
```

Reminder schedule (default, configurable): 7 days before due, due day, +3, +7, +14 (escalate to Admin list). Quiet hours respected.

## F5. Payment via Web (MoMo)

```mermaid
sequenceDiagram
  actor G as Guardian
  participant W as Web App
  participant API
  participant PAY as Payments Module
  participant AG as Aggregator
  participant MNO as Mobile Money
  participant AL as Alerts
  G->>W: Choose child, items/amount, MoMo number
  W->>API: POST /payment-intents (Idempotency-Key)
  API->>PAY: Validate balance, create intent (pending)
  PAY->>AG: Request-to-pay (msisdn, amount, ref)
  AG->>MNO: Push approval prompt
  MNO-->>G: "Approve GHS 500 to GreenHill?" + PIN
  G->>MNO: Enters MoMo PIN
  MNO-->>AG: Success
  AG-->>API: Webhook (signed) payment.success
  API->>API: Persist raw event, verify signature, idempotent dedupe
  API->>PAY: Post ledger, allocate, mark invoice
  PAY->>AL: payment.succeeded
  AL-->>G: Receipt SMS/WhatsApp
  W-->>G: Poll/SSE shows success
  Note over API,AG: If no webhook in N minutes → status-check API; else mark expired/unknown for reconciliation
```

## F6. Payment via USSD

```mermaid
sequenceDiagram
  actor G as Guardian
  participant TEL as Telco USSD Gateway
  participant U as USSD Service
  participant R as Redis Session
  participant API
  participant AG as Aggregator
  G->>TEL: Dial *XXX#
  TEL->>U: POST session start (msisdn, sessionId)
  U->>API: Lookup guardian by msisdn
  U->>R: Create session
  U-->>G: Main menu
  G->>TEL: 1 (Pay fees) → select child → amount → PIN
  TEL->>U: Inputs
  U->>API: Verify PIN, create payment intent
  API->>AG: Request-to-pay
  U-->>G: "Approve prompt on your phone. You'll get SMS receipt."
  Note over U,G: USSD session ends (END)
  AG-->>API: Webhook success
  API-->>G: SMS receipt
```

Design choice: USSD never waits on the payment result inside the session; it hands off to the MoMo approval prompt and confirms by SMS, because sessions expire quickly.

## F7. Announcement / Bulk Message

```mermaid
sequenceDiagram
  actor A as School Admin
  participant API
  participant AL as Alert Service
  participant WAL as Wallet
  participant P as Providers
  A->>API: Compose message, choose audience filter, channel(s)
  API->>API: Resolve audience → count, dedupe by guardian, apply consent
  API-->>A: Preview + est. cost + wallet balance
  A->>API: Confirm / schedule
  API->>WAL: Reserve credits
  API->>AL: Create deliveries
  loop per recipient (rate-limited)
    AL->>P: Send via preferred channel
    P-->>AL: Delivery receipt (async)
    alt failed
      AL->>P: Fallback channel
    end
  end
  AL->>WAL: Settle actual vs reserved
  AL-->>A: Delivery report
```

## F8. Absence Alert

```mermaid
flowchart LR
  T[Teacher marks absent] --> E[attendance.marked]
  E --> R{Rule: notify?}
  R -- First absence today --> A[Alert guardian]
  R -- 3 consecutive --> B[Alert guardian + class teacher + admin]
  A --> D[Delivery tracking]
  B --> D
  E --> AI[AI features: absence trend]
```

## F9. AI Insight Loop

```mermaid
sequenceDiagram
  participant EV as Events/Features
  participant AI as AI Service
  participant DB as Insights DB
  actor T as Class Teacher
  actor G as Guardian
  EV->>AI: grades.published, attendance, payments (aggregate only)
  AI->>AI: Compute features, trends, risk score
  AI->>DB: Insight (draft) + evidence
  DB-->>T: Review queue
  T->>DB: Approve / edit / dismiss
  DB->>G: Weekly digest (approved insights only)
  G->>DB: Feedback (helpful / not)
  DB->>AI: Feedback to evaluation set
```

## F10. Reconciliation & Settlement

```mermaid
flowchart TB
  A[Daily 02:00: fetch provider settlement report] --> B[Match provider txn id with payments]
  B --> C{All matched?}
  C -- Yes --> D[Close day]
  C -- No --> E[Exceptions]
  E --> F1[Provider success, no payment → create/claim payment]
  E --> F2[Payment success, provider missing → investigate/hold]
  E --> F3[Amount mismatch → flag]
  D --> G[Compute settlement per school: gross − fees]
  G --> H[Finance approval]
  H --> I[Payout via bank/MoMo]
  I --> J[Statement to school bursar]
```

## F11. Payment State Machine

```mermaid
stateDiagram-v2
  [*] --> Initiated
  Initiated --> PendingProvider: Request-to-pay sent
  PendingProvider --> Succeeded: Webhook/status success
  PendingProvider --> Failed: Declined/insufficient/timeout
  PendingProvider --> Unknown: No answer after N min
  Unknown --> Succeeded: Status check/reconciliation
  Unknown --> Failed: Status check/expiry
  Succeeded --> Reversed: Refund/chargeback
  Failed --> [*]
  Reversed --> [*]
```

## F12. Student Year-End Rollover

1. Close term/year → lock grades.
2. Promotion rules (per level) → proposed list; Head reviews exceptions (repeat/withdraw).
3. Create next-year enrolments; carry forward arrears as opening balance line (policy).
4. Archive graduates; retain read-only access for transcripts.
