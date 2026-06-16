# Icon & Asset Discovery (Phase 0b)

Discovers all Lucide icons and SVG file assets imported across the codebase, extracts their SVG markup, and maps which components use which icons. This is pure static analysis — no dev server or Figma access needed.

## What It Does

This step builds a complete inventory of every icon and SVG asset used in the project. It identifies Lucide icon imports, resolves their underlying SVG data from the installed package, and finds any SVG files imported directly (e.g., logos or illustrations). The result is a structured manifest that pairs each icon/asset with its SVG markup and tracks which components reference it.

## How It Works

1. Recursively scans all `.tsx` and `.ts` files in the configured source directory.
2. Parses static imports from `lucide-react` and resolves each icon's SVG data from the installed package.
3. Detects SVG file imports (e.g., `import Logo from '@/assets/logo.svg'`) and extracts their markup directly from the file system.
4. Builds an `iconsByComponent` index that maps every component to the icons and assets it uses.
5. Writes a full manifest and a compact summary for downstream phases.

If `lucide-react` is not installed, the Lucide portion degrades gracefully — SVG file assets are still discovered.

## Inputs

- **Source directory** — the project source root, provided by the pipeline config.
- **node_modules/lucide-react** — required for resolving Lucide icon SVG data. Optional; the step continues without it.

## Outputs

All output is written to `.temp/figma-from-code/`:

| File | Description |
|------|-------------|
| `icons.json` | Full icon/asset manifest — SVG strings, element data, and per-component usage mapping. |
| `icons-summary.json` | Compact summary (icon names, asset names, counts) consumed by the orchestrator. |

## Why It Matters

Phase 3 reads `icons.json` to create Figma icon and asset components directly from the extracted SVG data. Without this step, every icon would need to be manually recreated in Figma. The per-component usage mapping also tells Phase 3 which components need icon instances wired in, keeping the generated Figma file accurate to the codebase.

## Key Details

- **Key script:** `extract-icons.js` (do not modify).
- **Skip/Resume:** If `icons.json` already exists, this step is skipped on resume.
- **Phase order:** Runs as Phase 0b, immediately after component discovery.
