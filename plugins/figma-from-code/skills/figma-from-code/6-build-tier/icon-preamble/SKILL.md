# Skill: Icon & Asset Preamble

Builds all Figma icon and asset components from SVG data before any tier processing begins. Reads `icons.json`, skips already-built entries in `builtComponents.json`, and creates `Icon/{Name}` and `Asset/{Name}` components via `use_figma`.

## Required Inputs

> Placeholders like `{skillRoot}` resolve from `state.json → config`.

| Input          | Source                                      |
| -------------- | ------------------------------------------- |
| `fileKey`      | Passed by orchestrator                      |
| `iconsFrameId` | From `state.json → figmaNodes.iconsFrameId` |

## Files Read from Disk

- `.temp/figma-from-code/icons.json` — icon/asset manifest with SVG strings
- `.temp/figma-from-code/builtComponents.json` — registry of already-built components

## Output File

Write `.temp/figma-from-code/icon-preamble-results.json` on completion.

## Workflow

### 1. Read inputs

Read `icons.json` and `builtComponents.json` from disk.

### 2. Filter already-built

For each icon in `icons[].name` and each asset in `assets[].name`, check if an entry exists in `builtComponents.json`. Skip any that already have a node ID — they were built in a prior run or seeded from Figma inspection in Phase 0a.

### 3. Build icon components

For each remaining Lucide icon, call `use_figma` to create a Figma component from its SVG string:

- Batch ~7 icons per `use_figma` call to stay within incremental limits
- Use `figma.createNodeFromSvg(svgString)` for each icon
- Name each component `Icon/{iconName}` (e.g., `Icon/Check`, `Icon/Bot`)
- Resize to 24×24 (standard Lucide size) using `node.resize(24, 24)`
- Place inside the Icons frame (`iconsFrameId`)
- Collect each created node's ID

If `createNodeFromSvg()` fails for an icon, create a 24×24 placeholder rectangle so higher-tier components can still instantiate it. Log the failure.

### 4. Build asset components

For each remaining SVG asset, call `use_figma`:

- Batch ~7 assets per `use_figma` call
- Use `figma.createNodeFromSvg(svgString)` for each asset
- Name each component `Asset/{assetName}` (e.g., `Asset/AppLogoSvg`)
- Resize to the asset's natural dimensions if known, otherwise 100×40
- Place inside the Icons frame alongside icon components
- Collect each created node's ID

### 5. Write output

Write `.temp/figma-from-code/icon-preamble-results.json`:

```json
{
  "created": {
    "Icon/Check": "123:45",
    "Icon/Bot": "123:46",
    "Asset/AppLogoSvg": "123:47"
  },
  "skipped": ["Icon/Star"],
  "failed": [],
  "totalCreated": 3,
  "totalSkipped": 1,
  "totalFailed": 0
}
```

### 6. Report back

Report: `{ "success": true, "outputFile": ".temp/figma-from-code/icon-preamble-results.json" }`

Include a one-line summary: `"Created 3 icons/assets, skipped 1 already-built, 0 failed."`

## Error Handling

| Scenario                          | Action                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `icons.json` missing              | Report `success: false`, message: "icons.json not found — run Phase 0b first" |
| `createNodeFromSvg()` fails       | Create 24×24 placeholder rectangle, log to `failed[]`, continue               |
| `use_figma` incremental limit hit | Split remaining icons into a new `use_figma` call                             |
