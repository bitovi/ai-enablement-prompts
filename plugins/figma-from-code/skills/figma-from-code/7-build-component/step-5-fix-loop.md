# Step 5: Fix Loop (Up to 3 Iterations)

> **This step runs inline.** Diagnose discrepancies from `diff.png` and `comparison.json`, not from assumptions about what "should" be wrong. Read the source `.tsx` ONLY to resolve specific differences the comparison identified — never to form a prior about what the component "probably" looks like.
>
> **Anti-pattern: blanket fixes.** Never apply the same fix to all instances of a component type without diff evidence that each instance is wrong. If `diff.png` shows a problem with one EditableTitle but not another, fix only the one the diff flags. Each instance must be individually verified against the diff before modification. The build phase may have left some instances correct and others incorrect — you cannot know which without checking the comparison data.

## Iteration model

Step 5 runs up to 3 fix iterations inline:

- **Iteration 1**: Diagnose only from `diff.png`, `comparison.json`, and the step inputs. Focus on comparison data, not build assumptions.
- **Iterations 2 and 3**: Continue with the context of previous fix attempts and their outcomes.

If all 3 iterations complete without reaching `verdict: "match"`, exit the loop. Return `status: "partial_match"` and proceed to Step 6 — do **not** retry Step 5.

If the verdict is `minor_diff` or `mismatch`, enter the fix loop.

## Per-iteration process

### 5a. Diagnose the discrepancy

Use all four inputs together to identify specific differences:

1. **Step 4a instance-usage check result** — if it failed, address it FIRST. Missing instances break design-system coupling and Code Connect; no amount of pixel tweaking fixes them.
2. **Step 4b sizing check result** — if it failed, address sizing next. A too-small master will mask everything else and will re-fail validation later.
3. **Read `diff.png`** — red regions show exactly where pixels differ
4. **Read `app.png`** — what the component should look like
5. **Read `figma.png`** — what was actually built
6. **Read source `.tsx`** — Tailwind classes reveal intended values (colors, spacing, radii, font weights)

Cross-reference to identify the exact Figma properties that need correction. Common discrepancy patterns:

