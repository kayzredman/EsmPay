# 04 — Data Model

Conventions: UUIDv7 primary keys; `school_id` on all tenant tables; `created_at/updated_at/deleted_at`; money stored as **integer minor units** (pesewas) with ISO currency code; timestamps in UTC; phone numbers in E.164.

## 1. Core ERD (simplified)

```mermaid
erDiagram
  SCHOOL ||--o{ MEMBERSHIP : has
  USER ||--o{ MEMBERSHIP : holds
  SCHOOL ||--o{ ACADEMIC_YEAR : defines
  ACADEMIC_YEAR ||--o{ TERM : contains
  SCHOOL ||--o{ CLASS : has
  SCHOOL ||--o{ SUBJECT : offers
  CLASS ||--o{ CLASS_SUBJECT : teaches
  SUBJECT ||--o{ CLASS_SUBJECT : in
  STAFF ||--o{ CLASS_SUBJECT : assigned
  STUDENT ||--o{ ENROLMENT : enrolled
  CLASS ||--o{ ENROLMENT : holds
  TERM ||--o{ ENROLMENT : during
  GUARDIAN ||--o{ GUARDIAN_STUDENT : links
  STUDENT ||--o{ GUARDIAN_STUDENT : links
  USER ||--o| GUARDIAN : is
  USER ||--o| STAFF : is
  FEE_STRUCTURE ||--o{ FEE_ITEM : has
  TERM ||--o{ FEE_STRUCTURE : for
  STUDENT ||--o{ INVOICE : billed
  INVOICE ||--o{ INVOICE_LINE : has
  INVOICE ||--o{ PAYMENT_ALLOCATION : settled_by
  PAYMENT ||--o{ PAYMENT_ALLOCATION : allocates
  GUARDIAN ||--o{ PAYMENT : makes
  PAYMENT ||--o{ LEDGER_ENTRY : posts
  LEDGER_ACCOUNT ||--o{ LEDGER_ENTRY : holds
  CLASS_SUBJECT ||--o{ ASSESSMENT : defines
  ASSESSMENT ||--o{ GRADE : records
  STUDENT ||--o{ GRADE : earns
  TERM ||--o{ RESULT_SUMMARY : aggregates
  STUDENT ||--o{ RESULT_SUMMARY : has
  STUDENT ||--o{ ATTENDANCE : has
  MESSAGE ||--o{ MESSAGE_DELIVERY : sends
  GUARDIAN ||--o{ MESSAGE_DELIVERY : receives
  STUDENT ||--o{ INSIGHT : about
```

## 2. Entity Catalogue

### 2.1 Identity & Tenancy
| Table | Key fields | Notes |
|-------|-----------|-------|
| `schools` | id, slug, name, country, currency, timezone, plan_id, status, settings(jsonb) | Tenant root; not subject to RLS (platform scoped) |
| `users` | id, phone_e164?, email?, password_hash?, mfa, locale, status | Global person account |
| `user_phones` | id, user_id, phone_e164 (unique), verified_at, is_primary, whatsapp_opted_in | Multiple numbers per person |
| `memberships` | id, user_id, school_id, roles[], status | Tenant-scoped access |
| `pin_credentials` | user_id, pin_hash, failed_count, locked_until | USSD PIN |
| `audit_log` | id, school_id, actor, action, entity, before, after, ip, channel, at | Append-only |

### 2.2 Academic Structure
| Table | Key fields |
|-------|-----------|
| `academic_years` | school_id, name, start, end, status |
| `terms` | academic_year_id, name, type(term/semester), start, end, status |
| `levels` | school_id, name (e.g. JHS 1), order |
| `classes` | school_id, level_id, name/stream, class_teacher_id |
| `subjects` | school_id, code, name, is_core |
| `class_subjects` | class_id, subject_id, teacher_id, term_id |
| `grading_schemes` | school_id, name, boundaries(jsonb), scale_type |
| `assessment_types` | school_id, name, weight, max_score (e.g. Class Test 30%, Exam 70%) |

### 2.3 People
| Table | Key fields |
|-------|-----------|
| `students` | school_id, student_code (unique per school), first/last, dob, gender, photo, status, admission_date, medical_notes(encrypted) |
| `guardians` | school_id? (see note), user_id, name, relationship_default, preferred_channel, preferred_locale |
| `guardian_students` | guardian_id, student_id, relationship, is_primary_payer, can_view_results, can_pay, verified_at |
| `staff` | school_id, user_id, staff_code, subjects, employment_status |
| `enrolments` | student_id, class_id, term_id, status |

