# Skill: Pre-capture Reference Material

Captures app screenshots and structured text content for every UI component before any Figma building begins. Decoupling capture from building means build agents never launch Chromium. A single unified batch manifest (sorted by URL) minimizes page navigations and avoids multi-subagent overhead.

## When to Use

- Before `figma-from-code` Phase 3 (component builds need app screenshots as reference)
- To refresh app screenshots after UI changes without re-running the full pipeline
- Standalone capture of component screenshots for design review

## Prerequisites

- Dev server running at `{devServerUrl}`
- Playwright installed (`node_modules/playwright-core`)
- Shared Playwright server optionally running (started by orchestrator before dispatching; scripts fall back to launching their own browser if absent):
  ```bash
  node {skillRoot}/10-validator/browser-server.js &
  ```

> Placeholders like `{devServerUrl}` and `{skillRoot}` resolve from `state.json → config`.
  Endpoint is written to `.temp/figma-from-code/pw-endpoint.txt` and auto-detected by scripts.

## Manifest Building

The **subagent** builds all manifests itself before running any screenshots. Do not wait for external manifest files — build them from `component-map.json`.

1. Read `.temp/figma-from-code/component-map.json` to get all components and their `capture` data
2. Derive the URL, selector, fallbacks, and interaction replay from each component's `capture` object (see **Selector Strategy** below)
3. Build two unified manifests (screenshot + text) covering all screenshottable components, sorted by `url`; append one text entry per discovered route (selector `body`) to `all-text.json` for screen text extraction
4. Create a `precapture-screens` manifest for full-page screenshots of all discovered routes; for each route carry the list of top-level components (`keyComponents`) from `component-map.json` so the results file can be written without re-reading the map

### Selector Strategy

Use `component-map.json → capture` as the authoritative source. It records exactly where and how the component was observed at discovery time:

- `capture.url` — the **exact concrete route** where the selector was validated. Always use it as the manifest URL. Never substitute `routes[0]` — selectors derived on one route routinely fail on another.
- `capture.selector` — the primary selector; `capture.fallbackSelectors` — ordered alternates, passed through so `screenshot.js` can retry on drift.
- `capture.interaction` — the replay recipe for interaction-gated components: `clicks` (ordered array) and `hover` go straight into the manifest entry.
- `capture.viewport` — when non-null, pass as `width`/`height`.

Legacy maps without `capture`: fall back to the top-level `selector` field paired with `routes[0]`, as before. Do not read any other skill file to obtain selectors.

### Components with no capture data (skip entirely)

Skip a component only when **both** `capture` and the legacy `selector` field are null. These are typically loading states, error states, and components genuinely not reachable in the UI. They proceed to Phase 3 build with `appScreenshot: null` (the build skill handles the `no_app_reference` path). List each one in the `skipped` array.

## Manifest Format

The subagent constructs a unified manifest for all screenshottable components. The manifest is a JSON array where each entry has: `url`, `output`, `selector`, `fallbackSelectors` (optional), `click` (optional, string or ordered array), `hover` (optional), `nth` (optional), `width`/`height` (optional).

Write two manifest files (sorted by `url` to cluster same-route entries; within a URL, put entries **without** `click` first so passive captures are never polluted by leftover overlays):

- `.temp/figma-from-code/manifests/all-screenshots.json` — all screenshot entries
- `.temp/figma-from-code/manifests/all-text.json` — all text extraction entries

### Screenshot manifest entry format

```json
{
  "url": "{devServerUrl}{capture.url}",
  "output": ".temp/figma-from-code/screenshots/{name}/app.png",
  "selector": "{capture.selector}",
  "fallbackSelectors": ["{capture.fallbackSelectors...}"],
  "click": ["{capture.interaction.clicks...}"],
  "hover": "{capture.interaction.hover}",
  "nth": 0
}
```

Omit `click`/`hover` when `capture.interaction` is null. Add `"width"`/`"height"` when `capture.viewport` is set.

### Text manifest entry format

```json
{
  "url": "{devServerUrl}{capture.url}",
  "output": ".temp/figma-from-code/screenshots/{name}/text.json",
  "selector": "{capture.selector}",
  "fallbackSelectors": ["{capture.fallbackSelectors...}"],
  "click": ["{capture.interaction.clicks...}"],
  "nth": 0
}
```

### Screen manifest entries (no selector — full page)

One entry per discovered route goes into `manifests/precapture-screens.json`:

```json
[
  {
    "url": "{devServerUrl}{route}",
    "output": ".temp/figma-from-code/screenshots/screens/{ScreenName}/app.png",
    "screenName": "{ScreenName}",
    "route": "{route}",
    "pageSourceFile": "{pageSourceFile}",
    "keyComponents": ["{ComponentName}", "..."]
  }
]
```

One additional entry per route is appended to `manifests/all-text.json` for screen text extraction:

```json
{
  "url": "{devServerUrl}{route}",
  "output": ".temp/figma-from-code/screenshots/screens/{ScreenName}/text.json",
  "selector": "body"
}
```

Build one entry per discovered route from `component-map.json`. Name screens by converting route paths to PascalCase (e.g., `/items/new` → `CreateItemPage`). `keyComponents` is the list of top-level components on that route.

## Subagent Prompt Template

The orchestrator dispatches **one subagent** that handles manifest-building and all captures inline.

