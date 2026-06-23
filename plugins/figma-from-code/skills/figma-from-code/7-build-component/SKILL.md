---
name: figma-from-code-build-component
description: Unified skill for figma-from-code Phase 3 per-component pipeline. Executes the full analyze→build→review→fix process (steps 1–7) inline within a single agent. One agent per component, dispatched by the orchestrator in tier order.
model: claude-opus-4-6
---

# Skill: Build and Review a Figma Component (Steps 1–7)

> **Full per-component pipeline.** Analyzes source, creates the Figma node, captures screenshot, runs comparison, executes the fix loop, finalizes tracking, and returns the result. All steps run inline — no subagent dispatching.
>
> **Figma MCP tools available:** `use_figma`, `get_screenshot`.

## Required Inputs

> Placeholders like `{componentsRoot}` resolve from `state.json → config`. `{componentsRoot}` is an array of directory paths.

| Input                   | Description                                                                                       | Source                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `componentName`         | Name of the component (e.g., `Button`, `UserProfile`)                                             | Build order / caller                                     |
| `fileKey`               | Figma file key                                                                                    | State ledger or caller                                   |
| `parentFrameId`         | Node ID of the tier/container frame to append the component into                                  | State ledger                                             |
| `sourceFile`            | Absolute path to the component's `.tsx` source file                                               | Project's component source directory                     |
| `sourceDir`             | Component's modlet root directory (parent of `.figma/`)                                           | Derived from `sourceFile` path                           |
| `devServerUrl`          | URL of the running dev server — required for Step 1g live inspection                              | State ledger or caller                                   |
| `textContent`           | Extracted text JSON from the live app                                                             | `.temp/figma-from-code/screenshots/{name}/text.json`     |
| `iconUsage`             | Which Lucide icons and SVG assets the component uses, with sizes                                  | Source code imports + `icons.json`                       |
| `builtComponents`       | Map of `{componentName: nodeId}` for all previously built components available for instance reuse | State ledger `builtComponents`                           |
| `preExistingComponents` | Immutable snapshot of components that existed in Figma BEFORE this orchestrator run started       | State ledger `preExistingComponents` (Phase 0a snapshot) |

Screenshot directory is always `.temp/figma-from-code/screenshots/{componentName}/` — derived from `componentName`, not passed as an input.

### Optional Inputs

| Input              | Description                                                                                                                                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `computedStyles`   | Resolved CSS values from `computed-styles.json` (produced by `inspect-styles.js` in step 1g). Authoritative for colors, spacing, typography. Also contains `layoutContext.parent.clientWidth` — used by Step 1a to promote hug→fill when the parent slot is meaningfully wider than the element |
| `stateScreenshots` | Paths to state screenshots (`state-hover.png`, `state-focus.png`, `state-disabled.png`) and style diffs from `states.json`                                                                                                                                                                      |
| `cssFile`          | Path to the component's `.css` module file if external styles exist                                                                                                                                                                                                                             |
| `figmaVariant`     | Variant properties that match the app rendering                                                                                                                                                                                                                                                  |

### Also reads from disk

- `.temp/figma-from-code/builtComponents.json` — for instance resolution during fix loop
- `.temp/figma-from-code/color-index.json` — reverse RGB → variable index for the Step 5R rebind sweep
- `state.json → preExistingComponents` — for the pre-existing guard
- `.temp/figma-from-code/screenshots/{componentName}/app.png` — app reference screenshot
- `{sourceDir}/.figma/code.json` — written by Step 1; consumed by Step 4a
- `{sourceDir}/.figma/figma.json` — written by Step 2f; consumed by Step 4a

---

## Pre-Existing Components Rule

Before doing any work that resolves to a node ID in `preExistingComponents`, **stop**. That node existed in Figma before this run; modifying it requires explicit user authorization per the orchestrator skill's "Pre-Existing Components Rule".

Concretely:

- If `componentName` itself maps to a node in `preExistingComponents`: write `status: "needs_authorization"` and `preExistingTouched: ["<name>"]` to the result file and return immediately. Do not call `use_figma`.
- If a _child_ you would instantiate is in `preExistingComponents`: **instancing it is fine** — that's reuse, not modification. Modifying its master is not.
- The fix loop (Step 5) must **never** edit a node whose ID appears in `preExistingComponents`. If a comparison finding requires modifying such a node, surface it in the result and let the orchestrator/user decide.

---

## Variant Strategy

