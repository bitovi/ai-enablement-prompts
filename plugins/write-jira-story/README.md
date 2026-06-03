# Write Jira Story Plugin

Write or refine a **Jira story description** using comprehensive context gathered from all linked sources — Figma designs, Confluence docs, Google Docs, and the parent epic. The skill fetches and follows linked resources, analyzes Figma frames, runs a scope analysis, and writes a complete story with a User Story Statement, Scope Analysis, Gherkin acceptance criteria, NFRs, and Developer Notes.

A key feature is **re-running to refine**: on subsequent runs it flips open questions (❓) to answered (💬) as replies appear in Figma/Jira comments or updated docs, and preserves manual edits.

## Skills

This plugin bundles the entry skill plus the three sub-skills it dispatches to during a run:

| Skill | Role |
|---|---|
| `write-jira-story` | Entry — gathers linked context, analyzes Figma frames + scope, writes/refines the Jira story (`example-story.md` is a worked reference). |
| `cascade-analyze-figma-frame` | Sub-skill — analyzes one Figma frame from extracted local files (Phase 4, Path A). |
| `cascade-analyze-figma-frame-mcp` | Sub-skill — analyzes one Figma frame via the MCP cache (Phase 4, Path B). |
| `cascade-analyze-feature-scope` | Sub-skill — categorizes features by scope using the epic as source of truth (Phase 5). |

## Prerequisites

This skill orchestrates an existing **Cascade** toolchain — it is not standalone:

- **Cascade MCP server**, providing the tools the skills call: `extract-linked-resources`, `figma-batch-zip`, `figma-batch-cache`, `figma-frame-data`, `atlassian-get-issue`, `atlassian-update-issue-description`.
- Access to the **Jira / Confluence / Figma** resources referenced by the issue.
- *Optional*: the `generate-behavior-questions` skill (a separate Cascade workflow). `write-jira-story` only *suggests* running it first when there are many open questions — it is not bundled here.

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
