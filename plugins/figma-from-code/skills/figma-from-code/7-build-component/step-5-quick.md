# Step 5 Quick: Fix Loop + Rebind Sweep

> **Condensed reference.** For the full discrepancy patterns table, detailed rebind sweep script, and Discovered collection creation logic, read `step-5-fix-loop.md`.

## Fix Loop (up to 3 iterations)

Enter when verdict is `minor_diff` or `mismatch`, OR when Step 4a/4b failed.

### Per-iteration:

**5a. Diagnose** — use all inputs together:
1. Step 4a result → if `missing_instances`, fix those FIRST
2. Step 4b result → if `size_mismatch`, fix sizing NEXT
3. `diff.png` → red regions show exactly where pixels differ
4. `app.png` → what it should look like
5. `figma.png` → what was built
6. Source `.tsx` → Tailwind classes reveal intended values

**Common fixes:**

| Symptom | Fix |
|---------|-----|
| Missing instances | Replace local frames/text with `master.createInstance()` |
| Too small (fill intent) | Set `primaryAxisSizingMode='FIXED'`, resize, set children to FILL |
| Wrong color | Resolve via `resolve-color.js`, bind variable |
| Wrong spacing | Adjust `itemSpacing` or padding values |
| Wrong radius | Adjust `cornerRadius` |
| Wrong text | `loadFontAsync` + `setCharacters` |
| Missing element | Add missing child |

**5b. Apply fix** — targeted `use_figma` call changing only identified properties.

**Color fixes:** Always resolve first:
```bash
node {skillRoot}/scripts/resolve-color.js '#2563eb' --context fill
```
If variable returned → bind it. If `match: "none"` → hardcode RGB.

**5c. Re-enumerate, re-screenshot, re-compare:**
1. Re-run Step 2f enumeration (refresh `.figma/figma.json`)
2. If 4a previously failed → re-run `check-instances.js`
3. Re-screenshot: `get_screenshot(fileKey, screenshotNodeId)`
4. Re-compare: `node {skillRoot}/scripts/compare.js ...`

**5d. Evaluate:**
- `match` → exit loop, report as fixed
- Improved but not passing → next iteration
- 3 iterations done → exit, report `partial_match`

## Step 5R: Variable Rebind Sweep (ALWAYS runs)

Runs after the fix loop exits — even if comparison was `match` or `no_app_reference`. Catches hardcoded colors from any source (build fallbacks, stateStyles, fix edits).

**What it does:** Walks the component tree, finds SOLID fills/strokes without variable bindings, matches against `color-index.json` (tolerance: 3), binds matches. Creates "Discovered" collection variables for unmatched colors.

**Does NOT change rendered pixels** — only adds variable bindings where the resolved color already matches. No re-screenshot needed.

**Skip conditions:**
- `color-index.json` missing → skip, note `rebindSweep: "skipped_no_index"`
- Does not descend into INSTANCE nodes (their colors come from masters)

**Report shape:** `{ rebound: N, alreadyBound: N, unmatched: ["r,g,b", ...], created: [...] }`

## Steps 6 & 7: Track + Return

**Step 6:** Verify `.figma/code.json` and `.figma/figma.json` exist, refresh `updatedAt`, sanity-check invariants (names match, nodeId matches, fileKey matches).

**Step 7:** Write final result to `.temp/figma-from-code/build-results/{componentName}.json`:

```json
{
  "componentName": "...",
  "status": "success | partial_match | no_app_reference | needs_authorization | rejected | failed",
  "nodeId": "...",
  "screenshotNodeId": "...",
  "type": "COMPONENT_SET | COMPONENT",
  "variants": [{ "name": "...", "nodeId": "..." }],
  "figmaScreenshot": "...",
  "comparison": { "verdict": "...", "matchPct": 94.2, "borderMatchPct": 91.0, "iterations": 1, "fixes": [] },
  "preExistingTouched": [],
  "missingChildren": [],
  "rebindSweep": { "rebound": 3, "alreadyBound": 12, "unmatched": [] },
  "trackingFile": { "written": true }
}
```
