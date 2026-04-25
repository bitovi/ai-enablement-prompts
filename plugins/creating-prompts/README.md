# Creating Prompts Plugin

Skills for creating new agent skills for Claude Code and VS Code Copilot.

## Skills

| Skill | Description |
|---|---|
| `create-skill-claude` | Guide for creating Claude Code skills (`.claude/skills/`) with full frontmatter reference |
| `create-skill-copilot` | Guide for creating VS Code Copilot skills (`.github/skills/`) following the Agent Skills standard |

## Installation

### Claude Code

```
/plugin marketplace add bitovi/ai-enablement-prompts
/plugin install creating-prompts@bitovi-ai-enablement
```

### Copilot CLI

```
copilot plugin marketplace add bitovi/ai-enablement-prompts
copilot plugin install creating-prompts@bitovi-ai-enablement
```

### VS Code

Add to your settings:

```json
"chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
```

Then browse **Extensions → @agentPlugins** and install **creating-prompts**.

## Usage

Once installed, invoke skills with:

```
/creating-prompts:create-skill-claude
/creating-prompts:create-skill-copilot
```

Or just ask to "create a skill" and the appropriate skill will auto-load based on context.
