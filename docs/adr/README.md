# Architecture Decision Records

Short records of significant decisions: context, decision, consequences. Status: `Proposed` → `Accepted` → (`Superseded`).

| ADR | Title | Status |
|-----|-------|--------|
| [001](001-modular-monolith.md) | Modular monolith with separate edge services | Proposed |
| [002](002-multi-tenancy-shared-schema-rls.md) | Shared-schema multi-tenancy with Postgres RLS | Proposed |
| [003](003-ledger-double-entry.md) | Double-entry ledger for all money | Proposed |
| [004](004-funds-flow-and-settlement.md) | Funds flow & settlement model | Proposed (needs counsel) |
| [005](005-auth-approach.md) | Authentication approach | Proposed |
| [006](006-ai-guardrails.md) | AI: grounded, teacher-in-the-loop, template fallback | Proposed |
| [007](007-service-health-model.md) | Service health model & service map | Proposed |

Template:

```
# ADR-NNN: Title
Status: Proposed | Accepted | Superseded by ADR-XXX
Date: YYYY-MM-DD
## Context
## Decision
## Consequences (+ / −)
## Alternatives considered
```
