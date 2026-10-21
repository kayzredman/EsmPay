# ADR-006: AI is grounded, teacher-in-the-loop, with template fallback

Status: Proposed · Date: 2026-10-20

## Context
AI output about children reaches parents and shapes opinions of teachers and schools. Errors or biased framing carry high trust and ethical cost.

## Decision
1. Deterministic features and rules produce **insights with evidence**; LLMs only turn structured facts into language.
2. LLM inputs are **structured and minimised** (no raw PII; name placeholders).
3. A **fact validator** rejects outputs containing numbers/entities not in the input; failure → template text.
4. Parent-facing AI content passes a **teacher review queue** by default; schools may auto-approve low-risk types (praise) later.
5. Sensitive attributes and fee status are excluded from student-level prediction; fairness slices monitored.
6. Every AI output is logged to `ai_audit` with model version; kill-switch feature flag per tenant and global.
7. The student tutor ships only after a child-safety review with topic-bounded, moderated, curriculum-grounded behaviour.

## Consequences
+ Predictable, explainable, and safe; works without LLM availability.
− Teacher workload for review (mitigate with batch UI, defaults, auto-approve for safe categories).
− Slower feature delivery than free-form AI chat.
