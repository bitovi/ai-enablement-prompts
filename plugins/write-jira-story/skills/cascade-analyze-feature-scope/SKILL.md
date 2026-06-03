---
name: cascade-analyze-feature-scope
description: "Sub-skill: Produce a Scope Analysis from frame analyses and all gathered context. This is the critical step that takes per-frame analyses + epic context + Confluence/Google Docs + Figma comments and categorizes every feature by scope (☐/✅/⏬/❌/❓/💬). Groups features by user workflow, not by screen. Supports self-healing ❓→💬 flipping on re-runs. Output drives all downstream work (questions, shell stories, story writing)."
---

# Scope Analysis

Produce a **Scope Analysis** — the central artifact that drives all downstream work. This takes per-frame analyses, epic context, reference documentation, and Figma comments, then categorizes every observed feature by scope and groups them by user workflow.

This is the most critical step in the pipeline. Questions, shell stories, and story descriptions all consume the scope analysis as their primary input.

## When to Use

This is a **sub-skill** — called by parent skills after all content has been loaded, analyzed, and all Figma frames have been analyzed. Every parent skill (generate-questions, write-jira-story) needs scope analysis before proceeding.

## Prerequisites

- Figma frame analyses exist at `.temp/cascade/figma/{fileKey}/frames/*/analysis.md`
- Content summaries exist at `.temp/cascade/context/*-summary.md`
- All content loading iterations are complete (no unloaded URLs remain in `to-load.md`)
- Epic context is available (from the Jira issue loaded by `load-linked-resource-content`)

## Procedure

### 1. Gather all inputs

Read these files:

**Epic context (PRIMARY source of truth for scope decisions):**
- `.temp/cascade/context/jira-{epicKey}.md` — the epic/story description
- If the epic already has a `## Scope Analysis` section, extract it as the "previous scope analysis" for regeneration

**Figma frame analyses:**
- All `analysis.md` files from `.temp/cascade/figma/{fileKey}/frames/*/analysis.md`
- If multiple Figma files, gather from all file keys

**Reference documentation:**
- All `*-summary.md` files from `.temp/cascade/context/` (Confluence, Google Docs summaries)
- Read the full content files too if summaries are insufficient

**Figma annotations (per-frame):**
- `.temp/cascade/figma/{fileKey}/frames/*/context.md` — comments, notes, and connections per frame
- These may contain answers to previously asked questions

### 2. Check the codebase (if available)

**This step is conditional** — only perform if the agent has access to a local codebase (e.g. workspace file access in VS Code Copilot, Claude Code, or similar). If no codebase is accessible, skip to step 3.

When codebase is available, use it as the **primary source of truth for what is already implemented**. This replaces the need for the epic description to enumerate existing vs. new features — the code tells you directly.

#### What to search for

For each feature area identified from the Figma frame analyses:

1. **UI components** — search for component file names, component identifiers, or CSS class names that match the feature (e.g. `VoteButton`, `thumbs-up`, `upvote`)
2. **API routes / handlers** — search for route definitions, endpoint names, or controller methods related to the feature (e.g. `/comments/:id/vote`, `voteComment`)
3. **Feature flags** — search for flags or config keys related to the feature
4. **Data models / types** — search for type definitions or schema fields related to the feature (e.g. `upvoteCount`, `voteDirection`)

Use semantic search, grep, or file search as appropriate. Cast a wide net — look for partial matches and synonyms.

#### How to use the findings

- **Feature found in code and appears complete** → mark ✅ (note the file/component as evidence)
- **Feature found in code but appears partial or stubbed** → mark ☐ with a note: "Partial: {what exists}"
- **Feature not found in code** → mark ☐ (new work)
- **Feature explicitly excluded in epic context** → keep ❌ regardless of codebase state
- **Conflict between codebase and epic** → flag with ⚠️ in the feature description

#### Codebase check summary

After searching, write a brief summary to `.temp/cascade/codebase-check.md`:
```
## Codebase Check Summary
- Searched: {what you searched for}
- Found implemented: {list of features with file references}
- Found partial: {list with notes}
- Not found: {list}
```

This summary is used to inform ✅ categorization and Developer Notes in the final story.



### 3. Produce the Scope Analysis

#### FUNDAMENTAL RULE: EVIDENCE-BASED ONLY

Every feature listed MUST reference actual UI elements or functionality explicitly described in frame analyses. Do NOT infer, assume, or speculate about features not shown in the screens. If a UI element is visible but its purpose/behavior is unclear, list it as ❓.

#### Categorization Rules

- **☐ In-Scope**: Features explicitly in-scope in epic context AND not listed as existing/out-of-scope/low-priority. Only mark ☐ if they are new capabilities being added. When the epic provides scope context, existing UI elements may be shown for context but aren't new features.
- **✅ Already Done**: Features confirmed as already implemented. Source of truth (in priority order): (1) codebase — if found in code, mark ✅ with file reference; (2) epic context — if epic explicitly states something is already done. Keep descriptions brief.
- **⏬ Low Priority**: Features the epic explicitly says to implement later/at the end. These WILL be implemented in this epic, just after core features. If visible in screens but not mentioned in epic, assume ☐ instead.
- **❌ Out-of-Scope**: Features explicitly excluded from epic OR marked for future epics. These will NOT be implemented in this epic. Keep brief.
- **❓ Questions**: Ambiguous behaviors, unclear requirements, missing information that has NO ANSWER in any context source. Mark ❓ ONLY if truly unanswered across all context.
- **💬 Answered Questions**: Questions that HAVE BEEN ANSWERED in any context source (epic description, Confluence, Google Docs, Figma comments, inline answers after ❓ markers). Format: `💬 {question} → {answer found in context}`

