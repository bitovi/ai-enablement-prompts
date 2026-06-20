# Playwright Plugin

Playwright-based QA workflows — E2E testing, debugging, responsive verification, visual diffing, computed styles comparison, and pixel-perfect orchestration.

**Requires [Playwright MCP](https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-server-playwright) to be configured.**

## Included Skills

| Skill | Description |
|-------|-------------|
| **write-e2e-test** | Create, maintain, and verify end-to-end tests using Playwright MCP |
| **debug-e2e-test** | Debug and fix failing Playwright E2E tests |
| **debugging** | Error-free UI verification — fresh browser sessions and full flow walkthrough |
| **test-responsive-design** | Responsive design implementation and verification across all breakpoints |
| **visual-diff** | Pixel-level screenshot comparison between baseline and current URLs |
| **computed-styles** | Extract and compare computed CSS styles between two URLs |
| **pixel-perfect** | Orchestrate visual-diff + computed-styles in a loop until pages match |
| **discover-visual-states** | Discover all interactive visual states of a component on a production page |

## Installation

### Claude Code

```bash
claude plugin marketplace add bitovi/ai-enablement-prompts --scope project
claude plugin install playwright@bitovi-ai-enablement --scope project
```

### VS Code Copilot

Add to `.vscode/settings.json`:

```json
{
  "chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
}
```

Then install "playwright" from Extensions → `@agentPlugins`
