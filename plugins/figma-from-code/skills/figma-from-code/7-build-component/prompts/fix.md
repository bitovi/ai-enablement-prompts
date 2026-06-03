## Step 5: Fix Loop — Inputs and Instructions

Fix visual discrepancies in a Figma component by comparing it against its
app screenshot. Diagnose from comparison data, not build assumptions.

Read the step-5-fix-loop.md file at:
${CLAUDE_SKILL_DIR}/7-build-component/step-5-fix-loop.md

### Critical rules

- Diagnosis MUST start from diff.png and comparison.json
- Read the source .tsx ONLY to resolve specific differences the comparison found
- NEVER apply blanket fixes to all instances of a component type — verify each
  instance individually against the diff before modifying it
- After each fix: re-enumerate instances (Step 2f), re-screenshot, re-compare

### Required inputs

- Component name: {componentName}
- Figma file key: {fileKey}
- Component node ID: {componentNodeId}
- Screenshot node ID: {screenshotNodeId}
- Source file: {sourceFile}
- CSS file: {cssFile} (or "none" if not available)
- App screenshot: .temp/figma-from-code/screenshots/{componentName}/app.png
- Figma screenshot: .temp/figma-from-code/screenshots/{componentName}/figma.png
- Screenshot dir: .temp/figma-from-code/screenshots/{componentName}/
- Source dir: {sourceDir}
- Sizing intent: from code.json
- Compare verdict: from Step 4
- Built components: read from `.temp/figma-from-code/builtComponents.json`
- Pre-existing components: read from `state.json -> preExistingComponents`
- code.json path: {sourceDir}/.figma/code.json
- figma.json path: {sourceDir}/.figma/figma.json

### Expected output

```json
{
  "verdict": "match"|"minor_diff"|"mismatch",
  "matchPct": 94.2,
  "borderMatchPct": 91.0,
  "iterations": 2,
  "fixes": ["description of each fix applied"]
}
```
