# 10 — Security, Privacy & Compliance

We hold **children's records, parents' phone numbers, and money flows**. Security is a product feature and a legal duty.

## 1. Data Classification

| Class | Examples | Controls |
|-------|----------|----------|
| **Restricted** | Child medical notes, disciplinary records, PIN hashes, provider credentials, ID documents | Field-level encryption, strict RBAC, access logging, no logs |
| **Confidential** | Grades, attendance, guardian contact details, invoices/payments, AI insights | RLS, encryption at rest/in transit, audit on access of bulk exports |
| **Internal** | Config, templates, aggregate analytics | Standard access control |
| **Public** | School name/logo, marketing pages | — |

## 2. Legal & Regulatory (confirm with counsel before launch)

| Area | Ghana-first notes (verify; extend per country) |
|------|---------------------------------|
| Data protection | **Data Protection Act, 2012 (Act 843)**: register as data controller/processor with the Data Protection Commission; lawful basis, purpose limitation, security safeguards, data subject rights; **children's data** requires parental/guardian consent |
| Electronic communications | Telecom/NCA rules on SMS sender IDs, opt-out, unsolicited messaging |
| Payments | Bank of Ghana payment systems regulation, aggregator licensing, AML/KYC on schools |
| Cybersecurity | Cybersecurity Act, 2020 (Act 1038) — incident reporting obligations |
| Education | GES guidance on student records/report formats; school-level policies |
| Cross-border | Assess transfers to cloud/LLM/WhatsApp providers outside the country; contracts (DPAs) and notices |

Platform role: usually **processor** for schools (controller), but controller for platform account data and billing. Provide a DPA template to schools.

## 3. Threat Model Highlights (STRIDE-ish)

| Threat | Scenario | Mitigation |
|--------|----------|-----------|
| Cross-tenant data leak | Bug returns another school's students | RLS + tenant context middleware + CI cross-tenant tests + query linting |
| Account takeover (guardian) | SIM swap / OTP interception → pay or view child data | PIN for money, device binding, risk-based step-up, new-number cooling-off, SIM-swap signals |
| Guardian link hijack | Attacker links to a child | Verified link via imported phone or school approval; DOB + code second factor; rate limits |
| Payment tampering | Fake webhook marks invoice paid | Signature verification, IP allowlist, status re-check via provider API, amount/currency match |
| Replay/duplicate | Duplicate webhook double-credits | Idempotency keys + unique provider refs |
| Insider abuse | Admin voids payments or edits grades | Maker-checker, immutable ledger, audit log, alerts on anomalies |
| Data exfiltration | Bulk export by compromised admin | Export approval/limits, watermarking, anomaly alerts, MFA |
| Prompt injection (AI) | Teacher note or student input manipulates LLM | Structured inputs only, no tool access for LLM, output validation, content filters |
| SMS pumping / toll fraud | Abuse of OTP endpoints | Rate limits, per-IP/MSISDN caps, CAPTCHA/risk checks, provider fraud controls |
| Enumeration | Probe phone/student codes | Uniform responses, rate limits, lockouts |
| DDoS on USSD/webhooks | Resource exhaustion | WAF, autoscaling, IP allowlists for telco/aggregator |
| Supply chain | Malicious dependency | Dependency scanning, lockfiles, SBOM, signed images |

## 4. Application Security Controls

**Authentication & Session**
- Argon2id for passwords; MFA for platform staff, Heads, Bursars.
- JWT access tokens (≤15 min) + rotating refresh tokens (revocation list); tokens scoped to a school.
- OTP: 6 digits, 5 min TTL, 3 attempts, resend throttling.
- Device/session list for users with remote revoke.

**Authorization**
- Central policy engine (RBAC + attribute rules: class assignment, guardian-student link) — decisions in one library, tested with a permission matrix test derived from [01](01-actors-and-permissions.md).
- Deny by default; object-level checks on every read/write (prevent IDOR).

**Input/Output**
- Schema validation on all inputs; output encoding; file uploads type-checked, size-limited, AV-scanned, stored in private buckets with signed URLs.
- CSV import sanitised (formula injection `=`, `+`, `-`, `@`).

**Secrets & Keys**
- Managed secret store; no secrets in repo/env files in prod; rotation schedule; separate keys per environment; HSM/KMS-managed encryption keys.

**Encryption**
- TLS 1.2+ everywhere; HSTS; DB and object storage encrypted at rest; field-level encryption for Restricted fields with per-tenant data keys (envelope encryption).

**Logging & Audit**
- Structured logs, PII-scrubbed (hash msisdn, no PINs/OTPs/tokens).
- Immutable `audit_log` for: auth events, role changes, grade changes, payment actions, exports, impersonation, config changes, AI approvals.
- Log retention 12 months online, longer cold.

## 5. Infrastructure Security

- Private networking, no public DB; least-privilege IAM; separate prod account/project.
- WAF + rate limiting at edge; bot protection on OTP/registration.
- Webhook endpoints: IP allowlist where provider supports, signature validation, strict body size limit, quick 2xx.
- Backups: PITR, encrypted, cross-region copy, **quarterly restore drills**.
- Vulnerability management: SAST, dependency scan, container scan in CI; annual pen-test (plus before payments go-live).
- Environments isolated; **no production data in non-prod** (use synthetic/anonymised).

## 6. Privacy by Design

| Principle | Implementation |
|-----------|----------------|
| Minimisation | Collect only needed child/guardian fields; optional fields clearly optional |
| Purpose limitation | AI/analytics purposes declared; no ad use; no selling data |
| Consent & notice | Guardian consent captured at activation (web checkbox / USSD acceptance with SMS record) covering messaging channels and AI features; plain-language privacy notice in local languages |
| Transparency | "Why am I seeing this?" for AI insights; message sender always identified |
| Access & portability | Guardian can download child's records; school export tools |
| Erasure | Anonymise personal data on request while retaining legally required financial/academic records |
| Retention | Per [04](04-data-model.md) lifecycle; automated purge jobs |
| Children | Student accounts require guardian consent; no behavioural advertising; no dark patterns in gamification |

## 7. Incident Response

1. Detect (alerts on auth anomalies, cross-tenant query errors, payment anomalies).
2. Triage severity (SEV1: data leak/payments integrity).
3. Contain (revoke tokens, disable provider keys, feature flags).
4. Notify: affected schools within 24–72h as required; regulator per law; guardians via school.
5. Post-mortem, corrective actions tracked.

On-call rotation and runbooks for: payment webhook outage, SMS outage, DB failover, suspected tenant leak, credential leak.

## 8. Business Continuity

| Metric | Target |
|--------|--------|
| RPO | ≤ 5 minutes (PITR) |
| RTO | ≤ 2 hours core API; ≤ 30 min USSD/webhooks (stateless redeploy) |
| DR | Cross-region backup restore tested; infra reproducible via IaC |
| Degraded modes | If SMS provider down: failover; if AI down: templates; if payments provider down: show status, queue nothing silently, allow bursar manual payments |

## 9. Security Roadmap Gates

- **Before pilot:** RLS tests, authz matrix tests, OTP abuse controls, backups tested, DPA + privacy notice, Data Protection Commission registration in progress.
- **Before payments go-live:** pen-test, webhook hardening, reconciliation running, KYC process, finance runbooks.
- **Before AI to parents:** consent flows, teacher approval workflow, fact-checker, vendor DPA.
- **Before student tutor:** child-safety review, moderation pipeline, safeguarding policy.
