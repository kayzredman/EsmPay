# ADR-003: Double-entry ledger for all money

Status: Proposed · Date: 2026-10-20

## Context
Fees involve partial payments, discounts, refunds, provider/platform fees and settlements. Mutable "balance" columns lead to untraceable discrepancies.

## Decision
All monetary effects are recorded as **immutable, balanced ledger transactions** (debits = credits) in integer minor units. Invoice balances and school payables are derived (and materialised for speed) from entries. Corrections are reversing entries. Postings are idempotent on `(source_type, source_id, posting_type)`. A nightly job asserts invariants per school.

## Consequences
+ Full auditability, easy reconciliation, safe refunds.
+ Settlement statements generated directly from ledger.
− More modelling upfront; developers must post via the ledger library, never update balances directly.
− Need reporting views for non-accountants.

## Alternatives
- Balance columns + transactions table: simpler but error-prone; rejected for money.