> **Guardian note:** guardian identity is person-level (via `users`); per-school guardian profile rows hold school-specific attributes. This supports a guardian with kids at two schools under one phone.

### 2.4 Fees & Payments
| Table | Key fields |
|-------|-----------|
| `fee_structures` | school_id, term_id, level_id/class_id, name, status |
| `fee_items` | fee_structure_id, name, amount, is_optional, due_date |
| `student_fee_adjustments` | student_id, term_id, type(discount/scholarship/waiver/penalty), amount/percent, reason, approved_by |
| `invoices` | school_id, student_id, term_id, number, status(draft/issued/part_paid/paid/void), total, balance (derived/materialised), due_date |
| `invoice_lines` | invoice_id, fee_item_id, description, amount |
| `installment_plans` | invoice_id, schedule(jsonb) |
| `payment_intents` | id, school_id, guardian_id, student_ids, amount, channel(web/ussd/cash/bank), status, idempotency_key, provider, provider_ref, expires_at |
| `payments` | id, intent_id, amount, fee_amount, status(pending/succeeded/failed/reversed), paid_at, payer_msisdn, provider_txn_id (unique), receipt_no |
| `payment_allocations` | payment_id, invoice_id, invoice_line_id?, amount |
| `refunds` | payment_id, amount, reason, requested_by, approved_by, status |
| `ledger_accounts` | school_id?, code, type(asset/liability/revenue/expense), owner(platform/school/guardian) |
| `ledger_entries` | id, txn_id, account_id, debit, credit, currency, source_type, source_id, posted_at |
| `provider_events` | id, provider, event_type, raw_payload, signature_ok, received_at, processed_at, error | Raw inbox |
| `settlements` | school_id, period, gross, fees, net, status, bank_ref, paid_at |
| `reconciliation_runs` / `exceptions` | provider, date, matched, unmatched, status |

### 2.5 Academics & Attendance
| Table | Key fields |
|-------|-----------|
| `assessments` | class_subject_id, term_id, type_id, name, max_score, date, status |
| `grades` | assessment_id, student_id, score, status(draft/submitted/approved/published/locked), version, entered_by |
| `grade_revisions` | grade_id, old_score, new_score, reason, approved_by |
| `result_summaries` | student_id, term_id, subject totals, grade letters, position, average, remarks, status, published_at |
| `report_cards` | student_id, term_id, file_id, generated_at, version |
| `attendance_records` | student_id, date, session/period, status(present/absent/late/excused), marked_by |
| `teacher_notes` | student_id, author, visibility(private/staff/guardian), body |

### 2.6 Communications
| Table | Key fields |
|-------|-----------|
| `message_templates` | school_id?, key, channel, locale, body, variables, wa_template_id, approved |
| `messages` | school_id, author, audience_query(jsonb), subject, body, category, scheduled_at, status, est_cost |
| `message_deliveries` | message_id, recipient (guardian/user), channel, provider, provider_msg_id, status(queued/sent/delivered/failed/read), cost, error, attempts |
| `notification_preferences` | user_id, category, channels[], quiet_hours, locale |
| `consents` | user_id, channel, status, source, at (opt-in/out) |
| `alert_wallets` / `wallet_txns` | school_id, balance, topups, usage |
| `inbox_items` | user_id, title, body, read_at |

### 2.7 USSD
| Table | Key fields |
|-------|-----------|
| `ussd_sessions` (Redis; summary persisted) | session_id, msisdn, school_id?, state, context, started, ended, outcome |
| `ussd_events` | session_id, step, input_hash, latency_ms (for analytics, no PINs) |

### 2.8 AI
| Table | Key fields |
|-------|-----------|
| `student_features` | student_id, term_id, subject_id?, feature_name, value, computed_at |
| `insights` | student_id, type(risk/progress/praise/study_plan), severity, evidence(jsonb), narrative, status(draft/approved/sent/dismissed), model_version, reviewed_by |
| `study_plans` | student_id, term_id, items(jsonb), generated_at |
| `practice_items` / `practice_attempts` | topic_id, student_id, correct, time |
| `curriculum_topics` | subject, level, strand, code, embedding |
| `ai_audit` | request_id, model, prompt_hash, redactions, output_hash, flagged |

