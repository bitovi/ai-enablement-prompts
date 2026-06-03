# Figma-from-Code Plugin

Rebuild a Figma file **from your codebase**. This workflow discovers the React components of a running app + source, creates Figma variable collections and file structure, builds components tier-by-tier, composes full-page screens from those components, and validates visual fidelity against the live app.

It ships two ways to run: as a **Workflow** (parallel, orchestrated, progress-tracked) and as a **skill tree** an agent can read and follow.

## Skills

| Skill | Description |
|---|---|
| `figma-from-code` | Entry skill — orchestrates the full 10-stage code-to-Figma rebuild. Thin dispatcher that delegates to per-stage sub-skills under its folder. |
| `figma-setup-variables` | Companion — extracts design tokens from CSS/Tailwind into Figma variable collections (Phase 1). |
| `figma-setup-file-structure` | Companion — creates the Figma page skeleton and foundations frames (Phase 2). |

The `figma-from-code/` skill folder contains the staged sub-skills (`1-discovery-components/` … `10-validator/`), per-component step files, prompt templates, and helper scripts (`map-components.js`, `resolve-colors.js`, `compare.js`, `browser-server.js`, …).

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

- **Figma MCP server** connected and authenticated (the `figma` plugin). The build/setup stages use `use_figma`, and require the `figma:figma-use` skill (mandatory before any `use_figma` call) and `figma:figma-generate-library`.
- **Playwright** (`@playwright/test` with chromium installed) — used for the browser crawl, pre-capture screenshots, and pixel comparison.
- **A running dev server** for the app you're rebuilding.
- **Node.js 18+**.

## Installation

### Claude Code

```
/plugin marketplace add bitovi/ai-enablement-prompts
/plugin install figma-from-code@bitovi-ai-enablement
```

### Manual (to run the Workflow orchestrator)

The orchestrator ships under `workflows/`. To run it via the Workflow tool, place the files so the orchestrator can find the skill tree:

- Skill tree → `.claude/skills/figma-from-code/` (default `skillDir`; override with `args.skillDir`).
- Companion skills → `.claude/skills/figma-setup-variables/`, `.claude/skills/figma-setup-file-structure/`.
- Orchestrator → `.claude/workflows/figma-from-code.js` (or run it by `scriptPath` directly).

## Usage

### As a Workflow (recommended — parallel + progress-tracked)

```js
Workflow({
  scriptPath: ".claude/workflows/figma-from-code.js",
  args: {
    fileKey: "<figma-file-key>",        // REQUIRED
    sourceDir: "src/",                   // your component/source root (default: "src/")
    devServerUrl: "http://localhost:5173", // your running dev server (default shown)
    startPhase: "phase0a",               // phase0a|phase0b|phase1|phase2|phase2_5|phase3|phase4|phase5
    endPhase: null,                      // optional stop point
    skillDir: ".claude/skills/figma-from-code" // override if installed elsewhere
  }
})
```

`fileKey` is **required** — the workflow errors out without it. All other args have neutral defaults; set `sourceDir` and `devServerUrl` to match your project.

### As a skill

```
/figma-from-code:figma-from-code
```

Then follow the entry `SKILL.md`, which dispatches through the staged sub-skills.

## Notes

- This bundle was generalized from a real project. Paths and identifiers are placeholders (`<source-dir>`, `<tailwind-config>`, `<figma-file-key>`, `<dev-server-url>`) — supply your own via the workflow args.
- A full run requires a live Figma file, a running dev server, and Playwright. There is no offline/dry-run mode.
