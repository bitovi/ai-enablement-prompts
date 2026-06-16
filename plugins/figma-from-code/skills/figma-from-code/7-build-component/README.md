# Per-Component Build & Review (Phase 3 Inner Loop)

This folder contains two sub-skills and a shared step library that together implement the full per-component build-and-review pipeline. The **Build** sub-skill (7a) analyzes source code and constructs the Figma component. The **Review/Fix** sub-skill (7b) compares the result against the live app, iterates fixes, and writes the final outcome. The tier builder (6-build-tier) calls this pair for every component in every tier during Phase 3.

## What It Does

Takes a single component's source code, builds it as a Figma component (with variants when applicable), screenshots the result, compares it pixel-by-pixel against the app screenshot, and loops through fixes until the component meets visual fidelity thresholds — or exhausts its retry budget.

If a component already exists in Figma before this run, the pipeline writes a `needs_authorization` status and stops. No existing component is modified without explicit user approval.

## The Build Sub-skill (Steps 1–3)

Defined in `7a/SKILL.md`. Handles analysis, construction, and initial screenshot.

### Step 1: Analyze

Reads the component source code and inspects the live component in the browser. Determines layout direction, sizing intent (fill/fixed/hug), spacing, colors, typography, icon and image usage with size mappings, and text content from pre-captured `text.json`. Runs `inspect-styles.js` to capture live computed styles.

Identifies variant axes from variant libraries (cva, tailwind-variants, etc.), CSS pseudo-states, responsive breakpoints, and prop-driven structural states such as overlays and modals. Checks which child components can be reused as instances from already-built components, and verifies all child components exist before proceeding.

Produces `.figma/code.json` — the structural analysis that drives everything downstream.

### Step 2: Build

Creates the Figma component via `use_figma`. Resolves all child component node IDs upfront (the instance manifest). For simple components, creates a single component node. For components with variants, creates a component set with inline variant data, base styles, and per-combo overrides.

Maps Tailwind/CSS properties to Figma equivalents — layout mode, alignment, spacing, border-radius, typography, and sizing. Resolves colors and binds them to Figma variables by reverse-matching from `color-index.json`. Runs `fixSizing()` after every build to correct auto-layout sizing. Writes `.figma/figma.json` as a tracking file.

### Step 3: Screenshot

Captures the built Figma component via `get_screenshot`. For component sets, screenshots the resolved default variant rather than the set itself. Writes a handoff file (`{ComponentName}-built.json`) containing status, node ID, and metadata.

## The Review/Fix Sub-skill (Steps 4–7)

Defined in `7b-review-fix-component/SKILL.md`. Handles comparison, iterative fixes, tracking, and result writing.

### Step 4: Compare

Runs three checks in sequence:

- **Instance usage (4a)** — verifies child instances match between `code.json` and `figma.json`. This is a hard gate; mismatches block further progress.
- **Sizing sanity (4b)** — verifies fill/fixed/hug intent in the built component matches the analysis.
- **Pixel diff (4c)** — runs `compare.js` to produce a match percentage and diff image. Thresholds: ≥90% is a match, 75–90% is a minor diff, below 75% is a mismatch. Border ring comparison uses a separate ≥85% threshold.

### Step 5: Fix Loop

Iterates up to three times. Each iteration diagnoses discrepancies using the diff image, app screenshot, Figma screenshot, and source code, then applies targeted fixes via `use_figma`. After each fix, re-enumerates instances, re-screenshots, and re-compares. Common fixes include spacing adjustments, color corrections, missing text, and wrong sizing mode.

A **rebind sweep** (Step 5R) always runs regardless of match status. It walks the entire component tree, finds hardcoded solid fills and strokes not bound to variables, matches them against `color-index.json` with a tolerance of 3, and binds matches. Unmatched colors get new variables in a "Discovered" collection.

### Step 6: Track

Verifies both `.figma/code.json` and `.figma/figma.json` exist and are structurally valid. Refreshes the `updatedAt` timestamp in each.

### Step 7: Return

Writes the final result to `build-results/{ComponentName}.json` using a canonical schema: status (`success`, `partial_match`, `no_app_reference`, `needs_authorization`, `rejected`, or `failed`), node ID, variants, comparison data (verdict, match percentage, border match percentage, iteration count, fixes applied), and tracking file paths.

## Acceptance Criteria

A component passes when its pixel-diff match percentage is **≥ 90%** and its border ring match percentage is **≥ 85%**. Components that meet these thresholds after up to three fix iterations receive `success` status. Those between the thresholds receive `partial_match`.

## Step Files

The `steps/` directory contains shared instructions used by both sub-skills:

| File | Purpose |
|------|---------|
| `step-1-analyze.md` | Full analysis instructions |
| `step-2-build.md` | Figma build instructions with Tailwind mapping |
| `step-3-screenshot.md` | Screenshot capture |
| `step-4-compare.md` | Three-part comparison |
| `step-5-fix-loop.md` | Fix iterations and rebind sweep |
| `step-6-track.md` | Tracking file finalization |
| `step-7-return.md` | Result writing |
| `figma-utils.md` | Shared utilities including `fixSizing()` and Tailwind-to-Figma mapping table |

Key scripts: `check-instances.js`, `check-prereqs.js`, `compare.js`, `inspect-styles.js`.
