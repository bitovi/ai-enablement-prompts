# react-mock

Mock data and data model patterns for Zod-based React apps.

## Included Skills

| Skill | Description |
|-------|-------------|
| **generate-sample-data** | Generate mock/sample data from Zod schemas for testing, development, and mocks |
| **update-data-model** | Add or modify domain entities in the data model using Zod schemas |
| **implement-feature** | End-to-end workflow for implementing a new UI feature in a mock app |

## Prerequisites

- React
- Zod

No MCP servers required.

## Installation

### Claude Code

```bash
claude plugin marketplace add bitovi/ai-enablement-prompts --scope project
claude plugin install react-mock@bitovi-ai-enablement --scope project
```

### VS Code Copilot

Add to `.vscode/settings.json`:

```json
{
  "chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
}
```

Then install **react-mock** from Extensions → `@agentPlugins`.
