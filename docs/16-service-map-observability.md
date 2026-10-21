# 16 — Service Map, Health Model & Critical Paths

> A live, colour-coded map of every service, gateway and external provider, from the parent's phone to the school's bank (the **last mile**). Prototype: `prototype/staff.html` → Platform Admin → **Service map**. Decision record: [ADR-007](adr/007-service-health-model.md).

## 1. Purpose

Money, messages and USSD sessions each cross many hops owned by different parties. When something is slow or down, operators need to see **where**, **who is affected**, and **whether the platform has already worked around it**. The service map is that view. It is also the primary operational surface for the Platform Admin and on-call engineer.

It answers four questions in under ten seconds:

1. Is everything healthy right now? (overall status + KPI strip)
2. If not, which node or link is failing, and what depends on it? (colour + dependency highlighting)
3. Which **critical paths** (payments, results alerts, settlement, AI digests) are affected, and do they still reach the last mile? (path tracing)
4. What did the platform do about it automatically? (failover badges, incident log)

## 2. Topology

Six lanes, left to right, following a request from the user to the outside world:

| Lane | Nodes |
|------|-------|
| **Channels** | Parent web app (PWA) · School & platform consoles · Feature phone (*714#) |
| **Telco & edge** | CDN · WAF · load balancer · Telco USSD gateways (MTN, Telecel, AT) |
| **Application** | Web app (SSR) · Core API (modular monolith) · USSD service |
| **Core services & data** | Webhook receiver · Payments & ledger · Alert service · Workers & queues · AI study service · PostgreSQL · Redis |
| **External providers** | Payment aggregator · SMS provider 1 · SMS provider 2 · WhatsApp Cloud API · Email provider · LLM provider |
| **Last mile** | School settlement (bank / MoMo) · MoMo networks (approval prompt) · Parent handset (SMS · WhatsApp · email) |

This mirrors the container view in [03](03-architecture.md) and adds the external hops that the architecture diagram treats as boundaries. Edges are labelled with what travels on them (HTTPS, session callback, request-to-pay, webhook, SMS delivery, etc.) and have a nominal latency used for budgeting.

## 3. Health model

Every node has one of three states:

| State | Colour | Meaning | Typical rule (illustrative) |
|-------|--------|---------|------------------------------|
| **Healthy** | green | Within SLO | Error rate < 1% and p95 < 1.5× baseline |
| **Degraded** | amber | Working but outside SLO | Error rate 1–10% or p95 ≥ 2× baseline or provider delivery < 95% |
| **Down** | red | Not serving | Error rate > 50%, probes failing, or circuit breaker open |

Links inherit the **worse** of their endpoints. Down links are drawn dashed; requests that fail along them are drawn as red dots that fade out part-way.

**Signals** (production): RED metrics per service (rate, errors, duration), queue depth and age, provider delivery receipts, synthetic probes (see §7), circuit-breaker state, and provider status feeds.

**Paths and soft dependencies.** A path's status is the worst state of the nodes it uses, with two refinements:

- **Alternates:** where the platform can choose (SMS provider 1 → 2 → WhatsApp → email), the path takes the healthiest alternative. If the preferred route is unhealthy and an alternative is used, the path stays **healthy** and is tagged **Failover** with the provider it fell back to.
- **Soft dependencies:** nodes whose outage degrades but doesn't break the path (e.g. the LLM provider on the AI path, which falls back to templates) cap at **degraded**.

## 4. Critical paths

| Path | Route (abridged) | Budget | If it breaks |
|------|------------------|--------|--------------|
| **USSD payment** | Phone → telco gateway → USSD service → API → payments → aggregator → MoMo prompt; callback → webhook → ledger → alert → SMS/WhatsApp → handset | 10 s end to end (excluding the user's approval time) | USSD users cannot pay; web and cash continue |
| **Web payment** | PWA → edge → web app → API → payments → aggregator → MoMo prompt; callback → ledger → receipt | 10 s | Online payments paused with a clear message |
| **Results → parents** | Head's console → edge → API → outbox → alert service → channel → handset | 15 s | Results published but guardians not alerted; still visible in app |
| **Settlement → school** | Console → API → payments → aggregator → school account | T+1 | Payouts held, not lost; funds safe in ledger |
| **AI insight → parent** | Workers → AI service → LLM → insights → teacher approval → alert → handset | 20 s | Digest delayed; no effect on payments |

For a selected path the map dims everything else, numbers each hop, and the side panel lists hop-by-hop latency and status, the end-to-end time against its budget, and **last-mile reach** — the share of messages/payments that make it to the handset or bank. Reach multiplies per-node factors (degraded ≈ 0.955, down = 0, failover ≈ 0.985) in the prototype; in production it comes from delivery receipts.

## 5. Live behaviour

- **Animation:** dots travel along links at a rate proportional to current throughput. Colour = link state; slower when degraded.
- **Automatic rerouting is visible:** when SMS provider 1 is degraded, traffic on its links thins, provider 2's links thicken and its node shows a **FAILOVER** badge. If both SMS providers are down, the alert service shows **QUEUE n** growing and WhatsApp/email carry what they can.
- **Metrics on nodes:** throughput and p95 under each name; **DOWN** when unreachable.
- **KPI strip:** payments/min, active USSD sessions, alerts/min (with queue depth), API p95, webhook lag, last-mile delivery.
- **Incidents panel:** active incidents with impact, mitigation already applied, age, and a Resolve action; an event log below.
- **Consistency:** the Providers page, the Overview "Provider health" table, the overview incident banner and the sidebar badge all derive from the same incident state.

## 6. Incident simulator (prototype and game-day tool)

The prototype includes an **Inject incident** control, doubling as the specification for chaos/game-day exercises:

| Incident | Effect | Expected platform behaviour |
|----------|--------|-----------------------------|
| SMS Provider 1 degraded | Delivery 91% | ~70% of SMS shifts to provider 2 |
| SMS Provider 1 outage | No SMS via P1 | 100% shifts to provider 2 |
| All SMS providers down | No SMS/OTP | Queue + retry, WhatsApp-first, page on-call |
| Payment aggregator outage | No MoMo prompts | Fail fast with clear message; manual payments continue; reconciliation heals |
| Aggregator callbacks delayed | Receipts lag | Status polling; daily reconciliation |
| PostgreSQL failover | ~15 s read-only | Automatic promotion; idempotent retries; self-resolves (timed in the prototype) |
| Redis unavailable | USSD sessions fail | "Service busy"; managed failover; load shedding |
| Telco USSD latency | Screens > 3 s | Session resume prompt; escalate |
| WhatsApp rate-limited | Throttled | Overflow to SMS |
| LLM timeouts | No narratives | Template text |
| Edge traffic spike | p95 × 2.4 | Autoscale; payments keep queue priority |

Deep links for demos: `staff.html#role=platform&page=flow&path=ussd&inject=sms_all`.

## 7. Production implementation notes

- **Synthetic probes** every minute per path (e.g. a test MSISDN receiving a canary SMS; a sandbox USSD session; a sandbox payment intent) feed the last-mile numbers independent of real traffic.
- **Topology as code:** nodes, edges and path definitions live in a versioned config next to the infrastructure, so the map cannot drift from reality.
- **Data source:** OpenTelemetry metrics/traces + provider delivery receipts into the observability stack; the console reads a small read-only status API (`GET /platform/v1/health`, `/platform/v1/paths`, `/platform/v1/incidents`).
- **Alerting:** burn-rate alerts per path SLO page on-call; the map is the landing page linked from every page.
- **Public status page:** a trimmed, customer-safe subset (channels and path health, no internals) for schools and parents.
- **Access:** platform roles only; no tenant or child data on this screen.

## 8. SLOs (starting targets)

| SLI | Target |
|-----|--------|
| Payment initiation success (prompt delivered) | ≥ 98% within 10 s |
| Receipt delivered to handset | ≥ 97% within 60 s |
| Results alert delivered | ≥ 97% within 5 min of publish |
| USSD screen response p95 | < 2 s |
| API p95 | < 300 ms |
| Webhook-to-ledger lag p95 | < 5 s |
| Settlement correctness | 100% (zero unreconciled after T+1 except flagged exceptions) |
