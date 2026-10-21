# ADR-004: Funds flow & settlement model

Status: Proposed — **requires legal/regulatory review before acceptance** · Date: 2026-10-20

## Context
Parents pay school fees through the platform. Who holds the money in between determines licensing, liability, accounting, and trust.

## Options

| Option | Flow | Pros | Cons |
|--------|------|------|------|
| **A. Aggregator sub-merchant + split settlement** | Parent → aggregator → school account (platform fee split off automatically) | We never hold customer funds; least regulatory burden; schools get paid directly | Depends on aggregator support for splits/sub-merchants; less control over timing |
| **B. Platform merchant account + payouts** | Parent → platform merchant account → payout to school | Full control, flexible settlement, can hold disputes | We hold funds → likely needs payment/e-money licensing or partnership; higher fraud/AML burden |
| **C. School's own merchant account** | Parent → school's MoMo merchant | Simplest legally | Each school must be onboarded to MoMo merchant; weak platform revenue capture |

## Decision (proposed)
Start with **A**, using the aggregator's sub-merchant/split features, with a **C-compatible mode** for schools that already have a merchant account (platform fee billed through SaaS invoice). Keep the ledger modelled so **B** is possible later (the `school_payable` account exists regardless).

## Consequences
+ Faster, lower-risk launch; clear separation of platform vs school funds.
− Reconciliation still required against the aggregator's reports.
− Aggregator choice must be validated against split settlement capabilities **before** build.
− Dispute/refund handling follows aggregator rules.

## Follow-ups
- Counsel opinion on regulatory status under A.
- Aggregator RFP with: split settlement, T+1, webhooks, status API, sandbox, fees, KYC burden, support SLAs.