#### Epic Context is the Source of Truth

**Epic context ALWAYS WINS for scope decisions:**
- If epic says a feature is existing → mark ✅ even if UI is prominent
- If epic says "delay until end" → mark ⏬ even if UI shows it as primary
- If epic says a feature is out-of-scope → mark ❌ even if UI exists
- If epic says "We already have X" → that's ✅ Already Done
- If epic says "delay X until end" or "do X last" → that's ⏬ Low Priority
- If epic says "Future epic: X" or "Not included: X" → that's ❌ Out-of-Scope

#### Question Answering — Check ALL Sources Before Marking ❓

Before marking any question as ❓, check ALL context sources:
1. Codebase — existing implementation may answer behavioral questions directly
2. Epic description — may contain inline answers or clarifications
3. Confluence docs and Google Docs — may have detailed specifications
4. Figma per-frame annotations — resolved threads often contain decisions
5. Previous scope analysis — if regenerating, check for inline answers added after ❓ items

If ANY source provides a clear answer → mark 💬, NOT ❓.

#### Regeneration Rules (❓ → 💬 Flipping)

When a previous scope analysis exists (the epic already has a `## Scope Analysis` section):
- If a ❓ question now has an answer (inline text added after the ❓, or new Figma comment reply in per-frame `context.md`, or new Confluence/Google Doc content) → flip to 💬 with the answer
- If a ❓ question remains unanswered → keep as ❓
- Preserve all other content (features, groupings) unless new information changes them

#### Grouping Rules

- Group features by **user workflow and functional areas** (e.g., "Authentication Flow", "User Profile Management", "Data Entry Workflow")
- Focus on how users interact with features, NOT UI location or technical architecture
- Each feature area must list relevant Figma screen links
- A screen may appear in multiple feature areas if it contains multiple types of functionality
- Create a "Remaining Questions" section for cross-cutting or general questions

#### Feature Description Verbosity

- **☐ In-Scope**: Concise for obvious features, detailed for complex ones
- **⏬ Low Priority**: Same as ☐ plus timing note (e.g., "delay until end per epic")
- **✅ Already Done**: Brief — not part of new work
- **❌ Out-of-Scope**: Brief — won't be implemented this epic

#### Question Deduplication

- If a question is relevant to multiple areas, list only in the FIRST area
- Questions not associated with a specific area → "Remaining Questions" section

### 4. Write the scope analysis

Save to `.temp/cascade/scope-analysis.md`:

```
.temp/cascade/
├── scope-analysis.md               ← this file (THE key artifact)
├── context/                        ← content summaries
│   ├── jira-PROJ-123.md
│   ├── jira-PROJ-123-summary.md
│   └── confluence-spec-summary.md
└── figma/
    └── {fileKey}/
        └── frames/
            └── */
                ├── context.md
                └── analysis.md       ← frame analyses
```

### 5. Self-healing decision (report to parent skill)

Count the ❓ markers in the scope analysis. Report:

- **Feature area count**: How many workflow groups
- **Marker counts**: ☐ in-scope, ✅ already done, ⏬ low priority, ❌ out-of-scope, ❓ unanswered, 💬 answered
- **Self-healing recommendation**:
  - If ≤5 unanswered ❓ → recommend **PROCEED** (enough clarity to move forward)
  - If >5 unanswered ❓ and no previous scope analysis → recommend **CLARIFY** (too many unknowns — ask questions first)
  - If >5 unanswered ❓ and had previous scope analysis → recommend **REGENERATE** (check if answers were added)

The parent skill decides what to do with this recommendation.

## Output Format

```markdown
# Scope Analysis: {Feature/Epic Name}

## Feature Overview
{high-level description synthesized from all sources}

## User Journeys

### Journey 1: {Name}
1. {step referencing Frame Name}
2. {step}

## Feature Inventory

### {Workflow Area 1}
Screens: [Screen Name](figma-url), [Another Screen](figma-url)

- ☐ **{Feature}**: {description}
- ☐ **{Complex Feature}**: {detailed description with validation, error handling, etc.}
- ✅ **{Existing Feature}**: {brief description}
- ❓ **{Open Question}**: {what needs clarification, with enough context}
- 💬 **{Answered Question}**: {question} → {answer from context source}

### {Workflow Area 2}
Screens: [Screen Name](figma-url)

- ☐ **{Feature}**: {description}
- ⏬ **{Low Priority Feature}**: {description} (delay until end per epic)
- ❌ **{Excluded Feature}**: {brief description} (future epic)

### Remaining Questions
- ❓ **{Cross-cutting question}**: {description}

## Cross-Screen Patterns
- {shared components, consistent behaviors, design system usage}

## Technical Scope
- {APIs, data models, architecture implications}

## Implementation Notes
- {dependencies, constraints, decisions from documentation}
```

## Important Notes

- **This is THE critical artifact** — everything downstream (questions, stories) depends on a good scope analysis
- **Evidence-based only** — every feature must reference actual UI elements from frame analyses or specific text from content summaries
- **Epic context wins** — never override explicit epic scope decisions based on what's visible in designs
- **Contradiction flagging** — if Figma shows something different from what Jira/Confluence says, flag with ⚠️
- **No invention** — don't add features or requirements not present in any source material
- **Collapse all-done sections** — if a workflow area has ONLY ✅ items, collapse it into a brief "Already Completed Areas" summary at the end to reduce noise
