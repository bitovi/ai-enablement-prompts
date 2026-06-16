# Step 1 Quick: Analyze the Component

> **Condensed reference.** For edge cases (responsive breakpoints, prop-driven structural states, overlays, parent-context promotion), read the full `step-1-analyze.md`.

## Pre-Existing Components Rule

If `componentName` is in `preExistingComponents`: write `status: "needs_authorization"` to `build-results/{componentName}.json` and stop immediately.

## Sequence

1. **Step 0 — Initialize code.json skeleton** at `{sourceDir}/.figma/code.json`
   - Get git commit: `git log -1 --format="%H|%aI|%s" -- {sourceFilePath}`
   - Write skeleton with null fields (crash-recovery signal)
   - All sub-steps accumulate in memory; single final write at end

2. **Step 1a — Layout & Sizing**
   - Read source code for: layout direction (`flex-col` → VERTICAL, `flex`/`flex-row` → HORIZONTAL)
   - Sizing intent per axis: `fill` (w-full/flex-1), `fixed:NNN` (w-[200px], h-10), or `hug` (content-driven)
   - Spacing: `gap-*` → itemSpacing, `p-*`/`px-*`/`py-*` → padding
   - Colors, typography, border-radius from Tailwind classes

3. **Step 1b — Variant extraction**
   - Search for `cva()`, `tv()`, `defineRecipe()` → extract axes with `classMap` per value
   - Representative set algorithm: default combo + vary one axis at a time = `1 + SUM(values - 1)` combos
   - Cap at 30 combos; if none found, `variantAxes: []`, `variantCombos: [{}]`

4. **Step 1c — Icon usage**
   - Map Lucide imports to `Icon/{Name}` in builtComponents with size from `h-N w-N` classes

5. **Step 1d — Child components (instance manifest)**
   - Every PascalCase import from `./components/` or `@/components/` that exists in `builtComponents`
   - Record: `{ figmaName, nodeId, usageCount, usages[] }`
   - This IS the Step 4a contract — all listed children MUST appear as instances

6. **Step 1e — Prerequisite gate**
   ```bash
   node {skillRoot}/scripts/check-prereqs.js <componentName> <sourceFile.tsx>
   ```
   If exit 1 → write `rejected` result with `missingChildren`, stop.

7. **Step 1f — Text content**
   - Use `text.json` for exact strings. Never use placeholders.
   - No `text.json`? Trace actual prop data from consuming components.

8. **Step 1g — Live inspection** (requires dev server)
   ```bash
   node {skillRoot}/scripts/inspect-styles.js "{devServerUrl}/{route}" \
     --selector "{selector}" --output ".temp/figma-from-code/screenshots/{ComponentName}/"
   ```
   - Produces: `computed-styles.json`, `states.json`, state screenshots
   - Use resolved RGB values as authoritative for colors/spacing/typography
   - CSS states with visual diffs → add `State` axis (Hover, Focus, Disabled)

9. **Final write** — merge all accumulated data into code.json in one atomic write.

## code.json Output Schema

```json
{
  "componentName": "...",
  "sourceFile": "...",
  "analyzedAt": "ISO8601",
  "lastCommit": { "hash": "...", "date": "...", "message": "..." },
  "liveInspection": "complete | skipped_no_dev_server",
  "layout": { "direction": "VERTICAL|HORIZONTAL", "widthIntent": "fill|fixed:N|hug", "heightIntent": "..." },
  "variantAxes": [{ "property": "...", "values": [], "defaultValue": "...", "source": "...", "classMap": {} }],
  "variantCombos": [{ "Variant": "primary", "State": "Default" }],
  "variantStrategy": "representative",
  "totalPossibleCombinations": 0,
  "iconUsage": [{ "name": "Check", "figmaComponent": "Icon/Check", "size": 16 }],
  "childComponents": [{ "figmaName": "Button", "nodeId": "123:45", "usageCount": 1, "usages": ["submit"] }],
  "textContent": { "headings": [], "labels": [], "buttons": [] },
  "computedStyles": {},
  "states": {}
}
```
