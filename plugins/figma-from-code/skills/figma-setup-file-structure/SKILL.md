---
name: figma-setup-file-structure
description: Create the project's Figma file page skeleton and foundations documentation frames. Run after figma-setup-variables and before component builds. This is Phase 2 of the code-to-Figma workflow.
---

# Skill: Set Up Figma File Structure

Creates the page layout and foundations documentation for the project's Figma file. This is Phase 2 of the code-to-Figma workflow — it must run after variables exist (Phase 1) and before components are built (Phase 3).

## When to Use

After `figma-setup-variables` has created the variable collections, before starting component work.

## Prerequisites

- Variable collections (`Palette`, `Semantic`, `Spacing`) must already exist in the file
- `figma:figma-use` skill MUST be loaded before any `use_figma` calls

## Required Inputs

- `fileKey`: The Figma file key

## Page Structure to Create

Rename/create pages in this exact order:

| Page Name | Purpose |
|-----------|---------|
| `🎨 Foundations` | Color swatches, type specimens, spacing scale |
| `📦 Components` | All component sets (built in Phase 3) |
| `📄 Screens` | Assembled page screens (built in Phase 4) |

If pages already exist with these names, skip creation.

## Foundations Page Content

On the `🎨 Foundations` page, create three documentation frames stacked vertically with 80px gaps. All content is driven by the Figma variables created in Phase 1 — never hardcode color values.

### Frame 1: Color Palette (y=0)

Name: `Color Palette`  
Width: 1200, height: auto  
Background: white  
Padding: 48px all sides  
Layout: VERTICAL, gap 40px

**Building the palette dynamically:**
1. Query all variables in the `Palette` collection via `figma.variables.getLocalVariablesAsync()`
2. Group variables by color family (the prefix before the `/` in the variable name, e.g., `gray`, `teal`)
3. For each color family, create a horizontal row:
   - Scale label: Inter Semi Bold 12px, `#64748b`, width 60px (the family name)
   - One swatch per step (50→950): 40×40px rectangle, cornerRadius 6, filled with the bound Palette variable
   - Tooltip text below showing the step number

### Frame 2: Semantic Colors (y = Frame1.height + 80)

Name: `Semantic Colors`  
Width: 1200, height: auto  
Background: white, padding 48px, vertical layout gap 32px

**Building semantic swatches dynamically:**
1. Query all variables in the `Semantic` collection
2. Group by the token's first path segment (e.g., `background`, `primary`, `border`, `sidebar`)
3. For each group, create a horizontal row with a label and swatches
4. Each swatch: 48×48px, cornerRadius 6, filled with the bound Semantic variable, label below (12px, `#64748b`, truncated to 14 chars)

### Frame 3: Spacing Scale (y = Frame2.y + Frame2.height + 80)

Name: `Spacing Scale`  
Width: 1200, height: auto  
Background: white, padding 48px, vertical layout gap 20px

Title: "Spacing Scale" (Inter Bold 24px)

Two sub-sections side by side (horizontal layout):

**Spacing:**  
Query all `spacing/*` variables from the `Spacing` collection. For each value:
- Horizontal row: colored rectangle (width = value px, height 24px), label "spacing/{n} = {value}px" (Inter Regular 13px, `#334155`)

**Border Radius:**  
Query all `radius/*` variables from the `Spacing` collection. For each value:
- Row: 32×32px white rectangle with border (`#e2e8f0`), cornerRadius = value, label "radius/{name} = {value}px"

## How to Execute

Load `figma:figma-use`, then work in small incremental `use_figma` calls:

1. **Call 1** — Set up pages (rename existing Page 1, create Components and Screens if missing)
2. **Call 2** — Create Color Palette frame (query Palette variables, build rows dynamically)
3. **Call 3** — Continue Color Palette if needed (may require multiple calls for large palettes)
4. **Call 4** — Create Semantic Colors frame (query Semantic variables, build rows dynamically)
5. **Call 5** — Create Spacing Scale frame (query Spacing variables, build rows dynamically)
6. **Call 6** — Screenshot all three frames for verification

After each call, `return` the created node IDs and take an inline `screenshot()`.

## Variable Binding in Swatches

Bind swatch fills to variables rather than hardcoding hex values:

```javascript
const vars = await figma.variables.getLocalVariablesAsync();
const colorVar = vars.find(v => v.name === "Palette/{family}/{step}");
const swatch = figma.createRectangle();
swatch.fills = [figma.variables.setBoundVariableForPaint(
  { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", colorVar
)];
```

## Feeds Into

`figma:figma-generate-library` Phase 3 (components). The Components page must exist before components are placed on it. The Foundations page gives the library skill a reference for what tokens are available.
