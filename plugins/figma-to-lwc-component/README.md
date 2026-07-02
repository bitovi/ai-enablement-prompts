# figma-to-lwc-component

Repo-agnostic guidance for implementing or updating Lightning Web Components from Figma designs.

This plugin starts by discovering the target repository's LWC layout, component conventions, story/test setup, registration files, styling approach, and icon strategy before making changes.

## Included Skills

| Skill | Description |
|-------|-------------|
| **figma-to-lwc-component** | Implement or update repo-native Lightning Web Components from Figma designs, with adaptive Storybook, SLDS, and Salesforce DX guidance |

## Prerequisites

- Requires **Figma MCP** to inspect design context.
- Requires a target repo that uses Lightning Web Components.
- Uses Playwright or another browser verification path when the target repo has a runnable preview.

## Installation

### Claude Code

```bash
claude plugin marketplace add bitovi/ai-enablement-prompts --scope project
claude plugin install figma-to-lwc-component@bitovi-ai-enablement --scope project
```

Commit `.claude/settings.json` so teammates get the plugin automatically.

### VS Code Copilot

Add to `.vscode/settings.json`:

```json
{
  "chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
}
```

Then install "figma-to-lwc-component" from Extensions -> `@agentPlugins`.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add bitovi/ai-enablement-prompts
copilot plugin install figma-to-lwc-component@bitovi-ai-enablement
```
