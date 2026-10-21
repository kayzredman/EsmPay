# 12 — Tech Stack & Infrastructure

Recommendations optimised for: small team, fast MVP, low-bandwidth users, reliability with money, and room to scale. Each choice has an escape hatch. Final calls recorded in [ADRs](adr/).

## 1. Stack at a Glance

| Layer | Recommendation | Why | Alternatives |
|-------|---------------|-----|--------------|
| Language | **TypeScript** end-to-end (API, web, workers); **Python** for AI service | One language for 90% of code; Python for ML ecosystem | Go for USSD/webhook edge later |
| Web app | **Next.js (App Router) + React**, Tailwind, shadcn/ui, PWA | SSR/performance, mature, PWA for low-data | Remix, SvelteKit |
| API | **NestJS** modular monolith (Fastify adapter) | Enforces modules/DI, OpenAPI generation, queue integrations | Hono/Fastify + custom modules |
| Database | **PostgreSQL 16** (managed) + RLS | Relational integrity for money/grades; RLS tenancy | — |
| ORM / migrations | **Drizzle** or **Prisma** + SQL migrations for RLS/triggers | Type-safe; raw SQL escape hatch is essential for RLS/ledger | Kysely |
| Cache/queue | **Redis** + **BullMQ** | USSD sessions, queues, rate limits | SQS/Cloud Tasks later |
| Search | Postgres FTS/trigram first | Avoid extra infra | Meilisearch/OpenSearch |
| Object storage | S3-compatible | Report cards, receipts, uploads | — |
| AI service | **FastAPI**, scikit-learn/XGBoost, `pgvector` | Simple; keep vectors in Postgres | Dedicated vector DB if scale demands |
| LLM | Provider-agnostic gateway (Anthropic/OpenAI/Google/others) | Swap for cost, quality, residency | Self-hosted OSS for tutor later |
| Auth | Own implementation on proven libs **or** managed (Clerk/Auth0/Keycloak) | See [ADR-005](adr/005-auth-approach.md) | — |
| PDF | Headless Chromium rendering (Playwright) or React-PDF | Branded report cards/receipts | wkhtmltopdf (avoid) |
| Observability | OpenTelemetry → Grafana/Datadog; Sentry for errors | Traces across web/API/workers | — |
| IaC / CI | Terraform; GitHub Actions | Reproducible | Pulumi |
| Hosting | See below | | |

## 2. Hosting Options

| Option | Pros | Cons | Fit |
|--------|------|------|-----|
| **AWS** (ECS Fargate, RDS, ElastiCache, S3) in `eu-west-1`/`af-south-1` | Broadest services, Africa region (Cape Town), mature compliance | More ops/complexity & cost | **Default recommendation for production** |
| GCP (Cloud Run, Cloud SQL, Memorystore) | Simple serverless containers | No African region for most services (Johannesburg exists) | Good alternative |
| Fly.io/Render/Railway + managed Postgres | Fast to start, cheap | Fewer compliance options, less control | Fine for pilot/staging |
| Local/African cloud (e.g. in-country DC) | Data residency, latency | Maturity varies | Consider if regulation demands |

**Latency matters most for USSD**: deploy the USSD service in the region closest to the telco/aggregator callback origin (often Europe or Johannesburg — confirm with aggregator) and measure.

## 3. Repository Layout (monorepo)

```
/apps
  /web            Next.js app (parent, student, teacher, school admin)
  /admin          Platform admin console (could be route group in web)
  /api            NestJS modular monolith
  /ussd           Stateless USSD edge service
  /webhooks       Minimal webhook receiver (shared lib with api)
  /worker         BullMQ workers
  /ai             FastAPI AI service (Python)
/packages
  /domain         Shared domain types, validators (zod), money utils, permissions matrix
  /ledger         Double-entry library + invariants tests
  /providers      Adapters: payments, sms, whatsapp, email, ussd
  /i18n           Message catalogues (web, alerts, ussd)
  /ui             Design system components
  /config         eslint, tsconfig, tailwind presets
/infra            Terraform, Docker, CI workflows
/docs             This blueprint
```