| Symptom                                                              | Likely Cause                                                                                                                                                         | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Step 4a instance check failed** (`missing_instances`)              | Source imports `X` from the design system, but the build rendered `X` as text nodes or local frames. Rest-state visual may look identical but is structurally wrong. | For each name in `missingInstances`: locate the local subtree in the build that stands in for it, delete it, and replace with `figma.getNodeById(builtComponents[name]).createInstance()`. For component sets, choose the matching variant via `instance.setProperties({ ... })`. To override text inside an instance, `instance.findOne(n => n.type === 'TEXT')` then `await figma.loadFontAsync(text.fontName)` then `text.characters = '...'`. After replacing, re-run the 4a enumeration query and `check-instances.js`. |
| **Step 4b sizing check failed** (master too small for `fill` intent) | Master built with `*SizingMode='AUTO'`, hugged content, app.png was cropped narrow                                                                                   | Set sizing modes FIRST, then resize: `node.primaryAxisSizingMode='FIXED'; node.counterAxisSizingMode='FIXED'; node.resizeWithoutConstraints(W, H)`. Set fill children to `layoutSizingHorizontal='FILL'` / `layoutSizingVertical='FILL'`. Order matters — sizing modes before `resize()`, otherwise the resize collapses back to AUTO.                                                                                                                                                                                       |
| **Step 4b sizing check failed** (fixed dimension off by > 2px)       | Wrong literal width/height from Tailwind class                                                                                                                       | `node.resizeWithoutConstraints(intendedW, intendedH)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Red border ring around component                                     | Wrong border color, extra stroke, missing stroke                                                                                                                     | Adjust `strokes`, `strokeWeight`, `strokeAlign`                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Red fill region                                                      | Wrong background color                                                                                                                                               | Adjust `fills` color values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Red text area                                                        | Wrong font size/weight, wrong text color, wrong text content                                                                                                         | Adjust font properties, text fills                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Shifted content                                                      | Wrong padding or spacing                                                                                                                                             | Adjust `itemSpacing`, padding values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Missing element                                                      | Child not created or wrong visibility                                                                                                                                | Add missing child element                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Extra element                                                        | Decorative element not in source                                                                                                                                     | Remove unexpected child                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Size mismatch (from pixel diff, not 4a)                              | Wrong resize values or sizing mode                                                                                                                                   | Adjust `resize()` or `layoutSizingMode`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Components all thin strips                                           | `fixSizing()` not applied, or `counterAxisSizingMode = 'FIXED'`                                                                                                      | Run `fixSizing()` on the component                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### 5b. Apply the fix via `use_figma`

Write a targeted fix — change only the properties identified in diagnosis.

**Color fixes must go through the variable index first** (step-2-build.md §2e Step 0). Before authoring the fix script, resolve the intended color:

```bash
node {skillRoot}/scripts/resolve-color.js '#2563eb' --context fill
```

If it returns a variable, bind it; hardcode RGB only on `match: "none"`. Reassigning `fills`/`strokes` **clears any existing variable binding** on that paint — a raw-RGB color fix on a previously-bound node silently downgrades it to a hardcoded color, which is the main way components lose their token coupling.

```javascript
// use_figma — fix specific property
const node = figma.getNodeById('{nodeId}');
// Example: fix border radius
node.cornerRadius = 8; // was 4, should be rounded-lg (8px)
// Example: fix fill color — bind the variable resolve-color.js returned
node.fills = [{ type: 'SOLID', color: { r: 0.141, g: 0.31, b: 0.722 } }];
node.setBoundVariable('fills', 0, await figma.variables.getVariableByIdAsync('{matchedVariableId}'));
// Only when resolve-color.js returned match: "none" — leave the raw RGB unbound
fixSizing(node);
return 'fixed';
```

### 5c. Re-enumerate, re-screenshot, re-compare

The Figma node tree has changed, so the `.figma/figma.json` written by Step 2f is now stale. Re-run the Step 2f enumeration + write before re-checking — otherwise Step 4a will compare against the previous build's instance list and either pass a still-broken build or fail one that's already fixed.

1. **Re-enumerate** — run the Step 2f `findAll(INSTANCE)` query against the (possibly-mutated) root node and re-write `<sourceDir>/.figma/figma.json`. Preserve `createdAt` from the prior file; refresh `updatedAt`. Recompute the dependencies list from scratch.
2. **Re-run the Step 4a gate** if the previous iteration's failure was `missing_instances`:
   > Placeholders like `{skillRoot}` resolve from `state.json → config`.
   ```bash
   node {skillRoot}/scripts/check-instances.js <componentName> <sourceDir>
   ```
   If it still rejects, diagnose the next missing entry and loop back to 5b. Do not proceed to pixel re-compare until 4a passes.
3. **Re-screenshot** — only after Step 4a passes:
   ```
   get_screenshot(fileKey, screenshotNodeId)
   ```
   Save to `{screenshotDir}/figma.png` (overwrite previous).
4. **Re-compare pixels:**
   ```bash
   node {skillRoot}/scripts/compare.js \
     "{screenshotDir}/app.png" \
     "{screenshotDir}/figma.png" \
     "{screenshotDir}/"
   ```

### 5d. Evaluate and continue or stop

- If verdict is now `match` → exit loop, report as fixed
- If verdict improved but still `minor_diff` or `mismatch` → continue to next iteration
- If iteration count reaches 3 → exit loop, report remaining issues

## Step 5R: Variable rebind sweep (always runs)

Run this sweep **after** the fix loop exits — and also when the fix loop never ran because the first comparison was already a `match` or comparison was skipped (`no_app_reference`). It is the safety net that catches hardcoded colors regardless of which step introduced them: build fallbacks, `stateStyles` values, computed-styles, or fix-loop edits that cleared bindings.

The sweep is purely structural — it changes which variables paints are *bound* to, never the rendered pixels (it only binds variables whose resolved color already equals the paint's color). No re-screenshot or re-compare is needed afterward.

1. Read `.temp/figma-from-code/color-index.json` (written by Phase 1 — regenerate with `node {skillRoot}/scripts/resolve-color.js --dump-index --output .temp/figma-from-code/color-index.json` if missing). If it cannot be produced, skip the sweep and note `rebindSweep: "skipped_no_index"` in the result.
2. Inline the `index` object into the following `use_figma` script (the sandbox has no filesystem access).
3. Run it against the component root node.

```javascript
// use_figma — rebind sweep. COLOR_INDEX is inlined from color-index.json.
const COLOR_INDEX = {
  /* ... inlined "r,g,b" -> [candidates] map ... */
};
const TOLERANCE = 3;

const entries = Object.entries(COLOR_INDEX).map(([key, candidates]) => {
  const [r, g, b] = key.split(',').map(Number);
  return { r, g, b, candidates };
});

function findCandidates(color) {
  const r = Math.round(color.r * 255),
    g = Math.round(color.g * 255),
    b = Math.round(color.b * 255);
  let best = null;
  for (const e of entries) {
    const d = Math.max(Math.abs(e.r - r), Math.abs(e.g - g), Math.abs(e.b - b));
    if (d <= TOLERANCE && (!best || d < best.d)) best = { d, candidates: e.candidates };
  }
  return best ? best.candidates : null;
}

