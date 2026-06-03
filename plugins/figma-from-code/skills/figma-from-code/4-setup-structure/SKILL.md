# Skill: Setup File Structure (Phase 2)

Creates the Figma file skeleton and all container frames needed by later phases. Runs as a subagent dispatched by the orchestrator.

## When to Use

- When `figma-from-code` orchestrator reaches Phase 2
- Standalone to set up a fresh Figma file for a code-to-Figma rebuild

## Required Inputs

| Input           | Description                             | Source                    |
| --------------- | --------------------------------------- | ------------------------- |
| `fileKey`       | Figma file key                          | State ledger              |
| `existingPages` | Pages already present in the Figma file | Phase 0a Figma inspection |

## Output Files

| File                                           | Contents                    | Consumed by                                           |
| ---------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `.temp/figma-from-code/structure-summary.json` | All page and frame node IDs | Orchestrator (merges into `state.json -> figmaNodes`) |

## Workflow

### 1. Create pages and foundations

Load and run the `figma-setup-file-structure` skill. Pass `fileKey` and `existingPages`.

After completion, screenshot the Foundations page for visual verification.

### 2. Create Icons and Screens container frames

Create only the Icons frame (on the Components page) and the Screens container frame (on the Screens page). Tier frames are created on-demand at the start of each tier build in Phase 3.

```javascript
await figma.setCurrentPageAsync(componentsPage);

const iconsFrame = figma.createFrame();
iconsFrame.name = 'Icons';
iconsFrame.layoutMode = 'HORIZONTAL';
iconsFrame.primaryAxisSizingMode = 'AUTO';
iconsFrame.counterAxisSizingMode = 'AUTO';
iconsFrame.layoutWrap = 'WRAP';
iconsFrame.itemSpacing = 24;
iconsFrame.counterAxisSpacing = 24;
iconsFrame.paddingTop = 24;
iconsFrame.paddingBottom = 24;
iconsFrame.paddingLeft = 24;
iconsFrame.paddingRight = 24;
iconsFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
iconsFrame.x = 0;
iconsFrame.y = 0;
componentsPage.appendChild(iconsFrame);

await figma.setCurrentPageAsync(screensPage);
const screensFrame = figma.createFrame();
screensFrame.name = 'Screens';
screensFrame.layoutMode = 'HORIZONTAL';
screensFrame.primaryAxisSizingMode = 'AUTO';
screensFrame.counterAxisSizingMode = 'AUTO';
screensFrame.itemSpacing = 80;
screensFrame.paddingTop = 80;
screensFrame.paddingBottom = 80;
screensFrame.paddingLeft = 80;
screensFrame.paddingRight = 80;
screensFrame.fills = [{ type: 'SOLID', color: { r: 0.973, g: 0.973, b: 0.98 } }];
screensFrame.x = 0;
screensFrame.y = 0;
screensPage.appendChild(screensFrame);

return { iconsFrameId: iconsFrame.id, screensFrameId: screensFrame.id };
```

### 3. Screenshot for verification

Take a screenshot of the Components page to verify the Icons frame was created:

```
get_screenshot(fileKey, componentsPageId)
```

### 4. Write summary

Write the page and container frame node IDs to the summary file:

```json
{
  "foundationsPageId": "...",
  "componentsPageId": "...",
  "screensPageId": "...",
  "foundationsFrameId": "...",
  "iconsFrameId": "...",
  "screensFrameId": "...",
  "foundationsScreenshot": ".temp/figma-from-code/screenshots/foundations.png"
}
```

Write to `.temp/figma-from-code/structure-summary.json`.

### 5. Report

```
Phase 2 complete:
- 3 pages created (Foundations, Components, Screens)
- Icons frame + Screens container frame created
- Tier frames will be created on-demand at the start of each Phase 3 tier build
```

## Skip / Resume

Skip if all conditions are met:

- `.temp/figma-from-code/structure-summary.json` exists
- All page IDs, `iconsFrameId`, and `screensFrameId` in the summary are verified to exist in Figma (use `get_metadata` or `use_figma` to check)

## Error Handling

| Scenario                              | Action                                                         |
| ------------------------------------- | -------------------------------------------------------------- |
| `figma-setup-file-structure` fails    | Report error; page/foundations creation is required            |
| `use_figma` tier frame creation fails | Retry once; if still failing, report which frames were created |
| Pages already exist but frames don't  | Create only the missing frames (idempotent)                    |
