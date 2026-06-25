# Code Plugin

Baseline planning, spec, and codebase understanding skills that work with any codebase, any stack.

## What This Plugin Does

The **code** plugin bundles a set of workflow skills for planning, implementing, and understanding codebases. It gives AI agents a structured approach to:

- **Build implementation specs** — gather context, create detailed plans with numbered questions
- **Review specs** — check for contradictions, redundancy, and completeness
- **Implement specs** — phase-by-phase execution with pause points and verification
- **Generate API signatures** — summarize APIs with mermaid dependency graphs
- **Onboard to a codebase** — multi-step analysis that produces an AI instruction file
- **Document features** — comprehensive feature requirement documents
- **Create new skills** — scaffold skills for Claude Code and VS Code Copilot

No MCP servers required. All skills work with standard file system access.

## Included Skills

| Skill | Description |
|-------|-------------|
| `spec` | Build a detailed implementation plan with context gathering and numbered questions |
| `spec-check` | Review an implementation spec for contradictions, redundancy, and completeness |
| `spec-implement` | Implement a spec phase-by-phase with pause points and build/test/lint verification |
| `spec-answered-questions` | Incorporate answered questions back into a spec document |
| `signatures` | Generate a signatures.md summarizing API signatures with a mermaid dependency graph |
| `instruction-generation` | Onboard an AI agent to an unknown codebase via a 6-step analysis chain |
| `document-feature` | Create comprehensive feature requirement documents with user stories and workflows |
| `create-skill-claude` | Create new skills for Claude Code projects |
| `create-skill-copilot` | Create new skills for VS Code Copilot projects |

## Installation

### Claude Code

Add the marketplace and install at **project scope** so it's committed to `.claude/settings.json` and shared with your team:

```bash
claude plugin marketplace add bitovi/ai-enablement-prompts --scope project
claude plugin install code@bitovi-ai-enablement --scope project
```

Commit `.claude/settings.json`. Teammates will have the plugin available when they open the project.

To test locally without installing:

```bash
claude --plugin-dir ./plugins/code
```

### VS Code Copilot

Add the marketplace to `.vscode/settings.json` (commit this file):

```json
{
  "chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
}
```

Then install the plugin:
- **Extensions view** → search `@agentPlugins` → find `code` → Install
- **OR** Command Palette → "Chat: Install Plugin From Source" → enter `https://github.com/bitovi/ai-enablement-prompts`
