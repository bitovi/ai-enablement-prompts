# Skill: Setup Tokens (Phase 1)

Creates Figma variable collections, extracts the CSS-variable-to-Figma-variable-ID map, and pre-computes all CSS colors as sRGB values. Runs as a subagent dispatched by the orchestrator.

## When to Use

- When `figma-from-code` orchestrator reaches Phase 1
- Standalone to recreate variable collections and color maps after token changes

## Required Inputs

| Input                 | Description                                          | Source                    |
| --------------------- | ---------------------------------------------------- | ------------------------- |
| `fileKey`             | Figma file key                                       | State ledger or caller    |
| `existingCollections` | List of variable collection names that already exist | Phase 0a Figma inspection |

## Output Files

| File                                         | Contents                                       | Consumed by             |
| -------------------------------------------- | ---------------------------------------------- | ----------------------- |
| `.temp/figma-from-code/variables.json`       | CSS var name -> Figma variable ID map          | Phase 3 build subagents |
| `.temp/figma-from-code/resolved-colors.json` | Pre-computed sRGB values for all CSS variables | Phase 3 build subagents |
| `.temp/figma-from-code/tokens-summary.json`  | Small summary for the orchestrator             | Orchestrator only       |

## Workflow

### 1. Create variable collections

Load and run the `figma-setup-variables` skill. Pass `fileKey` and `existingCollections`.

Skip if all three collections (`Palette`, `Semantic`, `Spacing`) already exist.

### 2. Extract variable lookup map

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
      };
    }
  }
}
return JSON.stringify(map);
```

Write the returned JSON to `.temp/figma-from-code/variables.json`.

### 3. Resolve CSS colors

Run the color resolution script to pre-compute all CSS variable colors as sRGB:

```bash
node ${CLAUDE_SKILL_DIR}/10-validator/resolve-colors.js \
  <source-dir>/index.css \
  --tailwind <tailwind-config> \
  --output .temp/figma-from-code/resolved-colors.json
```

### 4. Write summary

Count the entries in `variables.json` and `resolved-colors.json`, then write the summary:

```bash
node -e "
  const vars = JSON.parse(require('fs').readFileSync('.temp/figma-from-code/variables.json','utf-8'));
  const colors = JSON.parse(require('fs').readFileSync('.temp/figma-from-code/resolved-colors.json','utf-8'));
  const varCount = Object.keys(vars).length;
  const colorCount = Object.keys(colors.cssVariables || {}).length;
  const collections = [...new Set(Object.values(vars).map(v => v.collectionName))];
  const summary = { collections, variableCount: varCount, resolvedColorCount: colorCount, variableMapPath: '.temp/figma-from-code/variables.json', resolvedColorsPath: '.temp/figma-from-code/resolved-colors.json' };
  require('fs').writeFileSync('.temp/figma-from-code/tokens-summary.json', JSON.stringify(summary, null, 2));
  console.log('Tokens summary: ' + collections.length + ' collections, ' + varCount + ' variables, ' + colorCount + ' resolved colors');
"
```

### 5. Report

```
Phase 1 complete:
- {collections.length} variable collections: {collection names}
- {variableCount} CSS variables mapped to Figma variable IDs
- {resolvedColorCount} CSS colors pre-computed as sRGB
```

## Skip / Resume

Skip if all three conditions are met:

- `.temp/figma-from-code/variables.json` exists
- `.temp/figma-from-code/resolved-colors.json` exists
- `.temp/figma-from-code/tokens-summary.json` exists

## Error Handling

| Scenario                              | Action                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `figma-setup-variables` fails         | Report error; variable creation is required for downstream phases         |
| `use_figma` variable extraction fails | Retry once; if still failing, report error                                |
| `resolve-colors.js` fails             | Report error; Phase 3 can still build using computed-styles.json fallback |
