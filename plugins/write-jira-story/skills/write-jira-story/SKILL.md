---
name: write-jira-story
description: "Write or refine a Jira story description with full context from Figma designs, Confluence docs, Google Docs, and parent epic. Gathers all linked resources, analyzes Figma frames, runs scope analysis, and writes a comprehensive story with User Story Statement, Scope Analysis, Acceptance Criteria (Gherkin), NFRs, and Developer Notes. Uses ☐/✅/❌/❓/💬 scope markers and flips ❓→💬 when answers are found."
---

# Write Story

Write or refine a Jira story description using comprehensive context from all linked sources (Figma, Confluence, Google Docs, parent epic).

## When to Use

Use when the user wants to:
- Write a new story description from Figma designs and specs
- Refine an existing story with newly available context (answered questions, updated designs)
- Re-run story writing to incorporate inline answers (❓ → 💬 flipping)

Typical triggers:
- "Write the story for PROJ-456"
- "Update PROJ-456 with the latest design context"
- "Refine this story — questions have been answered"

## Required Input

- **Jira issue key** (e.g., `PROJ-456`) — the story to write/refine

## Procedure

### Phase 1: Fetch the Starting Issue

Call MCP tool `extract-linked-resources` with the Jira issue URL (e.g., `https://myco.atlassian.net/browse/PROJ-456`).

Save the returned markdown+frontmatter directly to `.temp/cascade/context/jira-PROJ-456.md`.

Parse `discoveredLinks` from frontmatter to build `.temp/cascade/context/to-load.md`.

### Phase 2: Iterative Content Loading

For each non-Figma URL in `to-load.md` (prioritize `parent` and `blocks` relationships first):

1. Call `extract-linked-resources` with the URL
2. Save the returned markdown to `.temp/cascade/context/{type}-{identifier}.md`
3. Parse `discoveredLinks` from frontmatter — add any new URLs to `to-load.md`
4. Repeat until no unloaded non-Figma URLs remain

### Phase 3: Figma Batch Load

For each Figma URL:

1. Call `figma-batch-zip` with the URL
   - This returns a `downloadUrl` and `manifest`
2. Try to download and extract:
   ```
   curl -sL "{downloadUrl}" -o /tmp/cascade-figma.zip && unzip -qo /tmp/cascade-figma.zip -d .temp/cascade/figma/ && rm /tmp/cascade-figma.zip
   ```
3. **If curl fails** (e.g., DNS blocked in cloud environments):
   - Call `figma-batch-cache` with the same Figma URLs
   - Note the `batchToken` and `manifest` from the response

### Phase 4: Parallel Frame Analysis

**Choose the matching path based on Phase 3 outcome:**

#### Path A: Local files available (zip succeeded)

For each frame in `manifest.json`, launch a **subagent** with the `cascade-analyze-figma-frame` sub-skill.

**Pass only the frame directory path** (e.g., `.temp/cascade/figma/{fileKey}/frames/{dirName}/`). Do NOT read context.md, structure.xml, or image.png yourself — the subagent reads all files internally.

#### Path B: MCP cache (curl failed, using batch cache)

For each frame in the `manifest` from `figma-batch-cache`, launch a **subagent** with the `cascade-analyze-figma-frame-mcp` sub-skill.

Pass the frame's **Figma URL** and the **batchToken**. The subagent calls `figma-frame-data(url, batchToken)` to retrieve data via MCP.

Run all subagents in parallel.

### Phase 5: Scope Analysis

Use `analyze-feature-scope` sub-skill to produce `.temp/cascade/scope-analysis.md`. This categorizes every feature by scope (☐/✅/⏬/❌/❓/💬) using the epic context as the primary source of truth.

**Self-healing check**: If the `analyze-feature-scope` sub-skill recommends **CLARIFY** (>5 unanswered ❓ and no previous scope analysis), warn the user that there are many open questions. Suggest running `generate-behavior-questions` first to get answers before writing the story. Proceed only if the user confirms.

### Phase 6: Read Existing Description

Call `atlassian-get-issue` to get the current story description (if it exists). This is needed to:
- Detect if this is a first run or subsequent run
- Find ❓ markers that may now have inline answers (💬 flipping)
- Preserve content the user added manually

### Phase 7: Write Story Description

