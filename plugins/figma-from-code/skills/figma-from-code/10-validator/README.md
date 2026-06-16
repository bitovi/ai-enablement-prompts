# Figma Rebuild Validator

Validates the output of figma-from-code by screenshotting each component in its live app context and comparing it against the matching Figma variant. Produces a structured report with side-by-side screenshots and match percentages.

This is a utility skill, not a pipeline phase. Phase 5 (`9-validate/`) invokes it to perform the actual validation work. It can also be used standalone to audit whether Figma components match their React implementations.

## What It Does

Builds a component inventory from Figma, resolves each component set to the specific variant the app renders, captures paired screenshots (app + Figma), runs pixel diffs, performs structural checks, and writes a comparison report.

## How It Works

### Component Inventory

Reads `state.json` for the Figma file key, then queries Figma for all components and component sets on the Components page. Each component is classified using the Component App Map (built dynamically from `component-map.json`) as one of: **app-visible**, **requires-interaction**, or **not-visible-in-app**. Verifies the dev server is running before proceeding.

### Variant Resolution

This is the key step for accurate comparisons. Screenshotting a component set node returns an image of ALL variants tiled together — not the single variant the app renders. This phase resolves each component set to the specific child variant node that matches what the app shows (e.g., Button → Variant=primary, State=Default).

Resolution uses exact match first, then partial match fallback, then falls back to the first child. The resolved variant node ID is stored for use during screenshot capture.

### Screenshot Comparison

Processes components sequentially by tier. For each component:

- Checks for pre-built app screenshots from Phase 2.5
- Captures a fresh app screenshot if needed (using the Component App Map's URL, selector, and click/hover actions)
- Runs a structural QA audit on the Figma component
- Captures a Figma screenshot at scale:1 using the resolved variant node, not the set
- Runs pixel diff via `compare.js`

### Structural Checks

Validates file-level properties via `use_figma`:

- Variable collections exist and are populated
- Expected pages exist
- Screen frame sizes match the target body size

### Report Generation

Writes `.temp/figma-validation/report.md` containing:

- Summary statistics (match / minor_diff / mismatch counts)
- Per-component comparison table with match percentages
- Side-by-side screenshot grids

When invoked by the Phase 5 orchestrator, a **fix loop** runs up to 3 iterations for mismatched components built during the current run — identifying visual defects, applying fixes in Figma, re-screenshotting, and updating the report.

## Thresholds

| Metric | Match | Minor Diff | Mismatch |
|--------|-------|------------|----------|
| Overall | ≥ 90% | 75–90% | < 75% |
| Border ring | ≥ 85% | — | < 85% |

## Inputs

- **state.json** — Figma file key and pipeline state
- **component-map.json** — drives the Component App Map (URL, CSS selector, click/hover actions, Figma variant properties per component)
- **Running dev server** — serves the live app for screenshot capture
- **Figma file** — source of truth for component/variant structure

## Outputs

- **`.temp/figma-validation/report.md`** — full validation report with comparison data and screenshots
- **Screenshot pairs** — app and Figma screenshots for each compared component

## Standalone Usage

Run the validator outside the pipeline to audit an existing Figma file against its React implementation. Requires a running dev server, a populated `component-map.json`, and a `state.json` with the Figma file key. The validator builds the component inventory, captures screenshot pairs, and writes the same structured report.

**Key scripts:** `compare.js` (pixel diff), `screenshot.js` (app screenshots).
