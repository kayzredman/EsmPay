# 02 — Functional Requirements

Priority: **P0** MVP · **P1** fast-follow · **P2** later. IDs are stable for traceability into tickets/tests.

## M1. Platform Administration (System Admin)

| ID | Requirement | Pri |
|----|-------------|-----|
| M1.1 | Create/suspend/archive schools (tenants) with plan, region, subdomain/slug | P0 |
| M1.2 | School onboarding wizard status tracking (profile, data import, fees, go-live) | P0 |
| M1.3 | Subscription plans (per-student/term, tiers, feature flags per plan) | P0 |
| M1.4 | SaaS invoicing of schools; trial, grace period, suspension rules | P1 |
| M1.5 | Platform dashboard: schools, students, payment volume, alert volume, failures | P0 |
| M1.6 | Provider management: configure SMS/WhatsApp/email/payment providers, failover priority | P0 |
| M1.7 | Alert credit wallet per school; platform-wide pricing for SMS/WhatsApp | P0 |
| M1.8 | Settlement management: payout batches, fees, commission report | P0 |
| M1.9 | Support tools: search any user/school, consent-based impersonation, audit view | P1 |
| M1.10 | Feature flags / staged rollout per tenant | P1 |
| M1.11 | Global announcements (maintenance, new features) | P1 |
| M1.12 | USSD shortcode & routing configuration (shared code vs per-school extension) | P0 |
| M1.13 | **Platform revenue dashboard:** headline revenue on the overview; detailed page with streams, per-school breakdown, waterfall to gross profit and contribution, formula drill-down, trend, export (see [15](15-platform-revenue.md)) | P0 |
| M1.14 | **Service map:** live topology of services, gateways and providers with health colour-coding, critical-path tracing to the last mile, per-node metrics, incident log (see [16](16-service-map-observability.md)) | P0 |
| M1.15 | Incident management: active incidents with impact and applied mitigation, link to providers; incident simulator for game-days | P1 |
| M1.16 | Public status page (customer-safe subset of service health) | P1 |
| M1.17 | Command palette / global search for platform admins | P2 |

## M2. School Setup & Administration

| ID | Requirement | Pri |
|----|-------------|-----|
| M2.1 | School profile: name, logo, contacts, address, motto, bank/MoMo settlement account | P0 |
| M2.2 | Academic calendar: year, terms/semesters, holidays, exam windows | P0 |
| M2.3 | Classes/streams/levels, subjects, subject-to-class mapping | P0 |
| M2.4 | Staff management: invite, role assign, deactivate | P0 |
| M2.5 | Bulk import (CSV/Excel) for students, guardians, staff, with validation report & dry run | P0 |
| M2.6 | Grading scheme config: grade boundaries, GPA/percent, remarks, weights (CA vs exam) | P0 |
| M2.7 | Timetable builder (manual first) | P1 |
| M2.8 | Admissions: online application, document upload, review, offer, enrolment | P1 |
| M2.9 | Student promotion/graduation/transfer at year end | P1 |
| M2.10 | Document templates (report card, receipts, letters) with branding | P0 |
| M2.11 | School-defined custom fields on student/guardian | P2 |

## M3. People & Records

| ID | Requirement | Pri |
|----|-------------|-----|
| M3.1 | Student profile: bio, class, guardians, medical/allergy notes, photo, documents | P0 |
| M3.2 | Guardian profile: phones (verified), email, relationship, payer flag, preferred channel/language | P0 |
| M3.3 | Sibling grouping and family-level view (combined balance, one payment for several kids) | P0 |
| M3.4 | Teacher profile: subjects, classes, contact | P0 |
| M3.5 | Duplicate detection & merge (same phone, same name+DOB) | P1 |
| M3.6 | Disciplinary/behaviour records with visibility rules | P1 |
| M3.7 | Student ID card / QR generation | P2 |

## M4. Fees & Payments (see [07](07-payments.md))

