# figma-implement-component

> **Also available as a plugin.** This skill is also packaged as the [`figma-implement-component` skill](../../plugins/figma-react/skills/figma-implement-component/SKILL.md) in the [`figma-react` plugin](../../plugins/figma-react) — install it for the maintained, auto-loading version (see [PLUGINS.md](../../PLUGINS.md)). This standalone copy still works if you'd rather paste it directly into any AI chat agent.

## What this is

A skill that implements a React component from a Figma design — either after `figma-design-react` has analyzed it, or directly from a Figma URL. Delegates to `create-react-modlet` for folder structure, then adds the Figma-specific implementation and stories for each variant.

## How to run it

Requires Figma MCP configured in your agent. Paste the contents of [`SKILL.md`](./SKILL.md) into your AI agent along with a Figma URL and ask it to build the component. Or, to get the packaged version, install the `figma-react` plugin (see [PLUGINS.md](../../PLUGINS.md)) and invoke `/figma-react:figma-implement-component` in Claude Code.
