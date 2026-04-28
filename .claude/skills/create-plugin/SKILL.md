---
name: create-plugin
description: Use this skill when the user asks to "create a plugin", "add a plugin", "make a new plugin", "build a plugin", or wants to package skills into an installable plugin for this marketplace. Guides creating a properly structured plugin under plugins/.
---

# Create Plugin

Help the user create a new plugin in this repo's marketplace.

## What Is a Plugin?

A plugin is an installable package of AI agent skills distributed through this marketplace. Users install plugins to get specialized capabilities for their tech stack. Each plugin lives in `plugins/<plugin-name>/` and is registered in the marketplace catalog.

## Repo Structure

```
ai-enablement-prompts/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace catalog — lists ALL plugins
└── plugins/
    └── <plugin-name>/
        ├── .claude-plugin/
        │   └── plugin.json       # Plugin identity (name, description, author)
        ├── skills/
        │   └── <skill-name>/
        │       └── SKILL.md      # Skill instructions + YAML frontmatter
        ├── instructions/          # (optional) Scoped instruction files
        │   └── *.instructions.md
        └── README.md             # Install & usage docs
```

## Step 1: Determine Plugin Scope

Ask the user (or infer from context):
- What tech stack does this plugin target?
- What skills should it include?
- Does it require any MCP servers (Figma, Playwright, Atlassian, etc.)?
- Is it a standalone plugin or does it complement other plugins in the marketplace?

**Grouping principle:** Plugins are organized by tech stack and MCP dependencies, not by workflow stage. Users install only what applies to their stack.

## Step 2: Create plugin.json

Create `plugins/<plugin-name>/.claude-plugin/plugin.json`:

```json
{
  "name": "<plugin-name>",
  "description": "One-line description of what this plugin provides.",
  "author": {
    "name": "Bitovi",
    "url": "https://www.bitovi.com"
  }
}
```

### Naming Rules

- `name` must be **plain kebab-case**: lowercase letters, numbers, hyphens only (max 64 chars)
- No slashes, colons, or namespace prefixes — these cause **silent load failures**
- Examples: `code`, `react`, `playwright`, `figma-react`, `trpc-prisma`

### Version Pinning

- **Omit `version`** to use the git commit SHA as version (every commit = automatic update)
- If you set `version`, you **must bump it on every release** or users won't receive updates
- Do NOT set version in both `plugin.json` and `marketplace.json` — `plugin.json` wins silently

## Step 3: Create Skills

Each skill gets its own folder under `plugins/<plugin-name>/skills/<skill-name>/`:

```
plugins/<plugin-name>/skills/<skill-name>/
├── SKILL.md          # Main instructions (required)
├── reference/        # Background knowledge, specs, checklists (optional)
├── steps/            # Step-by-step sub-instructions (optional)
└── examples/         # Example inputs/outputs (optional)
```

### SKILL.md Frontmatter

Every SKILL.md must have YAML frontmatter:

```yaml
---
name: skill-name
description: Use this skill when the user asks to "...". Include specific trigger phrases and situations.
---
```

- `name`: kebab-case, matches the folder name
- `description`: How the agent decides when to auto-load this skill — include trigger phrases, keywords, and situations

### Writing Effective Skills

- State the goal clearly at the top
- Use numbered steps for sequential workflows
- Include "When to Use" and "When NOT to Use" sections
- Add a checklist at the end for verification
- Keep SKILL.md under 500 lines — move detailed reference material to separate files
- Reference supporting files with relative markdown links: `[checklist.md](reference/checklist.md)`

## Step 4: Create Instructions (Optional)

For scoped coding conventions that apply to specific file patterns, create instruction files:

```
plugins/<plugin-name>/instructions/<name>.instructions.md
```

With frontmatter specifying the scope:

```yaml
---
applyTo: '**/packages/server/**'
---
```

Instructions are automatically applied when the agent works on files matching the `applyTo` glob pattern. Use these for coding standards, not for task workflows (those should be skills).

## Step 5: Create README.md

Create `plugins/<plugin-name>/README.md` with this template:

```markdown
# <Plugin Name>

<One paragraph description>

## Skills

| Skill | Description |
|-------|-------------|
| `skill-name` | What it does |

## Prerequisites

- List any required MCP servers
- List any required tech stack (React, Zod, tRPC, etc.)

## Install

### Claude Code

\```bash
claude plugin marketplace add bitovi/ai-enablement-prompts --scope project
claude plugin install <plugin-name>@bitovi-ai-enablement --scope project
\```

Commit `.claude/settings.json` so teammates get the plugin automatically.

### VS Code Copilot

Add to `.vscode/settings.json` (commit this file):

\```json
{
  "chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
}
\```

Then install from: **Extensions view** → search `@agentPlugins` → find `<plugin-name>` → Install
```

## Step 6: Register in Marketplace

Add the plugin to `.claude-plugin/marketplace.json` in the `plugins` array:

```json
{
  "name": "<plugin-name>",
  "source": "./plugins/<plugin-name>",
  "description": "Same one-line description as plugin.json"
}
```

## Step 7: Verify

Run these checks:

1. **Structure check:** Verify all required files exist:
   ```bash
   ls plugins/<plugin-name>/.claude-plugin/plugin.json
   ls plugins/<plugin-name>/README.md
   ls plugins/<plugin-name>/skills/*/SKILL.md
   ```

2. **JSON validity:** Ensure plugin.json and marketplace.json are valid JSON:
   ```bash
   cat plugins/<plugin-name>/.claude-plugin/plugin.json | python3 -m json.tool
   cat .claude-plugin/marketplace.json | python3 -m json.tool
   ```

3. **Frontmatter check:** Every SKILL.md must start with `---` and have `name` and `description` fields

4. **Local test (Claude Code):**
   ```bash
   claude --plugin-dir ./plugins/<plugin-name>
   ```

5. **Validate (Claude Code):**
   ```bash
   claude plugin validate ./plugins/<plugin-name>
   ```

## Existing Plugins in This Marketplace

| Plugin | Description | Required MCPs |
|--------|-------------|---------------|
| `creating-prompts` | Meta-skills for creating new agent skills (Claude + Copilot) | — |
| `code` | Spec workflow, signatures, instruction-generation, document-feature, create-skill | — |
| `react` | Modlet pattern, component extraction, registry, reuse, validation | — |
| `react-mock` | Zod sample data, data model management, feature implementation | — |
| `figma-react` | Figma-to-React lifecycle: design, implement, sync, Code Connect | Figma |
| `playwright` | E2E testing, debugging, responsive design, visual diff, pixel-perfect | Playwright |
| `trpc-prisma` | Cross-package types, AppRouter inference, package instructions | — |

Check this table before creating a new plugin — the skill may belong in an existing one.

## Common Mistakes

- ❌ Forgetting to add the plugin to `marketplace.json`
- ❌ Using uppercase, slashes, or colons in `name` (causes silent failures)
- ❌ Setting `version` in `plugin.json` and then forgetting to bump it
- ❌ Putting task workflows in instruction files (use skills instead)
- ❌ Putting coding conventions in skills (use instruction files instead)
- ❌ Creating a new plugin when the skill fits in an existing one
