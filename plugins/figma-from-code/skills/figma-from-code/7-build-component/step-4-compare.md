# Step 4: Compare Against App Screenshot

> **All of Step 4 runs inline.** Run 4a (instance check), then 4b (sizing check), then 4c (pixel diff). Produce a structured verdict. Do NOT attempt any fixes in this step — if the verdict is not "match", Step 5 handles fixes.

## 4a. Instance usage check (run FIRST — hard gate)

Before any visual comparison, verify that every design-system child the source code imports is actually present as an `INSTANCE` inside the built component. A pixel diff cannot catch substitution failures: rendering an `EditableTitle` as a plain text node produces a visually identical rest-state result, but breaks design-system coupling, variant switching, and Code Connect.

The gate consumes the two `.figma/*.json` tracking files written earlier:

- `<sourceDir>/.figma/code.json` — Step 1 wrote this (incrementally across sub-steps). The `childComponents` field is the **source-derived** required set, in Figma name space.
- `<sourceDir>/.figma/figma.json` — Step 2f wrote this. The `dependencies[].componentName` list is the **built-derived** actual set, enumerated from the live Figma node tree.

### Run the gate

> Placeholders like `{skillRoot}` resolve from `state.json → config`.

```bash
node {skillRoot}/scripts/check-instances.js \
  <componentName> \
  <sourceDir>
```

`<sourceDir>` is the directory whose `.figma/` subfolder contains both tracking files (the modlet root for normal components, or the synthesized `Icon/{Name}/` directory for icons).

**Exit codes:**

- `0` — every required child appears in `figma.dependencies`. Writes `.temp/figma-from-code/instances/<componentName>.ok`.
- `1` — at least one required child is missing as a dependency. Prints rejection JSON to stderr (see below).

If the script reports a missing tracking file, the earlier step that should have written it (Step 1 for `code.json`, Step 2f for `figma.json`) is the place to fix — don't paper over by hand-writing the file from inside Step 4.

### Hard rejection — what to do when it fails

If the script exits 1, **stop the comparison flow and jump straight to Step 5 fix-loop with `missing_instances` as the discrepancy.** Do NOT proceed to 4b/4c (sizing & pixel diff) — those would waste iterations on a build that is structurally wrong regardless of pixel score.

Rejection JSON shape (matches `check-instances.js` stderr output):

```json
{
  "componentName": "CaseDetails",
  "componentDir": "/absolute/path/to/CaseDetails",
  "codeJson": "/absolute/path/to/CaseDetails/.figma/code.json",
  "figmaJson": "/absolute/path/to/CaseDetails/.figma/figma.json",
  "requiredInstances": ["EditableText", "EditableTitle", "MoreOptionsMenu"],
  "presentInstances": ["MoreOptionsMenu"],
  "missingInstances": ["EditableText", "EditableTitle"],
  "unexpectedInstances": [],
  "status": "rejected",
  "reason": "missing_instances",
  "howToFix": "The build rendered the listed components as plain text or local frames instead of instancing them. Replace each local subtree with `figma.getNodeById(builtComponents[name]).createInstance()`. For instances of component sets, pick the right variant via setProperties(). To override text inside an instance, findOne(n => n.type === \"TEXT\"), loadFontAsync(text.fontName), then setCharacters. After fixing, re-run Step 2f to refresh `.figma/figma.json` and re-run this check."
}
```

Feed `missingInstances` into Step 5 — each entry must become an instance in the next fix iteration. Substituting plain text or local frames for any required instance is **always wrong**, even when the rest-state visual is identical. There is no acceptable visual-equivalence shortcut.

### Acceptable exceptions

There are none for design-system components in `builtComponents`. Portal-rendered components (`ConfirmationDialog`, `AlertDialog`, toasts) must still appear in the Figma master as **detached examples** (instances placed inside or next to the component) so designers can see and prototype them. They are not excluded from the check.

If a fix-loop iteration genuinely cannot reach a passing state (e.g. the design-system component itself is broken), surface the failure in the Step 7 result with `instanceCheck: { verdict: "fail", missing: [...] }` and let the user decide whether to override.

## 4b. Sizing sanity check (run BEFORE the pixel compare)

A pixel diff against a narrow `app.png` can pass even when the component is built far smaller than it will render in real usage — this is the most common silent failure mode. Run this check first; it is independent of the screenshot.

Inspect the built component (`use_figma`) and read its top-level frame:

```javascript
const node = figma.getNodeById('{nodeId}');
const built = {
  w: Math.round(node.width),
  h: Math.round(node.height),
  primaryAxisSizingMode: node.primaryAxisSizingMode,
  counterAxisSizingMode: node.counterAxisSizingMode,
  layoutMode: node.layoutMode,
};
```

Compare against the **sizing intent** captured in Step 1a (only run this if 4a passed):

