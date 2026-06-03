# Skill: Pre-capture Reference Material

Captures app screenshots and structured text content for every UI component before any Figma building begins. Decoupling capture from building means build agents never launch Chromium. A single unified batch manifest (sorted by URL) minimizes page navigations and avoids multi-subagent overhead.

## When to Use

- Before `figma-from-code` Phase 3 (component builds need app screenshots as reference)
- To refresh app screenshots after UI changes without re-running the full pipeline
- Standalone capture of component screenshots for design review

## Prerequisites

- Dev server running at `<dev-server-url>`
- Playwright installed (`node_modules/playwright-core`)
- Shared Playwright server running (started by orchestrator before dispatching):
  ```bash
  node ${CLAUDE_SKILL_DIR}/10-validator/browser-server.js &
  ```
  Endpoint is written to `.temp/figma-from-code/pw-endpoint.txt` and auto-detected by scripts. If not running, scripts fall back to launching their own browser.

## Manifest Building

The **subagent** builds all manifests itself before running any screenshots. Do not wait for external manifest files — build them from `component-map.json`.

1. Read `.temp/figma-from-code/component-map.json` to get all components and the routes where they appear
2. Derive selectors from each component's `selector` field in `component-map.json` (see **Selector Strategy** below)
3. Build two unified manifests (screenshot + text) covering all screenshottable components, sorted by `url`
4. Create a `precapture-screens` manifest for full-page screenshots of all discovered routes

### Selector Strategy

Use `component-map.json → selector` for each component. If the field is present, use it as-is. If absent or null, skip the component (treat as no-selector). Do not read any other skill file to obtain selectors.

| Component Type                        | Preferred Selector                | Example                                |
| ------------------------------------- | --------------------------------- | -------------------------------------- |
| Always visible (nav, header, sidebar) | `aria-label` or semantic HTML     | `header[aria-label="Main navigation"]` |
| Form inputs                           | Input type + placeholder          | `input[placeholder="..."]`             |
| Overlays/dialogs                      | Click trigger + `[role="dialog"]` | `--click "button[aria-label='...']"`   |
| Embedded / primitives                 | Parent context                    | `[class*="ComponentName"]`             |

### Components with no app selector (skip entirely)

Components that have no CSS selector in `component-map.json` should be skipped. These are typically loading states, error states, hover-only components, and components not directly visible in the UI.

### Code-only components (skip entirely)

Components with `source: "code"` in `component-map.json` were discovered by static code analysis but have no browser route or selector. They cannot be screenshotted from the running app. Skip them during pre-capture — they proceed to Phase 3 build with `appScreenshot: null` (the build skill handles the `no_app_reference` path).

## Manifest Format

The subagent constructs a unified manifest for all screenshottable components. The manifest is a JSON array where each entry has: `name`, `url`, `selector`, `click` (optional), `hover` (optional), `nth` (optional).

Write two manifest files (sorted by `url` to cluster same-route entries):

- `.temp/figma-from-code/manifests/all-screenshots.json` — all screenshot entries
- `.temp/figma-from-code/manifests/all-text.json` — all text extraction entries

### Screenshot manifest entry format

```json
{
  "url": "<dev-server-url>{url}",
  "output": ".temp/figma-from-code/screenshots/{name}/app.png",
  "selector": "{selector}",
  "click": "{click}",
  "hover": "{hover}",
  "nth": 0
}
```

### Text manifest entry format

```json
{
  "url": "<dev-server-url>{url}",
  "output": ".temp/figma-from-code/screenshots/{name}/text.json",
  "selector": "{selector}",
  "click": "{click}",
  "nth": 0
}
```

### Screen manifest entries (no selector — full page)

```json
[
  {
    "url": "<dev-server-url>{route}",
    "output": ".temp/figma-from-code/screenshots/screens/{ScreenName}/app.png"
  }
]
```

Build one entry per discovered route from `component-map.json`. Name screens by converting route paths to PascalCase (e.g., `/items/new` → `CreateItemPage`).

## Subagent Prompt Template

The orchestrator dispatches **one subagent** that handles manifest-building and all captures inline.

