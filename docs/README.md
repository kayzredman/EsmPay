# EsmPay — School SaaS Platform Blueprint

A multi-tenant school management platform for African schools where **parents can follow their child's progress and pay fees from any phone (web or USSD)**, schools run day-to-day operations, and an **AI study engine** tracks every student's progress and feeds insight back to parents and teachers.

> Status: **Blueprint / pre-build.** No production code yet; a clickable prototype exists (see below). These documents are the source of truth until code exists; update them as decisions change.
>
> Last updated: 21 Oct 2026 — renamed to EsmPay and applied the [UI design system](17-design-system.md) to the parent app, USSD simulator and parent's-phone panels (§7–8). Earlier (20 Oct): added platform revenue ([15](15-platform-revenue.md)), service map & health model ([16](16-service-map-observability.md)), UI design system ([17](17-design-system.md)) and [ADR-007](adr/007-service-health-model.md).

## Document Map

| # | Document | What it answers |
|---|----------|-----------------|
| 00 | [Vision & Scope](00-vision-and-scope.md) | Why we exist, who we serve, what's in/out, success metrics, assumptions |
| 01 | [Actors, Roles & Permissions](01-actors-and-permissions.md) | Who uses the system and exactly what each role may do (RBAC matrix) |
| 02 | [Functional Requirements](02-functional-requirements.md) | Module-by-module feature list with priorities (P0/P1/P2) |
| 03 | [System Architecture](03-architecture.md) | Components, tenancy model, deployment, integration boundaries |
| 04 | [Data Model](04-data-model.md) | Core entities, ERD, tenancy and ledger design |
| 05 | [Key Flows](05-flows.md) | Sequence diagrams: onboarding, grading, fees, alerts, AI |
| 06 | [USSD Specification](06-ussd-spec.md) | Menu tree, session rules, screen copy, failure handling |
| 07 | [Payments & Ledger](07-payments.md) | Fee structures, MoMo/card flows, reconciliation, settlement |
| 08 | [Alert System](08-alerts.md) | Email / SMS / WhatsApp orchestration, templates, cost control |
| 09 | [AI Study Engine](09-ai-study-engine.md) | Progress tracking, risk detection, study plans, tutor, safety |
| 10 | [Security, Privacy & Compliance](10-security-privacy.md) | Child data protection, audit, threat model |
| 11 | [API Outline](11-api-outline.md) | Resource-oriented API surface and conventions |
| 12 | [Tech Stack & Infrastructure](12-tech-stack-infra.md) | Recommended stack, environments, observability, cost |
| 13 | [Roadmap](13-roadmap.md) | MVP definition and phased delivery |
| 14 | [Risks & Open Questions](14-risks-open-questions.md) | What we must decide or de-risk before/while building |
| 15 | [Platform Revenue & Owner Economics](15-platform-revenue.md) | What the platform earns, per stream and school, and how it adds up to contribution |
| 16 | [Service Map & Observability](16-service-map-observability.md) | Live topology, health model, critical paths to the last mile, incident behaviour, SLOs |
| 17 | [UI Design System](17-design-system.md) | Visual principles, tokens, components, accessibility |
| — | [Decision Records](adr/) | Architecture decisions and their rationale |

## Interactive Prototype

Open [`prototype/index.html`](../prototype/index.html) (parent web app + USSD simulator) and [`prototype/staff.html`](../prototype/staff.html) (Platform Admin, School Head/Bursar and Teacher consoles) in a desktop browser. They share mock data: a payment made in the parent app or USSD appears live on the bursar dashboard **and raises the platform's transaction-fee revenue**. No build step required (serve the folder statically if your browser blocks `file://`).

Platform Admin screens:

| Screen | What it shows | Spec |
|--------|---------------|------|
| Overview | Revenue strip, KPIs, provider health, incident banner | [15](15-platform-revenue.md), [16](16-service-map-observability.md) |
| **Service map** | Animated live topology from phone to bank, colour-coded health, critical-path tracing, incident simulator | [16](16-service-map-observability.md) |
| **Revenue** | Waterfall from streams to contribution, per-stream formulas, follow-a-payment calculator, per-school table | [15](15-platform-revenue.md) |
| Settlements · Schools · Providers | Payout batches, tenants, provider and wallet management | [07](07-payments.md), [08](08-alerts.md) |

Deep links: `staff.html#role=platform&page=flow&path=ussd&inject=sms_all` (service map with a path and an incident), `#role=platform&page=revenue`.

## One-Paragraph Architecture

A **modular monolith** (single deployable, strict module boundaries) exposes a REST API to a **Next.js web app** and to a thin **USSD gateway adapter**. **PostgreSQL** with row-level security isolates each school (tenant). A **payments module** with a double-entry ledger talks to a mobile-money/card **aggregator**. An **alert service** fans out notifications through email, SMS and WhatsApp providers via a queue. An independent **AI service** consumes academic events, computes progress insights and powers study tools, with outputs always flowing through teacher-approved or clearly labelled channels.

## Conventions Used in These Docs

- **P0** = required for MVP, **P1** = fast-follow, **P2** = later.
- "School" = tenant. "Guardian" = parent or legal guardian (a Parent is a Guardian).
- "Term" is the default academic period; "semester" is supported as a configurable term type.
- Diagrams use Mermaid (renders in GitHub, Cursor, and most Markdown viewers).
