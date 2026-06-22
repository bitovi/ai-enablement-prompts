# figma-react

Full Figma-to-code lifecycle for React — from design analysis through component implementation, visual sync, and Code Connect mapping.

## Included Skills

| Skill | Description |
|-------|-------------|
| **figma-design-react** | Analyze Figma designs and propose React component architecture, props API, and variant handling |
| **figma-implement-component** | Implement React components from analyzed Figma designs with stories, tests, and Code Connect |
| **figma-component-sync** | Check existing React components against their Figma source and identify differences |
| **figma-connect-component** | Generate Figma Code Connect mappings that link React components to their Figma counterparts |

## Prerequisites

Requires **Figma MCP** to be configured and authenticated in your environment.

## Installation

### Claude Code

```bash
claude plugin marketplace add bitovi/ai-enablement-prompts --scope project
claude plugin install figma-react@bitovi-ai-enablement --scope project
```

### VS Code Copilot

Add to `.vscode/settings.json`:

```json
{
  "chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
}
```

Then install "figma-react" from Extensions → `@agentPlugins`.