Variants are computed by Step 1b — they are **not** a caller input. See [step-1-analyze.md §1b](step-1-analyze.md) for the full extraction algorithm (variant library definitions, CSS pseudo-states, responsive breakpoints, prop-driven structural states), the representative set algorithm, and the budget guardrail (cap: 30 combos).

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

```json
{
  "componentName": "Button",
  "status": "success | partial_match | no_app_reference | needs_authorization | rejected | failed",
  "nodeId": "123:45",
  "screenshotNodeId": "123:46",
  "type": "COMPONENT_SET | COMPONENT",
  "variants": [{ "name": "Variant=primary, Size=regular", "nodeId": "123:46" }],
  "figmaScreenshot": ".temp/figma-from-code/screenshots/Button/figma.png",
  "figmaVariant": { "Variant": "primary", "State": "Default" },
  "sourceDir": "path/to/Button",
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
- `needs_authorization` — `componentName` is in `preExistingComponents`; no build performed
- `rejected` — missing child components; `missingChildren` list is populated; no build performed
- `failed` — Figma API error during build or fix loop; `error` field is required

---

## Inline Workflow

All steps run inline within a single agent. There is no subagent dispatching.

```
Steps 1–7 (all inline):
  1.  Analyze    → read source + reference material, write .figma/code.json
  2.  Build      → create Figma component via use_figma, write .figma/figma.json
  3.  Screenshot → capture Figma result via get_screenshot
  4a. Instance check → run check-instances.js (hard gate)
  4b. Sizing check   → verify dimensions match intent
  4c. Pixel diff     → compare against app screenshot → verdict
  5.  Fix loop       → if verdict is not "match", diagnose and fix (up to 3 iterations)
  5R. Rebind sweep   → always — bind hardcoded colors that match a token variable
  6.  Track          → verify/refresh figma-component.json tracking files
  7.  Return         → write final result file
```

### Flow

```
 1.  Execute Step 1 (Analyze) → produces code.json
 1a. If result shows "needs_authorization" → write result with that status, stop
 1b. If result shows "rejected"            → write result with status "rejected" + missingChildren, stop
 2.  Read code.json, execute Step 2 (Build)
     Post-Step 2 invariant: componentNodeId must be a non-null string before proceeding
 2a. If use_figma throws "node_not_accessible" → write result with status "failed",
     error "node_not_accessible: <id>", stop. Do NOT record the nodeId in builtComponents.
 3.  Execute Step 3 (Screenshot) → produces figma.png
 4.  Execute Step 4a (instance check)
     If 4a reports missing_instances → enter Step 5 fix loop with missing_instances
                                       (skip 4b/4c for this first pass)
 5.  If 4a passes → execute Steps 4b, 4c → get verdict
 6.  If app.png is missing → skip comparison, set verdict "no_app_reference", proceed to Step 5R
 7.  If verdict is "match" → skip the fix loop, proceed to Step 5R
 8.  If verdict is not "match" → execute Step 5 fix loop (up to 3 iterations)
 9.  Execute Step 5R rebind sweep (always — even when verdict was "match" or comparison was skipped)
