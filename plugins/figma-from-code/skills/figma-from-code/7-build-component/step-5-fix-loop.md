# Step 5: Fix Loop (Up to 3 Iterations)

> **This step runs inline.** Diagnose discrepancies from `diff.png` and `comparison.json`, not from assumptions about what "should" be wrong. Read the source `.tsx` ONLY to resolve specific differences the comparison identified — never to form a prior about what the component "probably" looks like.
>
> **Anti-pattern: blanket fixes.** Never apply the same fix to all instances of a component type without diff evidence that each instance is wrong. If `diff.png` shows a problem with one EditableTitle but not another, fix only the one the diff flags. Each instance must be individually verified against the diff before modification. The build phase may have left some instances correct and others incorrect — you cannot know which without checking the comparison data.

## Iteration model

Step 5 runs up to 3 fix iterations inline:

- **Iteration 1**: Diagnose only from `diff.png`, `comparison.json`, and the step inputs. Focus on comparison data, not build assumptions.
- **Iterations 2 and 3**: Continue with the context of previous fix attempts and their outcomes.

If all 3 iterations complete without reaching `verdict: "match"`, exit the loop. Return `status: "partial_match"` and proceed to Step 6 — do **not** retry Step 5. Also exit **early** — before consuming all 3 iterations — when an iteration fails to improve the score or when the comparison baseline turns out to be invalid/unreachable; see the bail conditions in 5d. Running all 3 iterations is a ceiling, not a quota.

If the verdict is `minor_diff` or `mismatch`, enter the fix loop.

## Screenshot economy

Each `get_screenshot` call is a network round-trip and a token cost — do not re-pull images you already have on disk:

- **`app.png` is immutable.** It is the precaptured app reference (Step 1g / precapture). Always **read it from `{screenshotDir}/app.png`**; never call `get_screenshot` on it or re-run the app capture — it does not change between iterations.
- **Capture `figma.png` at most once per iteration**, and only *after* a structural edit + the Step 4a gate passes (§5c). Do not re-screenshot the Figma node speculatively or more than once per iteration.
- **`diff.png` and `comparison.json` are produced locally by `compare.js`.** Read them from disk; never fetch them remotely.
- Read each input image **once** per iteration. If you already read `diff.png`/`comparison.json` this iteration, reuse what you have rather than re-reading.

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

Write a targeted fix — change only the properties identified in diagnosis:

```javascript
// use_figma — fix specific property
const node = figma.getNodeById('{nodeId}');
// Example: fix border radius
node.cornerRadius = 8; // was 4, should be rounded-lg (8px)
// Example: fix fill color
node.fills = [{ type: 'SOLID', color: { r: 0.141, g: 0.31, b: 0.722 } }];
fixSizing(node);
return 'fixed';
```

### 5c. Re-enumerate, re-screenshot, re-compare

The Figma node tree has changed, so the `.figma/figma.json` written by Step 2f is now stale. Re-run the Step 2f enumeration + write before re-checking — otherwise Step 4a will compare against the previous build's instance list and either pass a still-broken build or fail one that's already fixed.

1. **Re-enumerate** — run the Step 2f `findAll(INSTANCE)` query against the (possibly-mutated) root node and re-write `<sourceDir>/.figma/figma.json`. Preserve `createdAt` from the prior file; refresh `updatedAt`. Recompute the dependencies list from scratch.
2. **Re-run the Step 4a gate** if the previous iteration's failure was `missing_instances`:
   ```bash
   node ${CLAUDE_SKILL_DIR}/7-build-component/check-instances.js <componentName> <sourceDir>
   ```
   If it still rejects, diagnose the next missing entry and loop back to 5b. Do not proceed to pixel re-compare until 4a passes.
3. **Re-screenshot** — only after Step 4a passes:
   ```
   get_screenshot(fileKey, screenshotNodeId)
   ```
   Save to `{screenshotDir}/figma.png` (overwrite previous).
4. **Re-compare pixels:**
   ```bash
   node ${CLAUDE_SKILL_DIR}/10-validator/compare.js \
     "{screenshotDir}/app.png" \
     "{screenshotDir}/figma.png" \
     "{screenshotDir}/"
   ```

### 5d. Evaluate and continue or stop

Track `matchPct` (and `borderMatchPct`) across iterations so you can tell whether the fixes are actually helping — an iteration that doesn't move the numbers is wasted.

- If verdict is now `match` → exit loop, report as fixed.
- **No-improvement bail.** If this iteration's `matchPct` did not improve over the previous iteration by at least **1 percentage point** (and `borderMatchPct` likewise stalled), STOP. Do not spend another iteration. Report `status: "partial_match"` with the best verdict reached. Re-applying near-identical fixes that don't move the score is a strong signal the remaining diff is not addressable from the build side.
- **Invalid / unreachable-reference bail.** If diagnosis shows the comparison baseline is not a valid target for this component, STOP immediately rather than iterating against it:
  - `app.png` captured the wrong element (a stray avatar, a sibling, an empty slot) — report `no_app_reference` with the reason.
  - the component only renders inside an interaction you cannot reproduce here — report `no_app_reference`.
  - the residual is the documented system-ui→Inter **font-proxy drift** (`fontCheck.matches` is true; see Step 4c) — report `partial_match` with `residual: "font-proxy"`. The text will never pixel-match because Inter is a deliberate proxy for the OS system font; further iterations cannot fix it.
  Record the reason so the validation phase can re-check it instead of re-fixing it.
- If the verdict improved **meaningfully** (≥ 1 pt) but is still `minor_diff` or `mismatch`, and iteration count < 3 → continue to next iteration.
- If iteration count reaches 3 → exit loop, report remaining issues.

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