| ID | Requirement | Pri |
|----|-------------|-----|
| M4.1 | Fee structure per term/class/level with line items (tuition, PTA, feeding, uniform, transport) | P0 |
| M4.2 | Per-student adjustments: scholarship, discount, sibling discount, waiver, late fee | P0 |
| M4.3 | Invoice generation (bulk per class/term), re-issue, cancel | P0 |
| M4.4 | Installment plans with due dates and reminder schedule | P0 |
| M4.5 | Parent pays via **web** (MoMo prompt, card) | P0 |
| M4.6 | Parent pays via **USSD** (MoMo prompt/direct debit approval) | P0 |
| M4.7 | Partial payments allocated to oldest/targeted line items | P0 |
| M4.8 | Manual/cash/bank payment recording by bursar with proof & receipt | P0 |
| M4.9 | Instant digital receipt (SMS + PDF link + WhatsApp) with unique reference | P0 |
| M4.10 | Reconciliation: match provider transactions to ledger, flag exceptions | P0 |
| M4.11 | Refunds/reversals (maker-checker) | P0 |
| M4.12 | Settlement of school funds (T+1 default), statements, fee-adjusted net | P0 |
| M4.13 | Fee reports: arrears, collection rate, by class, by channel, aging | P0 |
| M4.14 | Pay-for-others (other relative pays using student code) | P1 |
| M4.15 | Recurring/auto-pay (MoMo standing approval) | P2 |
| M4.16 | Scholarship/sponsor payer accounts (corporate/NGO pays for multiple kids) | P2 |
| M4.17 | Multi-currency support | P2 |

## M5. Academics

| ID | Requirement | Pri |
|----|-------------|-----|
| M5.1 | Assessment definitions per subject/class/term: class tests, assignments, project, exam, weights | P0 |
| M5.2 | Teacher grade entry: grid UI with keyboard entry; CSV upload; mobile-friendly | P0 |
| M5.3 | Draft → Submitted → Approved → Published → Locked lifecycle | P0 |
| M5.4 | Auto computation: totals, grade letter, position/rank, class average, remarks | P0 |
| M5.5 | Report card generation (PDF), bulk, with teacher & head remarks | P0 |
| M5.6 | Grade corrections after publish with approval, versioning, and parent notification | P0 |
| M5.7 | Attendance: daily/period, bulk mark, late/excused, absence alerts | P0 |
| M5.8 | Teacher notes on student progress (private vs shareable) | P1 |
| M5.9 | Homework/assignments posting | P1 |
| M5.10 | Class/subject analytics for teachers | P1 |
| M5.11 | Learning standards/curriculum tagging (GES, WAEC-aligned strands) | P1 |
| M5.12 | Exam timetable, invigilation, question bank | P2 |

## M6. Communication & Alerts (see [08](08-alerts.md))

| ID | Requirement | Pri |
|----|-------------|-----|
| M6.1 | School Admin → all/segment of parents (by class/level/arrears/custom) | P0 |
| M6.2 | School Admin → all/segment of teachers | P0 |
| M6.3 | Channel choice per message: SMS, WhatsApp, email, in-app; automatic fallback | P0 |
| M6.4 | Templates with merge fields (`{{student_name}}`, `{{balance}}`) and i18n | P0 |
| M6.5 | System-triggered alerts: payment received, fee due/overdue, results published, absence, low grade | P0 |
| M6.6 | Delivery tracking & failure reporting; retry & fallback | P0 |
| M6.7 | Guardian preferences: channel, language, quiet hours, categories | P0 |
| M6.8 | Scheduled and recurring messages | P1 |
| M6.9 | Two-way parent ↔ teacher messaging (moderated, class-teacher scoped) | P1 |
| M6.10 | WhatsApp inbound bot (balance, pay link, results link, FAQs) | P1 |
| M6.11 | Emergency broadcast (closure, safety) priority queue bypassing quiet hours | P1 |
| M6.12 | Opt-out compliance (STOP) and consent records | P0 |

## M7. USSD Application (see [06](06-ussd-spec.md))

| ID | Requirement | Pri |
|----|-------------|-----|
| M7.1 | Identify guardian by MSISDN; list linked children | P0 |
| M7.2 | Check fee balance & last payments | P0 |
| M7.3 | Pay fees (full/partial/by item) via MoMo prompt | P0 |
| M7.4 | Results summary for latest published term | P0 |
| M7.5 | Attendance summary / last absence | P1 |
| M7.6 | PIN set/change/reset | P0 |
| M7.7 | Language selection (EN + local) | P1 |
| M7.8 | Manage alert preferences | P1 |
| M7.9 | Register unknown number via school code + student code + verification | P0 |
| M7.10 | Session resumption after drop | P1 |
| M7.11 | Request callback / contact school | P2 |

