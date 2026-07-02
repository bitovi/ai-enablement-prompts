# Sharing Skills via Plugins

This repo distributes reusable AI agent skills as installable plugins for both **Claude Code** and **VS Code Copilot**.

Skills are packaged as plugins using the **Claude plugin format** (`.claude-plugin/plugin.json`), which is recognized by both Claude Code and VS Code Copilot automatically.

---

## Available Plugins

| Plugin | Description | Required MCPs |
|--------|-------------|---------------|
| `creating-prompts` | Meta-skills for creating new agent skills (Claude + Copilot) | — |
| `figma-from-code` | Rebuilds a Figma design system from a running web app's codebase | Figma |
| `implement-workflow` | End-to-end feature implementation: design, build, test, self-review, prep a PR | — |
| `code` | Spec workflow, signatures, instruction-generation, document-feature, create-skill | — |
| `react` | Modlet pattern, component extraction, registry, reuse, validation | — |
| `react-mock` | Zod sample data, data model management, feature implementation | — |
| `figma-react` | Figma-to-React lifecycle: design, implement, sync, Code Connect | Figma |
| `playwright` | E2E testing, debugging, responsive design, visual diff, pixel-perfect | Playwright |
| `trpc-prisma` | Cross-package types, AppRouter inference, package instructions | — |

---

## Installing for Your Project

### Claude Code

Add the marketplace and install plugins at **project scope** so it's committed to `.claude/settings.json` and shared with your team:

```bash
claude plugin marketplace add bitovi/ai-enablement-prompts --scope project
claude plugin install code@bitovi-ai-enablement --scope project
```

Commit `.claude/settings.json`. Teammates will have the plugin available when they open the project.

> **Note:** The `/plugin` TUI inside Claude Code doesn't show which scope it's writing to. Use the CLI with `--scope project` explicitly to avoid writing to your global `~/.claude/settings.json`.

### VS Code Copilot

Add the marketplace to `.vscode/settings.json` (commit this file):

```json
{
  "chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
}
```

Then each team member installs the plugin once from:
- **Extensions view** → search `@agentPlugins` → find the plugin → Install
- **OR** Command Palette → "Chat: Install Plugin From Source" → enter `https://github.com/bitovi/ai-enablement-prompts`

### GitHub Copilot CLI

Add the marketplace and install plugins via the Copilot CLI:

```bash
copilot plugin marketplace add bitovi/ai-enablement-prompts
copilot plugin install code@bitovi-ai-enablement
```

The marketplace catalog is served from `.github/plugin/marketplace.json` (a symlink to `.claude-plugin/marketplace.json`), so both Claude Code and the Copilot CLI read from the same source of truth.

---

## Testing Locally (Claude Code)

```bash
# Load a plugin for a single session
claude --plugin-dir ./plugins/code

# Validate plugin structure
claude plugin validate ./plugins/code
```

---

## Adding a New Plugin

Use the `create-plugin` skill (`.claude/skills/create-plugin/SKILL.md`) for step-by-step guidance on creating a new plugin, or follow the structure of any existing plugin under `plugins/`.
