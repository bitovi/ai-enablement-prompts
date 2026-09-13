---
name: spec-review
description: Adversarial review of plans, specs, and architectural decisions before implementation. Finds gaps, weak assumptions, edge cases, and blind spots that spec-check misses. Use before spec-implement or at major milestones. Differs from code-reviewer (which reviews code) and spec-check (which checks internal consistency) — this challenges whether the plan will actually survive contact with reality.
---

# Skill: Adversarially Review a Spec or Plan

Your job is to find everything wrong with this plan before anyone writes a line of code.

## How this differs from other review skills

- **`spec-check`** validates the spec's *internal* consistency — contradictions, redundancy, missing fields. It asks: "Is this spec well-formed?"
- **`spec-review`** challenges the spec's *external* soundness — wrong assumptions, missing edge cases, fragile design choices, overlooked dependencies. It asks: "Will this plan actually work in production?"
- **`code-reviewer`** reviews *implemented code* against the spec and project conventions. It runs after building. This skill runs *before* building.

Think of it as: spec-check is your editor, spec-review is your adversary, code-reviewer is your QA.

## What to do

Read the spec, plan, or decision document provided. Then attack it from every angle:

1. **Assumption audit** — List every implicit assumption the plan makes. Which ones are unverified? What breaks if any of them are wrong?

2. **Edge cases** — What happens at boundaries: empty states, zero items, concurrent access, partial failures, malformed input, large volumes, network timeouts? What error handling does the plan assume exists but doesn't specify?

3. **Missing pieces** — What did the plan *not* mention that it should have? Auth, rate limiting, idempotency, rollback, data migration, monitoring, logging, backward compatibility, API versioning?

4. **Dependency risks** — Does the plan depend on external services, APIs, libraries, or team handoffs that could fail, change, or be delayed? What's the blast radius?

5. **Simpler alternatives** — Could any part of this plan be done with less complexity? Is the team overengineering a solution that a simpler approach would handle?

6. **What would make this fail** — If you were betting your own money on this plan succeeding, what would keep you up at night?

## Output format

Write your findings as a structured report:

```markdown
## Adversarial Review Report

### Verdict
One of: [Go as planned | Go with fixes | Rethink needed] — followed by a one-sentence rationale.

### Critical gaps
These must be addressed before implementation.

- **[Gap name]** — Description of the gap and what it breaks. Fix: [concrete recommendation].

### Weak assumptions
Assumptions that may not hold in production.

- **[Assumption]** — Why it's risky. Mitigation: [what to verify or change].

### Edge cases and blind spots
Scenarios the plan doesn't account for.

- **[Scenario]** — What goes wrong. Fix: [what to add].

### Simplification opportunities
Places where less complexity would suffice.

- **[Area]** — Current approach. Simpler alternative: [what to do instead].

### Research notes
If you researched alternatives or best practices online, summarize what you found here. Cite sources.
```

## When to invoke

- After `spec-check` passes (before `spec-implement`)
- At major design milestones
- Before architectural decisions
- When you're about to build something complex and want a second opinion
- Anytime you say "review this adversarially" or "challenge this plan"

## Tips

- Be specific. "This might fail" is useless. "This assumes the payment webhook arrives within 30s, but Stripe's SLA is up to 5 minutes" is actionable.
- Prioritize findings by blast radius, not by how clever they sound.
- If the spec is solid, say so. A clean review report is a good sign.
- You can research best practices online to ground your recommendations in real-world evidence, not just intuition.
