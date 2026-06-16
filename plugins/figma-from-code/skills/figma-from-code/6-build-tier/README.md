# Component Builds (Phase 3)

Builds every Figma component from pre-captured reference material, working tier-by-tier from the simplest leaf components up to the most complex compositions. Each component goes through a build-and-review loop that compares the Figma output against real app screenshots and iterates toward visual fidelity.

This is the main build phase — it runs after all setup, token extraction, icon discovery, and screenshot pre-capture are complete.

## What It Does

Transforms analyzed source code into a complete Figma component library. Components are organized into tiers by dependency depth: tier 1 holds primitives with no child component dependencies, tier 2 holds components that only depend on tier 1, and so on. Each built component reuses previously built components as Figma instances rather than recreating them, producing a properly structured design system.

## How It Works

### Icon Preamble

Before any component tier runs, a dedicated icon preamble step builds all Lucide icons and SVG assets as Figma components (e.g., `Icon/Check`, `Asset/AppLogoSvg`). These are created from the SVG data extracted during Phase 0b, built in batches using `createNodeFromSvg()`, resized to 24×24 for Lucide icons, and placed in the Icons frame.

This runs first so that every subsequent component build can instantiate icons rather than embedding raw SVG data.

### Tiered Component Builds

Tiers run sequentially — tier 1 completes before tier 2 begins — because each tier depends on components from all previous tiers. Within a tier, components are built one at a time.

For each tier, the orchestrator:

1. Creates a tier container frame on the Components page (e.g., "Tier 1 — Primitives")
2. Filters out components that are already built, either from a prior run or from components that already existed in the Figma file
3. Runs the full build-and-review pipeline for each remaining component

### The Build-and-Review Loop

Each component passes through a multi-step pipeline:

- **Analyze** — Reads the component source code and identifies layout, sizing, variants, icon usage, child component instances, and text content
- **Build** — Creates the Figma component (or component set with variants) via the Figma API, binding colors to variables and using instances of already-built child components
- **Screenshot** — Captures the newly built Figma component
- **Compare** — Pixel-diffs the Figma screenshot against the pre-captured app screenshot, checking against thresholds (≥90% overall match, ≥85% border match)
- **Fix Loop** — If the comparison falls below thresholds, diagnoses the discrepancies and applies targeted fixes, then re-screenshots and re-compares (up to 3 iterations)
- **Rebind Sweep** — Walks the component tree to find any hardcoded colors and binds them to the correct Figma variables from the token system
- **Track** — Writes `.figma/figma.json` and `.figma/code.json` tracking files next to the source code, linking source files to their Figma node IDs
- **Return** — Records the final result (success, partial_match, or failed) with match percentages

### Between Tiers

After each tier completes, the orchestrator merges newly created node IDs into state, spot-checks the tier with a screenshot, reports comparison results, and checkpoints with the user before proceeding to the next tier.

Components that existed in the Figma file before this run are never modified without explicit user authorization. They are skipped during builds and flagged if changes are needed.

**Library component handling:**

- Lucide icons and SVG assets are skipped (already built in the icon preamble)
- Router primitives like `Link` are built as a nav link component set with Default/Active variants

## Inputs

- Completed prior phases — component map, icon discovery, token extraction, file structure, and pre-captured screenshots
- `state.json` populated with build order, tier assignments, Figma node IDs, and icon data
- Pre-captured app screenshots in `.temp/figma-from-code/screenshots/`

## Outputs

All outputs are written to `.temp/figma-from-code/`:

| Output | Description |
|--------|-------------|
| `build-results/{ComponentName}.json` | Per-component result with status, node ID, match percentages, and variant info |
| `build-tier{N}.json` | Tier summary with completed/failed component lists and the tier frame node ID |
| `icon-preamble-results.json` | Results from the icon and asset preamble step |
| `{componentsRoot}/{Component}/.figma/figma.json` | Tracking file linking source code to Figma nodes |
| `{componentsRoot}/{Component}/.figma/code.json` | Structural analysis of the component used during builds |

## Why It Matters

This is the core of the pipeline — where the actual Figma design system gets built. The tiered approach guarantees that dependencies are always available before they are needed. The pixel-diff comparison loop with fix iterations drives visual fidelity toward matching the real application. The variable rebind sweep ensures all colors connect to the design token system rather than sitting as hardcoded values.

**Sub-skills:**

- `7-build-component/7a/` — Build steps (analyze, build, screenshot)
- `7-build-component/7b-review-fix-component/` — Review/fix steps (compare, fix loop, track, return)
- `6-build-tier/icon-preamble/` — Icon and asset preamble
