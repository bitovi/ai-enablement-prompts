# Skill: Build a Figma Component from Code (Steps 1–3)

> **Build phase only.** Analyzes the component source, creates the Figma node, and captures the initial screenshot. Called by `figma-from-code` Phase 3 (via the tier agent) or standalone. Review/fix is handled by the sibling `7b-review-fix-component` skill.
>
> **Figma MCP tools available:** `use_figma`, `get_screenshot`.

## Required Inputs

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
| `figmaVariant`     | Variant properties that match the app rendering (passed through to the `-built.json` handoff for use by `7b-review-fix-component`)                                                                                                                                                              |

---

## Build Handoff File Schema

Written to `.temp/figma-from-code/build-results/{componentName}-built.json` after Step 3. This is the handoff consumed by `7b-review-fix-component`.

```json
{
  "componentName": "Button",
  "status": "built | needs_authorization | rejected | failed",
  "nodeId": "123:45",
  "screenshotNodeId": "123:46",
  "type": "COMPONENT_SET | COMPONENT",
  "variants": [{ "name": "Variant=primary, Size=regular", "nodeId": "123:46" }],
  "figmaScreenshot": ".temp/figma-from-code/screenshots/Button/figma.png",
  "figmaVariant": { "Variant": "primary", "State": "Default" },
  "sourceDir": "<source-dir>/components/Button",
  "preExistingTouched": [],
  "missingChildren": []
}
```

`status` values:

- `built` — Steps 1–3 completed; handoff is ready for `7b-review-fix-component`
- `needs_authorization` — `componentName` is in `preExistingComponents`; skip review phase
- `rejected` — missing child components; `missingChildren` list is populated; skip review phase
- `failed` — Figma API error during Steps 2–3; skip review phase

## Variant Strategy

Variants are computed by Step 1b — they are **not** a caller input. See [../step-1-analyze.md §1b](../step-1-analyze.md) for the full extraction algorithm (variant library definitions, CSS pseudo-states, responsive breakpoints, prop-driven structural states), the representative set algorithm, and the budget guardrail (cap: 30 combos).

---

## Pre-Existing Components Rule

Before doing any work that resolves to a node ID in `preExistingComponents`, **stop**. That node existed in Figma before this run; modifying it requires explicit user authorization per the orchestrator skill's "Pre-Existing Components Rule".

Concretely:

- If `componentName` itself maps to a node in `preExistingComponents`: write `status: "needs_authorization"` and `preExistingTouched: ["<name>"]` to the `-built.json` handoff and return immediately. Do not call `use_figma`.
- If a _child_ you would instantiate is in `preExistingComponents`: **instancing it is fine** — that's reuse, not modification. Modifying its master is not.

This rule overrides Steps 2–3 of the workflow when in conflict. Full detail is in [../step-1-analyze.md §Pre-Existing Components Rule](../step-1-analyze.md).

---

## Execution Mode

The tier agent runs this build skill for each component sequentially. All steps execute **inline** — no further agent dispatching.

After this skill completes, the tier agent calls `7b-review-fix-component` with the `-built.json` handoff as its primary input. If `status` is not `built`, the tier agent skips the review phase and writes the final result directly from the handoff.

---

## Inline Workflow

All steps run inline within a single agent. There is no subagent dispatching — the agent executes every step itself.

```
Steps 1-3 (all inline):
  1. Analyze → read source + reference material, write .figma/code.json
  2. Build   → create Figma component via use_figma, write .figma/figma.json
  3. Screenshot → capture Figma result via get_screenshot
```

### Flow

```
1.  Execute Step 1 (Analyze) → produces code.json
1a. If result shows "needs_authorization" → write -built.json with status "needs_authorization", stop
1b. If result shows "rejected"            → write -built.json with status "rejected" + missingChildren, stop
2.  Read code.json, execute Step 2 (Build)
    Post-Step 2 invariant: componentNodeId must be a non-null string before proceeding
3.  Execute Step 3 (Screenshot) → produces figma.png
4.  Write -built.json with status "built", nodeId, screenshotNodeId, figmaScreenshot, variants
```

### Step reference files

Detailed instructions for each step live in the parent directory and in `../prompts/`:

- **[../prompts/analyze.md](../prompts/analyze.md)** — Step 1 inputs and instructions

---

## Workflow

Each step has its own detailed file in the parent directory (`../`).

| Step | File                                               | Phase   | What it does                                                                                  |
| ---- | -------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| 1    | [../step-1-analyze.md](../step-1-analyze.md)       | Analyze | Read source + reference material, inspect live component, write `.figma/code.json`            |
| 2    | [../step-2-build.md](../step-2-build.md)           | Build   | Create the component in Figma via `use_figma`, enumerate instances, write `.figma/figma.json` |
| 3    | [../step-3-screenshot.md](../step-3-screenshot.md) | Build   | Capture the Figma result via `get_screenshot`                                                 |

> Steps 4–7 (compare, fix loop, track, return) are handled by `../7b-review-fix-component/SKILL.md`.

---

## fixSizing() — Mandatory After Every Build

The `fixSizing()` function definition, construction-time sizing rules, and anti-patterns live in [../step-2-build.md](../step-2-build.md). Call it on every component and every child component before appending to the parent frame.

---

## Common Pitfalls

| Pitfall                                                        | Prevention                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| All components appear as thin strips                           | `fixSizing()` was not called — see [../step-2-build.md](../step-2-build.md)             |
| Rendering a design-system child as plain text or a local frame | Caught by Step 4a in `7b-review-fix-component` — always instance from `builtComponents` |

---

## Error Handling

Step-specific error cases are documented in each step file. Global rules:

| Scenario                                          | Action                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `componentName` is in `preExistingComponents`     | Write `-built.json` with `status: "needs_authorization"`, stop immediately                 |
| Any required child missing from `builtComponents` | Write `-built.json` with `status: "rejected"` and `missingChildren` list, stop immediately |
| `use_figma` API error during Steps 2–3            | Write `-built.json` with `status: "failed"`, include error message, stop                   |
| No app screenshot available                       | Proceed normally — screenshot absence is handled in `7b-review-fix-component`              |

Never fail silently. Every error or skip must appear in the `-built.json` handoff.
