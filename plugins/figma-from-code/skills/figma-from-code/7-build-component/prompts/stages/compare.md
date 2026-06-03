# Stage 3 of 4 — Compare against the app screenshot → verdict

You are the **compare** stage of a 4-stage per-component pipeline (analyze → build → compare →
fix). The build stage produced the Figma node and `figma.png`. Your job: run the three gates
(instance, sizing, pixel), produce a verdict, finalize tracking, and write the result file. Do
**NOT** fix anything — if the verdict isn't a pass, the workflow dispatches the fix stage next.

## Inputs

- Component name: `{componentName}`
- Figma file key: `{fileKey}`
- Source dir (holds `.figma/code.json` + `figma.json`): `{sourceDir}`
- Component node ID: `{nodeId}`
- Screenshot node ID: `{screenshotNodeId}`
- Screenshot dir: `.temp/figma-from-code/screenshots/{componentName}/` (`app.png`, `figma.png`)

## Step 4 — compare

**4a — instance gate (run FIRST):**

```bash
node ${CLAUDE_SKILL_DIR}/7-build-component/check-instances.js {componentName} {sourceDir}
```

Exit 0 → writes `instances/{componentName}.ok`, 4a passes. Exit 1 → required child(ren) missing
as dependencies → verdict `missing_instances` (do NOT run 4b/4c). Crash (non-zero, no JSON) →
`instanceCheck.verdict: "error"`, treat as 4a failure. There is no visual-equivalence shortcut —
a text-node lookalike for a required instance is always a fail.

**4b — sizing check** (before pixel diff). Inspect the built node:

```javascript
const node = figma.getNodeById('{nodeId}');
const built = { w: Math.round(node.width), h: Math.round(node.height),
  primaryAxisSizingMode: node.primaryAxisSizingMode, counterAxisSizingMode: node.counterAxisSizingMode, layoutMode: node.layoutMode };
```

Compare to `code.json` sizing intent:

| Intent | Expected | Flag if |
| --- | --- | --- |
| `fill` | master FIXED at consumer size, or root child FILL | `*SizingMode==='AUTO'` AND dimension < 50% of expected |
| `fill:NNN` | width = NNN ± 5% | width < NNN×0.85, or horizontal `AUTO` when parent ≥200px wider |
| `fixed:NNN` | dimension = NNN ± 2px | diff > 2px |
| `hug` | `*SizingMode==='AUTO'` | forced FIXED without reason |

Page-level: width ≥ 1200 AND height ≥ 600 (or screen body dims). Record
`sizingCheck { verdict, issues, builtSize, expectedSize, expectedSource }`. A failed 4b →
verdict `size_mismatch` (regardless of pixel score).

**4c — pixel diff.**

```bash
node ${CLAUDE_SKILL_DIR}/10-validator/compare.js \
  "{screenshotDir}/app.png" "{screenshotDir}/figma.png" "{screenshotDir}/"
```

Produces `diff.png` + `comparison.json` `{ matchPct, borderMatchPct, verdict, borderVerdict }`.
Combined verdict:
- 4a+4b pass AND `matchPct ≥ 90` AND `borderMatchPct ≥ 85` → **match**
- 4a fail → **missing_instances** ; 4b fail → **size_mismatch**
- 4a+4b pass AND (`matchPct 75–90` or `borderMatchPct < 85`) → **minor_diff**
- 4a+4b pass AND `matchPct < 75` → **mismatch**

If no `app.png`, skip pixel compare but still run 4a+4b; report **no_app_reference** only if both pass.

## Finalize + write result

Write the full `comparison.json`-style block into the result, finalize tracking (Step 6), and
write `.temp/figma-from-code/build-results/{componentName}.json`:

- **Step 6:** verify `{sourceDir}/.figma/code.json` + `figma.json` exist; refresh `figma.json.updatedAt`
  (preserve `createdAt`); sanity-check `componentName`/`fileKey`/`nodeId` match. Surface any
  violation in the result; don't silently repair.
- **Result file** (`build-results/{componentName}.json`):

```json
{
  "componentName": "{componentName}",
  "nodeId": "{nodeId}",
  "type": "COMPONENT" | "COMPONENT_SET",
  "variants": [ ... ],
  "comparison": {
    "matchPct": 96.0, "borderMatchPct": 94.7,
    "verdict": "match" | "minor_diff" | "mismatch" | "size_mismatch" | "missing_instances" | "no_app_reference",
    "iterations": 0, "fixes": [],
    "instanceCheck": { "verdict": "pass" | "fail" | "error", "missing": [] },
    "sizingCheck": { "verdict": "pass" | "fail" | "pass_no_reference", "builtSize": {...}, "expectedSize": {...} }
  },
  "screenshotNodeId": "{screenshotNodeId}",
  "figmaScreenshot": ".temp/figma-from-code/screenshots/{componentName}/figma.png"
}
```

## Return (StructuredOutput)

```json
{
  "componentName": "{componentName}",
  "nodeId": "{nodeId}",
  "verdict": "match" | "minor_diff" | "mismatch" | "size_mismatch" | "missing_instances" | "no_app_reference",
  "matchPct": 96.0,
  "borderMatchPct": 94.7,
  "needsFix": false,
  "missingInstances": []
}
```

Set `needsFix: true` for `minor_diff`, `mismatch`, `size_mismatch`, `missing_instances`.
Set `needsFix: false` for `match` and `no_app_reference`. Include `missingInstances` when the
4a gate failed so the fix stage knows what to add.
