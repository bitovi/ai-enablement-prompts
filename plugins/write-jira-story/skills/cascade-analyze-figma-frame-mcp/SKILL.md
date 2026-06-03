---
name: cascade-analyze-figma-frame-mcp
description: "Sub-skill: Analyze a single Figma design frame via the figma-frame-data MCP tool. Use this variant when local files are NOT available (e.g., GitHub cloud Copilot where curl is blocked). Calls figma-frame-data with a batchToken to retrieve image, structure, and context via MCP, then analyzes and returns the analysis as text. No filesystem reads needed — pure MCP."
---

# Analyze Figma Frame (MCP)

Analyze a single Figma design frame by retrieving its data via the `figma-frame-data` MCP tool. This skill is designed for environments where local files are NOT available (e.g., GitHub cloud Copilot where `curl` cannot download zip files).

Use `cascade-analyze-figma-frame` (the filesystem variant) when local files ARE available — it's faster and avoids MCP round-trips.

## When to Use

This is a **sub-skill** called as a subagent by parent skills during parallel frame analysis when the **cache path** is being used (i.e., `figma-batch-cache` was called instead of `figma-batch-zip`).

The parent skill passes:
- The frame's **Figma URL** (with `node-id`)
- The **batchToken** from `figma-batch-cache`

## Prerequisites

- Cascade MCP server connected (tools available)
- A valid `batchToken` from a prior `figma-batch-cache` call
- The frame's Figma URL (must contain `node-id`)

## Procedure

### 1. Retrieve frame data via MCP

Call the MCP tool `figma-frame-data` with:
- `url`: The Figma URL for this frame (passed by parent)
- `batchToken`: The batch token (passed by parent)
- `includeStructure`: `true`

The tool returns multiple content blocks:
- **Image** — The frame screenshot (use as vision input for analysis)
- **Context markdown** — Designer annotations, comments, connections to other frames
- **Structure XML** — Semantic XML component tree
- **Metadata JSON** — Frame ID, name, file key

### 2. Analyze the frame

Using the image, context, and structure from the MCP response, perform the analysis. Key analysis areas:

#### Page Structure
- Header, navigation, layout regions
- Visual hierarchy and content flow

#### Layout Structure Analysis
- Grid dimensions (count rows, columns systematically)
- Element mapping within the grid
- Spacing and alignment patterns

#### Primary UI Elements
- Buttons, forms, tabs, dropdowns — with **exact labels** from the design
- Visual states: active, hover, disabled, selected, empty
- Component names from the structure XML

#### Data Display
- Tables, lists, cards, charts
- Visual indicators (badges, status icons, progress bars)
- Data formatting patterns

#### Interactive Behaviors
- Clickable elements and expected actions
- State changes (toggle, expand/collapse, modal triggers)
- Navigation flows (where does clicking go?)

#### Scope Assessment
Categorize observed features using scope markers:
- **☐ In-Scope** — New work to implement
- **✅ Already Done** — Existing functionality visible in the design
- **❌ Out-of-Scope** — Features visible but excluded (check context for scope notes)
- **⏬ Low Priority** — Implement later
- **❓ Questions** — Ambiguous requirements that need clarification

**Important scope rules:**
- If context contains scope-limiting notes (e.g., "out of scope", "phase 2"), respect them
- If a feature is visible in the design but context says it's out-of-scope, mark it ❌
- Cross-reference with the structure XML for hidden or conditional elements

#### Technical Considerations
- Responsive/breakpoint implications
- Accessibility requirements (ARIA, keyboard nav, contrast)
- Loading states, error states, empty states
- Performance considerations (large lists, real-time updates)

### 3. Return analysis

Return your complete analysis as text to the parent agent. **Do NOT write files** — the parent agent will handle collecting analyses from all frame subagents.

## Output Format

```markdown
# Frame Analysis: {Frame Name}

## Page Structure
{header, navigation, layout description}

## Layout Structure Analysis
{grid dimensions, element mapping}

## Primary UI Elements
{buttons, forms, tabs with exact labels}

## Data Display
{tables, lists, visual indicators}

## Interactive Behaviors
{clickable elements, state changes}

## Scope Assessment
- ☐ {in-scope feature}: {description}
- ✅ {already done feature}: {description}
- ❌ {out-of-scope feature}: {description}
- ❓ {question about ambiguous feature}

## Technical Considerations
{responsive, accessibility, loading states}
```
