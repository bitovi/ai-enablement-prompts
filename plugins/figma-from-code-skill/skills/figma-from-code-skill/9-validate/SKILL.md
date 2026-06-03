# Skill: Validate + Fix (Phase 5)

Validates every built Figma component against its app screenshot, runs fix loops on mismatches (built-during-run components only), cleans up misplaced components on the Components page, and produces a structured report. Runs as a subagent dispatched by the orchestrator.

## When to Use

- When `figma-from-code` orchestrator reaches Phase 5
- Standalone to validate a completed rebuild

## Required Inputs

| Input                   | Description                                      | Source                                  |
| ----------------------- | ------------------------------------------------ | --------------------------------------- |
| `fileKey`               | Figma file key                                   | State ledger                            |
| `builtComponents`       | Map of `{name: nodeId}` for all built components | `state.json -> builtComponents`         |
| `preExistingComponents` | Immutable snapshot of pre-run components         | `state.json -> preExistingComponents`   |
| `figmaNodes`            | All page and frame node IDs                      | `state.json -> figmaNodes`              |
| `buildOrder`            | Tiered component list                            | `state.json -> buildOrder`              |
| `devServerUrl`          | URL of the running dev server                    | State ledger or `<dev-server-url>` |

## Output Files

| File                                            | Contents                                     | Consumed by       |
| ----------------------------------------------- | -------------------------------------------- | ----------------- |
| `.temp/figma-validation/report.md`              | Full validation report with comparison table | User review       |
| `.temp/figma-from-code/validation-summary.json` | Small summary for the orchestrator           | Orchestrator only |

## Workflow

### 1. Run validation

Read and execute the `${CLAUDE_SKILL_DIR}/10-validator/SKILL.md` workflow inline. This:

- Inventories all Figma components
- Resolves variant nodes for component sets
- Captures app + Figma screenshots and runs pixel diffs for each component sequentially (by tier)
- Runs structural checks (variables, pages, screen sizes)
- Produces `.temp/figma-validation/report.md`

**Pre-Existing Components gate:** Components in `preExistingComponents` are validated **read-only**. Run screenshot + compare, record the verdict, but DO NOT invoke the fix loop. Surface mismatches in the report for user review.

Components built during this run (in `builtComponents` but not in `preExistingComponents`) follow the full fix loop (up to 3 iterations) per the review/fix workflow in `${CLAUDE_SKILL_DIR}/7-build-component/7b-review-fix-component/SKILL.md`.

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

Parse the report and write a concise summary for the orchestrator:

```json
{
  "componentsCompared": 60,
  "match": 52,
  "minorDiff": 5,
  "mismatch": 2,
  "noAppReference": 12,
  "fixedDuringValidation": 3,
  "averageMatchPct": 91.4,
  "overallVerdict": "PASS",
  "preExistingFlagged": [{ "name": "OldButton", "verdict": "mismatch", "matchPct": 68.2 }],
  "reportPath": ".temp/figma-validation/report.md"
}
```

Write to `.temp/figma-from-code/validation-summary.json`.

**Overall verdict:** `PASS` if >= 80% of compared components are `match`. Otherwise `FAIL`.

### 5. Report

```
Phase 5 complete:
- {componentsCompared} components validated
- {match} match, {minorDiff} minor diff, {mismatch} mismatch
- {noAppReference} skipped (no app reference)
- {fixedDuringValidation} fixed during validation
- Average match: {averageMatchPct}%
- Overall verdict: {overallVerdict}
- {preExistingFlagged.length} pre-existing components flagged for review
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
