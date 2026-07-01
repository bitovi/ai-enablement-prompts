# Validation & Cleanup (Phase 5)

Validates the completed Figma rebuild by comparing full-page screen frames against app screenshots. Individual components are not re-validated here — they already passed during Phase 3's build loop. This phase checks that components compose correctly at the page level, cleans up the Figma file, and produces a final report.

## What It Does

- Compares each assembled screen frame against its full-page app screenshot.
- Runs up to 2 fix iterations on screens that don't match (adjusting instance positions, variants, or spacing).
- Flags pre-existing screens as read-only — compared but never modified.
- Cleans up stray frames on the Components page.
- Shuts down the shared Playwright browser server.
- Writes a validation summary with an overall PASS/FAIL verdict.

## How It Works

### Screen-Level Validation

For each screen built in Phase 4:

1. Captures a fresh Figma screenshot of the screen frame at 1x scale.
2. Pixel-diffs it against the pre-captured app screenshot from Phase 2.5.
3. Records the verdict (screen thresholds: ≥85% match, 70-85% minor_diff, <70% mismatch).
4. For mismatched screens, runs up to 2 targeted fix iterations — diagnose from the diff, adjust the Figma frame, re-compare.

Pre-existing screens (those that existed before the pipeline run) are compared read-only — no fixes applied, mismatches flagged for user review.

### Component Page Cleanup

Finds stray top-level frames on the Components page, moves their children into the correct tier frames, deletes empty strays, and re-stacks all tier frames vertically with 80px gaps.

### Summary and Verdict

The summary contains per-screen results, average match percentage, and an overall **PASS** or **FAIL** verdict — at least 75% of compared screens must match to pass.

## Inputs

- Screen frames built in Phase 4 (node IDs from build results).
- Pre-captured full-page app screenshots from Phase 2.5.
- Pipeline state for pre-existing screen detection.

## Outputs

- **`.temp/figma-validation/report.md`** — Full report with per-screen comparisons.
- **`.temp/figma-from-code/validation-summary.json`** — Compact summary for the orchestrator.

## Why It Matters

This is the final quality gate. By validating at the page level rather than re-checking every component individually, it confirms that the assembled design system works as an integrated whole — while consuming a fraction of the resources that per-component validation would require. Components already proved themselves during Phase 3; this phase proves they compose correctly.

**Skip/Resume:** Skipped if `validation-summary.json` exists and Phase 5 is marked complete in `state.json`.