### 2.9 Platform
| Table | Key fields |
|-------|-----------|
| `plans` | id, name, price_per_student, features(jsonb), limits |
| `subscriptions` | school_id, plan_id, status, period, invoices |
| `provider_configs` | provider, type, credentials_ref, priority, enabled |
| `feature_flags` | key, scope(school/global), value |

## 3. Money Model (Double-Entry)

Accounts (per school unless noted):

| Account | Type | Description |
|---------|------|-------------|
| `provider_clearing` | Asset | Money in transit at the aggregator |
| `school_payable` | Liability | What the platform owes the school (net funds held) |
| `platform_fee_revenue` | Revenue (platform) | Our transaction fee |
| `provider_fee_expense` | Expense (platform) | Aggregator cost |
| `student_receivable:{student}` | Asset | What the family owes (from invoices) |
| `refund_clearing` | Liability | Pending refunds |
| `saas_revenue` | Revenue (platform) | Subscription revenue recognised monthly |
| `deferred_revenue` | Liability (platform) | Prepaid term subscriptions not yet recognised |
| `alert_wallet_usage` | Revenue (platform) | Message charges drawn from a school's alert wallet |
| `ai_addon_revenue` | Revenue (platform) | AI study add-on per opted-in student |
| `ussd_usage` | Revenue (platform) | Per-session USSD charges |
| `provider_cost_expense` | Expense (platform) | Provider cost of messages, sessions and LLM usage |
| `settlement_bank` | Asset | Payouts to school |

Posting example — Parent pays GHS 500 tuition; provider fee 1.0%, platform fee 0.5%:

| Txn | Account | Debit | Credit |
|-----|---------|------:|-------:|
| 1 Receipt | `provider_clearing` | 500.00 | |
| 1 Receipt | `student_receivable` | | 500.00 |
| 2 Provider fee | `school_payable` | 5.00 | |
| 2 Provider fee | `provider_fee_payable` | | 5.00 |
| 3 Platform fee | `school_payable` | 2.50 | |
| 3 Platform fee | `platform_fee_revenue` | | 2.50 |

The platform-revenue reporting views (see [15](15-platform-revenue.md)) read these accounts, so the owner's revenue screen always agrees with the books.

Each step is its own balanced transaction so it is independently auditable and reversible. The school's net payable is derived (500.00 − 5.00 − 2.50 = 492.50). Full flow, fee-bearing options and settlement in [07-payments.md](07-payments.md).

> Note: the receipt step uses `student_receivable` as the credit side because the invoice created the matching debit when it was issued (`Dr student_receivable / Cr school_payable-or-revenue-deferred`, per school accounting policy). Confirm the exact chart of accounts with an accountant before build.

Invariants (enforced by DB constraints/tests):
1. Each `txn_id` sums debits = credits.
2. Entries are immutable; corrections are reversing entries.
3. `invoice.balance = invoice.total − Σ allocations (succeeded, not reversed)`.
4. `school_payable` ≈ Σ succeeded payments − fees − settlements (daily assertion).

## 4. Row-Level Security Pattern

```sql
-- every tenant table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON students
  USING (school_id = current_setting('app.school_id')::uuid);

-- request middleware (per transaction)
SET LOCAL app.school_id = '<uuid>';
SET LOCAL app.user_id   = '<uuid>';
```

Platform-admin code uses a distinct DB role with `BYPASSRLS` limited to audited paths. A CI test suite creates two tenants and asserts zero cross-reads on every table.

## 5. Indexing & Performance Notes

- Composite indexes lead with `school_id`: `(school_id, student_id, term_id)`.
- `provider_txn_id` unique; `payments(school_id, paid_at)` for reports.
- Partition high-volume tables by month: `message_deliveries`, `ledger_entries`, `ussd_events`, `audit_log`.
- Materialised views for dashboards (collection rate, class averages), refreshed by events/cron.
- Phone lookup index on `user_phones(phone_e164)` — USSD hot path.

## 6. Data Lifecycle

| Data | Retention | Notes |
|------|-----------|-------|
| Financial ledger, invoices, receipts | 7+ years | Legal/audit |
| Grades & report cards | Lifetime of school record or per policy | Archive after graduation |
| USSD event logs | 13 months | No PINs/PII beyond msisdn hash |
| Message bodies | 24 months, delivery metadata longer | Minimise PII |
| AI prompts/outputs | 12 months audit | Redacted |
| Deleted guardians | Anonymise personal fields; keep financial refs | Right to erasure vs legal retention |