10.  Execute Step 6 (track), Step 7 (return) → write final result
```

**Fix iteration model:** Step 5 runs up to 3 iterations inline. Each iteration: diagnose from `diff.png`/`comparison.json`, apply fix via `use_figma`, re-enumerate instances (Step 2f re-run), re-screenshot, re-compare. If all 3 iterations complete without match, set `status: "partial_match"` and proceed to Step 6. Do not retry Step 5.

---

## Step Files (shared library)

All step instruction files live directly in this folder. Each step has a **quick reference** (condensed, ~100 lines) and a **full reference** (exhaustive, ~600 lines). Default to the quick versions and only escalate to full references when dealing with complex components or failed builds.

### Quick references (default — use these first):

| File                                         | Steps    | Lines | Covers                                           |
| -------------------------------------------- | -------- | ----- | ------------------------------------------------ |
| [step-1-quick.md](step-1-quick.md)           | 1        | ~90   | Analysis sequence, sizing rules, output schema   |
| [step-2-quick.md](step-2-quick.md)           | 2        | ~110  | Build pattern, fixSizing, variable binding, 2f   |
| [step-3-quick.md](step-3-quick.md)           | 3        | ~35   | Screenshot capture (all cases)                   |
| [step-4-quick.md](step-4-quick.md)           | 4a/4b/4c | ~60   | Instance gate, sizing check, pixel diff          |
| [step-5-quick.md](step-5-quick.md)           | 5/6/7    | ~95   | Fix loop, rebind sweep, track, return            |

### Full references (escalate when needed):

| File                                         | Step     | When to escalate                                          |
| -------------------------------------------- | -------- | --------------------------------------------------------- |
| [step-1-analyze.md](step-1-analyze.md)       | 1        | Responsive variants, prop-state overlays, promotion rules |
| [step-2-build.md](step-2-build.md)           | 2        | Responsive builds, full Tailwind table, color chain       |
| [step-3-screenshot.md](step-3-screenshot.md) | 3        | Rarely needed                                             |
| [step-4-compare.md](step-4-compare.md)       | 4a/4b/4c | Detailed rejection handling, sizing edge cases            |
| [step-5-fix-loop.md](step-5-fix-loop.md)     | 5        | Full discrepancy table, rebind sweep internals            |
| [step-6-track.md](step-6-track.md)           | 6        | Folder resolution rules, legacy file migration            |
| [step-7-return.md](step-7-return.md)         | 7        | Canonical result schema details                           |

### Script references

> Placeholders like `{skillRoot}` resolve from `state.json → config`.

- `check-instances.js` — lives at `{skillRoot}/scripts/check-instances.js`
- `check-prereqs.js` — lives at `{skillRoot}/scripts/check-prereqs.js`
- `compare.js` — lives at `{skillRoot}/scripts/compare.js`
- `inspect-styles.js` — lives at `{skillRoot}/scripts/inspect-styles.js`
- `resolve-color.js` — lives at `{skillRoot}/scripts/resolve-color.js`

---

## Workflow Step Instructions

Each step has a **condensed quick reference** (default) and a **full reference** (for complex cases). Start with the quick files. Only escalate to the full file when:
- The component has responsive-breakpoint variants or prop-driven structural states
- The build fails on the first iteration and you need edge-case guidance
- The component is a page-level layout with parent-context promotion

### Default (quick references — use these first):

| Step | File                                     | Phase    | What it does                                                                 |
| ---- | ---------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| 1    | [step-1-quick.md](step-1-quick.md)       | Analyze  | Read source + reference material, inspect live component, write code.json    |
| 2    | [step-2-quick.md](step-2-quick.md)       | Build    | Create component in Figma via `use_figma`, enumerate instances, write figma.json |
| 3    | [step-3-quick.md](step-3-quick.md)       | Build    | Capture the Figma result via `get_screenshot`                                |
| 4    | [step-4-quick.md](step-4-quick.md)       | Compare  | Instance gate + sizing check + pixel diff → verdict                          |
| 5+6+7| [step-5-quick.md](step-5-quick.md)       | Fix/Done | Fix loop + rebind sweep + track + return result                              |

### Full references (escalate only when needed):

| Step | File                                       | When to use                                                                  |
| ---- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| 1    | [step-1-analyze.md](step-1-analyze.md)     | Responsive variants, prop-state overlays, parent-context promotion           |
| 2    | [step-2-build.md](step-2-build.md)         | Responsive variants, full Tailwind table, color resolution chain             |
| 3    | [step-3-screenshot.md](step-3-screenshot.md)| Rarely needed                                                               |
| 4    | [step-4-compare.md](step-4-compare.md)     | Instance-usage gate details, sizing edge cases, rejection handling           |
| 5    | [step-5-fix-loop.md](step-5-fix-loop.md)   | Full discrepancy patterns table, detailed fix examples, rebind internals     |
| 6    | [step-6-track.md](step-6-track.md)         | Folder resolution rules, legacy file migration                               |
| 7    | [step-7-return.md](step-7-return.md)       | Canonical result schema details                                              |

---

## Error Handling

| Scenario                                           | Action                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `componentName` in `preExistingComponents`         | Write `status: "needs_authorization"`, stop immediately                   |
| Missing child components (prereq gate fails)       | Write `status: "rejected"` with `missingChildren`, stop                   |
| `use_figma` API error during build                 | Write `status: "failed"` with error message, stop                         |
| No app screenshot (`app.png` missing)              | Skip comparison, write `status: "no_app_reference"`, proceed to Step 5R   |
| Fix loop reaches 3 iterations without match        | Set `status: "partial_match"`, proceed to Step 6 — do not retry           |
| `use_figma` API error during fix loop              | Record error in result, return current best status, proceed to Step 6     |
| Fix loop would edit a `preExistingComponents` node | Stop fix loop, surface in result, let orchestrator/user decide            |
| `color-index.json` missing and not regenerable     | Skip Step 5R, set `rebindSweep: "skipped_no_index"`, proceed to Step 6    |

Never fail silently. Every error or skip must appear in the final result file.
