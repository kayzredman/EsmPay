# 14 — Risks & Open Questions

## 1. Open Questions (decisions needed)

| # | Question | Why it matters | Owner | Needed by |
|---|----------|----------------|-------|-----------|
| Q1 | **Launch country and currency?** (Ghana assumed) | Providers, shortcodes, regulations, languages | Founder | Phase 0 |
| Q2 | **School segment**: basic/JHS/SHS, private vs public, boarding? Any tertiary? | Grading models, fee complexity, volume | Founder | Phase 0 |
| Q3 | **Who pays the platform?** Per-student fee, transaction %, hybrid? | Billing module, margin, pricing page | Founder | Phase 0 |
| Q4 | **Funds flow**: sub-merchant split settlement vs platform-collect-and-payout? | Licensing, risk, accounting design ([ADR-004](adr/004-funds-flow-and-settlement.md)) | Founder + counsel | Before payments build |
| Q5 | **Who bears transaction fees** (school vs parent vs split)? | UX copy, ledger postings, parent trust | Founder / pilot schools | Phase 1 |
| Q6 | **Payment aggregator** selection | Integration scope, fees, settlement timing | Founder / Eng | Phase 0 |
| Q7 | **USSD route**: telco direct vs aggregator; shared vs per-school code; session charges | Cost, timeline, branding | Founder / Eng | Phase 0 (apply now) |
| Q8 | **WhatsApp**: single shared number vs per-school; template languages | Cost, branding, verification time | Product | Phase 1 |
| Q9 | **Withhold results for unpaid fees?** | Ethical/legal/product stance; default off proposed | Founder + pilot heads | Phase 1 |
| Q10 | **Languages at launch** for web/USSD/alerts? | i18n content work, USSD char limits | Product | Phase 1 |
| Q11 | **Report card formats**: GES-standard? per-school custom layouts? | PDF engine flexibility | Pilot schools | Phase 1 |
| Q12 | **Do students get logins at MVP?** At what age? | Consent, safety, effort | Product | Phase 1 |
| Q13 | **Auth approach**: managed vs self-built ([ADR-005](adr/005-auth-approach.md)) | Cost, phone-first OTP fit, MFA | Eng | Phase 0 |
| Q14 | **AI training data rights**: can we pool de-identified data across schools? | Model quality vs consent | Founder + counsel | Before Phase 3 |
| Q15 | **Curriculum content** source & licensing for practice/tutor | Legality, quality | Product | Before Phase 3 |
| Q16 | **LLM vendor & data residency** | Privacy, cost, quality in local languages | Eng + counsel | Before Phase 3 |
| Q17 | **Offline needs** for teachers (grade entry without data)? | PWA offline sync complexity | Pilot teachers | Phase 1 |
| Q18 | **Existing school data**: spreadsheets, other systems to migrate? | Import tooling scope | Implementation | Phase 0 |
| Q19 | **Platform name/brand and domain** (name chosen: **EsmPay**; domain, shortcode and sender-ID availability still to be checked) | Shortcode registration, sender IDs, WhatsApp name | Founder | Phase 0 |
| Q20 | **Support model**: who answers parents? (school vs platform) | Staffing, in-app help | Founder | Phase 1 |
| Q21 | **Subscription price points and tiers** (prototype: GHS 6/9/12 per student per term) | Revenue, adoption, margin ([15](15-platform-revenue.md)) | Founder / pilot schools | Phase 1 |
| Q22 | **Platform transaction fee level and disclosure** (prototype: 0.50%) | Revenue vs parent trust; interacts with Q5 | Founder / counsel | Before payments build |
| Q23 | **AI add-on pricing and cap** (prototype: GHS 2 per student per month) | Unit economics of LLM usage | Founder / Eng | Before Phase 3 |
| Q24 | **Which costs count in "contribution"?** (team costs excluded in the prototype) | Owner reporting, investor metrics | Founder | Phase 1 |
| Q25 | **SLO targets and on-call model** for the critical paths ([16 §8](16-service-map-observability.md)) | Staffing, alert design, schools' expectations | Eng / Founder | Phase 1 |

## 2. Risk Register

Likelihood (L) and Impact (I): 1 low – 5 high. Score = L × I.

