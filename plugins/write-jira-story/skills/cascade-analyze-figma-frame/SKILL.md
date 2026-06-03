---
name: cascade-analyze-figma-frame
description: "Sub-skill: Analyze a single Figma design frame from local files. Reads image.png (vision), structure.xml (component tree), and context.md (comments/annotations) from .temp/cascade/figma/{fileKey}/frames/{name}/. Writes analysis.md. Designed to run as a subagent — no MCP tools needed, pure filesystem."
---

# Analyze Figma Frame

Analyze a single Figma design frame using local files. This skill is designed to run as a **subagent** — it needs only filesystem access and LLM vision capability, no MCP tools.

## When to Use

This is a **sub-skill** called as a subagent by parent skills (generate-behavior-questions, write-jira-story) during parallel frame analysis. Each subagent instance analyzes one frame.

## Prerequisites

- Frame data exists locally in `.temp/cascade/figma/{fileKey}/frames/{dirName}/`:
  - `image.png` — screenshot of the frame (use as vision input)
  - `structure.xml` — semantic XML of the Figma component tree
  - `context.md` — comments, annotations, connections to other frames
- The analysis prompt exists at `.temp/cascade/figma/{fileKey}/prompts/frame-analysis.md`

## Procedure

### 1. Read input files

Read these files from the frame directory:

- **`image.png`** — View this image. This is the visual screenshot of the Figma frame. Use it as the primary input for visual analysis.
- **`structure.xml`** — The semantic XML component tree. Cross-reference visual elements with their component names, variants, and properties.
- **`context.md`** — Designer annotations, comments from stakeholders, connections to other frames. This provides intent and scope guidance.

### 2. Read analysis instructions

Read `.temp/cascade/figma/{fileKey}/prompts/frame-analysis.md` for the detailed analysis prompt.

### 3. Analyze the frame

Follow the analysis prompt instructions. Key analysis areas:

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
- Component names from `structure.xml`

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
- **❌ Out-of-Scope** — Features visible but excluded (check context.md for scope notes)
- **⏬ Low Priority** — Implement later
- **❓ Questions** — Ambiguous requirements that need clarification

**Important scope rules:**
- If `context.md` contains scope-limiting notes (e.g., "out of scope", "phase 2"), respect them
- If a feature is visible in the design but context says it's out-of-scope, mark it ❌
- Cross-reference with `structure.xml` for hidden or conditional elements

#### Technical Considerations
- Responsive/breakpoint implications
- Accessibility requirements (ARIA, keyboard nav, contrast)
- Loading states, error states, empty states
- Performance considerations (large lists, real-time updates)

### 4. Write analysis output

Write your complete analysis to `analysis.md` in the same frame directory:

```
.temp/cascade/figma/{fileKey}/frames/{dirName}/analysis.md
```

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

## Important Notes

- **Be exhaustive** — document every visible element with exact labels and text
- **Distinguish observation from inference** — clearly separate what you SEE from what you INFER about behavior
- **Cross-reference all three inputs** — the image shows what's visible, the XML shows component structure, the context shows intent
- **No MCP tools** — this skill runs as a subagent with filesystem access only
- **One frame per invocation** — analyze only the single frame in your working directory
