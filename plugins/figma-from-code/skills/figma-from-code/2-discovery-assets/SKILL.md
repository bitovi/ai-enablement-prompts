# Skill: Icon & Asset Discovery

Discovers all Lucide icons and SVG file assets imported across the codebase, extracts their SVG markup, and maps which components use which icons. This is pure static analysis — no dev server or Figma access needed.

## When to Use

- Before `figma-from-code` Phase 3 (icon preamble builds Figma icon components from this data)
- Standalone audit of icon and asset usage across the codebase
- When resuming a build and `icons.json` is missing

## Prerequisites

- Source directory exists at `{sourceDir}` (the directory containing the project's component source files)
- `node_modules/lucide-react` installed (for resolving icon SVG data; only required when `config.iconLibrary` is `lucide-react`)

> Placeholders like `{sourceDir}` resolve from `state.json → config`. When `config.iconLibrary` is `null` or the `lucide-react` package is absent, icon extraction is skipped and an empty `icons` array is written to `icons.json` — the phase still completes and records `totalIcons: 0` in the summary.

## Required Inputs

| Input       | Description                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| `sourceDir` | Path to the source directory to scan (from `state.json → config.sourceDir`) |

## Output Files

Written to `.temp/figma-from-code/`:

| File         | Contents                                                       |
| ------------ | -------------------------------------------------------------- |
| `icons.json` | Icon/asset manifest with SVG strings and per-component mapping |

### `icons.json` structure

```json
{
  "icons": [
    {
      "name": "Check",
      "elements": [["path", { "d": "M20 6 9 17l-5-5" }]],
      "svgString": "<svg ...>...</svg>",
      "usedBy": ["Button", "Checkbox"]
    }
  ],
  "assets": [
    {
      "name": "AppLogoSvg",
      "importPath": "@/assets/logo.svg",
      "sourcePath": "{sourceDir}/assets/logo.svg",
      "svgString": "...",
      "usedBy": ["Header"]
    }
  ],
  "iconsByComponent": {
    "Button": ["Check", "X"],
    "Header": ["AppLogoSvg"]
  },
  "summary": {
    "totalIcons": 21,
    "totalAssets": 1,
    "componentsWithIcons": 22
  }
}
```

## Workflow

### 1. Ensure output directory exists

```bash
mkdir -p .temp/figma-from-code/
```

### 2. Run the icon extraction script

```bash
node {skillRoot}/scripts/extract-icons.js \
  --scan {sourceDir} \
  --output .temp/figma-from-code/icons.json
```

The script:

- Recursively finds all `.tsx?` files (excludes `node_modules`, test files)
- Parses static imports from `lucide-react`
- Resolves each icon's SVG from `node_modules/lucide-react/dist/esm/icons/`
- Finds and extracts SVG file imports (e.g., `import Logo from '@/assets/logo.svg'`)
- Maps which components use which icons/assets

### 3. Read and summarize the output

Read `.temp/figma-from-code/icons.json` and extract:

- `summary.totalIcons` — number of Lucide icons found
- `summary.totalAssets` — number of SVG file assets found
- `summary.componentsWithIcons` — how many components use icons
- `icons[].name` — list of icon names
- `assets[].name` — list of asset names

### 4. Write icons summary for the orchestrator

Extract the data the orchestrator needs into a small summary file so it never has to read the full `icons.json` (which contains SVG strings):

```bash
node -e "
  const data = JSON.parse(require('fs').readFileSync('.temp/figma-from-code/icons.json','utf-8'));
  const summary = {
    iconCount: data.summary.totalIcons,
    icons: data.icons.map(i => i.name),
    assetCount: data.summary.totalAssets,
    assets: data.assets.map(a => a.name)
  };
  require('fs').writeFileSync('.temp/figma-from-code/icons-summary.json', JSON.stringify(summary, null, 2));
"
```

Write to `.temp/figma-from-code/icons-summary.json`. The orchestrator reads only this file (~500 bytes) instead of the full icons.json.

### 5. Report

```
Icon & Asset Discovery complete:
- {totalIcons} Lucide icons discovered
- {totalAssets} SVG assets found
- Icons used across {componentsWithIcons} components
```

## Scripts Reference

| Script             | Location                                          | Purpose                                                              |
| ------------------ | ------------------------------------------------- | -------------------------------------------------------------------- |
| `extract-icons.js` | `{skillRoot}/scripts/extract-icons.js` | Static analysis of imports to find icons/assets and extract SVG data |

Do NOT modify this script.

## Skip / Resume

If called with `resume: true`, check whether `.temp/figma-from-code/icons.json` exists on disk. If it does, skip and read the existing file. If it's missing, re-run.

## Error Handling

| Scenario                         | Action                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `extract-icons.js` fails         | Verify the source directory exists and `node_modules/lucide-react` is installed |
| Icon SVG resolution fails        | Script logs warnings per-icon; other icons still extracted                      |
| SVG file asset not found on disk | Script logs warning; asset entry created without `svgString`                    |
