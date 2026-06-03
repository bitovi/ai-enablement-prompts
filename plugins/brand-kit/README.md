# Brand Kit Plugin

Pull a brand's real assets — colors, logos, fonts, typography — straight from its live website, then apply them so anything the AI builds stays on-brand.

## Skills

| Skill | Description |
|---|---|
| `brand-assets` | Two modes: **extract** a brand kit from a website URL, and **apply** it when building UI or artifacts. |

## Installation

### Claude Code

```
/plugin marketplace add bitovi/ai-enablement-prompts
/plugin install brand-kit@bitovi-ai-enablement
```

### Copilot CLI

```
copilot plugin marketplace add bitovi/ai-enablement-prompts
copilot plugin install brand-kit@bitovi-ai-enablement
```

### VS Code

Add to your settings:

```json
"chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
```

Then browse **Extensions → @agentPlugins** and install **brand-kit**.

## Usage

**Extract** — give it a website:

```
/brand-kit:brand-assets https://www.bitovi.com
```

This creates a `brand-kit/` folder in your project containing `brand-guidelines.md`, the downloaded logos/icons under `assets/`, and the raw `extracted.json` evidence.

**Apply** — once a `brand-kit/` exists, just ask to build something on-brand:

```
Build an on-brand hero section
```

The skill reads `brand-kit/brand-guidelines.md` and applies the brand's colors (as CSS variables), fonts (with fallbacks), and logos automatically.

## How extraction works

A dependency-free Node 18+ script (`scripts/extract-brand.js`) fetches the page HTML and its stylesheets, ranks the color palette by usage, collects font stacks and `@font-face`/Google Fonts references, captures the **spacing scale, border-radius, and box-shadow** values (and their named design-token CSS vars), and downloads logos, favicons, and social images. The agent then sanity-checks the evidence (frequency ranking can surface incidental colors) and synthesizes a clean, Anthropic-style `brand-guidelines.md`.
