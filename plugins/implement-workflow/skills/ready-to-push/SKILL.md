---
name: ready-to-push
description: Get the code ready for deployment by running the project's test, lint, and build commands in order, fixing any issues that arise and rerunning each command until it passes before moving to the next.
---

# Deployment Readiness Check

Prepare the code for deployment by running the project's verification commands **in order**. First discover the right commands for this repo (look at `package.json` scripts, a `Makefile`, the CI config, or a `CONTRIBUTING`/`TESTING` doc), then run them in this sequence: **tests → lint → format/type check → build**.

For each command:

1. Run it.
2. If it fails or reports issues, fix the underlying issues in the code.
3. Rerun the same command.
4. Repeat steps 2–3 until the command passes cleanly with no issues.
5. Only then move on to the next command.

Stop only when every command has passed cleanly with no remaining issues.

## Commands (run in this exact order)

1. **Unit tests** — e.g. `npm test` / `pnpm test:unit` / `yarn test` / `make test`
2. **Lint** — e.g. `npm run lint` / `pnpm lint`
3. **Format / type check** — any check the pre-commit hook or CI runs that the lint step skips (e.g. `biome check`, `prettier --check`, `tsc --noEmit`). Use the project's inline-ignore syntax for intentional exceptions, not a blanket disable.
4. **Build** — e.g. `npm run build` / `pnpm build`

> If a step doesn't apply to this project, skip it and say so. Adjust the exact commands to match this repo — see the README's "How to modify" notes for tuning these to your stack and pre-authorizing them via `allowed-tools`.

## Rules

- **Do not skip a command.** Each must pass before the next is run.
- **Do not move on with known issues.** If a command surfaces warnings or errors that block the workflow, fix them and rerun.
- **Do not reorder the commands.** Tests first, then lint, then the format/type check, then build.
- **Do not suppress failures** with `--no-verify`, `|| true`, environment hacks, or by deleting/skipping tests to make them pass. Fix the root cause.
- **Do not commit, push, or open a PR.** This skill only verifies readiness — the user decides when to commit.
- If a fix in one step could plausibly break an earlier step (e.g., a lint fix changes runtime behavior), rerun the earlier command before continuing.
- When all commands pass, report a brief summary: which commands ran, how many fix iterations each required, and confirm the code is deployment-ready.
