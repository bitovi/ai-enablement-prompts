# External Skills & Prompts Inventory

An inventory of AI skills, prompts, agents, and instruction files found across Bitovi repositories, with the goal of identifying candidates to consolidate into `ai-enablement-prompts`.

---

## Table of Contents

- [Summary Matrix](#summary-matrix)
- [Per-Repo Breakdown](#per-repo-breakdown)
  - [cascade-mcp](#cascade-mcp)
  - [vybit](#vybit)
  - [vybit-app-template](#vybit-app-template)
  - [carton-case-management](#carton-case-management)
  - [bitos](#bitos)
  - [bitovi-website](#bitovi-website)
- [Cross-Repo Overlaps & Differences](#cross-repo-overlaps--differences)
- [Already in This Repo](#already-in-this-repo)
- [Recommended Plugin Organization](#recommended-plugin-organization)
- [Cascade-MCP Built-In Prompts to Extract](#cascade-mcp-built-in-prompts-to-extract)
- [MCP Server Mapping](#mcp-server-mapping)

---

## Summary Matrix

| Repo | Skills | Prompts | Agents | Instructions | Tech Focus |
|------|--------|---------|--------|--------------|------------|
| [cascade-mcp](https://github.com/bitovi/cascade-mcp) | 1 | 5 standalone | 0 | 2 | TypeScript, MCP, Express, Atlassian/Figma APIs, OAuth |
| [vybit](https://github.com/bitovi/vybit) | 12 | 0 | 6 (Claude) | 1 | TypeScript, React, Angular, Tailwind, Storybook, Playwright, MCP, WebSocket |
| [vybit-app-template](https://github.com/bitovi/vybit-app-template) | 12 | 0 | 0 | 1 | React, Zod, MSW, Playwright, Storybook, Tailwind |
| [carton-case-management](https://github.com/bitovi/carton-case-management) | 11 | 5 standalone | 3 | 3 (package-scoped) | TypeScript, React, tRPC, Prisma, Shadcn UI, Figma, Jira |
| [bitos](https://github.com/bitovi/bitos) | 0 | 0 | 0 | Auto-generated context files | TypeScript, React, tRPC, Prisma, Shadcn UI |
| [bitovi-website](https://github.com/bitovi/bitovi-website) | 11 | 0 | 0 | 0 | Astro, React, TypeScript, Tailwind v4, Playwright |

---

## Per-Repo Breakdown

### cascade-mcp

**Repo:** https://github.com/bitovi/cascade-mcp
**Description:** MCP tools integrating Figma and Jira for software teams.
**Tech Stack:** TypeScript, Express, MCP SDK, Vercel AI SDK, Zod, OAuth 2.0/PKCE, JWT

#### Skills

| Name | Path | Description | Technologies |
|------|------|-------------|--------------|
| `create-skill` | `.github/skills/create-skill/SKILL.md` | Meta-skill: teaches how to create new Agent Skills following the VS Code standard | Markdown, YAML frontmatter |

#### Standalone Prompts

| Name | Path | Description | Technologies |
|------|------|-------------|--------------|
| `ngrok-local` | `.github/prompts/ngrok-local.prompt.md` | Sets up ngrok tunnel on port 3000, updates `.env`, restarts server, instructs on OAuth callback update | ngrok, Express, Atlassian OAuth |
| `signatures` | `.github/prompts/signatures.prompt.md` | Generates `signatures.md` with API signatures and mermaid dependency graph | Mermaid diagrams, API design |
| `spec` | `.github/prompts/spec.prompt.md` | Builds implementation plan in markdown; gathers context from Jira/Figma via MCP; adds numbered questions | MCP tools, Jira, Figma |
| `spec-check` | `.github/prompts/spec-check.prompt.md` | Reviews spec for contradictions, redundancy, completeness against codebase | Codebase analysis |
| `write-tool-readme-docs` | `.github/prompts/write-tool-readme-docs.prompt.md` | Writes MCP tool documentation (purpose, API reference, usage examples, debugging) | MCP tools |

#### Instructions

| File | Scope | Description |
|------|-------|-------------|
| `.github/copilot-instructions.md` | Project-wide | Security, architecture, MCP tool patterns, OAuth/JWT, dual interface design (MCP + REST) |
| `.github/agents/copilot-instructions.md` | Auto-generated | Active technologies, project structure, commands, code style |

---

### vybit

**Repo:** https://github.com/bitovi/vybit
**Description:** Point-n-click vibe coding browser overlay + MCP server for visually editing Tailwind CSS on React/Angular apps.
**Tech Stack:** TypeScript, React 18, Angular 21, Vite, Tailwind v3/v4, Express, WebSocket, MCP SDK, Vitest, Playwright, Storybook 8+10

#### Skills

| Name | Path | Description | Technologies |
|------|------|-------------|--------------|
| `component-registry` | `.github/skills/component-registry/SKILL.md` | Tracks reusable UI components and unextracted patterns; maintains REGISTRY.md inventory | React, Tailwind CSS |
| `create-react-modlet` | `.github/skills/create-react-modlet/SKILL.md` | Creates React components/hooks following modlet pattern (folder with impl + test + story + types) | React, TypeScript, Vitest, Storybook, Tailwind |
| `create-skill` | `.github/skills/create-skill/SKILL.md` | Meta-skill: teaches how to create Agent Skills | Markdown, YAML frontmatter |
| `debug-e2e-test` | `.github/skills/debug-e2e-test/SKILL.md` | 9-step workflow for debugging Playwright E2E tests; screenshots, error-context.md artifacts | Playwright, Playwright MCP, Vitest |
| `debugging` | `.github/skills/debugging/SKILL.md` | Ensures app is fully reloaded and error-free after code changes; fresh browser sessions | Playwright, browser DevTools |
| `dev-environments` | `.github/skills/dev-environments/SKILL.md` | Guide to 8+ dev service arrangements with port map, conflict resolution, VS Code Tasks | VS Code Tasks, Vite, Storybook 8/10, esbuild, Angular |
| `extract-ui-component` | `.github/skills/extract-ui-component/SKILL.md` | Guides extraction of reusable components from inline patterns; discriminated unions, a11y | React, TypeScript, Tailwind CSS |
| `mode-button-behavior` | `.github/skills/mode-button-behavior/SKILL.md` | Documents interaction flows for overlay mode buttons (Select, Insert, Place, Replace) with flow tables | React, WebSocket, Playwright E2E |
| `naming-guide` | `.github/skills/naming-guide/SKILL.md` | Canonical naming reference as visual topology tree covering overlay, panel, server, addon | Full-stack (project-specific) |
| `preview-className-component` | `.github/skills/preview-className-component/SKILL.md` | Building panel controls that live-preview Tailwind class changes via WebSocket | React, `@floating-ui/react`, WebSocket, Tailwind |
| `tailwind-vocabulary` | `.github/skills/tailwind-vocabulary/SKILL.md` | Canonical terminology for Tailwind concepts (classToken, prefix, value, scale, patch lifecycle) | Tailwind CSS, WebSocket |
| `write-e2e-test` | `.github/skills/write-e2e-test/SKILL.md` | Guides creation of Playwright E2E tests using Playwright MCP | Playwright, Playwright MCP |

#### Claude Agents

| Name | Path | Description |
|------|------|-------------|
| `launch-angular-env` | `.claude/agents/launch-angular-env.md` | Launches Angular 21 dev environment (ports 3335, 5177, 6009) |
| `launch-carton-env` | `.claude/agents/launch-carton-env.md` | Launches MCP dev server pointed at external Carton Storybook (port 6006) |
| `launch-demo-env` | `.claude/agents/launch-demo-env.md` | Builds and serves static demo site on port 4000 |
| `launch-external-6006-storybook-env` | `.claude/agents/launch-external-6006-storybook-env.md` | Launches MCP dev server for external Storybook on port 6006 |
| `launch-react-vite-storyV10-environment` | `.claude/agents/launch-react-vite-storyV10-environment.md` | Full React dev env with Storybook v10, MCP server, test app |
| `release` | `.claude/agents/release.md` | Automates npm publish, version bump, git tag workflow |

---

### vybit-app-template

**Repo:** https://github.com/bitovi/vybit-app-template
**Description:** Template for building mock apps with VyBit visual editor integration.
**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 4, React Router, MSW 2, Storybook 8, Playwright, Vitest, Zod

#### Skills

| Name | Path | Description | Technologies |
|------|------|-------------|--------------|
| `implement-feature` | `.github/skills/implement-feature/SKILL.md` | End-to-end 9-step workflow for any UI feature; mandatory for ALL UI changes | React, Zod, MSW, Playwright MCP, Storybook, Tailwind |
| `component-registry` | `.github/skills/component-registry/SKILL.md` | Living inventory of UI components via REGISTRY.md | React, Tailwind CSS, Storybook |
| `create-skill` | `.github/skills/create-skill/SKILL.md` | Meta-skill: teaches how to create Agent Skills | Markdown, YAML frontmatter |
| `debug-e2e-test` | `.github/skills/debug-e2e-test/SKILL.md` | 9-step debugging for Playwright tests; includes non-deterministic data diagnosis | Playwright, MSW, Vitest |
| `debugging` | `.github/skills/debugging/SKILL.md` | Error-free UI verification after code changes; supports `VITE_BYPASS_LOGIN=true` | Playwright, browser console |
| `extract-ui-component` | `.github/skills/extract-ui-component/SKILL.md` | 8-step component extraction with a11y guidelines; analyzes 3-5 pattern examples first | React, TypeScript, Storybook, Tailwind |
| `generate-sample-data` | `.github/skills/generate-sample-data/SKILL.md` | Type-safe deterministic sample data from Zod schemas using `@anatine/zod-mock` + Faker | Zod, `@anatine/zod-mock`, `@faker-js/faker`, MSW, Vitest |
| `init-mock-app` | `.github/skills/init-mock-app/SKILL.md` | Scaffolds complete project with React, Vite, Tailwind v4, MSW, Storybook, Playwright | React, Vite, Tailwind 4, MSW, Storybook, Playwright |
| `update-data-model` | `.github/skills/update-data-model/SKILL.md` | Add/modify domain entities using Zod schemas; one entity per file; Mermaid diagram updates | Zod, TypeScript |
| `responsive-design` | `.github/skills/responsive-design/SKILL.md` | Responsive UI across mobile/tablet/desktop; Playwright MCP resize/screenshot verification | Tailwind CSS, Playwright MCP |
| `write-e2e-test` | `.github/skills/write-e2e-test/SKILL.md` | Create Playwright E2E tests using `/model` sample generators | Playwright MCP, MSW, Zod |
| `document-feature` | `.github/skills/document-feature/SKILL.md` | Creates feature requirement docs in `wiki/`; 11-section template; mock-app-focused only | Markdown, Zod |

---

### carton-case-management

**Repo:** https://github.com/bitovi/carton-case-management
**Description:** Open source case management system designed to be maintained with coding agents.
**Tech Stack:** TypeScript, React 18, tRPC, Prisma/SQLite, Shadcn UI, Tailwind CSS, Vite, Storybook, Playwright

#### Skills

| Name | Path | Description | Technologies |
|------|------|-------------|--------------|
| `component-reuse` | `.github/skills/component-reuse/SKILL.md` | Ensures existing UI components are reused before creating new ones; must run BEFORE any UI impl | React, Shadcn UI |
| `validate-implementation` | `.github/skills/validate-implementation/SKILL.md` | Validates for runtime errors, accessibility, and API compliance before commit | React, TypeScript, a11y |
| `figma-implement-component` | `.github/skills/figma-implement-component/SKILL.md` | Implement React components from Figma designs; has `reference/` and `steps/` subdirs | React, Figma MCP |
| `figma-design-react` | `.github/skills/figma-design-react/SKILL.md` | Design/propose architecture and props API from Figma files | React, Figma |
| `figma-component-sync` | `.github/skills/figma-component-sync/SKILL.md` | Audit React components against Figma source for visual accuracy | React, Figma MCP |
| `figma-connect-component` | `.github/skills/figma-connect-component/SKILL.md` | Generate Figma Code Connect mapping for React components | Figma Code Connect, React |
| `figma-connect-shadcn` | `.github/skills/figma-connect-shadcn/SKILL.md` | Connect shadcn/ui components to Figma | Shadcn UI, Figma Code Connect |
| `figma-explore` | `.github/skills/figma-explore/SKILL.md` | Explore Figma files to discover pages/components; includes helper script | Figma API |
| `create-react-modlet` | `.github/skills/create-react-modlet/SKILL.md` | Create React components following the modlet pattern | React, TypeScript, Storybook |
| `cross-package-types` | `.github/skills/cross-package-types/SKILL.md` | Type flow between shared, server, and client packages (AppRouter type inference) | TypeScript, tRPC, Prisma |
| `create-skill` | `.github/skills/create-skill/SKILL.md` | Meta-skill: teaches how to create Agent Skills | Markdown, YAML frontmatter |

#### Standalone Prompts

| Name | Path | Description | Technologies |
|------|------|-------------|--------------|
| `bit.spec` | `.github/prompts/bit.spec.prompt.md` | Builds implementation plan; gathers context from Jira/Figma links; adds questions | MCP, Jira, Figma |
| `bit.spec-check` | `.github/prompts/bit.spec-check.prompt.md` | Reviews spec for contradictions, redundancy, completeness | Codebase analysis |
| `bit.spec-implement` | `.github/prompts/bit.spec-implement.prompt.md` | Implements spec with todo list per phase; pause after each step; verify build/tests/lint | General |
| `bit.spec-answered-questions` | `.github/prompts/bit.spec-answered-questions.prompt.md` | Incorporates answered spec questions back into the spec | General |
| `figma-sync` | `.github/prompts/figma-sync.prompt.md` | Checks component against Figma design; identifies differences | Figma MCP |

#### Agents

| Agent | Description |
|-------|-------------|
| `generate-feature` | Automates full Jira ticket processing: fetch ticket → parse Figma → implement → validate → move to "In Review" |
| `review-jira-ticket` | Read-only Jira ticket analysis; posts clarifying questions; **disallowed from writing code** |
| `user-experience-guidelines` | UX pattern reference (sidebar lists, inline editing, delete confirmation, responsive design) with code examples |

#### Package-Scoped Instructions

| File | Scope | Key Rules |
|------|-------|-----------|
| `client.instructions.md` | `packages/client/**` | Modlet pattern, tRPC client, Shadcn UI prioritization, browser-safe imports |
| `server.instructions.md` | `packages/server/**` | tRPC routers, Prisma via shared, Zod validation, TRPCError handling |
| `shared.instructions.md` | `packages/shared/**` | Two entry points (server vs browser), auto-generated Zod from Prisma |

---

### bitos

**Repo:** https://github.com/bitovi/bitos
**Description:** Internal staffing/CRM application.
**Tech Stack:** TypeScript, React, tRPC, Prisma, PostgreSQL, Vite, Shadcn/UI, Tailwind CSS

No traditional skills or prompts. Has auto-generated agent context files for 16+ AI tools (Claude, Gemini, Copilot, Cursor, Windsurf, etc.) and a referenced `modlet.prompt.md` (may exist on non-main branches).

---

### bitovi-website

**Repo:** https://github.com/bitovi/bitovi-website
**Description:** Bitovi corporate marketing website.
**Tech Stack:** Astro, React, TypeScript, Tailwind CSS v4, Storybook, Playwright

> Note: This is a private repository. Skills were retrieved via GitHub MCP.

#### Skills

| Name | Description | Technologies |
|------|-------------|--------------|
| `component-registry` | Track and manage reusable UI components in the Astro site; maintains inventory of extracted vs unextracted patterns in `src/components/` | Astro, React, Tailwind CSS |
| `computed-styles` | Extract and compare computed CSS styles between a baseline URL and a dev/Storybook URL via Playwright `getComputedStyle()`. Pairs with `visual-diff` for a complete visual QA loop. | Playwright MCP, CSS, Tailwind |
| `copy-to-page` | Build a complete `.astro` page from a markdown copy document using existing React components. Handles service pages, case studies, partner pages, landing pages. | Astro, React |
| `create-react-modlet` | Create React components/hooks in modlet pattern for Astro islands context (index.ts, impl, story, tests, types) | React, TypeScript, Storybook |
| `create-skill` | Meta-skill: how to create Agent Skills for this project | Markdown, YAML frontmatter |
| `debugging` | Verify Astro dev server is running cleanly after any code change; walk through affected pages; confirm no console errors before continuing | Playwright, Astro |
| `discover-visual-states` | Discover all visual states of a component by interactively exploring the production baseline page via Playwright. Saves `pixel-perfect.config.json` for replay by `pixel-perfect`. | Playwright MCP |
| `extract-ui-component` | Extract reusable Astro/React components from inline patterns; covers TypeScript props, Tailwind styling, shared UI primitives | Astro, React, Tailwind CSS |
| `pixel-perfect` | Orchestrate a complete visual QA workflow: runs `visual-diff` (screenshot comparison) and `computed-styles` (CSS property extraction) in a convergence loop until pages match pixel-for-pixel | Playwright MCP |
| `responsive-design` | Make UI features responsive across all devices; verify with Playwright resize and screenshot at each breakpoint | Tailwind CSS, Playwright MCP |
| `visual-diff` | Compare a baseline URL vs a dev/Storybook URL by taking Playwright screenshots at multiple breakpoints, running a pixel-level image diff, and reporting results to guide corrections | Playwright MCP |

---

## Cross-Repo Overlaps & Differences

### 1. `create-skill` (Meta-Skill) — 5 repos

| Repo | Differences |
|------|-------------|
| cascade-mcp | Base version; VS Code Agent Skills standard |
| vybit | Same content as cascade-mcp |
| vybit-app-template | Same content as cascade-mcp |
| carton-case-management | Same content; also mirrored in `.claude/skills/` |
| bitovi-website | Same content; project-specific wording for Astro context |

**Verdict:** Identical or near-identical across all repos. Strong candidate to centralize in `ai-enablement-prompts` (already exists here as `create-skill-copilot`).

---

### 2. `create-react-modlet` — 3 repos

| Repo | Differences |
|------|-------------|
| vybit | No `@/` alias, no `cn()` utility, uses template literals for classNames, Bitovi design tokens (`bv-teal`, `bv-orange`), relative imports only |
| carton-case-management | Standard modlet pattern with Storybook + Vitest; likely uses Shadcn-style `cn()` |
| bitovi-website | Astro islands context; explicitly includes Storybook story, Vitest tests, optional types |

**Verdict:** Similar structure, different styling conventions. Could be generalized with configurable options (already partially exists in `ai-enablement-prompts` at `writing-code/react/create-react-modlet/`).

---

### 3. `component-registry` — 3 repos

| Repo | Differences |
|------|-------------|
| vybit | Tracks extracted + unextracted patterns; grep commands for scanning |
| vybit-app-template | Same structure; also includes Storybook integration in description |
| bitovi-website | Astro-scoped: tracks `src/components/`; incremental refactoring, prevents duplication |

**Verdict:** Nearly identical across repos; Astro version slightly more specific. Generic enough to centralize.

---

### 4. `debug-e2e-test` — 2 repos

| Repo | Differences |
|------|-------------|
| vybit | 9-step workflow; screenshots in `temp/`; Playwright MCP `f*`-prefixed refs for iframes |
| vybit-app-template | Same 9-step workflow; adds section on diagnosing non-deterministic data (dates, missing seeds) |

**Verdict:** vybit-app-template is a superset. Could consolidate into one version.

---

### 5. `debugging` — 3 repos

| Repo | Differences |
|------|-------------|
| vybit | Fresh browser sessions; monitor console for errors |
| vybit-app-template | Same + supports `VITE_BYPASS_LOGIN=true` login bypass flag |
| bitovi-website | Astro dev server focus; walk through affected pages; confirm no hydration warnings |

**Verdict:** Same intent across all three; minor env-specific additions.

---

### 6. `extract-ui-component` — 3 repos

| Repo | Differences |
|------|-------------|
| vybit | Discriminated unions, incremental refactoring (one file at a time), props extend `HTMLAttributes` |
| vybit-app-template | 8-step workflow, analyzes 3-5 existing pattern examples first, a11y guidelines, updates component registry |
| bitovi-website | Astro-scoped: covers Astro component extraction with TypeScript props, composable APIs, Tailwind |

**Verdict:** Complementary content across repos. vybit-app-template's is most structured; could merge as one skill with optional Astro-specific section.

---

### 7. `write-e2e-test` / `responsive-design` — 2 repos each

`write-e2e-test`:

| Repo | Differences |
|------|-------------|
| vybit | Checklist-driven; companion to debug-e2e-test |
| vybit-app-template | Emphasizes `/model` sample generators for test data |

**Verdict:** Similar intent, slightly different data strategies. Could merge.

`responsive-design`:

| Repo | Differences |
|------|-------------|
| vybit-app-template | Generic responsive verification with Playwright resize/screenshot across breakpoints |
| bitovi-website | Same pattern but Astro-specific; includes scrollbar testing, breakpoint verification |

**Verdict:** Essentially identical intent; minor framework differences.

---

### 8. Spec Prompts (`spec`, `spec-check`, `spec-implement`, `spec-answered-questions`) — 3 repos

| Prompt | This repo (`writing-code/specs/`) | cascade-mcp | carton (`bit.*` prefix) |
|--------|-----------------------------------|-------------|-------------------------|
| `spec` | Base version | **Identical** to this repo | **Identical** to this repo |
| `spec-check` | Base version (numbered questions instruction) | **Identical** to this repo | Minor wording change: "Add additional questions ... if you need help making decisions" instead of numbered questions instruction |
| `spec-implement` | Base version | Not present | **Identical** to this repo |
| `spec-answered-questions` | Base version (includes "changes = feedback" paragraph, detailed review instructions) | Not present | **Stripped-down version** — missing the "changes/additions = feedback" paragraph and detailed review instructions |

**Verdict:** This repo is the canonical source. cascade-mcp's copies are identical (just a subset of 2). carton has all 4 but with minor wording drift in `spec-check` and a simplified `spec-answered-questions`.

---

### 9. `signatures` Prompt — 2 repos

| Repo | Differences |
|------|-------------|
| cascade-mcp | `.github/prompts/signatures.prompt.md` |
| ai-enablement-prompts (this repo) | `understanding-code/signatures.prompt.md` |

**Verdict:** **Identical.** cascade-mcp's copy has not diverged.

---

### 10. Figma Skills — 1 repo (carton only)

| Skill | Description |
|-------|-------------|
| `figma-explore` | Discover Figma pages/components |
| `figma-design-react` | Propose architecture from Figma |
| `figma-implement-component` | Implement React from Figma |
| `figma-component-sync` | Audit implementation vs Figma |
| `figma-connect-component` | Generate Code Connect mapping |
| `figma-connect-shadcn` | Connect shadcn/ui to Figma |

**Verdict:** Unique to carton but technology-generic (React + Figma). Strong candidates for centralization. Note: `figma-design-react` already exists in `ai-enablement-prompts` at `writing-code/react/figma-design-react/`.

---

### 11. Unique Skills (no overlap)

| Skill | Repo | Description | Generalizable? |
|-------|------|-------------|----------------|
| `dev-environments` | vybit | Port map, service arrangements, VS Code Tasks | No — very project-specific |
| `mode-button-behavior` | vybit | Overlay interaction flow tables | No — vybit-specific |
| `naming-guide` | vybit | Topology tree for naming parts | No — vybit-specific |
| `preview-className-component` | vybit | Live-preview Tailwind via WebSocket | No — vybit-specific |
| `tailwind-vocabulary` | vybit | Canonical Tailwind terms | Partially — useful for any Tailwind project |
| `responsive-design` | vybit-app-template | Responsive verification with Playwright resize | Yes — generic workflow |
| `generate-sample-data` | vybit-app-template | Zod → mock data with `@anatine/zod-mock` + Faker | Yes — useful for any Zod project |
| `init-mock-app` | vybit-app-template | Full project scaffold with 12 tools | Yes — opinionated but reusable |
| `update-data-model` | vybit-app-template | Zod entity management patterns | Yes — useful for any Zod project |
| `document-feature` | vybit-app-template | Feature requirement doc template | Yes — technology-agnostic |
| `implement-feature` | vybit-app-template | End-to-end UI feature workflow | Yes — orchestration pattern |
| `component-reuse` | carton | Check existing components before building new ones | Yes — generic React pattern |
| `validate-implementation` | carton | Runtime error, a11y, API compliance checks | Yes — generic quality gate |
| `cross-package-types` | carton | tRPC AppRouter type inference across packages | Partially — tRPC-specific |
| `generate-feature` (agent) | carton | Full Jira ticket → implementation automation | Partially — Jira-specific workflow |
| `review-jira-ticket` (agent) | carton | Read-only Jira ticket analysis | Partially — Jira-specific |
| `ngrok-local` | cascade-mcp | ngrok tunnel setup for OAuth dev | No — project-specific |
| `write-tool-readme-docs` | cascade-mcp | MCP tool documentation generator | Partially — MCP-specific |
| `visual-diff` | bitovi-website | Playwright screenshot comparison between two URLs at multiple breakpoints; pixel-level diff and report | Yes — generic Playwright workflow |
| `computed-styles` | bitovi-website | Extract and diff `getComputedStyle()` values between two URLs via Playwright; pairs with visual-diff | Yes — generic Playwright workflow |
| `pixel-perfect` | bitovi-website | Orchestrator: drives visual-diff + computed-styles convergence loop until pages match | Yes — orchestrates two other skills |
| `discover-visual-states` | bitovi-website | Playwright-driven discovery of all interactive visual states of a component; saves `pixel-perfect.config.json` | Yes — generic Playwright workflow |
| `copy-to-page` | bitovi-website | Build `.astro` page from markdown copy doc using existing components | No — Astro-specific |

---

## Already in This Repo

These already exist in `ai-enablement-prompts` and should be considered as the canonical baseline:

| Path | Type | Description |
|------|------|-------------|
| [understanding-code/signatures.prompt.md](understanding-code/signatures.prompt.md) | Prompt | Generates `signatures.md` with API signatures + mermaid graph |
| [understanding-code/instruction-generation/](understanding-code/instruction-generation/) | Prompt set (6 files) | Multi-step instruction generation: techstack → categorize → architecture → domain deep dive → styleguide → build |
| [writing-code/specs/spec.prompt.md](writing-code/specs/spec.prompt.md) | Prompt | Build implementation plan; gather context from Jira/Figma; numbered questions |
| [writing-code/specs/spec-check.prompt.md](writing-code/specs/spec-check.prompt.md) | Prompt | Review spec for contradictions, redundancy, completeness |
| [writing-code/specs/spec-implement.prompt.md](writing-code/specs/spec-implement.prompt.md) | Prompt | Implement spec phase-by-phase with pause points |
| [writing-code/specs/spec-answered-questions.prompt.md](writing-code/specs/spec-answered-questions.prompt.md) | Prompt | Incorporate answered questions back into spec |
| [writing-code/generate-feature/generate-feature.md](writing-code/generate-feature/generate-feature.md) | Prompt | Full feature generation workflow |
| [writing-code/react/create-react-modlet/SKILL.md](writing-code/react/create-react-modlet/SKILL.md) | Skill | Create React components in modlet pattern |
| [writing-code/react/figma-design-react/SKILL.md](writing-code/react/figma-design-react/SKILL.md) | Skill | Design React components from Figma |
| [writing-stories/from-figma/](writing-stories/from-figma/) | Prompt set | Multi-step Figma → shell stories → full stories workflow |
| [writing-stories/from-figma-alt/](writing-stories/from-figma-alt/) | Prompt set | Alternate Figma → stories workflow |
| [writing-stories/from-images/](writing-stories/from-images/) | Prompt set | Image-based screen analysis → stories |
| [writing-stories/subtasks-spa-rest-sql/](writing-stories/subtasks-spa-rest-sql/) | Prompt set | Story → subtasks split (data migrations / API / frontend) |
| [writing-stories/to-jira/story-to-jira.md](writing-stories/to-jira/story-to-jira.md) | Prompt | Push completed stories to Jira |
| [creating-prompts/create-skill/](creating-prompts/create-skill/) | Skill (claude + copilot variants) | Meta-skill: how to create new skills |
| [crop-image/crop-image.md](crop-image/crop-image.md) | Prompt | Image cropping workflow |
| [plugins/creating-prompts/](plugins/creating-prompts/) | Plugin | Existing plugin packaging the create-skill skills |

---

## Recommended Plugin Organization

**Recommendation: Multiple tech-stack-based plugins under one marketplace.** Groupings reflect dependencies (MCP servers required + tech stack), not workflow stages. Users install only what applies to their stack.

### Proposed Plugins

| Plugin | Contents | Required MCPs | Tech Stack |
|--------|----------|--------------|------------|
| **`code`** | spec prompts, signatures, instruction-generation, document-feature, create-skill | — | Any |
| **`react`** | create-react-modlet, extract-ui-component, component-registry, component-reuse, validate-implementation | — | React |
| **`react-mock`** | generate-sample-data, update-data-model, implement-feature | — | React + Zod |
| **`figma-react`** | figma-design-react, figma-implement-component, figma-component-sync, figma-connect-component | Figma | React + Figma |
| **`playwright`** | write-e2e-test, debug-e2e-test, debugging, test-responsive-design, visual-diff, computed-styles, pixel-perfect, discover-visual-states | Playwright | Any |
| **`trpc-prisma`** | cross-package-types, server/shared package instruction patterns | — | tRPC + Prisma |

### Plugin Detail

#### `code` — No MCP required
The baseline plugin. Works with any codebase, any stack.
- `spec`, `spec-check`, `spec-implement`, `spec-answered-questions` — planning and implementation workflow (canonical source, identical across cascade-mcp and carton)
- `signatures` — generate `signatures.md` API surface + mermaid dependency graph
- `instruction-generation/` (6-step series) — onboard an AI agent to an unknown codebase
- `document-feature` — markdown PRD template (`wiki/` directory, 11-section format)
- `create-skill` — meta-skill for creating new skills (claude + copilot variants)

#### `react` — No MCP required
Core React component development patterns. Framework conventions, no external dependencies.
- `create-react-modlet` — modlet pattern (index.ts + impl + story + tests + types)
- `extract-ui-component` — extract reusable components from inline patterns; a11y, discriminated unions
- `component-registry` — living inventory of extracted vs unextracted patterns
- `component-reuse` — check existing components before creating new ones
- `validate-implementation` — runtime errors, a11y, API compliance gate

#### `react-mock` — No MCP required; requires React + Zod
Mock data and data model patterns for Zod-based React apps.
- `generate-sample-data` — type-safe deterministic mock data from Zod schemas via `@anatine/zod-mock` + Faker
- `update-data-model` — add/modify Zod entities; Mermaid diagram updates; one entity per file
- `implement-feature` — end-to-end 9-step UI feature workflow (Zod → mock → component → test → story)

#### `figma-react` — Requires Figma MCP; React stack
The full Figma-to-code lifecycle for React.
- `figma-design-react` — propose component architecture and props API from Figma (already in this repo)
- `figma-implement-component` — implement React component from Figma design (with `reference/` + `steps/` subdirs)
- `figma-component-sync` — audit React implementation against Figma source for visual accuracy
- `figma-connect-component` — generate a single `.figma.ts` Code Connect file for any React component

#### `playwright` — Requires Playwright MCP
All Playwright-based QA workflows. Includes bitovi-website's visual QA skills.
- `write-e2e-test` — create Playwright E2E tests (with MSW/Zod sample data awareness)
- `debug-e2e-test` — 9-step debugging workflow; screenshots, `error-context.md` artifacts
- `debugging` — post-change verification: fresh browser session, no console errors
- `test-responsive-design` — responsive verification via Playwright resize + screenshot at each breakpoint
- `visual-diff` — compare baseline vs dev/Storybook via screenshots at multiple breakpoints; pixel-level diff report
- `computed-styles` — extract `getComputedStyle()` from two URLs and diff property-by-property
- `pixel-perfect` — orchestrator: drives `visual-diff` + `computed-styles` convergence loop until pages match
- `discover-visual-states` — explore production page to find all interactive visual states; save `pixel-perfect.config.json`

#### `trpc-prisma` — No MCP required; requires tRPC + Prisma
Type-safety patterns for monorepos with a tRPC + Prisma architecture.
- `cross-package-types` — AppRouter type inference across shared/server/client packages
- Package instruction templates for `server.instructions.md`, `shared.instructions.md`, `client.instructions.md`

### Sourcing Priority

Skills that already exist in this repo are ready immediately. Priority order for extraction:

1. **`code`** — spec prompts, signatures, instruction-generation already here. Add `document-feature` (from vybit-app-template).
2. **`react`** — `create-react-modlet` already here. Add `extract-ui-component`, `component-registry`, `component-reuse`, `validate-implementation`.
3. **`playwright`** — `write-e2e-test`, `debug-e2e-test`, `debugging` from vybit-app-template (superset versions). Add `test-responsive-design`, `visual-diff`, `computed-styles`, `pixel-perfect`, `discover-visual-states` from bitovi-website.
4. **`figma-react`** — `figma-design-react` already here. Add remaining skills from carton.
5. **`react-mock`** — All from vybit-app-template.
6. **`trpc-prisma`** — Extract from carton.

### Single-Plugin Alternative

For the awesome-copilot marketplace, bundle Tier 1 only: `code` + `react` + `creating-prompts`. No MCP dependencies required, broadly applicable.

> **Note on cascade-mcp:** Jira workflows, Figma story-writing, and all Atlassian+Figma orchestration are better served by cascade-mcp, which provides dedicated MCP tools (semantic Figma representation, `write-shell-stories`, `write-full-story`, `review-work-item`, etc.). cascade-mcp should release its own plugin for these workflows. The `figma-react` plugin in this repo covers only the code-side React↔Figma skills (implementing components, syncing, Code Connect) which don't depend on cascade-mcp.


---

## Cascade-MCP Built-In Prompts (Deferred)

> **Decision:** These are out of scope for phase 1. The prompts below rely on cascade-mcp's own MCP tools (semantic Figma representation, etc.) and are not portable as standalone skills. cascade-mcp should release its own plugin.

For reference, these are the prompts cascade-mcp uses internally inside its MCP tools:

| Source File | Currently Used By | What It Does | Migration Target |
|-------------|-------------------|--------------|------------------|
| [`writing-shell-stories/prompt-screen-analysis.ts`](https://github.com/bitovi/cascade-mcp/blob/main/server/providers/combined/tools/writing-shell-stories/prompt-screen-analysis.ts) | `write-shell-stories` tool | Vision-model prompt that analyzes a single Figma screen — UI elements, interactions, purpose, and uses any associated "Note" components | Skill or prompt: `analyze-figma-screen` (extends `writing-stories/from-figma/3-analyze-screens.md`) |
| [`writing-shell-stories/prompt-shell-stories.ts`](https://github.com/bitovi/cascade-mcp/blob/main/server/providers/combined/tools/writing-shell-stories/prompt-shell-stories.ts) | `write-shell-stories` tool | Synthesizes screen analyses into prioritized, dependency-ordered shell stories with ✅/❌/❓ markers, evidence-based (no speculation) | Prompt: `synthesize-shell-stories` (extends `writing-stories/from-figma/4-shell-stories.md`) |
| [`analyze-feature-scope/strategies/prompt-scope-analysis-2.ts`](https://github.com/bitovi/cascade-mcp/blob/main/server/providers/combined/tools/analyze-feature-scope/strategies/prompt-scope-analysis-2.ts) | `analyze-feature-scope` tool (deprecated, now inlined into `write-shell-stories`) | Categorizes features into ☐ in-scope / ✅ already done / ⏬ low priority / ❌ out-of-scope / ❓ questions, grouped by user workflow | Skill: `analyze-feature-scope` |
| [`write-next-story/prompt-story-generation.ts`](https://github.com/bitovi/cascade-mcp/blob/main/server/providers/combined/tools/write-next-story/prompt-story-generation.ts) + [`story-writing-guidelines.md`](https://github.com/bitovi/cascade-mcp/blob/main/server/providers/combined/tools/write-next-story/story-writing-guidelines.md) | `write-epics-next-story` tool | Generates a full Jira story from a shell story: user-story format, Supporting Artifacts, Out of Scope, NFRs, Developer Notes, Gherkin acceptance criteria with embedded Figma links | Prompt + reference doc: `write-full-story` (extends `writing-stories/from-figma/5-write-story.md`) |
| [`review-work-item/prompt-work-item-review.ts`](https://github.com/bitovi/cascade-mcp/blob/main/server/providers/combined/tools/review-work-item/prompt-work-item-review.ts) | `review-work-item` tool | Reviews a Jira work item against parents/blockers/Confluence DoR/Figma; emits questions grouped by feature area + DoR gaps | Skill: `review-work-item` |
| [`write-story` and `write-story-context`](https://github.com/bitovi/cascade-mcp/tree/main/server/providers/combined/tools) (newest, 2 days old) | `write-story` tool | Newest single-call story-writing flow with separate context-gathering step | Investigate; likely consolidates the others |
| [`figma-ask-scope-questions-for-page`](https://github.com/bitovi/cascade-mcp/tree/main/server/providers/figma/tools) (last month) | Figma tool | Asks scope questions for a Figma page | Skill: `figma-ask-scope-questions` |

These are evidence-based and battle-tested in production at `cascade.bitovi.com/mcp`. They are listed here as a reference for when cascade-mcp releases its own plugin.

---

## MCP Server Mapping

Which MCPs each plugin / skill / prompt depends on:

### MCP Servers Referenced

| MCP | Provides | Required by |
|-----|----------|-------------|
| **Atlassian MCP** (Jira/Confluence) | `atlassian-get-issue`, `atlassian-search`, `atlassian-update-issue-description`, Confluence page fetch | spec, generate-feature, review-jira-ticket, story-to-jira, all `writing-stories/` flows |
| **Figma MCP** (or cascade-mcp Figma tools) | `figma-get-image-download`, `figma-get-metadata-for-layer`, `figma-get-layers-for-page` | All `figma-*` skills, `writing-stories/from-figma/*`, `figma-design-react`, cascade-mcp built-in prompts |
| **Cascade MCP** (`cascade.bitovi.com/mcp`) | `analyze-feature-scope`, `write-shell-stories`, `write-epics-next-story`, `review-work-item`, plus underlying Atlassian + Figma tools | cascade-mcp's own plugin (not this repo) |
| **Playwright MCP** | Browser automation, screenshots, accessibility tree | `write-e2e-test`, `debug-e2e-test`, `debugging`, `responsive-design` |
| **GitHub MCP** | `issue_write`, repo introspection | `taskstoissues` style flows, `generate-feature` (for PRs/issues) |
| **Filesystem MCP** | Local file read/write, scanning | Most skills (component-registry scanning, init flows) |
| **Google Drive / Sheets MCP** | Doc fetch, sheet read | cascade-mcp's newest `write-story-context` |

### Plugin → MCP Requirements

| Plugin | Required MCPs | Optional MCPs |
|--------|--------------|---------------|
| `code` | — | Atlassian, Figma, Cascade (any context source) |
| `react` | — | Filesystem (for registry scans) |
| `react-mock` | — | — |
| `figma-react` | Figma | — |
| `playwright` | Playwright | — |
| `trpc-prisma` | — | — |

### Note on Cascade MCP

cascade-mcp's tools depend on their own proprietary MCP server and are not included in this repo's plugins. Users who want the full Figma+Jira orchestration (write-shell-stories, write-full-story, etc.) should use cascade-mcp directly — it should release its own plugin for that workflow.
