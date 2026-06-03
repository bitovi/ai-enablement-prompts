## Step 1: Analyze — Inputs and Instructions

Analyze a React component's source code and produce a `code.json` analysis file.

Read the step-1-analyze.md file at:
${CLAUDE_SKILL_DIR}/7-build-component/step-1-analyze.md

Follow ALL sub-steps (0 through 1g). Write code.json to:
{sourceDir}/.figma/code.json

### Required inputs

- Component name: {componentName}
- Source file: {sourceFile}
- Source dir: {sourceDir}
- Built components: read from `.temp/figma-from-code/builtComponents.json`
- Pre-existing components: read from `state.json -> preExistingComponents`
- Dev server URL: {devServerUrl}

Screenshot dir convention: `.temp/figma-from-code/screenshots/{componentName}/`

### Early exit conditions

If {componentName} appears as a key in preExistingComponents, this component
pre-dates the current pipeline run. Write a result file with "status": "needs_authorization"
and "preExistingTouched": ["{componentName}"] to
.temp/figma-from-code/build-results/{componentName}.json and stop immediately.
Do NOT analyze, do NOT write code.json — just write the rejection and return.

If any child component is missing from builtComponents, write a rejection result
(status: "rejected", missingChildren: [...]) to
.temp/figma-from-code/build-results/{componentName}.json and stop.
