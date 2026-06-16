# File Structure Setup (Phase 2)

Creates the Figma file's page skeleton, foundations documentation frames, and container frames that all later phases build into.

Runs after token setup (Phase 1) and before screenshots or component builds.

## What It Does

### Pages

Three pages are added to the Figma file:

- **🎨 Foundations** — color swatches, type specimens, and spacing scale
- **📦 Components** — where all component sets are built in Phase 3
- **📄 Screens** — where assembled page screens are built in Phase 4

### Foundations Page Content

Three documentation frames are built on the Foundations page:

- **Color Palette** — dynamically generated swatches bound to Palette collection variables, grouped by color family (gray, teal, etc.) and showing steps from 50 to 950
- **Semantic Colors** — swatches for contextual tokens (background, primary, border, sidebar, etc.) bound to Semantic collection variables
- **Spacing Scale** — visual representations of spacing values and border-radius values from the Spacing collection

### Container Frames

- **Icons** frame on the Components page (wrapping horizontal layout for icon components)
- **Screens** container frame on the Screens page (horizontal layout with spacing)

Tier frames for components are _not_ created here — they are created on-demand when each tier build starts in Phase 3.

### Verification

Screenshots are taken after setup completes to confirm the structure looks correct.

## How It Works

1. Reads the list of existing pages from the Figma file (collected in Phase 0a).
2. Creates any missing pages via MCP.
3. Populates the Foundations page by generating color swatch, semantic color, and spacing frames — each bound to the matching variable collection from Phase 1.
4. Creates the Icons and Screens container frames on their respective pages.
5. Records every page and frame node ID into `structure-summary.json`.
6. Takes screenshots for visual verification.

The step is idempotent. If `structure-summary.json` already exists and all referenced node IDs are verified to still exist in Figma, the phase is skipped entirely. If some IDs are missing, only the missing pages and frames are recreated.

## Inputs

| Input | Source |
|---|---|
| Figma file key and MCP connection | Pipeline configuration |
| Variable collections (Palette, Semantic, Spacing) | Phase 1 (token setup) |
| List of existing Figma pages | Phase 0a (analysis) |

## Outputs

| Output | Location | Consumed By |
|---|---|---|
| `structure-summary.json` | `.temp/figma-from-code/` | Orchestrator and all subsequent phases |
| Pages, documentation frames, and container frames | Figma file | Phases 3 and 4 |

The summary file contains all page and container frame node IDs so later phases know exactly where to place their output.

## Why It Matters

This phase creates the organizational skeleton for the entire Figma file. Components are placed into tier frames on the Components page, screens go into the Screens container, and the Foundations page serves as living documentation of the design system's tokens. Without the recorded node IDs from this step, subsequent phases would have nowhere to write their output.