Tooling: pnpm workspaces + Turborepo (or Nx for module-boundary enforcement).

## 4. Environments

| Env | Purpose | Data | Providers |
|-----|---------|------|-----------|
| local | Dev via Docker Compose (Postgres, Redis, MinIO, mailpit, USSD simulator) | Seeded fake data | Fakes/mocks |
| preview | Per-PR ephemeral web/API | Seeded | Sandbox |
| staging | Prod-like; UAT | Synthetic | Sandbox providers |
| production | Live | Real | Live (secret-scoped) |

## 5. CI/CD

1. PR: lint, typecheck, unit tests, **RLS cross-tenant tests**, permission-matrix tests, migration check, dependency/secret scans.
2. Merge to main: build images, integration tests (Testcontainers), deploy to staging, smoke + e2e (Playwright).
3. Production: manual approval, canary/rolling, automated rollback on SLO breach.
4. DB migrations: expand/contract; destructive changes are two-step across releases.

## 6. Testing Strategy

| Level | Focus |
|-------|-------|
| Unit | Domain logic: grading calc, fee allocation, ledger, permission checks |
| Property-based | Ledger balance invariants, allocation rules |
| Integration | API + DB + Redis (Testcontainers); provider adapters with recorded fixtures |
| Contract | OpenAPI schema; provider webhook payloads |
| E2E | Playwright for key journeys (pay fees, publish results, import students) |
| USSD flows | Simulator-driven scenario tests incl. timeouts, back/home, PIN lock |
| Load | k6: payment spikes (term start), bulk SMS, grade entry bursts, USSD concurrency |
| Security | SAST, DAST, pen-test, tenant isolation fuzzing |
| AI | Golden sets, validator regression, fairness slices |

**Seasonality:** fee-payment peaks at term start/deadlines and results day; load-test at 10× average.

## 7. Performance Budget (web)

- First load JS < 150 KB gzip on parent routes; images lazy and compressed; fonts subset.
- Works on 3G: skeletons, optimistic UI, offline shell for the PWA.
- Data-saver mode (text only) for parent dashboard.

## 8. Rough Cost Model (illustrative, to be validated)

| Item | Pilot (5 schools, ~2k students) | Growth (50 schools, ~25k students) |
|------|-------------------------------|-----------------------------------|
| Cloud infra | $150–400/mo | $1.5k–4k/mo |
| SMS | ~$0.02–0.05 / msg × volume (pass-through) | pass-through via wallet |
| WhatsApp | per conversation/message by category | pass-through |
| USSD | shortcode fees + per-session | pass-through/absorb |
| LLM | ~$0.01–0.05 / student / month with caching | cap by plan |
| Payments | provider fee % (pass-through) | — |

Unit economics: ensure messaging and USSD are **cost-recovered** (wallet) and AI has a per-student budget.

## 9. Observability Dashboards (day-1)

1. **Payments:** initiation→success funnel by channel/provider, webhook lag, unknown intents, reconciliation exceptions.
2. **USSD:** sessions, completion, latency, errors by network.
3. **Alerts:** queue depth, delivery rate, cost, fallbacks.
4. **Tenant health:** active users, grade-entry progress, collection rate.
5. **Platform SLOs:** API p95, error rate, DB connections, replication lag.
6. **Service map & critical paths:** live topology, per-path health, last-mile delivery, active incidents — the owner/on-call landing page ([16](16-service-map-observability.md)).
7. **Platform revenue:** read-only reporting views over the ledger ([15](15-platform-revenue.md)).

### Synthetic probes and last-mile measurement

Run one-minute synthetic checks per critical path: a sandbox USSD session, a sandbox payment intent, a canary SMS/WhatsApp to a test handset, a canary email. Their results, together with provider delivery receipts, feed the *last-mile reach* figure. Budget probe messages through a platform-owned wallet. Topology and path definitions are kept as code beside the infrastructure definitions.

### Status APIs

`GET /platform/v1/health`, `/platform/v1/paths`, `/platform/v1/incidents` (platform roles only) back the Service map; a trimmed public status page is generated from the same data.
