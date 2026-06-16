# Pre-capture Reference Material (Phase 2.5)

Captures app screenshots and structured text content for every UI component and every screen (route) before any Figma building begins. By decoupling capture from building, build agents never need to launch a browser — they work entirely from pre-captured reference material.

## What It Does

Reads `component-map.json` and produces three batch manifests:

- **Screenshot manifest** — one entry per component with URL, CSS selector, fallback selectors, and any click/hover interaction steps needed to reveal the component.
- **Text manifest** — matching entries for structured text extraction, plus one entry per route for full-page text.
- **Screen manifest** — one entry per discovered route for full-page screenshots.

It then executes each manifest in sequence:

1. Runs all component screenshots in batches (chunked to avoid timeouts) using `screenshot.js` with a shared Playwright browser instance.
2. Extracts structured text content from each component and each page using `extract-text.js`.
3. Captures full-page screenshots for every route.
4. Writes results files recording what was captured, what was skipped (no selector), and what failed (selector not found or timeout).

All screenshots are captured at **1x scale** (`deviceScaleFactor: 1`) to ensure consistent dimensions when comparing against Figma screenshots later.

## How It Works

### Selector strategy

Each component's capture data from Phase 0a is used as-is — the exact URL and validated CSS selector where the component was observed at discovery time. For interaction-gated components (dialogs, dropdowns), the interaction replay recipe (click/hover steps) from discovery is replayed before screenshotting. Components with no capture data at all are skipped — they proceed to Phase 3 with no app reference.

### Skip/Resume

This phase is skipped entirely if both `precapture-all.json` and `precapture-screens.json` already exist.

### Key scripts (do not modify)

`screenshot.js`, `extract-text.js`, `browser-server.js`

## Inputs

- **Dev server** — must be running and accessible.
- **Playwright** — must be installed.
- **`component-map.json`** (from Phase 0a) — provides the URL, selector, and interaction replay recipe for each component.

## Outputs

All outputs are written to `.temp/figma-from-code/`:

| Output | Description |
|---|---|
| `precapture-all.json` | Results for all component screenshots and text (captured/skipped/failed lists) |
| `precapture-screens.json` | Results for full-page screen screenshots per route |
| `screenshots/{ComponentName}/app.png` | Component screenshot |
| `screenshots/{ComponentName}/text.json` | Structured text content (labels, headings, placeholder text) |
| `screenshots/screens/{ScreenName}/app.png` | Full-page screenshot |
| `screenshots/screens/{ScreenName}/text.json` | Full-page text content |

## Why It Matters

Every component and screen built in Phases 3 and 4 is visually compared against these app screenshots. They are the "ground truth" — the pixel-diff comparison loop uses them to verify that the Figma output matches the real app. The text content provides the actual labels, headings, and placeholder text to use in Figma.

Without pre-capture, each build agent would need its own browser instance, making the pipeline much slower and more fragile.
