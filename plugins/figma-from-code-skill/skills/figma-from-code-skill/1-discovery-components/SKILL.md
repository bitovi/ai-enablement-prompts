# Skill: Component Discovery

Discovers the complete component architecture of a web application by combining two methods: (1) browser crawling to find runtime components with routes and selectors, and (2) static code scanning to find all components including those not rendered during the crawl (modals, inline-edit variants, conditional renders, etc.). Produces a merged, topologically-sorted build order (leaves first, layouts last). Also inspects the target Figma file to report existing pages, variable collections, and components.

## When to Use

- Before running `figma-from-code` on a fresh Figma file
- When the component hierarchy may have changed and you need an updated build order
- Standalone audit of what components a site uses and how they nest
- When resuming a build and `component-map.json` is missing

## Prerequisites

- Dev server running at `<dev-server-url>` (or custom URL)
- Playwright installed (`node_modules/playwright-core`)

## Required Inputs

- `fileKey`: The Figma file key (for the Figma inspection step)
- `devServerUrl` (optional, default `<dev-server-url>`): The running dev server URL

## Output Files

Written to `.temp/figma-from-code/`:

| File                 | Contents                                            |
| -------------------- | --------------------------------------------------- |
| `component-map.json` | Authoritative tiered build order (machine-readable) |
| `component-map.md`   | Human-readable report with Mermaid diagram          |

## Workflow

### 1. Ensure output directory exists

```bash
mkdir -p .temp/figma-from-code/
```

### 2. Verify dev server is running

```bash
curl -s --max-time 3 <dev-server-url> > /dev/null || echo "Dev server not running"
```

If not running, halt and tell the user to start the dev server.

### 3. Run the component discovery script

```bash
node ${CLAUDE_SKILL_DIR}/10-validator/map-components.js \
  "<dev-server-url>" --crawl --max-crawl 30 \
  --markdown .temp/figma-from-code/component-map.md \
  --output .temp/figma-from-code/component-map.json
```

This produces the **authoritative build order** — a topologically-sorted list of tiers where leaves come first and layouts come last. All subsequent phases of `figma-from-code` use this output, not the static `figma-component-dependency-map`.

### 4. Normalize component names

The DOM scanner extracts React component names from the fiber tree, which may differ from the Figma naming convention for icons and assets:

- Lucide icons: scanner reads the internal `displayName` (e.g. `EllipsisVertical`) rather than the import alias used in code (e.g. `MoreVertical`)
- SVG asset wrappers: scanner sees the wrapper component name (e.g. `CartonLogo`) rather than the Figma asset name (e.g. `Asset/CartonLogoSvg`)

Run the normalization script to align names with Figma conventions. This requires `icons.json` from Phase 0b.

```bash
node ${CLAUDE_SKILL_DIR}/1-discovery-components/normalize-component-map.js \
  .temp/figma-from-code/component-map.json \
  .temp/figma-from-code/icons.json \
  --write
```

