# Story to Jira

Creates a Jira epic and its child stories from the markdown output of the [`from-figma`](../from-figma) story-writing pipeline.

## What this does

Reads `<project-root>/.results/stories/shell-stories.md` (produced by [`writing-stories/from-figma/4-shell-stories.md`](../from-figma/4-shell-stories.md)) and uses it to create a Jira epic — with Problem, Impact, Solution, User Journeys, and References sections — plus its child stories.

## How to run it

Requires an Atlassian/Jira MCP server configured in your AI agent. Paste the contents of [`story-to-jira.md`](./story-to-jira.md) into your agent and provide:

- `<project-key>` – the Jira project the stories should be created in
- `<jira-site-id>` – optional, if you have access to more than one Jira site
