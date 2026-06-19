---
name: implement
description: Implement a feature from a spec, plan, or ticket — design, build, test, self-review via the code-reviewer agent, then prep a PR. Manual-invoke only: /implement-workflow:implement <spec, plan, or ticket>.
argument-hint: specification, implementation plan, or ticket
disable-model-invocation: true
---

# Feature Implementation Workflow

Implement the feature described in `$ARGUMENTS` against this codebase. Work through the steps below as a tracked to-do list, following **your project's own conventions** — before you start, read whatever convention, architecture, and testing docs the repo provides (e.g. `CLAUDE.md`, a backend/frontend styleguide, a `TESTING.md`, an `ONBOARDING.md`).

> If anything about the design, requirements, scope, or review feedback is unclear, **stop and ask** before proceeding. When a task is unclear or you're unsure which approach to use, ask for clarification rather than assuming.

## Step 1 — Understand
- Read the spec and the relevant parts of the codebase. Identify the area/module involved, the layers it touches, and the existing patterns to follow.
- Note the constraints: authorization/permissions, external-system boundaries, and any schema/migration impact.

## Step 2 — Design
- Outline your approach: which files change, new data/validation schemas, DB schema + migrations, API surface, and frontend pieces.
- For anything non-trivial, share the plan and get alignment **before** building. Reuse existing utilities, schemas, and shared UI components rather than introducing new ones.

## Step 3 — Implement
- Build the change respecting the project's architecture and its module/import boundaries.
- Route configuration through the project's settings/config layer rather than reading environment variables ad hoc (and update the example env file). Prefer the project's established frontend config, path aliases, and shared styles. Keep types strict — no escape-hatch `any`.
- For schema changes: generate a named migration, hand-edit it to be idempotent if your project requires that, then run the migration.

## Step 4 — Test
- Write and run tests per your project's testing guide: prefer behavior tests (HTTP status, response shape, persisted state, side effects) over implementation tests, and cover real-world scenarios and edge cases.
- **Never** write to production or shared external systems in tests. Keep external writes off and mock at the SDK/client boundary. Use synthetic data only — no PII.

## Step 5 — Self-review
- Spin up the `implement-workflow:code-reviewer` agent (bundled with this plugin) to review your changes against the main branch. Use the plugin-qualified name so a project's own `code-reviewer` agent doesn't shadow the bundled one.

## Step 6 — Address feedback
- Work through the review. For each finding, decide deliberately: fix it, push back with a reason, defer it to a future PR, or raise it with a human. Consider the rationale behind each comment rather than reflexively complying.

## Step 7 — Update docs
- Update any affected documentation — convention docs, testing/architecture guides, onboarding, or package READMEs. Skip if nothing structural changed.

## Step 8 — Prep the PR
- Get the branch green: run the `ready-to-push` skill (tests → lint → build) and fix anything it surfaces.
- Produce a PR title and description in the `suggest-pr` format (conventional-commit title, a short Description, and a Changelist), rendered in the conversation — do not create files for it.
- Follow your project's commit/PR rules (conventional commits; honor any co-author / auto-comment policy).

---

## Adapting this workflow to your stack

This skill ships intentionally generic, so each step defers to your repo's own conventions. It was originally tuned for one team's stack — see [`references/example-profile-trackframe.md`](references/example-profile-trackframe.md) for a complete worked example (four-layer architecture, a typed settings layer, idempotent migrations, a multi-track database, and external-system test guards). Use it as a template: copy the parts that fit and replace the specifics with your project's conventions, or wire each step to the docs your repo already has.
