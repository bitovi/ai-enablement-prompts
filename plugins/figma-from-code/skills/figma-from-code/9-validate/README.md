# Validation & Cleanup (Phase 5)

Validates every built Figma component against its app screenshot, runs fix loops on mismatches, cleans up the Components page layout, and produces a structured validation report with a pass/fail verdict. This is the final phase of the figma-from-code pipeline.

## What It Does

- Runs the validator across all Figma components, comparing them to real app screenshots.
- Applies up to 3 fix iterations for components built during this run that don't match.
- Flags pre-existing components (ones that existed before the run) as read-only — they get compared but never modified.
- Cleans up stray frames on the Components page that subagents may have created outside the designated tier frames.
- Shuts down the shared Playwright browser server.
- Writes a compact validation summary with an overall PASS/FAIL verdict.

## How It Works

### Validation Pass

The validator (defined in `10-validator/`) runs inline and performs several steps:

1. Inventories all Figma components and resolves variant nodes for component sets.
2. Captures fresh screenshots from both the app and Figma.
3. Runs pixel diffs for each component sequentially, grouped by tier.
4. Runs structural checks — variables, pages, and screen sizes.
5. Produces the full validation report.

Components are treated differently based on when they were created:

- **Built during this run** — enters a fix loop (up to 3 iterations) if the diff exceeds the match threshold. Each iteration attempts corrections and re-validates.
- **Pre-existing components** — validated read-only. Screenshots are captured and compared, but no fixes are applied. Mismatches are flagged for user review.

### Component Page Cleanup

Subagents sometimes create their own frames on the Components page instead of placing children inside the designated tier frames. The cleanup step:

1. Finds stray top-level frames on the Components page.
2. Moves their children into the correct tier frames.
3. Deletes the now-empty stray frames.
4. Re-stacks all tier frames vertically with consistent 80px gaps.

### Summary and Verdict

After validation completes, the report is parsed into a compact summary containing:

- Counts by status: match, minor_diff, mismatch, no_app_reference.
- Average match percentage across all compared components.
- A list of flagged pre-existing components with mismatches.
- An overall **PASS** or **FAIL** verdict — at least 80% of compared components must match to pass.

The Playwright browser server is shut down at the end of this phase.

## Inputs

- Built Figma components (from Phases 3 and 4).
- Running Playwright server with access to the live app.
- Pipeline state tracking which components were built during this run vs. pre-existing.

## Outputs

- **`.temp/figma-validation/report.md`** — Full validation report with comparison tables and side-by-side screenshots.
- **`.temp/figma-from-code/validation-summary.json`** — Compact summary for the orchestrator (counts, average match, verdict).

## Why It Matters

This is the quality gate for the entire pipeline. It catches visual regressions introduced during builds, identifies components that don't match their real-app counterparts, and gives a clear pass/fail signal. The cleanup step keeps the Figma file tidy. Pre-existing components are surfaced separately so users can decide whether to update them in a future run.

**Skip/Resume:** This phase is skipped if `validation-summary.json` already exists and Phase 5 is marked complete in `state.json`.
