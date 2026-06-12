# Skill: Setup File Structure (Phase 2)

Creates the Figma file page skeleton, foundations documentation frames, and container frames needed by later phases. Runs as a subagent dispatched by the orchestrator, or standalone to set up a fresh Figma file for a code-to-Figma rebuild.

## When to Use

- When `figma-from-code` orchestrator reaches Phase 2
- Standalone to set up a fresh Figma file after variable collections exist

## Prerequisites

- Variable collections (`Palette`, `Semantic`, `Spacing`) must already exist in the file (Phase 1 complete)
- Load `figma:figma-use` (mandatory) before any `use_figma` call

## Required Inputs

| Input           | Description                             | Source                    |
| --------------- | --------------------------------------- | ------------------------- |
| `fileKey`       | Figma file key                          | State ledger              |
| `existingPages` | Pages already present in the Figma file | Phase 0a Figma inspection |

> Placeholders like `{skillRoot}` resolve from `state.json → config`.

## Output Files

| File                                           | Contents                    | Consumed by                                           |
| ---------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `.temp/figma-from-code/structure-summary.json` | All page and frame node IDs | Orchestrator (merges into `state.json -> figmaNodes`) |

## Workflow

### 1. Create Pages

Rename/create pages in this exact order. If a page with the target name already appears in `existingPages`, skip its creation.

| Page Name        | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `🎨 Foundations` | Color swatches, type specimens, spacing scale   |
| `📦 Components`  | All component sets (built in Phase 3)           |
| `📄 Screens`     | Assembled page screens (built in Phase 4)       |

### 2. Build Foundations Page Content

On the `🎨 Foundations` page, create three documentation frames stacked vertically with 80px gaps. All content is driven by the Figma variables created in Phase 1 — never hardcode color values.

Work in separate incremental `use_figma` calls (one per frame) to stay under the size limit. After each call, capture the returned node IDs and take an inline screenshot for verification.

#### Frame 1: Color Palette (y=0)

Name: `Color Palette`
Width: 1200, height: auto
Background: white, padding: 48px all sides
Layout: VERTICAL, gap 40px

Building the palette dynamically:
1. Query all variables in the `Palette` collection via `figma.variables.getLocalVariablesAsync()`
2. Group by color family (the prefix before `/` in the variable name, e.g., `gray`, `teal`)
3. For each family, create a horizontal row:
   - Scale label: Inter Semi Bold 12px, `#64748b`, width 60px (family name)
   - One swatch per step (50→950): 40×40px rectangle, cornerRadius 6, filled with the bound Palette variable
   - Tooltip text below showing the step number

Bind swatch fills to variables rather than hardcoding hex values:

```javascript
const vars = await figma.variables.getLocalVariablesAsync();
const colorVar = vars.find(v => v.name === "Palette/{family}/{step}");
const swatch = figma.createRectangle();
swatch.fills = [figma.variables.setBoundVariableForPaint(
  { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", colorVar
)];
```

#### Frame 2: Semantic Colors (y = Frame1.height + 80)

Name: `Semantic Colors`
Width: 1200, height: auto
Background: white, padding: 48px, layout: VERTICAL, gap: 32px

Building semantic swatches dynamically:
1. Query all variables in the `Semantic` collection
2. Group by the token's first path segment (e.g., `background`, `primary`, `border`, `sidebar`)
3. For each group, create a horizontal row with a label and swatches
4. Each swatch: 48×48px, cornerRadius 6, filled with the bound Semantic variable, label below (12px, `#64748b`, truncated to 14 chars)

#### Frame 3: Spacing Scale (y = Frame2.y + Frame2.height + 80)

Name: `Spacing Scale`
Width: 1200, height: auto
Background: white, padding: 48px, layout: VERTICAL, gap: 20px

Title: "Spacing Scale" (Inter Bold 24px)

Two sub-sections side by side (horizontal layout):

**Spacing:** Query all `spacing/*` variables from the `Spacing` collection. For each value:
- Horizontal row: colored rectangle (width = value px, height 24px), label `spacing/{n} = {value}px` (Inter Regular 13px, `#334155`)

**Border Radius:** Query all `radius/*` variables from the `Spacing` collection. For each value:
- Row: 32×32px white rectangle with border (`#e2e8f0`), cornerRadius = value, label `radius/{name} = {value}px`

### 3. Create Icons and Screens Container Frames

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

### 4. Screenshot for Verification

Take a screenshot of the Foundations page and the Components page:

```
get_screenshot(fileKey, foundationsPageId)
get_screenshot(fileKey, componentsPageId)
```

### 5. Write Summary

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

### 6. Report

```
Phase 2 complete:
- 3 pages created (Foundations, Components, Screens)
- Foundations page: Color Palette, Semantic Colors, and Spacing Scale frames created
- Icons frame + Screens container frame created
- Tier frames will be created on-demand at the start of each Phase 3 tier build
```

## Skip / Resume

Skip the entire phase if `.temp/figma-from-code/structure-summary.json` exists and all page IDs, `iconsFrameId`, and `screensFrameId` in the summary are verified to exist in Figma (use `get_metadata` or `use_figma` to check).

If the summary file exists but some node IDs are missing or invalid, create only the missing pages/frames (all steps are idempotent — skip creation of any page or frame that already exists).

## Error Handling

| Scenario                              | Action                                                         |
| ------------------------------------- | -------------------------------------------------------------- |
| Page/foundations frame creation fails | Report error; page creation is required for downstream phases  |
| `use_figma` container frame fails     | Retry once; if still failing, report which frames were created |
| Pages already exist but frames don't  | Create only the missing frames (idempotent)                    |