| ID | Risk | L | I | Score | Mitigation | Contingency |
|----|------|---|---|-------|-----------|-------------|
| R1 | **USSD shortcode / telco approvals take months** | 4 | 5 | 20 | Apply in Phase 0 via aggregator; launch web + SMS/WhatsApp first if delayed | Use aggregator shared code; pilot via SMS-link flows |
| R2 | **Payment aggregator KYC/settlement delays or limits** | 3 | 5 | 15 | Parallel-apply to 2 aggregators; start with limits; keep manual payment path | Cash/bank recording only for pilot |
| R3 | **Reconciliation errors / lost money** | 3 | 5 | 15 | Ledger invariants, webhook-first-poll-second, daily recon, human checker in pilot | Hold settlements until clean |
| R4 | **Cross-tenant data leak** | 2 | 5 | 10 | RLS + tests + code review rules + pen-test | Incident response plan; notify |
| R5 | **Low parent adoption / activation** | 4 | 4 | 16 | Import guardian phones; SMS activation; USSD for non-smartphone; school-led onboarding events | Incentives; paper QR codes on fee notices |
| R6 | **Bad data from schools (duplicates, wrong phones)** | 5 | 3 | 15 | Import validator, dry run, phone normalisation, duplicate detection, verification SMS | Onboarding service team |
| R7 | **SMS/WhatsApp cost overrun** | 3 | 4 | 12 | Wallets, caps, cost estimates in composer, fallback rules prefer cheap channel | Pause non-critical comms |
| R8 | **WhatsApp template rejection / policy changes** | 3 | 3 | 9 | Utility-category templates, SMS fallback, multiple language drafts early | SMS-only mode |
| R9 | **AI hallucination / harmful message to parents** | 3 | 5 | 15 | Fact-checker, templates, teacher approval, strict grounding | Disable AI digests via flag |
| R10 | **AI bias / stigma** (labelling children "at risk") | 3 | 4 | 12 | Exclude sensitive features, fairness slices, teacher-only risk flags, wording review | Rules-only mode |
| R11 | **Child privacy breach / regulatory action** | 2 | 5 | 10 | DPC registration, DPA, consent, minimisation, security gates | Incident process |
| R12 | **SIM swap / account takeover → fraudulent payments** | 3 | 4 | 12 | PIN, velocity limits, name-match, cooling-off | Freeze + refund workflow |
| R13 | **Peak-load failures at term start/results day** | 3 | 4 | 12 | Load testing at 10×, autoscaling, queue buffering, read replicas | Rate-limit non-critical paths |
| R14 | **Provider outage (SMS, aggregator, telco)** | 4 | 3 | 12 | Failover providers, status pages, degrade gracefully | Manual procedures |
| R15 | **Scope creep (LMS, HR, transport, etc.)** | 4 | 3 | 12 | Strict MVP boundary, extension points only | Roadmap gates |
| R16 | **Schools resist (change management, unpaid fee transparency)** | 3 | 4 | 12 | Bursar-friendly tooling, training, quick wins (receipts, arrears reports) | Dedicated implementation staff |
| R17 | **Unit economics negative (SMS/USSD/AI costs)** | 3 | 4 | 12 | Cost pass-through wallets, AI budgets, pricing tests in pilot | Reprice, reduce channel mix |
| R18 | **Grading/report diversity across schools too complex** | 4 | 3 | 12 | Configurable schemes + template-based report cards, pilot-driven | Custom templates as paid service |
| R19 | **Key-person/small team risk** | 3 | 4 | 12 | Documentation (this folder), ADRs, simple stack, managed services | Contractors for non-core |
| R20 | **Regulatory changes (e-levy, data law, SMS rules)** | 2 | 3 | 6 | Counsel review quarterly; config-driven fees/taxes | Update rules |
| R21 | **Revenue concentration** (a few large schools drive revenue) | 3 | 3 | 9 | Concentration shown on revenue dashboard; grow school count; multi-year contracts | Diversify segments |
| R22 | **Seasonal cash flow** (term-start spikes, holiday troughs) | 4 | 3 | 12 | Term-upfront subscriptions with deferred recognition; cash forecast; reserves | Annual plans with discounts |
| R23 | **Silent degradation** of a provider unnoticed until parents complain | 3 | 4 | 12 | Service map, synthetic probes, delivery-receipt SLOs, burn-rate alerts ([16](16-service-map-observability.md)) | Manual status check + provider escalation |

## 3. Assumptions to Validate in Pilot

1. Parents with feature phones are a **material** share (target: confirm in discovery interviews).
2. Parents prefer **MoMo prompt** over card (very likely).
3. Schools will upload guardian phone numbers accurately enough (> 80%).
4. Teachers will enter grades digitally if the grid is as fast as a spreadsheet.
5. Bursars value reconciliation/arrears reports above all else → lead with these in sales.
6. Heads will approve AI-assisted communications if teacher review is built in.
7. A single shared USSD code with MSISDN lookup is workable (guardians across multiple schools OK).

## 4. Discovery Activities (do before/while building)

- 10+ interviews each: parents (smartphone & feature-phone), bursars, heads, teachers.
- Collect samples: fee schedules, report cards, grading schemes, attendance registers, parent notices.
- Time-and-motion on current fee collection and results compilation.
- Call aggregators/telcos for real pricing, timelines, and sandbox access.
- Legal consult: payments licensing, data protection, children's data, SMS rules.
- Pricing willingness tests with 5–10 schools.
