# ADR-007 — Service Health Model & Service Map

- **Status:** Proposed
- **Date:** 2026-10-20
- **Deciders:** Founder, Engineering

## Context

Payments, receipts, results alerts and USSD each traverse many components and third parties (telco, aggregator, SMS, WhatsApp, email, LLM). Failures are often partial (a provider is slow, a route is failing) and the platform has automatic fallbacks (SMS provider 2, WhatsApp, templates). Operators need one place that shows **what is broken, who is affected and what has already been mitigated**, tied to business outcomes (a receipt reaching a parent), not just CPU graphs.

## Decision

1. Model the platform as a **graph of nodes and links** with a three-state health (healthy / degraded / down) derived from RED metrics, queue age, provider delivery receipts, circuit-breaker state and synthetic probes.
2. Define **critical paths** (USSD payment, web payment, results to parents, settlement, AI digest) as ordered routes over the graph, with **alternates** (provider failover) and **soft dependencies** (graceful degradation). A path's status is the worst state of the chosen route; using an alternate keeps the path healthy but tagged *Failover*.
3. Measure the **last mile** explicitly: share of receipts/alerts that reach the handset and payouts that reach the school, from delivery receipts and synthetic canaries.
4. Keep the topology and path definitions **as code** next to infrastructure.
5. Expose a **Service map** in the Platform Admin console and a trimmed public status page; use the same incident state for the Providers page, overview banner and navigation badge.
6. Provide an **incident simulator** for demos and game-days that follows the same behaviours as production fallbacks.

## Consequences

**Positive:** faster diagnosis; fallbacks are visible rather than silent; a shared vocabulary for SLOs and runbooks; the same model feeds the public status page.

**Negative / costs:** requires disciplined instrumentation and maintaining the topology config; synthetic probes cost messages/sessions (budget them via the wallet model); risk of alert noise if thresholds are not tuned.

## Alternatives considered

- *Rely on generic APM dashboards only:* flexible but not tied to business paths or last-mile outcomes.
- *Third-party status products only:* good for public status; do not understand our fallbacks or ledger-linked paths.

## Follow-ups

- Choose observability stack (see [12](12-tech-stack-infra.md)).
- Agree SLO targets with pilot schools ([16 §8](../16-service-map-observability.md)).
- Write runbooks for each simulated incident.
