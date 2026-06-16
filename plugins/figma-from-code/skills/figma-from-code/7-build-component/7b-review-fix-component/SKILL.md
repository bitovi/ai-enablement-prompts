# Skill: Review and Fix a Figma Component (Steps 4–7)

> **Review/fix phase only.** Receives the `-built.json` handoff from `7-build-component`, runs instance/sizing/pixel comparison, executes the fix loop, finalizes tracking files, and returns the complete result. All Figma MCP tools are available (`use_figma`, `get_screenshot`).

## Required Inputs

| Input              | Description                                                | Source                                                           |
| ------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `componentName`    | Name of the component (e.g., `Button`, `UserProfile`)      | Handoff file or caller                                           |
| `fileKey`          | Figma file key                                             | State ledger or caller                                           |
| `builtHandoffPath` | Path to the `-built.json` handoff from `7-build-component` | `.temp/figma-from-code/build-results/{componentName}-built.json` |

All other inputs (`nodeId`, `screenshotNodeId`, `figmaScreenshot`, `figmaVariant`, `sourceDir`, `variants`) are read from the handoff file — they are not passed separately.

### Also reads from disk

- `.temp/figma-from-code/builtComponents.json` — for instance resolution during fix loop
- `.temp/figma-from-code/color-index.json` — reverse RGB → variable index for the Step 5R rebind sweep
- `state.json → preExistingComponents` — for the pre-existing guard
- `.temp/figma-from-code/screenshots/{componentName}/app.png` — app reference screenshot
- `{sourceDir}/.figma/code.json` — written by Step 1; consumed by Step 4a
- `{sourceDir}/.figma/figma.json` — written by Step 2f; consumed by Step 4a

---

## Acceptance Thresholds

| Metric           | Pass threshold |
| ---------------- | -------------- |
| `matchPct`       | ≥ 90%          |
| `borderMatchPct` | ≥ 85%          |

Both must pass for `verdict: "match"`. `matchPct` alone passing yields `"minor_diff"`. Below `matchPct` threshold is `"mismatch"`.

---

## Result File Schema

Written to `.temp/figma-from-code/build-results/{componentName}.json` on every execution path.

**This is the canonical schema.** All other files that reference the per-component result format point here.

```json
{
  "componentName": "Button",
  "status": "success | partial_match | no_app_reference | needs_authorization | rejected | failed",
  "nodeId": "123:45",
  "screenshotNodeId": "123:46",
  "type": "COMPONENT_SET | COMPONENT",
  "variants": [{ "name": "Variant=primary, Size=regular", "nodeId": "123:46" }],
  "figmaScreenshot": ".temp/figma-from-code/screenshots/Button/figma.png",
  "comparison": {
    "verdict": "match | minor_diff | mismatch | no_app_reference",
    "matchPct": 94.2,
    "borderMatchPct": 91.0,
    "iterations": 1,
    "fixes": ["border-radius 4px -> 8px"]
  },
  "preExistingTouched": [],
  "missingChildren": [],
  "rebindSweep": { "rebound": 3, "alreadyBound": 12, "unmatched": ["48,110,232"] },
  "trackingFile": { "written": true },
  "error": "only present when status is \"failed\""
}
```

`status` values:

- `success` — built and passed acceptance thresholds
- `partial_match` — built, fix loop ran 3 iterations without reaching thresholds
- `no_app_reference` — built, no `app.png` found; comparison skipped
- `needs_authorization` — propagated from handoff; no comparison performed
- `rejected` — propagated from handoff; no comparison performed
- `failed` — propagated from handoff or Figma API error during fix loop; `error` field is required

Field notes:
- `figmaScreenshot` — path to the final Figma screenshot (from the `-built.json` handoff or the last fix-loop capture)
- `screenshotNodeId` — the node ID used as the screenshot target (from the `-built.json` handoff)
- `matchPct` — the final pixel match percentage from `comparison.matchPct`, or `null` when comparison was skipped
- `rebindSweep` — report from the Step 5R variable rebind sweep; the string `"skipped_no_index"` when `color-index.json` was unavailable. `unmatched` lists 8-bit `"r,g,b"` colors that match no token — informational, not a failure
- `error` — human-readable error message; required when `status` is `failed`, omitted otherwise

---

## Pre-Existing Components Rule

The fix loop (Step 5) must **never** edit a node whose ID appears in `preExistingComponents`. If a comparison finding requires modifying such a node, surface it in the result and let the orchestrator/user decide. Full detail is in [../step-1-analyze.md §Pre-Existing Components Rule](../step-1-analyze.md).

---

## Early-Exit Gate

After reading the handoff file, check `status`:

| Handoff status        | Action                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `built`               | Continue to Inline Workflow below                                                             |
| `needs_authorization` | Write final result with `status: "needs_authorization"`, propagate `preExistingTouched`, stop |
| `rejected`            | Write final result with `status: "rejected"`, propagate `missingChildren`, stop               |
| `failed`              | Write final result with `status: "failed"`, propagate error message, stop                     |

