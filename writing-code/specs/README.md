# Specs

> **Also available as a plugin.** These four prompts are also packaged as the `spec`, `spec-check`, `spec-implement`, and `spec-answered-questions` skills in the [`code` plugin](../../plugins/code) — install it for the maintained, auto-loading version (see [PLUGINS.md](../../PLUGINS.md)). These standalone copies still work if you'd rather paste them directly into any AI chat agent.

## What this is

A four-step spec workflow for planning and implementing a change with an AI agent:

1. [`spec.prompt.md`](./spec.prompt.md) — build a detailed implementation plan, gathering context from any linked Jira/Figma URLs, ending with numbered clarifying questions
2. [`spec-check.prompt.md`](./spec-check.prompt.md) — review the spec for contradictions, redundancy, and completeness against the codebase
3. [`spec-implement.prompt.md`](./spec-implement.prompt.md) — implement the spec phase-by-phase, pausing for review after each step, then verify build/tests/lint
4. [`spec-answered-questions.prompt.md`](./spec-answered-questions.prompt.md) — incorporate your answers (and any other edits, treated as feedback) back into the spec

## How to run it

Paste each `.prompt.md` file's contents into your AI agent in order, once the previous step is done. Or, to get the packaged version, install the `code` plugin (see [PLUGINS.md](../../PLUGINS.md)) and invoke `/code:spec`, `/code:spec-check`, `/code:spec-implement`, or `/code:spec-answered-questions` in Claude Code — or just ask your agent to "build a spec for X" / "review this spec" / "implement this spec".