Using the scope analysis (`.temp/cascade/scope-analysis.md`), frame analyses, content summaries, Figma comments, and existing description (if any), write the story description.

#### Story Format

```markdown
## User Story Statement
As a {role}, I want {capability} so that {benefit}.

## Supporting Artifacts
- **Figma**: [Screen Name](figma-url) | [Another Screen](figma-url)
- **Confluence**: [Spec Title](confluence-url)
- **Epic**: [PROJ-123](jira-url): {epic summary}

<details>
<summary>Scope Analysis</summary>

### {Feature Area}
- ☐ **{Feature}**: {description} — [Screen Name](figma-url)
- ✅ **{Existing Feature}**: {description}
- ❌ **{Out of Scope}**: {why excluded}
- ❓ **{Open Question}**: {what needs clarification}
- 💬 **{Answered Question}**: {question} → {answer from comments/context}

</details>

## Non-Functional Requirements
{ONLY include if explicitly mentioned in context — do NOT invent}
- Performance: {specific requirement from specs}
- Accessibility: {specific requirement from specs}

## Developer Notes
{ONLY include if explicitly mentioned in context — do NOT invent}
- {specific technical guidance from Confluence, Google Docs, or Jira comments}

## Acceptance Criteria

**GIVEN** {precondition}:

[View in Figma](figma-url)

- **WHEN** {user action}, **THEN**
  - {expected result 1}
  - {expected result 2}
  
  [View state in Figma](figma-url)

  - **WHEN** {subsequent action}, **THEN**
    - {nested expected result}

**GIVEN** {another precondition}:

- **WHEN** {user action}, **THEN**
  - {expected result}
```

**Note on Scope Analysis formatting**: Wrap the Scope Analysis content in `<details><summary>Scope Analysis</summary>...</details>` as shown above. The MCP tool will convert this to a collapsible expand panel in Jira automatically.

#### Critical Story Writing Rules

1. **Scope markers in Scope Analysis only** — ❓ markers go in the Scope Analysis section, NOT in Acceptance Criteria
2. **Preserve original links** — always keep Figma URLs, Confluence links, etc. from the original context
3. **Nested Gherkin for ACs** — use **GIVEN** / **WHEN** / **THEN** (all caps, all bolded). WHEN and THEN always have a space before them on their own line or inline. Nest subsequent WHEN/THEN inside bullet points. Embed Figma links inline below the relevant GIVEN or THEN clause
4. **No invention** — NFRs and Developer Notes are ONLY included if explicitly stated in source context. Do NOT add generic requirements
5. **Evidence-based** — every feature in the scope analysis must reference actual UI elements or explicit requirements

#### Subsequent Run Behavior (❓ → 💬 Flipping)

When the story already has a description:

1. **Check for inline answers**: Look for ❓ items in the existing description that now have answers in:
   - Figma comments (new replies to questions)
   - Jira comments on the story or parent epic
   - Updated Confluence/Google Doc content
2. **Flip ❓ → 💬**: Change answered questions from ❓ to 💬 and include the answer
3. **Incorporate new context**: Add any new information from updated sources
4. **Preserve user edits**: Don't remove content that the user manually added to the description

### Phase 9: Update Jira

Call MCP tool `atlassian-update-issue-description` to write the story description to Jira.

Present the updated description to the user and confirm the update was successful.

## Important Notes

- **Reference example**: See `example-story.md` in this skill folder for a complete worked example of the expected output format, including nested Gherkin, scope markers, and `<details>` wrapping
- **First run vs. subsequent run**: The skill handles both — first run creates from scratch, subsequent runs refine with new context
- **💬 flipping is key**: The main value of re-running is converting ❓ to 💬 as questions get answered across sources
- **Don't over-scope**: The story description should only cover what's in the scope analysis. Features marked ❌ or ⏬ should be mentioned as exclusions, not detailed
- **Nested Gherkin in ACs**: Use **GIVEN** / **WHEN** / **THEN** (all caps, bolded). Nest subsequent WHEN/THEN under bullet points. Embed Figma links inline below the relevant GIVEN or THEN clause. See the story format template for the exact structure
- **Resumable**: If `.temp/cascade/` already has data from a prior `generate-behavior-questions` run, reuse it instead of re-fetching everything
