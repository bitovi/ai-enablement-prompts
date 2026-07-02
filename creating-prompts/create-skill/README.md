# create-skill

> **Also available as a plugin.** These meta-skills are also packaged as the `create-skill-claude` and `create-skill-copilot` skills in the [`creating-prompts` plugin](../../plugins/creating-prompts) (also bundled in the [`code` plugin](../../plugins/code)) — install one for the maintained, auto-loading version (see [PLUGINS.md](../../PLUGINS.md)). This standalone copy still works if you'd rather install it manually.

## What this is

A meta-skill that teaches an AI agent how to create new agent skills — one variant tuned for Claude Code ([`claude/SKILL.md`](./claude/SKILL.md)), one for VS Code Copilot ([`copilot/SKILL.md`](./copilot/SKILL.md)). The Claude variant has some additional capabilities not supported in Copilot, but works for both tools.

## How to run it

Install these skills manually by placing them at:

- Claude — `~/.claude/skills/create-skill/SKILL.md` (copy from [`claude/SKILL.md`](./claude/SKILL.md))
- Copilot — `~/.github/skills/create-skill/SKILL.md` (copy from [`copilot/SKILL.md`](./copilot/SKILL.md))

Or, to get the packaged version, install the `creating-prompts` plugin (see [PLUGINS.md](../../PLUGINS.md)), then ask your agent to "create a skill" — the right variant loads automatically, or invoke `/creating-prompts:create-skill-claude` / `/creating-prompts:create-skill-copilot` directly in Claude Code.