const NAME_HINTS = {
  text: /foreground/,
  stroke: /(^|-)(border|ring|outline|input)(-|$)/,
};

function pick(candidates, context) {
  const scored = candidates.map((c) => {
    let s = 0;
    if (c.collection === 'Semantic') s += 4;
    if (context !== 'fill' && NAME_HINTS[context] && NAME_HINTS[context].test(c.cssVar)) s += 2;
    return { c, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].c;
}

const report = { rebound: 0, alreadyBound: 0, unmatched: [], created: [] };

// Get or create a variable in the "Discovered" collection for a color with no existing token.
// Idempotent: if the variable already exists (same name), returns it without creating a duplicate.
function getOrCreateDiscovered(r, g, b) {
  const hexName = [r, g, b].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('');
  const varName = 'discovered/' + hexName;
  const existing = figma.variables.getLocalVariables('COLOR').find((v) => v.name === varName);
  if (existing) return existing;
  let col = figma.variables.getLocalVariableCollections().find((c) => c.name === 'Discovered');
  if (!col) col = figma.variables.createVariableCollection('Discovered');
  const v = figma.variables.createVariable(varName, col, 'COLOR');
  v.setValueForMode(col.defaultModeId, { r: r / 255, g: g / 255, b: b / 255 });
  report.created.push({ id: v.id, name: varName, rgb: r + ',' + g + ',' + b });
  return v;
}

async function sweepPaints(node, prop, context) {
  const paints = node[prop];
  if (!Array.isArray(paints)) return;
  for (let i = 0; i < paints.length; i++) {
    const p = paints[i];
    if (p.type !== 'SOLID' || p.visible === false) continue;
    if (p.boundVariables && p.boundVariables.color) {
      report.alreadyBound++;
      continue;
    }
    const candidates = findCandidates(p.color);
    if (!candidates) {
      // No token match — create a Discovered variable so the color is still variable-bound.
      const r = Math.round(p.color.r * 255);
      const g = Math.round(p.color.g * 255);
      const b = Math.round(p.color.b * 255);
      const discovered = getOrCreateDiscovered(r, g, b);
      node.setBoundVariable(prop, i, discovered);
      report.rebound++;
      continue;
    }
    const chosen = pick(candidates, context);
    const variable = await figma.variables.getVariableByIdAsync(chosen.id);
    node.setBoundVariable(prop, i, variable);
    report.rebound++;
  }
}

async function walk(node) {
  // Do not descend into instances — their colors come from (already-swept) masters;
  // touching them would create needless overrides.
  if (node.type === 'INSTANCE') return;
  if ('fills' in node) await sweepPaints(node, 'fills', node.type === 'TEXT' ? 'text' : 'fill');
  if ('strokes' in node) await sweepPaints(node, 'strokes', 'stroke');
  if ('children' in node) for (const c of node.children) await walk(c);
}

await walk(figma.getNodeById('{nodeId}'));
return JSON.stringify(report);
```

4. Record the returned report in the final result file as `rebindSweep` (see the result schema in `7b-review-fix-component/SKILL.md`).

5. If `rebindSweep.created` is non-empty, update `color-index.json` so later components and tiers see the new Discovered variables:

```bash
node -e "
const fs = require('fs');
const idxPath = '.temp/figma-from-code/color-index.json';
const idx = JSON.parse(fs.readFileSync(idxPath, 'utf-8'));
const created = PASTE_CREATED_ARRAY_HERE;
created.forEach(({id, name, rgb}) => {
  if (!idx.index[rgb]) idx.index[rgb] = [];
  if (!idx.index[rgb].find(c => c.id === id)) {
    idx.index[rgb].push({ cssVar: '--' + name.replace('/', '-'), id, name, collection: 'Discovered', scopes: [] });
  }
});
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
console.log('Updated color-index with', created.length, 'new entries');
"
```

Replace `PASTE_CREATED_ARRAY_HERE` with the JSON literal from `rebindSweep.created`.

## Structural audit (run before first comparison if issues suspected)

```javascript
// use_figma
function auditNode(node) {
  const issues = [];
  if ('strokeAlign' in node && node.strokeAlign === 'INSIDE' && node.strokes?.length > 0) {
    issues.push({ type: 'inside_stroke', node: node.id, name: node.name });
  }
  if ('fills' in node && node.fills.filter((f) => f.visible !== false).length > 1) {
    issues.push({ type: 'multiple_fills', node: node.id, count: node.fills.length });
  }
  if ('children' in node) node.children.forEach((c) => issues.push(...auditNode(c)));
  return issues;
}
const node = figma.getNodeById('{nodeId}');
return JSON.stringify(auditNode(node));
```

Fix structural issues before screenshotting — `strokeAlign: 'INSIDE'` causes double-border visuals, multiple fills cause color blending.
