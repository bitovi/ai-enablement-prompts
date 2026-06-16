# Skill: Validate + Fix (Phase 5)

Validates the completed Figma rebuild by comparing full-page screen frames against app screenshots. Instead of re-validating every individual component (which already passed during Phase 3's build loop), this phase checks the assembled screens as a whole — verifying that components compose correctly and that nothing was lost during screen assembly. Runs fix loops on mismatched screens and produces a structured report. Runs as a subagent dispatched by the orchestrator.

## When to Use

- When `figma-from-code` orchestrator reaches Phase 5
- Standalone to validate assembled screens after a rebuild

## Required Inputs

| Input                   | Description                                        | Source                                                              |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| `fileKey`               | Figma file key                                     | State ledger                                                        |
| `builtComponents`       | Map of `{name: nodeId}` for all built components   | `state.json -> builtComponents`                                     |
| `figmaNodes`            | All page and frame node IDs                        | `state.json -> figmaNodes`                                          |
| `buildOrder`            | Tiered component list                              | `state.json -> buildOrder`                                          |
| `devServerUrl`          | URL of the running dev server                      | `state.json → config.devServerUrl` (default `http://localhost:5173`) |
| `precaptureScreens`     | Screen manifest from Phase 2.5                     | `.temp/figma-from-code/precapture-screens.json`                     |

## Output Files

| File                                            | Contents                                           | Consumed by       |
| ----------------------------------------------- | -------------------------------------------------- | ----------------- |
| `.temp/figma-validation/report.md`              | Full validation report with per-screen comparisons | User review       |
| `.temp/figma-from-code/validation-summary.json` | Small summary for the orchestrator                 | Orchestrator only |

## Workflow

> Placeholders like `{devServerUrl}` and `{skillRoot}` resolve from `state.json → config`.

### 1. Validate screens (full-page comparisons only)

For each screen built in Phase 4 (read from `.temp/figma-from-code/build-results/screens/`):

1. **Read the screen result** — get the screen's Figma node ID from `build-results/screens/{screenName}.json`
2. **Capture a fresh Figma screenshot** — `get_screenshot(fileKey, screenNodeId)` at `scale: 1`
3. **Compare against the app screenshot** — the pre-captured full-page screenshot from Phase 2.5:
   ```bash
   node {skillRoot}/scripts/compare.js \
     ".temp/figma-from-code/screenshots/screens/{screenName}/app.png" \
     ".temp/figma-validation/screenshots/{screenName}/figma.png" \
     ".temp/figma-validation/screenshots/{screenName}/"
   ```
4. **Record the verdict** — thresholds: `matchPct ≥ 85%` → match, `70-85%` → minor_diff, `< 70%` → mismatch (screen thresholds are slightly lower than component thresholds because full pages have more variation in dynamic content)

**Fix loop for mismatched screens:** For screens with `verdict: "mismatch"` or `"minor_diff"`, run up to 2 fix iterations:
- Diagnose from `diff.png` — identify which region/component is off
- Apply targeted fix via `use_figma` (adjust instance position, swap variant, fix spacing)
- Re-screenshot and re-compare
- If after 2 iterations the screen still doesn't pass, record as `partial_match`

**Pre-existing screens** (in `state.json → preExistingScreens`) are compared **read-only** — screenshot and record the verdict, but do NOT run the fix loop. Surface mismatches for user review.

### 2. Clean up Components page layout

After validation, clean up any misplaced components on the Components page. Subagents sometimes create their own frames instead of using the designated tier frames.

```javascript
const componentsPage = figma.root.children.find((p) => p.name.includes('Components'));
await figma.setCurrentPageAsync(componentsPage);

const tierFrameIds = new Set([
  iconsFrameId,
  tier1FrameId,
  tier2FrameId,
  // ... all tier frames from figmaNodes
]);

const strayFrames = componentsPage.children.filter((c) => !tierFrameIds.has(c.id));

// For each stray frame, move its children to the correct tier frame
// based on which tier the component belongs to (from buildOrder.tiers)
// Then delete the empty stray frame

// Re-stack all tier frames vertically with 80px gaps
const frameOrder = [iconsFrameId, tier1FrameId, tier2FrameId /* ... */];
let yPos = 0;
const gap = 80;
for (const id of frameOrder) {
  const frame = figma.getNodeById(id);
  frame.x = 0;
  frame.y = yPos;
  yPos += Math.round(frame.height) + gap;
}
```

### 3. Stop the Playwright server

```bash
kill $(cat .temp/figma-from-code/pw-server.pid 2>/dev/null) 2>/dev/null
rm -f .temp/figma-from-code/pw-endpoint.txt
```

### 4. Write validation summary

Parse the results and write a concise summary for the orchestrator:

```json
{
  "screensCompared": 8,
  "match": 6,
  "minorDiff": 1,
  "mismatch": 0,
  "fixedDuringValidation": 1,
  "averageMatchPct": 89.7,
  "overallVerdict": "PASS",
  "preExistingFlagged": [],
  "screenResults": [
    { "name": "CasesPage", "matchPct": 92.1, "verdict": "match" },
    { "name": "CreateCasePage", "matchPct": 87.3, "verdict": "match" }
  ],
  "reportPath": ".temp/figma-validation/report.md"
}
```

Write to `.temp/figma-from-code/validation-summary.json`.

**Overall verdict:** `PASS` if >= 75% of compared screens are `match`. Otherwise `FAIL`.

### 5. Report

```
Phase 5 complete:
- {screensCompared} screens validated (full-page comparison)
- {match} match, {minorDiff} minor diff, {mismatch} mismatch
- {fixedDuringValidation} fixed during validation
- Average match: {averageMatchPct}%
- Overall verdict: {overallVerdict}
- Individual components already validated during Phase 3 build loop (not re-checked)
```

## Skip / Resume

Skip if `.temp/figma-from-code/validation-summary.json` exists and `state.json -> phases.phase5` is `complete`.

## Error Handling

| Scenario                          | Action                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Validator skill fails             | Report error; partial results may exist in `.temp/figma-validation/`         |
| Cleanup `use_figma` fails         | Report error; cleanup is non-critical — the components are already validated |
| Playwright server already stopped | Ignore the kill failure                                                      |
| Dev server not running            | Halt validation and tell the user to start the dev server                    |
