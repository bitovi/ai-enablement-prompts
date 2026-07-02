# figma-component-sync

> **Also available as a plugin.** This skill is also packaged as the [`figma-component-sync` skill](../../plugins/figma-react/skills/figma-component-sync/SKILL.md) in the [`figma-react` plugin](../../plugins/figma-react) — install it for the maintained, auto-loading version (see [PLUGINS.md](../../PLUGINS.md)). This standalone copy still works if you'd rather paste it directly into any AI chat agent.

## What this is

A skill that checks an existing React component against its Figma design source, reporting visual and structural differences to accept, ignore, or fix.

## How to run it

Requires Figma MCP configured in your agent. Paste the contents of [`SKILL.md`](./SKILL.md) into your AI agent and ask it to audit a component against its Figma design. Or, to get the packaged version, install the `figma-react` plugin (see [PLUGINS.md](../../PLUGINS.md)) and invoke `/figma-react:figma-component-sync` in Claude Code.