---

## Inline Workflow

All steps run inline within a single agent. There is no subagent dispatching.

```
Steps 4–7 (all inline):
  4a. Instance check → run check-instances.js (hard gate)
  4b. Sizing check   → verify dimensions match intent
  4c. Pixel diff     → compare against app screenshot → verdict
  5.  Fix loop       → if verdict is not "match", diagnose and fix (up to 3 iterations)
  5R. Rebind sweep   → always — bind hardcoded colors that match a token variable
  6.  Track          → verify/refresh figma-component.json tracking files
  7.  Return         → write final result file with node ID, match score, issues
```

### Flow

```
1.  Read {componentName}-built.json
1a. If status ≠ "built" → propagate status to final result, stop (see Early-Exit Gate)
2.  Execute Step 4a (instance check)
    If 4a reports missing_instances → enter Step 5 fix loop with missing_instances
                                      (skip 4b/4c for this first pass)
3.  If 4a passes → execute Steps 4b, 4c → get verdict
4.  If app.png is missing → skip comparison, set verdict "no_app_reference", proceed to Step 6
5.  If verdict is "match" → skip the fix loop
6.  If verdict is not "match" → execute Step 5 fix loop (up to 3 iterations)
7.  Execute Step 5R rebind sweep (always — even when the verdict was "match"
    on the first comparison or comparison was skipped)
8.  Execute Step 6 (track), Step 7 (return)
```

**Fix iteration model:** Step 5 runs up to 3 iterations inline. Each iteration: diagnose from `diff.png`/`comparison.json`, apply fix via `use_figma`, re-enumerate instances (Step 2f re-run), re-screenshot, re-compare. If all 3 iterations complete without match, return `status: "partial_match"` and proceed to Step 6. Do not retry Step 5.

---

## Workflow

Step files live in `../7-build-component/`. Use the **condensed quick references** by default. Only escalate to the full reference when a fix iteration fails and you need edge-case guidance (e.g., the full discrepancy patterns table, rebind sweep internals).

### Default (quick references — use these first):

| Step | File                                             | Phase    | What it does                                                                 |
| ---- | ------------------------------------------------ | -------- | ---------------------------------------------------------------------------- |
| 4    | [../step-4-quick.md](../step-4-quick.md)         | Compare  | Instance gate + sizing check + pixel diff → verdict                          |
| 5+6+7| [../step-5-quick.md](../step-5-quick.md)        | Fix/Done | Fix loop + rebind sweep + track + return result                              |

### Full references (escalate only when needed):

| Step | File                                           | When to use                                                                  |
| ---- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| 4a   | [../step-4-compare.md](../step-4-compare.md)   | Instance-usage gate — `check-instances.js` diffs `code.json` vs `figma.json` |
| 4b   | [../step-4-compare.md](../step-4-compare.md)   | Sizing sanity check                                                          |
| 4c   | [../step-4-compare.md](../step-4-compare.md)   | Pixel diff against the app screenshot → verdict                              |
| 5    | [../step-5-fix-loop.md](../step-5-fix-loop.md) | Full discrepancy patterns table, detailed fix examples                       |
| 5R   | [../step-5-fix-loop.md](../step-5-fix-loop.md) | Full rebind sweep script and Discovered collection logic                     |
| 6    | [../step-6-track.md](../step-6-track.md)       | Finalize | Verify tracking files, refresh `updatedAt`, sanity-check invariants          |
| 7    | [../step-7-return.md](../step-7-return.md)     | Finalize | Report result with node ID, match score, and any remaining issues            |

### Script references

> Placeholders like `{skillRoot}` resolve from `state.json → config`.

- `check-instances.js` — lives at `{skillRoot}/scripts/check-instances.js`
- `compare.js` — lives at `{skillRoot}/scripts/compare.js` (vendored from the standalone screenshot-comparison skill)
- `inspect-styles.js` — used by Step 5 re-enumeration if needed; lives at `{skillRoot}/scripts/inspect-styles.js`

---

## Error Handling

| Scenario                                           | Action                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| Handoff status is not `built`                      | Propagate to final result, stop (see Early-Exit Gate)                     |
| No app screenshot (`app.png` missing)              | Skip comparison, write `status: "no_app_reference"`, proceed to Step 6    |
| Fix loop reaches 3 iterations without match        | Return `status: "partial_match"`, proceed to Step 6 — do not retry Step 5 |
| `use_figma` API error during fix loop              | Record error in result, return current best `status`, proceed to Step 6   |
| Fix loop would edit a `preExistingComponents` node | Stop fix loop, surface in result, let orchestrator/user decide            |
| `color-index.json` missing and not regenerable     | Skip Step 5R, set `rebindSweep: "skipped_no_index"`, proceed to Step 6    |

Never fail silently. Every error or skip must appear in the final result file.
