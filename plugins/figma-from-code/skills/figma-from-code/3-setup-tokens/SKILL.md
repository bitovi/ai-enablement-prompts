# Skill: Setup Tokens (Phase 1)

Creates Figma variable collections from the project's CSS and Tailwind tokens, extracts the CSS-variable-to-Figma-variable-ID map, and pre-computes all CSS colors as sRGB values. Runs as a subagent dispatched by the orchestrator, or standalone when tokens change.

## When to Use

- When `figma-from-code` orchestrator reaches Phase 1
- Standalone to recreate variable collections and color maps after token changes

## Prerequisites

Load `figma:figma-use` (mandatory) before any `use_figma` call.

## Required Inputs

| Input                 | Description                                          | Source                    |
| --------------------- | ---------------------------------------------------- | ------------------------- |
| `fileKey`             | Figma file key                                       | State ledger or caller    |
| `existingCollections` | List of variable collection names that already exist | Phase 0a Figma inspection |

> Placeholders like `{cssPath}`, `{tailwindConfigPath}`, and `{skillRoot}` resolve from `state.json → config`.

## Token Sources

| File                    | What it contains                                                        |
| ----------------------- | ----------------------------------------------------------------------- |
| `{cssPath}`             | All CSS custom properties — palette colors and semantic aliases         |
| `{tailwindConfigPath}`  | Color names mapped to CSS variables, border-radius extensions (optional)|

## Output Files

| File                                         | Contents                                                  | Consumed by                            |
| -------------------------------------------- | --------------------------------------------------------- | -------------------------------------- |
| `.temp/figma-from-code/variables.json`       | CSS var name -> Figma variable ID map (with scopes)        | Phase 3 build subagents                |
| `.temp/figma-from-code/resolved-colors.json` | Pre-computed sRGB values for all CSS variables             | Phase 3 build subagents                |
| `.temp/figma-from-code/color-index.json`     | Reverse RGB -> Figma variable index (for rebind sweeps)    | Phase 3 fix loops, `resolve-color.js`  |
| `.temp/figma-from-code/tokens-summary.json`  | Small summary for the orchestrator                         | Orchestrator only                      |

## Workflow

### 1. Token Discovery

Rather than hardcoding token values, extract them dynamically from the project files:

1. **Read `{cssPath}`** and parse all `--variable-name: value` declarations from `:root` or theme blocks
2. **Categorize variables** into:
   - **Palette colors**: Raw color scales (e.g., `--gray-50` through `--gray-950`) — group by color family
   - **Semantic tokens**: Aliases that reference palette colors or define contextual colors (e.g., `--background`, `--primary`, `--foreground`)
   - **Spacing/sizing**: Numeric values for radius, spacing, gaps
3. **If `{tailwindConfigPath}` is not null**, read it to discover color name mappings to CSS variables, border-radius extensions, and spacing scale extensions

### 2. Create Variable Collections

Skip this step if all three collections (`Palette`, `Semantic`, `Spacing`) already exist in `existingCollections`.

Write a `use_figma` script to create the three collections. Work in batches of ~50 variables per call to stay under the incremental limit. Create Palette first, then Semantic (so alias references resolve correctly).

#### Collection: `Palette` (mode: `Value`)

Raw color scales extracted from CSS. Set `scopes` to `[]` on every variable (hidden from property pickers — used only for aliasing by Semantic). Groups are discovered dynamically from CSS variable naming patterns (`--{color}-{step}` where step is 50→950).

#### Collection: `Semantic` (mode: `Light`)

Alias tokens that components bind to. Set `scopes` based on usage:

| Token pattern                                         | Scope                    |
| ----------------------------------------------------- | ------------------------ |
| `background`, `card/*`, `popover/*`, `sidebar/*` fills | `FRAME_FILL, SHAPE_FILL` |
| `foreground`, `*-foreground`                          | `TEXT_FILL`              |
| `border/*`, `ring/*`, `outline/*`                     | `STROKE_COLOR`           |

Where a semantic token's value maps to a palette variable, create an alias reference. Where it's a standalone hex value, use a direct color.

#### Collection: `Spacing` (mode: `Value`)

Float variables from CSS or Tailwind config. Set `CORNER_RADIUS` scope for radius variables; `GAP, WIDTH_HEIGHT` scope for spacing variables.

