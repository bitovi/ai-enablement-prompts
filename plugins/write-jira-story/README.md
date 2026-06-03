# Write Jira Story Plugin

Write or refine a **Jira story description** using comprehensive context gathered from all linked sources — Figma designs, Confluence docs, Google Docs, and the parent epic. The skill fetches and follows linked resources, analyzes Figma frames, runs a scope analysis, and writes a complete story with a User Story Statement, Scope Analysis, Gherkin acceptance criteria, NFRs, and Developer Notes.

A key feature is **re-running to refine**: on subsequent runs it flips open questions (❓) to answered (💬) as replies appear in Figma/Jira comments or updated docs, and preserves manual edits.

## Skills

| Skill | Description |
|---|---|
| `write-jira-story` | Gathers linked context, analyzes Figma frames + scope, and writes/refines the Jira story (with `example-story.md` as a worked reference). |

## Prerequisites

This skill orchestrates an existing **Cascade** toolchain — it is not standalone:

- **Cascade MCP server**, providing the tools the skill calls: `extract-linked-resources`, `figma-batch-zip`, `figma-batch-cache`, `figma-frame-data`, `atlassian-get-issue`, `atlassian-update-issue-description`.
- **Companion sub-skills** it dispatches to (install alongside if you use those phases): `cascade-analyze-figma-frame`, `cascade-analyze-figma-frame-mcp`, `analyze-feature-scope`, and (optionally) `generate-behavior-questions`.
- Access to the **Jira / Confluence / Figma** resources referenced by the issue.

## Installation

### Claude Code

```
/plugin marketplace add bitovi/ai-enablement-prompts
/plugin install write-jira-story@bitovi-ai-enablement
```

## Usage

Invoke the skill with the Jira issue key of the story to write or refine:

```
/write-jira-story:write-jira-story
```

Triggers it also responds to:
- "Write the story for PROJ-456"
- "Update PROJ-456 with the latest design context"
- "Refine this story — questions have been answered"

The skill writes context to `.temp/cascade/`, produces a scope analysis, and (on confirmation) updates the Jira issue description. See `skills/write-jira-story/example-story.md` for the exact expected output format (nested Gherkin, scope markers, collapsible Scope Analysis).

## Notes

- Story keys, domains, and Figma IDs in the skill and example (`PROJ-456`, `myco.atlassian.net`, `abc123`) are placeholders — supply your own issue key at runtime.
- NFRs and Developer Notes are only included when explicitly present in the source context; the skill does not invent requirements.
