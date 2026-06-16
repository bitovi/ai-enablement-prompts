# Component Discovery (Phase 0a)

Discovers the complete component architecture of a web application by combining runtime browser crawling with static code analysis. Produces a merged, topologically-sorted build order (leaves first, layouts last) that every subsequent phase depends on. Also inspects the target Figma file to report what already exists there.

## What It Does

Component discovery uses two complementary methods to find every component in the application:

1. **Browser crawling** — A Playwright-based crawler visits each route in the running dev server, recording every component it encounters along with the CSS selector and URL where it was found. A second interaction pass triggers gated UI (dialogs, dropdowns, tooltips) to catch components that only appear after user actions.

2. **Static code scanning** — A source-code scanner walks the codebase to find all component definitions, including ones that never rendered during the crawl — inline-edit variants, conditionally rendered components, lazy-loaded views, and so on.

The two result sets are merged and deduplicated into a single component map. Components are topologically sorted so that leaf nodes (buttons, icons, badges) appear before the composites that use them (cards, forms, page layouts). This build order is the backbone of the entire pipeline.

In parallel, the step inspects the target Figma file via the Figma MCP to catalog existing pages, variable collections, and components, so later phases know what has already been built.

## How It Works

1. Verifies the dev server is running and reachable
2. Enumerates routes statically from the router config and programmatic navigation
3. Runs a passive browser crawl to discover components rendered at runtime, recording each component's CSS selector and the URL where it was found
4. Authors interaction scenarios for gated components — things like dialogs, dropdown menus, and tooltips that only appear after a click or hover
5. Runs an interaction pass using those scenarios to discover the hidden components
6. Normalizes component names to match Figma conventions (e.g., Lucide icons receive an "Icon/" prefix)
7. Discovers frontend source directories by scanning the codebase
8. Scans code statically for all component definitions, catching anything the browser crawl missed
9. Merges browser-discovered and code-discovered components into a unified, topologically-sorted build order
10. Inspects the Figma file to find existing components, pages, and variable collections
11. Creates `.figma/figma.json` tracking files for any components that match between the codebase and Figma
12. Writes a discovery summary for the orchestrator

## Inputs

- **A running dev server** — defaults to `http://localhost:5173`
- **Playwright** — must be installed for the browser crawl
- **A Figma file key** — used to inspect what already exists in the target Figma file

## Outputs

All output files are written to `.temp/figma-from-code/`:

| File | Description |
|------|-------------|
| **component-map.json** | The authoritative tiered build order with capture data (URL + CSS selector) for each component |
| **component-map.md** | Human-readable report including a Mermaid dependency diagram |
| **interactions.json** | Interaction scenarios for components behind user interactions (clicks, hovers) |
| **discovery-summary.json** | Compact summary consumed by the orchestrator to coordinate later phases |

## Why It Matters

Every subsequent phase in the pipeline depends on the component map produced here. The tiered build order ensures atoms (buttons, icons) are built in Figma before the composites that reference them (cards, forms, pages). The capture data — a URL and CSS selector for each component — tells the pre-capture phase exactly where to find and screenshot each component. Without accurate, complete discovery, later phases would miss components or attempt to build them in the wrong order.

## Key Scripts

The following scripts power this phase and should not be modified:

- **map-components.js** — Playwright-based browser crawler
- **normalize-component-map.js** — aligns discovered names with Figma conventions
- **discover-code-components.js** — static analysis scanner