For all variables in all collections, set WEB code syntax to `var(--variable-name)` matching the CSS variable name exactly.

### 3. Extract Variable Lookup Map

Run this `use_figma` call to build the CSS-variable-name to Figma-variable-ID map:

```javascript
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const map = {};
for (const col of collections) {
  for (const varId of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(varId);
    if (v.codeSyntax && v.codeSyntax.WEB) {
      map[v.codeSyntax.WEB] = {
        id: v.id,
        name: v.name,
        collectionName: col.name,
        resolvedType: v.resolvedType,
        scopes: v.scopes,
      };
    }
  }
}
return JSON.stringify(map);
```

Write the returned JSON to `.temp/figma-from-code/variables.json`.

### 4. Resolve CSS Colors

Run the color resolution script to pre-compute all CSS variable colors as sRGB:

```bash
node {skillRoot}/scripts/resolve-colors.js \
  {cssPath} \
  [--tailwind {tailwindConfigPath}] \
  --output .temp/figma-from-code/resolved-colors.json
```

> Omit the `--tailwind` flag entirely when `config.tailwindConfigPath` is `null`.

### 4b. Generate Reverse Color Index

Join `variables.json` and `resolved-colors.json` into the RGB-to-variable reverse index used by build agents and fix-loop rebind sweeps:

```bash
node {skillRoot}/scripts/resolve-color.js --dump-index \
  --output .temp/figma-from-code/color-index.json
```

The index is keyed by 8-bit `"r,g,b"` strings, each mapping to the candidate Figma variables that resolve to that color. Build agents inline it into `use_figma` scripts (the plugin sandbox has no filesystem access); single lookups go through `resolve-color.js <class|var|color>` instead of reading the JSON into context.

### 5. Write Summary

Count the entries in `variables.json` and `resolved-colors.json`, then write the summary:

```bash
node -e "
  const vars = JSON.parse(require('fs').readFileSync('.temp/figma-from-code/variables.json','utf-8'));
  const colors = JSON.parse(require('fs').readFileSync('.temp/figma-from-code/resolved-colors.json','utf-8'));
  const index = JSON.parse(require('fs').readFileSync('.temp/figma-from-code/color-index.json','utf-8'));
  const varCount = Object.keys(vars).length;
  const colorCount = Object.keys(colors.cssVariables || {}).length;
  const indexCount = Object.keys(index.index || {}).length;
  const collections = [...new Set(Object.values(vars).map(v => v.collectionName))];
  const summary = { collections, variableCount: varCount, resolvedColorCount: colorCount, colorIndexCount: indexCount, variableMapPath: '.temp/figma-from-code/variables.json', resolvedColorsPath: '.temp/figma-from-code/resolved-colors.json', colorIndexPath: '.temp/figma-from-code/color-index.json' };
  require('fs').writeFileSync('.temp/figma-from-code/tokens-summary.json', JSON.stringify(summary, null, 2));
  console.log('Tokens summary: ' + collections.length + ' collections, ' + varCount + ' variables, ' + colorCount + ' resolved colors, ' + indexCount + ' indexed color keys');
"
```

### 6. Report

```
Phase 1 complete:
- {collections.length} variable collections: {collection names}
- {variableCount} CSS variables mapped to Figma variable IDs
- {resolvedColorCount} CSS colors pre-computed as sRGB
- {colorIndexCount} reverse color-index keys for RGB -> variable matching
```

## Skip / Resume

Skip the entire phase if all four output files exist and are non-empty:

- `.temp/figma-from-code/variables.json`
- `.temp/figma-from-code/resolved-colors.json`
- `.temp/figma-from-code/color-index.json`
- `.temp/figma-from-code/tokens-summary.json`

Skip only Step 2 (collection creation) if all three collections already appear in `existingCollections`; proceed with Steps 3–5 to regenerate the maps.

## Error Handling

| Scenario                              | Action                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Collection creation fails             | Report error; variable creation is required for downstream phases         |
| `use_figma` variable extraction fails | Retry once; if still failing, report error                                |
| `resolve-colors.js` fails             | Report error; Phase 3 can still build using computed-styles.json fallback |
| `resolve-color.js --dump-index` fails | Report error; Phase 3 builds work but rebind sweeps degrade to no-ops     |
