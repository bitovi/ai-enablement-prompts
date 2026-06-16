# Design Token Setup (Phase 1)

Converts a project's CSS custom properties and Tailwind config into Figma variable collections, then builds the lookup maps that downstream phases use to bind colors and spacing to variables instead of hardcoding values.

## What It Does

This phase bridges the gap between a codebase's design tokens (CSS custom properties, Tailwind extensions) and Figma's variable system. It creates three variable collections in Figma, extracts a complete CSS-to-Figma variable ID map, and pre-computes resolved color values so that build agents can automatically bind the correct variable to any color they encounter.

## How It Works

1. **Token Discovery** — Reads the CSS file and sorts every custom property into one of three groups:
   - **Palette colors** — raw color scales (e.g. `--gray-50` through `--gray-950`)
   - **Semantic tokens** — aliases like `--background` or `--primary` that reference palette colors
   - **Spacing / sizing values** — border-radius, spacing, and gap values

   If a Tailwind config is provided, additional color mappings and spacing extensions are merged in.

2. **Variable Collection Creation** — Creates three Figma variable collections via the MCP:
   - **Palette** — raw color values, hidden from property pickers (used only for aliasing)
   - **Semantic** — contextual tokens that alias palette colors, scoped by usage (fill, text, stroke)
   - **Spacing** — float values for border-radius and spacing with appropriate scopes

   Every variable receives a WEB code syntax that matches its CSS variable name (`var(--name)`).

3. **Variable Lookup Map** — Queries all Figma variables and writes a CSS variable name → Figma variable ID map to `variables.json`.

4. **Color Resolution** — Runs a script to pre-compute every CSS variable color as an sRGB value, written to `resolved-colors.json`.

5. **Reverse Color Index** — Joins the variable map and resolved colors into an RGB → Figma variable reverse index (`color-index.json`). Build agents use this to rebind any hardcoded color to the correct variable.

## Inputs

| Input | Required | Description |
|---|---|---|
| Figma file key + MCP connection | Yes | Target Figma file for variable creation |
| CSS file path | Yes | The file containing CSS custom properties / design tokens |
| Tailwind config path | No | Skipped if null; provides extra color and spacing mappings |
| Existing collection info | Yes | From Phase 0a discovery — determines whether collection creation is skipped |

## Outputs

All files are written to `.temp/figma-from-code/`:

| File | Description |
|---|---|
| `variables.json` | CSS variable name → Figma variable ID map (includes scopes and collection info) |
| `resolved-colors.json` | Pre-computed sRGB values for all CSS variables |
| `color-index.json` | Reverse RGB → Figma variable index for color rebinding |
| `tokens-summary.json` | Compact summary passed to the orchestrator |

## Why It Matters

Every component built in Phase 3 needs to bind colors and spacing to Figma variables rather than hardcoding hex values. This phase creates those variables and provides the lookup maps that make variable binding possible. The reverse color index is especially important during the fix loop — it powers the "rebind sweep" that automatically finds and corrects any hardcoded colors missed during initial builds.

## Notes

- **Key scripts:** `resolve-colors.js` and `resolve-color.js` — do not modify these.
- **Skip / Resume:** The entire phase is skipped if all four output files already exist. Collection creation alone is skipped if all three collections are already present in the Figma file.
- **Runs after** Phase 0 (discovery) and **before** any Figma structure or components are created.
