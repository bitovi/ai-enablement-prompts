# Stage 4 of 4 — Fix loop (only runs when compare flagged a problem)

You are the **fix** stage of a 4-stage per-component pipeline (analyze → build → compare → fix).
You only run because the compare stage returned a non-passing verdict. Diagnose from `diff.png`
and `comparison.json` — NOT from build assumptions. Read source `.tsx` ONLY to resolve specific
differences the comparison found. **Never apply blanket fixes to all instances** — verify each
against the diff before modifying it.

> Before any `use_figma` call, invoke the `figma:figma-use` skill (mandatory prerequisite).

## Inputs

- Component name: `{componentName}`
- Figma file key: `{fileKey}`
- Source file / dir: `{sourceFile}` / `{sourceDir}`
- Component node ID: `{nodeId}`
- Screenshot node ID: `{screenshotNodeId}`
- Incoming verdict: `{verdict}` (`minor_diff` | `mismatch` | `size_mismatch` | `missing_instances`)
- Missing instances (if 4a failed): `{missingInstances}`
- Screenshot dir: `.temp/figma-from-code/screenshots/{componentName}/` (`app.png`, `figma.png`, `diff.png`)
- Comparison data: `.temp/figma-from-code/screenshots/{componentName}/comparison.json`
- Built components: `.temp/figma-from-code/builtComponents.json`

If `figma.getNodeById('{nodeId}')` returns null, re-query once or twice (cross-session sync); if
still null, return `status: "failed"`, `reason: "node_missing"`.

## Step 5 — fix loop (up to 3 iterations)

Per iteration:

**5a. Diagnose** (priority order): address `missing_instances` FIRST, then `size_mismatch`, then
read `diff.png` (red = differs), `app.png` (target), `figma.png` (actual), source `.tsx`.

| Symptom | Fix |
| --- | --- |
| `missing_instances` | For each name in `{missingInstances}`: delete the local stand-in subtree, replace with `getNodeById(builtComponents[name]).createInstance()` (variant via `setProperties`); override text via `findOne`+`loadFontAsync`. Re-run 2f enum + check-instances. |
| sizing: master too small for `fill` | Modes FIRST then resize: `primaryAxisSizingMode='FIXED'; counterAxisSizingMode='FIXED'; resizeWithoutConstraints(W,H)`; fill children `layoutSizingHorizontal/Vertical='FILL'`. |
| sizing: fixed off >2px | `resizeWithoutConstraints(W,H)` |
| red border ring | adjust `strokes`/`strokeWeight`/`strokeAlign` (use `OUTSIDE`) |
| red fill / red text | adjust `fills` / font props + text fills |
| shifted content | adjust `itemSpacing`/padding |
| missing / extra element | add / remove child |
| all thin strips | run `fixSizing()` |

**5b. Apply** a targeted `use_figma` change (only the diagnosed properties); `fixSizing(node)`.

**5c. Re-enumerate, re-screenshot, re-compare:**
1. Re-run the 2f enumeration + rewrite `{sourceDir}/.figma/figma.json` (the tree changed).
2. If the failure was `missing_instances`, re-run `check-instances.js {componentName} {sourceDir}`;
   don't pixel-compare until 4a passes.
3. `get_screenshot(fileKey, {screenshotNodeId})` → overwrite `figma.png`.
4. `node ${CLAUDE_SKILL_DIR}/10-validator/compare.js "{screenshotDir}/app.png" "{screenshotDir}/figma.png" "{screenshotDir}/"`.

**5d. Continue/stop:** `match` → exit (fixed). Improved but not match → next iteration. 3
iterations reached → exit with `status: "partial_match"`. Do not retry beyond 3.

`fixSizing()` (mandatory after any structural change):

```javascript
function fixSizing(node, depth = 0) {
  if (depth > 10 || !node) return;
  const hasLayout = (node.type === 'COMPONENT' || node.type === 'FRAME' || node.type === 'COMPONENT_SET')
    && node.layoutMode && node.layoutMode !== 'NONE';
  if (hasLayout) {
    if (node.layoutMode === 'VERTICAL') node.primaryAxisSizingMode = 'AUTO';
    node.counterAxisSizingMode = 'AUTO';
  }
  for (const child of ('children' in node ? node.children : [])) fixSizing(child, depth + 1);
}
```

## Finalize + overwrite result

Refresh `figma.json.updatedAt` (Step 6), then OVERWRITE
`.temp/figma-from-code/build-results/{componentName}.json` with the final state (same schema as
the compare stage's result, with updated `comparison.verdict`, `matchPct`, `iterations`, and a
`fixes` array describing each change applied).

## Return (StructuredOutput)

```json
{
  "componentName": "{componentName}",
  "status": "built" | "partial_match" | "failed",
  "nodeId": "{nodeId}",
  "verdict": "match" | "minor_diff" | "mismatch",
  "matchPct": 94.2,
  "iterations": 2
}
```

`status: "built"` when the final verdict is `match`; `partial_match` when it improved but didn't
reach match within 3 iterations.