> **Chunking:** `screenshot.js` has a 60-second timeout per run. If `all-screenshots.json` contains more than 15 entries, split it into chunk files of 15 entries each (`chunk-01.json`, `chunk-02.json`, …) and run each chunk sequentially. The default chunk size of 15 assumes ~3s per component; use chunks of 10 when a chunk contains entries with `click` steps (interaction replays add ~2–4s each), and reduce further if your app has slow navigation.

```
Capture app screenshots and text content for UI components and app screens from a running dev server.

Skill file: plugins/figma-from-code/skills/figma-from-code/5-precapture/SKILL.md
Read it for manifest format, selector strategy, and output format.

Step 0 — Build manifests from component-map.json:
  Read .temp/figma-from-code/component-map.json
  For each component with a non-null capture object (or, legacy fallback, a
  non-null top-level selector field), create entries in:
    .temp/figma-from-code/manifests/all-screenshots.json
    .temp/figma-from-code/manifests/all-text.json  (components only at this point)
  Entry fields come from capture: url = {devServerUrl}{capture.url} (exact route,
  never routes[0]), selector = capture.selector, fallbackSelectors, and when
  capture.interaction is set: click = interaction.clicks (array), hover = interaction.hover.
  Skip a component only when BOTH capture and selector are null — list it in skipped.
  For each distinct route in component-map.json, collect the top-level components
  that appear on that route (keyComponents list), then build:
    .temp/figma-from-code/manifests/precapture-screens.json
  Each screens manifest entry: { url, output, screenName, route, pageSourceFile, keyComponents }
  Also append one text entry per route into all-text.json:
    { url, output: ".temp/figma-from-code/screenshots/screens/{ScreenName}/text.json", selector: "body" }
  Sort all manifests by url (entries without click first within each url) before writing.

Scripts (already exist, do not modify):
  Screenshot: node {skillRoot}/10-validator/screenshot.js
  Text:       node {skillRoot}/10-validator/extract-text.js

Both scripts support batch mode for faster execution (one browser, many captures):

1. Capture all component screenshots (chunk if > 15 entries — run each chunk sequentially):
   node {skillRoot}/10-validator/screenshot.js \
     --batch .temp/figma-from-code/manifests/all-screenshots.json

2. Extract all text content in one batch (includes both component and screen text entries):
   node {skillRoot}/10-validator/extract-text.js \
     --batch .temp/figma-from-code/manifests/all-text.json

3. Capture all screen (full-page) screenshots — screens are few so one chunk suffices:
   node {skillRoot}/10-validator/screenshot.js \
     --batch .temp/figma-from-code/manifests/precapture-screens.json

4. Write component results to .temp/figma-from-code/precapture-all.json:
   {"group": "all", "captured": [{"name": "...", "app": "...", "text": "..."}], "skipped": [...], "failed": [{"name": "...", "error": "...", "url": "...", "selectorTried": "...", "fallbacksTried": N}]}
   For failed entries, copy the manifest url/selector and the fallback count from the
   screenshot.js error output so selector drift is diagnosable from the results file alone.

5. Write screen results to .temp/figma-from-code/precapture-screens.json:
   {
     "screens": [
       {
         "screenName": "CasesPage",
         "route": "/cases",
         "pageSourceFile": "src/pages/CasesPage.tsx",
         "keyComponents": ["CaseList", "CaseFilters"],
         "appScreenshot": ".temp/figma-from-code/screenshots/screens/CasesPage/app.png",
         "textFile": ".temp/figma-from-code/screenshots/screens/CasesPage/text.json",
         "status": "captured"
       }
     ]
   }
   status is "captured", "failed", or "skipped" per screen.
```

## Output Files

Written to `.temp/figma-from-code/`:

| File                      | Contents                                                      |
| ------------------------- | ------------------------------------------------------------- |
| `precapture-all.json`     | Results for all component screenshots and text (single file)  |
| `precapture-screens.json` | Results for full-page screen screenshots and screen text      |

### precapture-all.json format

```json
{
  "group": "all",
  "captured": [
    { "name": "Button", "app": ".temp/.../Button/app.png", "text": ".temp/.../Button/text.json" }
  ],
  "skipped": ["Skeleton"],
  "failed": [{ "name": "Calendar", "error": "selector not found or timeout (tried 3: ...)", "url": "http://localhost:5173/cases/", "selectorTried": "[aria-label=\"Calendar\"]", "fallbacksTried": 2 }]
}
```

### precapture-screens.json format

```json
{
  "screens": [
    {
      "screenName": "CasesPage",
      "route": "/cases",
      "pageSourceFile": "src/pages/CasesPage.tsx",
      "keyComponents": ["CaseList", "CaseFilters"],
      "appScreenshot": ".temp/figma-from-code/screenshots/screens/CasesPage/app.png",
      "textFile": ".temp/figma-from-code/screenshots/screens/CasesPage/text.json",
      "status": "captured"
    }
  ]
}
```

`keyComponents` lists the top-level components that appear on the route (sourced from `component-map.json`). `status` is `"captured"`, `"failed"`, or `"skipped"` per screen.

## Scripts Reference

| Script              | Location                                       | Purpose                                                 |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| `screenshot.js`     | `{skillRoot}/10-validator/screenshot.js`     | Playwright element/page screenshots, supports `--batch` |
| `extract-text.js`   | `{skillRoot}/10-validator/extract-text.js`   | Structured text extraction by role, supports `--batch`  |
| `browser-server.js` | `{skillRoot}/10-validator/browser-server.js` | Shared Playwright WebSocket server                      |

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
