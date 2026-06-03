## Steps 4b, 4c: Compare — Inputs and Instructions

Compare a Figma component against its app screenshot and produce a verdict.
Do NOT attempt any fixes — only compare and report. If the verdict is not "match", Step 5 handles fixes.

Read the step-4-compare.md file at:
${CLAUDE_SKILL_DIR}/7-build-component/step-4-compare.md

Run Step 4b (sizing check), then Step 4c (pixel diff).

### Required inputs

- Component name: {componentName}
- Figma file key: {fileKey}
- Component node ID: {componentNodeId}
- Screenshot node ID: {screenshotNodeId}
- Sizing intent: from code.json
- App screenshot: .temp/figma-from-code/screenshots/{componentName}/app.png
- Figma screenshot: .temp/figma-from-code/screenshots/{componentName}/figma.png
- Screenshot dir: .temp/figma-from-code/screenshots/{componentName}/
- Instance check result: from Step 4a

### Expected output

```json
{
  "sizingCheck": { "verdict": "pass"|"fail", "issues": [...], "builtSize": {"w": N, "h": N} },
  "matchPct": 94.2,
  "borderMatchPct": 91.0,
  "verdict": "match"|"minor_diff"|"mismatch",
  "borderVerdict": "border_ok"|"border_diff"
}
```
