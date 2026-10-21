# ADR-001: Modular monolith with separate edge services

Status: Proposed · Date: 2026-10-20

## Context
Small team, fast MVP, strong consistency needs (money, grades), but very different runtime profiles for USSD (sub-2s, bursty), webhooks (must-ack), and AI (Python, heavy).

## Decision
- One **core API** deployable organised as modules (IAM, org, people, fees, payments, academics, attendance, comms, insights bridge, billing, audit, files) with enforced boundaries and an outbox for events.
- Separate deployables for **USSD edge**, **webhook receiver**, **workers** (same codebase, different entrypoints), and the **AI service** (Python).

## Consequences
+ Simple transactions across modules, one DB, fast development.
+ Isolated scaling/failure of latency-critical edges.
− Requires discipline (lint-enforced boundaries) to avoid a "big ball of mud".
− Later extraction of modules (e.g. comms) must go through the event contracts that already exist.

## Alternatives
- Microservices from day one: too much operational overhead for team size.
- Pure monolith including USSD/AI: couples scaling and runtimes; rejected.