If `icons.json` does not yet exist (Phase 0b hasn't run), skip this step — the orchestrator will re-run normalization after Phase 0b completes.

The script resolves names via three strategies:

1. **Direct icon match**: component name is a known icon import name → prefix with `Icon/`
2. **Lucide alias resolution**: component name is a Lucide canonical name that differs from the import alias → resolve via `lucide-react` exports → prefix with `Icon/`
3. **Asset prefix match**: component name is a prefix of a known asset name → prefix with `Asset/`

### 5. Discover frontend source directories

Run the code scanner in discovery mode to locate component directories:

```bash
node ${CLAUDE_SKILL_DIR}/1-discovery-components/discover-code-components.js \
  --discover --root .
```

Read the JSON output. Present the discovered `componentDirectories` to the user for confirmation:

> "Found these component source directories:
>
> - `<source-dir>/components` (52 components across your component subfolders)
> - `<source-dir>/pages` (6 components)
>
> Are these correct? Any directories to exclude?"

Wait for user confirmation. If the user wants to exclude a directory (e.g., a deprecated `ui/` folder), note it for the `--exclude` flag.

### 6. Scan code for all components

Run the code scanner in scan mode with the confirmed directories:

```bash
node ${CLAUDE_SKILL_DIR}/1-discovery-components/discover-code-components.js \
  --scan {confirmed_dir_1} {confirmed_dir_2} \
  --browser-map .temp/figma-from-code/component-map.json \
  --output .temp/figma-from-code/component-map.json \
  [--exclude {excluded_dirs}]
```

This merges code-discovered components into the browser-discovered map. Each component gains a `source` field (`"browser"`, `"code"`, or `"both"`) and a `codeDependencies` array. Tiers are **recomputed** from static import analysis to include all components. Browser data (`routes`, `selector`, `instances`) is preserved for components found by both methods.

### 7. Read and summarize the output

Read `.temp/figma-from-code/component-map.json` and extract:

- `tiers[]` — the tiered build order (number of tiers varies per project)
- `tree` — the merged component hierarchy
- `componentCount` — total components to build
- Source breakdown:
  - `{bothCount}` found in browser + code
  - `{codeOnlyCount}` found in code only
  - `{browserOnlyCount}` found in browser only (no source file matched)

### 8. Inspect the Figma file and match components

Use `get_metadata` (fileKey) to retrieve all components and component sets from the Figma file. This returns every component with its `name` and `nodeId`.

Build a lookup map from the Figma metadata: `{ componentName → nodeId }`.

After normalization (step 4), component names in `component-map.json` use Figma conventions (`Icon/Bot`, `Asset/CartonLogoSvg`, `Button`). Match each component by exact name against the Figma lookup map.

For each component in every tier of `component-map.json`, add a `figmaNodeId` field:

- If a matching Figma component exists: set `figmaNodeId` to the node ID string (e.g. `"918:50"`)
- If no match: set `figmaNodeId` to `null`

Also use `use_figma` to do a read-only inspection for file-level state:

- List all pages (names + IDs)
- Check if variable collections already exist (`Palette`, `Semantic`, `Spacing`)
- If a page named `Screens` already exists, list its top-level children. Each direct child frame is a pre-existing screen. Build `preExistingScreens` as `{ frameName: nodeId }` (e.g. `{ "ExamplePage": "123:456" }`). If no Screens page exists, set `preExistingScreens` to `{}`.

### 8b. Ensure .figma/figma.json exists for every matched component

For each Figma component returned by `get_metadata` (regardless of whether it appears in the runtime `component-map.json`), ensure a tracking record exists at `<source-dir>/components/{ComponentName}/.figma/figma.json`. Same schema and same folder-resolution rules as Step 6 of `${CLAUDE_SKILL_DIR}/7-build-component/SKILL.md`:

```json
{
  "fileKey": "{figmaFileKey}",
  "nodeId": "{nodeId}",
  "url": "https://figma.com/design/{fileKey}?node-id={nodeIdWithDashes}",
  "componentName": "Button",
  "createdAt": "2026-05-15T14:32:00Z",
  "updatedAt": "2026-05-15T14:32:00Z",
  "dependencies": []
}
```

**Behavior:**

- **File missing:** create it. Set `createdAt` and `updatedAt` to the current ISO 8601 UTC timestamp. Create the `.figma/` folder first if it does not exist (use the namespace-aware path rules — `Icon/Bot` → `<source-dir>/components/Icon/Bot/.figma/figma.json`).
- **File present:** do not modify it. This phase only seeds tracking files for components that lack one — refreshing `updatedAt` is `${CLAUDE_SKILL_DIR}/7-build-component/SKILL.md`'s job.

Skip COMPONENT children of COMPONENT_SET nodes (variants) — only write tracking files for the top-level component or component set.

**Failure handling:** if a write fails (permission, missing parent path that can't be created), log the failure and continue with the rest. Surface the count of failures in the final report (Step 10).

### 9. Write updated output

Re-write `.temp/figma-from-code/component-map.json` with the `figmaNodeId` field added to every component entry across all tiers. Also add a top-level `figma` summary object.

> **Why this matters for later phases:** the orchestrator uses every component with a non-null `figmaNodeId` as the **immutable** `preExistingComponents` snapshot in `state.json`. The orchestrator's "Pre-Existing Components Rule" requires explicit user authorization before modifying, replacing, or deleting any of those nodes in later phases (Phase 3 rebuilds, Phase 5 fix-loops, ad-hoc cleanup). Accuracy of `figmaNodeId` matters — a missed match silently degrades that protection.

```json
{
  "figma": {
    "fileKey": "{fileKey}",
    "pages": [{ "name": "...", "id": "..." }],
    "variableCollections": ["Palette", "Semantic"] or [],
    "existingComponentCount": 12,
    "missingComponentCount": 5,
    "preExistingScreens": { "ExamplePage": "123:456" }
  },
  "tiers": [
    {
      "tier": 1,
      "components": [
        { "name": "Button", "figmaNodeId": "918:50", ... },
        { "name": "NewThing", "figmaNodeId": null, ... }
      ]
    }
  ]
}
```

### 10. Write discovery summary for the orchestrator

Extract the data the orchestrator needs into a small summary file so it never has to read the full `component-map.json` (which can be 48KB+):

```bash
node -e "
  const map = JSON.parse(require('fs').readFileSync('.temp/figma-from-code/component-map.json','utf-8'));
  const tiers = map.tiers.map(t => ({ tier: t.tier, label: t.label || 'Tier ' + t.tier, components: t.components.map(c => c.name) }));
  const builtComponents = {};
  const preExistingComponents = {};
  let bothCount = 0, codeOnlyCount = 0, browserOnlyCount = 0;
  for (const t of map.tiers) {
    for (const c of t.components) {
      if (c.figmaNodeId) {
        builtComponents[c.name] = c.figmaNodeId;
        preExistingComponents[c.name] = c.figmaNodeId;
      }
      if (c.source === 'both') bothCount++;
      else if (c.source === 'code') codeOnlyCount++;
      else if (c.source === 'browser') browserOnlyCount++;
    }
  }
  const componentCount = map.tiers.reduce((sum, t) => sum + t.components.length, 0);
  const summary = {
    buildOrder: { tierCount: tiers.length, tiers },
    builtComponents,
    preExistingComponents,
    preExistingScreens: (map.figma && map.figma.preExistingScreens) || {},
    componentCount,
    sourceBreakdown: { both: bothCount, codeOnly: codeOnlyCount, browserOnly: browserOnlyCount },
    figma: map.figma || null
  };
  require('fs').writeFileSync('.temp/figma-from-code/discovery-summary.json', JSON.stringify(summary, null, 2));
  console.log('Discovery summary written: ' + componentCount + ' components across ' + tiers.length + ' tiers');
"
```

Write to `.temp/figma-from-code/discovery-summary.json`. The orchestrator reads only this file (~3KB) instead of the full component-map.json.

### 11. Report

Report what exists in Figma vs what needs to be created, including the discovered build order and source breakdown:

```
Component Discovery complete:
- {componentCount} components across {tierCount} tiers
- Source breakdown: {bothCount} browser+code, {codeOnlyCount} code-only, {browserOnlyCount} browser-only
- Tier 1 (leaves): {component list}
- Tier 2: {component list}
- ...
- Tier {N} (top-level): {component list}

Figma file state:
- Pages: {existing page names}
- Variable collections: {existing or "none"}
- Already built: {count} components ({list})
- Not yet built: {count} components ({list})
```

## Scripts Reference

| Script                        | Location                                                                            | Purpose                                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `map-components.js`           | `${CLAUDE_SKILL_DIR}/10-validator/map-components.js`                     | Crawls routes, detects framework, discovers components, computes build order                                                                                                       |
| `normalize-component-map.js`  | `${CLAUDE_SKILL_DIR}/1-discovery-components/normalize-component-map.js`  | Aligns scanner names with Figma conventions using icons.json + Lucide alias table                                                                                                  |
| `discover-code-components.js` | `${CLAUDE_SKILL_DIR}/1-discovery-components/discover-code-components.js` | Auto-discovers frontend packages and scans source for all components. `--discover` mode finds directories; `--scan` mode parses imports, merges with browser map, recomputes tiers |

Do NOT modify `map-components.js`.

## Skip / Resume

If called with `resume: true`, check whether `.temp/figma-from-code/component-map.json` exists on disk. If it does, skip the discovery run and read the existing file. If it's missing, re-run.

## Error Handling

| Scenario                               | Action                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Dev server not running                 | Halt, tell user to start the dev server                                   |
| `map-components.js` fails              | Check Playwright installation, verify URL is accessible                   |
| Figma `use_figma` read-only call fails | Report error but do not block — component discovery output is still valid |
| Empty `component-map.json`             | Check that dev server is serving the app (not an error page)              |
