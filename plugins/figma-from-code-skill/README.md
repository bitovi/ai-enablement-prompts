# Figma-from-Code (Skill) Plugin

Rebuild a Figma file **from your codebase** — the **agent-driven** flavor. The entry skill is a thin dispatcher that an agent reads and executes, spawning subagents per phase, reading only small summary files, and tracking progress in `state.json`. It discovers the app's React components, creates Figma variables and structure, builds components tier-by-tier, composes screens, and validates visual fidelity.

## How this differs from `figma-from-code`

This repo ships two flavors of the same pipeline — **install one**:

| Plugin | Orchestration | Use when |
|---|---|---|
| `figma-from-code` | A deterministic Workflow script (`figma-from-code.js`) drives parallel, progress-tracked execution. | You run it via the Workflow tool. |
| **`figma-from-code-skill`** (this) | The entry `SKILL.md` itself orchestrates — an agent reads it and dispatches subagents. No Workflow script. | Your environment has no Workflow tool, or you prefer agent-driven control. |

They share the same staged sub-skills and helper scripts; this flavor omits the Workflow script and its `prompts/stages/` templates.

## Skills

| Skill | Description |
|---|---|
| `figma-from-code-skill` | Entry skill — agent-driven orchestrator for the full 10-stage rebuild; dispatches to per-stage sub-skills under its folder. |
| `figma-setup-variables` | Companion — extracts design tokens from CSS/Tailwind into Figma variable collections (Phase 1). |
| `figma-setup-file-structure` | Companion — creates the Figma page skeleton and foundations frames (Phase 2). |

> The two companion skills are also bundled by the `figma-from-code` plugin — installing both plugins will collide on those names. Install one flavor.

## What it does (10 stages)

1. **0a — Component discovery**: browser crawl + static source scan → `component-map.json`, dependency tiers, existing Figma components.
2. **0b — Icon/asset discovery**: scan for Lucide icons and SVG assets.
3. **Normalize**: align component names with Figma conventions.
4. **1 — Setup tokens**: create Figma variable collections (via `figma-setup-variables`).
5. **2 — File structure**: create pages and foundation frames (via `figma-setup-file-structure`).
6. **2.5 — Pre-capture**: screenshot every component and screen in the live app.
7. **3 — Build components**: tier-by-tier (tiers sequential, components within a tier in parallel).
8. **4 — Build screens**: compose full-page frames from built component instances.
9. **5 — Validate**: compare Figma vs live app screenshots, report, and fix mismatches.

## Prerequisites

- **Figma MCP server** connected and authenticated (the `figma` plugin). Build/setup stages use `use_figma` and require the `figma:figma-use` skill (mandatory before any `use_figma` call) and `figma:figma-generate-library`.
- **Playwright** (`@playwright/test` with chromium installed) — browser crawl, pre-capture screenshots, and pixel comparison.
- **A running dev server** for the app you're rebuilding.
- **Node.js 18+**.

## Installation

### Claude Code

```
/plugin marketplace add bitovi/ai-enablement-prompts
/plugin install figma-from-code-skill@bitovi-ai-enablement
```

## Usage

Invoke the entry skill and supply your Figma file key:

```
/figma-from-code-skill:figma-from-code-skill
```

The dispatcher takes these inputs (from its `SKILL.md`):

- `fileKey` — **required**, the target Figma file key.
- `resume` — optional; `true` to skip already-completed phases (tracked in `.temp/figma-from-code/state.json`).

Point it at your project by setting your dev server URL and source dir where the stages ask for them — the docs use placeholders (`<source-dir>`, `<tailwind-config>`, `<figma-file-key>`, `<dev-server-url>`).

## Notes

- Generalized from a real project — paths and identifiers are placeholders; supply your own.
- A full run requires a live Figma file, a running dev server, and Playwright. There is no offline/dry-run mode.
