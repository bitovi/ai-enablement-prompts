---
name: figma-setup-variables
description: Extract design tokens from the project's CSS and Tailwind config and create Figma variable collections. Run this before figma:figma-generate-library so Phase 1 (tokens) is already done.
---

# Skill: Set Up Figma Variables from Code

Extracts design tokens from the project's CSS and Tailwind configuration and creates Figma variable collections. This is Phase 1 of the code-to-Figma workflow — run it first so the library build can skip straight to components.

## When to Use

Before running `figma:figma-generate-library` on a fresh Figma file, or when design tokens have changed and Figma variables need syncing.

## Required Inputs

| Input | Description |
|-------|-------------|
| `fileKey` | The Figma file key |
| `cssPath` | Path to the main CSS file containing custom properties (e.g., `src/index.css`) |
| `tailwindConfigPath` (optional) | Path to the Tailwind config file (e.g., `tailwind.config.js`) |

## Token Sources

| File | What it contains |
|------|-----------------|
| `{cssPath}` | All CSS custom properties — palette colors and semantic aliases |
| `{tailwindConfigPath}` | Color names mapped to CSS variables, border radius extensions (if using Tailwind) |

## Token Discovery Process

Rather than hardcoding token values, extract them dynamically from the project files:

1. **Read the CSS file** and parse all `--variable-name: value` declarations from `:root` or theme blocks
2. **Categorize variables** into:
   - **Palette colors**: Raw color scales (e.g., `--gray-50` through `--gray-950`) — group by color family
   - **Semantic tokens**: Aliases that reference palette colors or define contextual colors (e.g., `--background`, `--primary`, `--foreground`)
   - **Spacing/sizing**: Numeric values for radius, spacing, gaps
3. **If Tailwind config exists**, read it to discover:
   - Color name mappings to CSS variables
   - Border radius extensions
   - Spacing scale extensions

## Collections to Create

### 1. `Palette` (mode: `Value`)
Raw color scales extracted from CSS — scopes set to `[]` (hidden from property pickers, used only for aliasing).

Groups are discovered dynamically from CSS variable naming patterns (e.g., `--{color}-{step}` where step is 50→950).

### 2. `Semantic` (mode: `Light`)
Alias tokens that components bind to — scopes set appropriately based on usage:

| Token pattern | Scope |
|--------------|-------|
| `background`, `card/*`, `popover/*`, `sidebar/*` fills | `FRAME_FILL, SHAPE_FILL` |
| `foreground`, `*-foreground` | `TEXT_FILL` |
| `border/*`, `ring/*`, `outline/*` | `STROKE_COLOR` |

Where a semantic token's value maps to a palette variable, create an alias reference. Where it's a standalone hex value, use a direct color.

### 3. `Spacing` (mode: `Value`)
Float variables extracted from CSS or Tailwind config. Radius scope: `CORNER_RADIUS`. Spacing scope: `GAP, WIDTH_HEIGHT`.

## How to Execute

Load `figma:figma-use` (mandatory), then write a `use_figma` script that:
1. Creates each collection with the correct mode name
2. Creates variables in the correct order (Palette first, then Semantic aliases)
3. Sets `scopes` explicitly on every variable — never leave as `ALL_SCOPES`
4. Sets WEB code syntax: `var(--variable-name)` matching the CSS variable name

Work in batches of ~50 variables per call to stay under the incremental limit.

## Feeds Into

`figma:figma-generate-library` Phase 1. Once this runs, tell the library skill that token collections already exist so it can proceed directly to Phase 2 (file structure) and Phase 3 (components).
