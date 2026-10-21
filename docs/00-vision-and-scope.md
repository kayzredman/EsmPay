# 00 — Vision & Scope

## 1. Problem

In many African schools, communication between school and home is manual: paper report cards, phone calls, cash fee payments with handwritten receipts, and little visibility into a child's progress until end of term. Parents often use **feature phones** or have limited data, so app-only solutions exclude a large share of them. Schools lack affordable tooling for fee tracking, grading and parent communication.

## 2. Vision

> Every parent knows how their child is doing and can pay fees in under a minute — from a smartphone or a basic phone — and every student gets personalised study support.

## 3. Product Pillars

1. **Reach everyone** — Web app *and* USSD *and* SMS/WhatsApp. No parent is excluded by device or data.
2. **Money you can trust** — Every cedi traceable through a ledger; instant receipts; reconciliation for the bursar.
3. **Clear academic picture** — Teachers enter grades once; parents, admins and the AI engine all benefit.
4. **Proactive, not reactive** — Alerts and AI insights surface problems (arrears, falling grades, absences) early.
5. **Tenant-safe by design** — One platform, many schools, hard data isolation, child-data protection.

## 4. Users

| Actor | Primary goal |
|-------|--------------|
| **System Admin (platform)** | Onboard and manage schools, plans/billing, platform health, support |
| **School Admin** | Run the school: info, fees, grades oversight, communications |
| **Teacher** | Enter grades, take attendance, view student info, manage class |
| **Parent / Guardian** | See results, pay fees, receive alerts, understand progress |
| **Student** | Access study tools, own results/timetable (age-appropriate) |

Details: [01-actors-and-permissions.md](01-actors-and-permissions.md).

## 5. Scope

### In scope (platform)
- Multi-tenant school management (people, classes, subjects, terms)
- Fee structures, invoicing, payments (web + USSD), receipts, reconciliation, settlement
- Gradebook, assessment, report cards, result publishing
- Attendance, announcements, messaging (school → parents, school → teachers)
- Alerts over email, SMS, WhatsApp
- USSD app for parents (balance, pay, results summary, alerts opt-in)
- AI study engine: progress tracking, risk flags, study plans, student tutor, parent digests
- Platform admin console, SaaS subscription billing for schools

### Out of scope (initially)
- Full LMS (video hosting, course authoring) — P2
- Payroll / HR for staff
- Hostel, transport and canteen modules — P2 extension points only
- Native mobile apps — web is a responsive PWA first
- Tertiary-grade features (credit hours, GPA transcripts) beyond configurable grading schemes

## 6. Assumptions (confirm — see [14](14-risks-open-questions.md))

| # | Assumption | Impact if wrong |
|---|-----------|-----------------|
| A1 | Launch market is **Ghana** (GHS, MTN MoMo / Telecel Cash / AT Money) | Provider and shortcode choices change; architecture stays the same |
| A2 | Target is **basic/JHS/SHS private & public schools** (K-12), not universities | Grading/term model needs more configurability |
| A3 | Schools are the paying customer (per-student/term SaaS fee) | Pricing and billing module change |
| A4 | Parents pay fees to the **school**; platform takes a small fee/spread | Settlement and compliance model change |
| A5 | Languages: English first; Twi/Ewe/Ga/Hausa for USSD & alerts later | i18n must be designed in from day one regardless |
| A6 | One guardian may have children in multiple schools | Identity must be person-level, not school-level |

## 7. Success Metrics

| Area | Metric | Target (12 months post-launch) |
|------|--------|-------------------------------|
| Adoption | Active schools | 50 |
| Reach | % parents with ≥1 verified phone number | > 90% |
| Payments | % of fees paid digitally in onboarded schools | > 60% |
| Payments | USSD payment success rate | > 92% |
| Engagement | Parent monthly active rate (any channel) | > 70% |
| Ops | Time to onboard a school (data ready) | < 3 days |
| Academic | Results published within X days of exam end | Median < 5 days |
| AI | Parents who open weekly digest | > 50% |
| Reliability | API availability | 99.9% |

## 8. Non-Functional Targets

- **Availability:** 99.9% API; USSD gateway 99.95% (telco timeouts are unforgiving).
- **Latency:** USSD response < 2 s p95 per screen (hard session limits). Web p95 < 500 ms for reads.
- **Scale (design to):** 500 schools, 250k students, 500k guardians, 5M alerts/month.
- **Data residency:** primary region as close to market as feasible; document cross-border transfers.
- **Accessibility:** WCAG 2.1 AA for web; low-bandwidth friendly (< 200 KB initial route).
- **Auditability:** all financial and grade changes are append-only audited.