| Intent (per axis)                                  | Expected built state                                                                                                                                        | Flag if …                                                                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fill`                                             | Master is FIXED at the consumer's expected size (page body width for page-level; parent slot width otherwise). Or the root child is FILL inside its parent. | `*SizingMode === 'AUTO'` AND the dimension is much smaller than the expected fill size (< 50%)                                                     |
| `fill:NNN` (parent-context promotion from Step 1a) | Master width equals NNN ± 5% (i.e. parent content-box width measured by Step 1g).                                                                           | Built width < NNN × 0.85, OR `primaryAxisSizingMode === 'AUTO'` on the horizontal axis when the parent was ≥ 200px wider than the element rendered |
| `fixed:NNN`                                        | Dimension equals NNN ± 2px                                                                                                                                  | Difference > 2px                                                                                                                                   |
| `hug`                                              | `*SizingMode === 'AUTO'`                                                                                                                                    | Forced FIXED with no clear reason                                                                                                                  |

**Additional checks:**

- **Page-level component (role hint from Step 1a)**: width must be ≥ 1200px AND height must be ≥ 600px (or the screen body dimensions read from `figmaNodes.screensFrameId`). If the master is 622×304 because precapture cropped the screenshot, this check catches it. Includes components flagged via the _page-consumed fallback_ (Step 1a, used when Step 1g was skipped).
- **Children with `flex-1` siblings in source but matching `*SizingMode='HUG'` in Figma**: the auto-layout will collapse the component. Flag.

If any check fails, **treat this as a `size_mismatch` discrepancy and feed it into Step 5 alongside (or before) the pixel diff results.** Do not declare a match based on pixel score alone if the sizing check failed — pixel match against a too-narrow `app.png` is a false positive. (4a must already have passed before you reach this point.)

Record the sizing check result in the eventual result file:

```json
"comparison": {
  "sizingCheck": {
    "verdict": "pass" | "fail",
    "issues": ["fill:1240 intent, built width 622 (< 1054 = 1240 × 0.85)"],
    "builtSize": {"w": 622, "h": 304},
    "expectedSize": {"w": 1240, "h": 768},
    "expectedSource": "parent-context (Step 1g)"
  },
  "matchPct": 95.26,
  ...
}
```

`expectedSource` is one of: `"page-level role hint"`, `"parent-context (Step 1g)"`, `"page-consumed fallback (Step 1g skipped)"`, or `"explicit fixed:NNN"` — surfaces which Step 1a signal produced the expected size, so a fix-loop diagnosis (or a later validator) can tell whether a failure reflects a stale signal vs. an actual sizing bug.

## Screenshot Scale Convention

Both sides of the comparison must use 1x scale to avoid dimension mismatches:

- **App screenshots** are captured at 1440x900 viewport with `deviceScaleFactor: 1` (enforced in `screenshot.js`). This prevents Retina 2x doubling.
- **Figma screenshots** via `get_screenshot` must request `scale: 1` to produce a 1x export. Without this, Figma defaults may produce higher-resolution images.
- Minor size differences between app and Figma screenshots are acceptable. The comparison focuses on visual fidelity, not pixel-exact dimensions.

## 4c. Pixel diff comparison

Run the pixel diff comparison:

```bash
node {skillRoot}/scripts/compare.js \
  "{screenshotDir}/app.png" \
  "{screenshotDir}/figma.png" \
  "{screenshotDir}/"
```

This produces:

- `diff.png` — red pixels mark differences, matching pixels dimmed
- `comparison.json` — `{ matchPct, borderMatchPct, verdict, borderVerdict }`

**Verdict thresholds (combined with 4a + 4b results):**

- 4a + 4b passed AND `matchPct >= 90%` AND `borderMatchPct >= 85%` → **match** (done)
- 4a failed → **missing_instances** (fix structure first, then re-enumerate and re-run 4a)
- 4b failed (regardless of pixel score) → **size_mismatch** (fix sizing first, then re-screenshot, then re-run 4a–4c)
- 4a + 4b passed AND `matchPct 75-90%` or `borderMatchPct < 85%` → **minor_diff** (needs fixing)
- 4a + 4b passed AND `matchPct < 75%` → **mismatch** (needs fixing)

A passing pixel verdict alone is NOT enough — 4a AND 4b must also pass. Otherwise the build is silently wrong-structured or wrong-sized and the validation phase will reject it later.

If no app screenshot exists (`appScreenshot` is null), skip pixel comparison — but still run 4a and 4b. Report `no_app_reference` only if both pass; otherwise report the failure of whichever check failed.

## Error Handling

| Scenario                                                          | Action                                                                                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `check-instances.js` crashes (non-zero exit, no JSON output)      | Surface error in result under `instanceCheck: { verdict: "error", error: "..." }`; treat as 4a failure and proceed to Step 5 fix loop |
| `check-instances.js` reports missing instances (exit 1 with JSON) | Hard reject — proceed to Step 5 fix loop with `missing_instances` discrepancy; do not proceed to 4b/4c                               |
| `get_screenshot` fails                                            | Retry once. If still failing, return component as built-but-unvalidated with `comparison: { verdict: "screenshot_error" }`       |
| `compare.js` fails or crashes                                     | Report `comparison: { verdict: "compare_error", error: "..." }`; return component with `nodeId` but no match score               |