## M8. Parent Web App

| ID | Requirement | Pri |
|----|-------------|-----|
| M8.1 | Passwordless login (OTP), child switcher, family dashboard | P0 |
| M8.2 | Results: current/previous terms, trends, teacher remarks, downloadable report card | P0 |
| M8.3 | Fees: invoices, balance, pay now, payment history, receipts | P0 |
| M8.4 | Attendance and announcements feed | P0 |
| M8.5 | AI progress summary & suggestions per child | P1 |
| M8.6 | Preferences: channels, language, PIN, linked phones | P0 |
| M8.7 | Installable PWA with low-data mode | P1 |
| M8.8 | Messaging with teachers | P1 |

## M9. Student Experience

| ID | Requirement | Pri |
|----|-------------|-----|
| M9.1 | Student portal: results, timetable, announcements, assignments | P1 |
| M9.2 | AI study plan, practice quizzes, topic explainers | P1 |
| M9.3 | Streaks/goals/badges (age-appropriate, no dark patterns) | P2 |
| M9.4 | WhatsApp/SMS quiz delivery for low-data students | P2 |

## M10. AI Study Engine (see [09](09-ai-study-engine.md))

| ID | Requirement | Pri |
|----|-------------|-----|
| M10.1 | Per-student progress model: subject mastery, trend, volatility | P1 |
| M10.2 | Early-warning flags: declining grades, absenteeism, fee/attendance correlation, missing assessments | P1 |
| M10.3 | Weekly parent digest (plain-language, translated) | P1 |
| M10.4 | Teacher class insights: weak topics, at-risk students, suggested interventions | P1 |
| M10.5 | Personalised study plans & practice generation aligned to curriculum | P1 |
| M10.6 | Student AI tutor (safe, curriculum-grounded) | P2 |
| M10.7 | Teacher-approval workflow for AI comments before they reach parents | P1 |
| M10.8 | Feedback loop: thumbs up/down, accuracy tracking, model evaluation dashboards | P1 |

## M11. Reporting & Analytics

| ID | Requirement | Pri |
|----|-------------|-----|
| M11.1 | School dashboard: enrolment, attendance rate, collection rate, performance distribution | P0 |
| M11.2 | Exportable reports (PDF/CSV/XLSX) with scheduled email | P1 |
| M11.3 | Cross-school benchmarks (anonymised, opt-in) | P2 |
| M11.4 | Platform BI warehouse sync | P2 |

## M12. Cross-Cutting

| ID | Requirement | Pri |
|----|-------------|-----|
| X1 | Audit log on all sensitive mutations (who/what/when/before/after/IP/channel) | P0 |
| X2 | i18n for UI, alerts and USSD (message catalogues) | P0 |
| X3 | Notifications in-app inbox | P0 |
| X4 | File storage with virus scan and signed URLs | P0 |
| X5 | Data export & deletion on request (guardian/school) | P0 |
| X6 | Offline-tolerant grade entry (queue and sync) | P1 |
| X7 | Webhooks/public API for schools to integrate | P2 |
| X8 | Soft delete & restore for core entities | P0 |
| X9 | Idempotency on all money/alert writes | P0 |

## Features Added Beyond the Original Brief

These are things a school SaaS typically needs that the first-pass outline did not mention:

1. **Attendance** — drives absence alerts and AI risk detection.
2. **Report cards & result approval workflow** — schools won't publish raw grades without head approval.
3. **Installments, discounts, scholarships, sibling logic** — real fee collection is rarely one lump sum.
4. **Reconciliation and settlement** — the bursar's and the platform's biggest operational pain.
5. **Platform billing of schools** — the SaaS needs its own revenue model.
6. **Alert credit wallets and cost control** — SMS/WhatsApp cost real money per message.
7. **Consent, privacy, and opt-out** — children's data and messaging law.
8. **Audit trail and maker-checker** — necessary for money and grades.
9. **Guardian identity across schools and household view** — siblings and shared payers.
10. **Teacher approval for AI messages** — protects trust and the school's voice.
