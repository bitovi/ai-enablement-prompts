---
name: qa-audit
description: Deep manual QA for a named non-trivial scope. Creates a local append-only audit receipt.
user-invocable: true
disable-model-invocation: true
---

# Skill: Deep QA Audit for a Scope

Use only for a named non-trivial focus. This is manual because it spends real time and tools.

Before auditing:

1. Define the exact focus and scope.
2. Gitignore `.qa-audit/`.
3. Create `.qa-audit/<scope>/AUDIT.md`.
4. Record scope, start time, and five phase headings. Timestamp every finding, confirmation, fix, and deferral.

Phase 1, self-review:
Run three focused passes against the requested outcome, build, lint, and tests. Fix findings before continuing.

Phase 2, deep verification:
Run ten distinct scope-specific passes. Every pass records its question, evidence, result, and fix or confirmation.

Phase 3, counter-review:
Use a fresh independent reviewer for the same scope. Resolve every finding with evidence and fixes.

Phase 4, live smoke:
Exercise the real runtime boundary. Unit tests do not replace an end-to-end proof when a live boundary exists.

Phase 5, final verification:
Run ten final independent passes. If a major flaw appears, return to counter-review.

Complete only when every phase is recorded, with totals for passes, findings, fixes, and approved deferrals. State clearly whether the focus is sound or what remains.