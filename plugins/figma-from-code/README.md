# figma-from-code

Rebuilds a Figma design system from a running web app's codebase. Point it at your app and a Figma file, and it discovers your components, extracts your design tokens, then builds the component library and screens in Figma — comparing every build against screenshots of the real app and iterating until they match.

## What it does

The pipeline runs eight tracked phases. An orchestrator skill dispatches each phase to a subagent and tracks progress in `.temp/figma-from-code/state.json`, so a run can be paused and resumed at any checkpoint.

| Phase | Name | What happens |
| ----- | ---- | ------------ |
| 0a | Component discovery | Crawls the running app in a browser and scans the source code to find every component, where it's used, and what it depends on. Produces a tiered, bottom-up build order (atoms before composites). |
| 0b | Asset discovery | Scans the source for icon and SVG usage (Lucide supported out of the box) and extracts the SVG markup. |
| 1 | Design tokens | Reads your CSS custom properties (and Tailwind config, if any) and creates Figma variable collections: Palette, Semantic, and Spacing. |
| 2 | File structure | Creates the Figma page skeleton (Foundations, Components, Screens) and the container frames everything builds into. |
| 2.5 | Pre-capture | Screenshots every component and screen in the running app, and extracts their text content. These become the reference targets every Figma build is compared against. |
| 3 | Component builds | Builds icon/asset masters first, then each tier of components in dependency order. Every component goes through analyze → build → screenshot → pixel-compare → fix loop (up to 3 iterations) until it visually matches the app. |
| 4 | Screen assembly | Composes the built components into full screen frames, one per route, validated against full-page app screenshots. |
| 5 | Validation | Compares assembled screen frames against full-page app screenshots, fixes mismatched screens (up to 2 iterations), cleans up the Components page, and writes a report to `.temp/figma-validation/report.md`. Individual components are not re-validated — they already passed during Phase 3. |

Alongside the Figma output, every built component gets a `.figma/figma.json` tracking file next to its source code (node ID, dependencies, last update), enabling future syncs and incremental rebuilds.

Two PreToolUse hooks ship with the plugin and register automatically: a prerequisite gate that blocks a component from being created in Figma before its children exist, and an instance gate that blocks a build from being marked complete until its child instances pass a structural check.

## Prerequisites

- **Figma MCP server** connected (`use_figma`, `get_screenshot`, `get_metadata`) and the Figma plugin's `figma:figma-use` skill available
- **A running dev server** for the target app
- **`@playwright/test`** installed at the project root, plus `npx playwright install chromium`
- `lucide-react` if the project uses Lucide icons (icon discovery degrades gracefully otherwise)
- Gitignore `.temp/`; the pipeline writes persistent `.figma/figma.json` tracking files next to component sources

## Starting a run

1. **Load the plugin.** In this repo:

   ```bash
   claude --plugin-dir ./plugins/figma-from-code
   ```

   From another project on this machine:

   ```text
   /plugin marketplace add /path/to/ai-enablement-prompts
   /plugin install figma-from-code@bitovi-ai-enablement
   ```

2. **Start your app's dev server** (e.g. `npm run dev`).

3. **Kick it off.** Tell Claude:

   > Run the figma-from-code pipeline against Figma file `<fileKey or Figma URL>`

   The only required input is the Figma file key. On a first run the orchestrator detects your project's config — dev server URL, source/components/pages directories, CSS token file, Tailwind config, icon library — and asks you to confirm it before anything is built. The confirmed config is persisted to `.temp/figma-from-code/state.json`.

4. **Approve at checkpoints.** The pipeline pauses after each major phase and after every component tier so you can inspect the Figma file and decide whether to continue. Say `continue` to proceed to the next wave, or stop at any pause point — nothing is lost.

## Batch mode (workflow)

For unattended runs, the plugin ships a workflow (`workflows/figma-from-code.js`) that drives the same phase sub-skills and contracts as the skill orchestrator — one architecture, two entry points. It runs the full pipeline without pause points: pre-existing-component conflicts come back as `needs_authorization` failures in the summary instead of pausing for approval.

> Run the figma-from-code workflow with fileKey `<fileKey>`

Args: `fileKey` (required), `startPhase`/`endPhase` (`phase0a`…`phase5`) to bound the run, plus any config overrides (`devServerUrl`, `sourceDir`, `componentsRoot` (string or array), `pagesRoot`, `cssPath`, `tailwindConfigPath`, `iconLibrary`, `skillRoot`). Batch mode does no config detection — pass overrides explicitly on a fresh run; a mid-pipeline start (`startPhase` past `phase0a`) hydrates config and progress from `state.json`, so a paused skill-orchestrator run can be continued as a batch run and vice versa.

## Resuming a run

State survives between sessions. To pick up where a previous run left off:

> Resume the figma-from-code run

The orchestrator reads `.temp/figma-from-code/progress.md` and `state.json`, verifies which phases are complete, and continues from the first incomplete phase. Components already built are never rebuilt, and anything that existed in Figma before the run started is treated as read-only unless you explicitly authorize changes.

## Outputs

- The Figma file: variable collections, Foundations docs, the tiered component library, and assembled screens
- `.temp/figma-from-code/` — state ledger, build order, per-component build results, app/Figma screenshots
- `.temp/figma-validation/report.md` — final validation report with per-component match percentages
- `{componentsRoot[]}/{Component}/.figma/figma.json` — persistent tracking files linking source code to Figma nodes (path derived from each component's source location; `componentsRoot` is an array supporting monorepos with multiple component directories)

## Development

After editing plugin files, run `/reload-plugins` in the session. See `skills/figma-from-code/REVIEW.md` for current findings, locked decisions, and the fix roadmap. The plugin will move to a dedicated marketplace repo once stable.

## Known limitations (being addressed per REVIEW.md)

- The `skillRoot` config default is repo-relative (`plugins/figma-from-code/skills/figma-from-code`); when running from an installed plugin, set it to `${CLAUDE_PLUGIN_ROOT}/skills/figma-from-code` at the first-run config confirmation
- Tailwind v3-style config assumed for token extraction (`tailwindConfigPath: null` skips it)