> **Chunking:** `screenshot.js` has a 60-second timeout per run. If `all-screenshots.json` contains more than 15 entries, split it into chunk files of 15 entries each (`chunk-01.json`, `chunk-02.json`, …) and run each chunk sequentially. The default chunk size of 15 assumes ~3s per component; reduce if your app has slow navigation.

```
Capture app screenshots and text content for UI components from a running dev server.

Skill file: ${CLAUDE_SKILL_DIR}/5-precapture/SKILL.md
Read it for manifest format, selector strategy, and output format.

Step 0 — Build manifests from component-map.json:
  Read .temp/figma-from-code/component-map.json
  For each component with a non-null selector field, create entries in:
    .temp/figma-from-code/manifests/all-screenshots.json
    .temp/figma-from-code/manifests/all-text.json
  Skip components with source: "code" or no selector.
  For routes in component-map.json, build:
    .temp/figma-from-code/manifests/precapture-screens.json
  Sort all manifests by url before writing.

Scripts (already exist, do not modify):
  Screenshot: node ${CLAUDE_SKILL_DIR}/10-validator/screenshot.js
  Text:       node ${CLAUDE_SKILL_DIR}/10-validator/extract-text.js

Both scripts support batch mode for faster execution (one browser, many captures):

1. Capture all screenshots (chunk if > 15 entries — run each chunk sequentially):
   node ${CLAUDE_SKILL_DIR}/10-validator/screenshot.js \
     --batch .temp/figma-from-code/manifests/all-screenshots.json

2. Extract all text content in one batch:
   node ${CLAUDE_SKILL_DIR}/10-validator/extract-text.js \
     --batch .temp/figma-from-code/manifests/all-text.json

After both batches complete, write results to:
.temp/figma-from-code/precapture-all.json

Use this format:
{"group": "all", "captured": [{"name": "...", "app": "...", "text": "..."}], "skipped": [...], "failed": [{"name": "...", "error": "..."}]}
```

## Output Files

Written to `.temp/figma-from-code/`:

| File                      | Contents                                            |
| ------------------------- | --------------------------------------------------- |
| `precapture-all.json`     | Results for all component screenshots (single file) |
| `precapture-screens.json` | Results for full-page screenshots                   |

### Output format

```json
{
  "group": "all",
  "captured": [
    { "name": "Button", "app": ".temp/.../Button/app.png", "text": ".temp/.../Button/text.json" }
  ],
  "skipped": ["Skeleton"],
  "failed": [{ "name": "Calendar", "error": "selector not found" }]
}
```

## Scripts Reference

| Script              | Location                                                        | Purpose                                                 |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| `screenshot.js`     | `${CLAUDE_SKILL_DIR}/10-validator/screenshot.js`     | Playwright element/page screenshots, supports `--batch` |
| `extract-text.js`   | `${CLAUDE_SKILL_DIR}/10-validator/extract-text.js`   | Structured text extraction by role, supports `--batch`  |
| `browser-server.js` | `${CLAUDE_SKILL_DIR}/10-validator/browser-server.js` | Shared Playwright WebSocket server                      |

Do NOT modify these scripts.

All screenshots are captured at 1x scale (`deviceScaleFactor: 1` is enforced in `screenshot.js`). This prevents Retina 2x doubling and ensures consistent dimensions for downstream comparison against Figma screenshots (which must also use `scale: 1` in `get_screenshot` calls).

## Skip / Resume

If called with `resume: true`, check whether `.temp/figma-from-code/precapture-all.json` and `precapture-screens.json` both exist. If both are present, skip. If either is missing, re-run the missing capture.

## Error Handling

| Scenario                                  | Action                                                          |
| ----------------------------------------- | --------------------------------------------------------------- |
| Dev server not running                    | Halt, tell user to start the dev server                         |
| Screenshot script fails for one component | Log in `failed` array, continue with remaining components       |
| Entire batch fails                        | Report error, offer retry for the failed chunk or full manifest |
| Missing selectors                         | Component goes in `skipped` array, non-fatal                    |
