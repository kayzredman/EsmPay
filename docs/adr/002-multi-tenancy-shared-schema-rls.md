# ADR-002: Shared-schema multi-tenancy with Postgres RLS

Status: Proposed · Date: 2026-10-20

## Context
Hundreds of small-to-mid schools; cost per tenant must be tiny; strong isolation is mandatory (children's data).

## Decision
Single database, shared schema, `school_id` on every tenant table, **Row-Level Security** policies keyed on `current_setting('app.school_id')`, set per transaction by middleware. Platform-admin operations use a separate DB role. Routing layer abstracts DSN so a large school can be moved to a dedicated DB.

## Consequences
+ Lowest cost/ops; simple migrations; cross-tenant analytics for the platform are possible with a privileged role.
+ Defence in depth: bugs in app queries still cannot cross tenants.
− Must guarantee the tenant context is always set (fail closed: policy denies when unset).
− Noisy-neighbour risk → per-tenant rate limits, indexes leading with `school_id`.
− Guardian identity spans tenants → `users` is global, access via `memberships`.

## Alternatives
- Schema-per-tenant: migration overhead at 500 schools; connection/catalog bloat.
- DB-per-tenant: strongest isolation, highest cost; keep as escape hatch.
