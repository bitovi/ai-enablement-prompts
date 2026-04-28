# React Plugin

Core React component development patterns — modlet structure, component extraction, registry, reuse, and validation. No external dependencies required.

## Included Skills

| Skill | Description |
|-------|-------------|
| **create-react-modlet** | Create React components, hooks, or utilities following the modlet pattern. Self-contained folders with index.ts, implementation, tests, stories, and optional types. |
| **extract-ui-component** | Extract reusable UI components from inline patterns. Covers component design, TypeScript props, Storybook stories, refactoring strategy, and best practices. |
| **component-registry** | Track reusable UI components and unextracted patterns. Maintains a REGISTRY.md inventory of extracted components and patterns that need extraction. |
| **component-reuse** | Gate skill that enforces checking for existing components before creating new ones. Audits the codebase for matching components and reports REUSE, WRAP, or CREATE. |
| **validate-implementation** | Quality gate that checks for runtime errors, accessibility issues, and API compliance before committing. |

## Install

No MCP servers required.

### Claude Code

```bash
claude plugin marketplace add bitovi/ai-enablement-prompts --scope project
claude plugin install react@bitovi-ai-enablement --scope project
```

### VS Code Copilot

Add to `.vscode/settings.json`:

```json
{
  "chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
}
```

Then install **react** from Extensions → `@agentPlugins`.
