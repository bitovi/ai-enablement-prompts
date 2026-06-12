# Skill: Build Components (Phase 3)

Builds all Figma components using pre-captured reference material, reusing lower-tier components as instances. Tiers run sequentially because each tier depends on components built in all lower tiers. Within a tier, components are built sequentially.

## When to Use

- When `figma-from-code` reaches Phase 3
- Standalone to build or rebuild a single tier of components
- After code changes to rebuild affected components

## Prerequisites

> Placeholders like `{skillRoot}` and `{componentsRoot}` resolve from `state.json → config`.

- Phases 0–2.5 complete (build order, icons, tokens, file structure, screenshots all in place)
- `.temp/figma-from-code/state.json` populated with `buildOrder`, `figmaNodes`, `iconDiscovery`
- `figmaNodes.componentsPageId` present in state (set by Phase 2)
- Pre-captured screenshots in `.temp/figma-from-code/screenshots/`

## Icon Preamble Prerequisite

The icon preamble is dispatched by the orchestrator as a separate phase ("Phase 3 pre") before any tier agent runs. Tier agents do **not** run the preamble.

Before processing any component in the tier, verify the preamble has completed:

```bash
test -f .temp/figma-from-code/icon-preamble-results.json && echo "exists" || echo "missing"
```

If `.temp/figma-from-code/icon-preamble-results.json` is missing: **stop immediately** and report back to the orchestrator that the icon preamble phase has not run. Do not proceed with any component builds.

## Handling Library Components (no source file)

Many tier-1 components detected by site-component-map are Lucide icons or router primitives imported directly from npm packages. They have no `.tsx` file in the codebase.

| Type             | Example                           | Figma approach                                                                                            |
| ---------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Lucide icon      | `Bot`, `Star`, `EllipsisVertical` | **Already built as `Icon/{Name}` in preamble** — skip, these are in `builtComponents`                     |
| SVG asset        | `AppLogoSvg`                      | **Already built as `Asset/{Name}` in preamble** — skip                                                    |
| Router primitive | `Link` (react-router-dom)         | Build as a nav link component set (Default / Active variants) showing what the link looks like in context |

When a tier-1 component name matches a Lucide icon discovered in Phase 0b, do not rebuild it — it already exists as `Icon/{Name}` in `builtComponents`.

## Per-Tier Process

For each component in the tier, execute the **entire** `{skillRoot}/7-build-component/7a/SKILL.md` (build) and `{skillRoot}/7-build-component/7b-review-fix-component/SKILL.md` (review/fix) workflow inline: analyze source → build via `use_figma` → screenshot via `get_screenshot` → compare via `compare.js` → fix loop (up to 3 iterations).

Build components sequentially within a tier. Do not proceed to the next tier until all components for the current tier have been built.

**Before dispatching:** ensure the results directory exists:

```bash
mkdir -p .temp/figma-from-code/build-results
```

### Create the tier frame

Before building any components for a tier, create the tier's container frame on the Components page. The frame does not exist yet — tier frames are created on-demand at the start of each tier build, not during Phase 2.

Compute the y-position by reading `figmaNodes` in state: place each new tier frame below the Icons frame and any already-created tier frames with 80px gaps.

```javascript
const componentsPage = figma.root.children.find((p) => p.id === componentsPageId);
await figma.setCurrentPageAsync(componentsPage);

// Compute y offset: below all existing frames on the page
const existingFrames = componentsPage.children;
const maxBottom = existingFrames.reduce((y, f) => Math.max(y, f.y + f.height), 0);
const yPos = existingFrames.length > 0 ? maxBottom + 80 : 200;

const tierFrame = figma.createFrame();
tierFrame.name = `Tier ${tier} — ${tierLabel}`;
tierFrame.layoutMode = 'HORIZONTAL';
tierFrame.primaryAxisSizingMode = 'AUTO';
tierFrame.counterAxisSizingMode = 'AUTO';
tierFrame.itemSpacing = 80;
tierFrame.paddingTop = 48;
tierFrame.paddingBottom = 48;
tierFrame.paddingLeft = 48;
tierFrame.paddingRight = 48;
tierFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
tierFrame.x = 0;
tierFrame.y = yPos;
componentsPage.appendChild(tierFrame);

const tierFrameId = tierFrame.id;
```

Record `tierFrameId` in the tier summary output so the orchestrator can persist it to `state.figmaNodes.tier{N}FrameId`.

### Filter out already-built components

Before building components for a tier, check each component against `builtComponents` in state.json. If a component's name already has a node ID in `builtComponents` (seeded from Phase 0a Figma inspection or from a prior tier build), **skip it**.

> **Pre-Existing Components Rule (orchestrator skill):** components whose node ID is in `state.json → preExistingComponents` predate this run. They are skipped here by default. If the user (or a Phase 5 finding) requests a rebuild for one of them, the orchestrator MUST first obtain explicit user authorization before dispatching, even in auto mode. See the orchestrator skill's "Pre-Existing Components Rule" section.

```
Tier 2 components: [Button, CaseComments, Link, RelatedCasesAccordion]
Already in builtComponents: [Button, Link]
→ Build only: [CaseComments, RelatedCasesAccordion]
→ Report: "Skipped 2 already-built components: Button, Link"
```

This enables partial rebuilds — pointing the pipeline at a Figma file that already has some components built will skip those and only create what's missing.

### Per-Component Build (inline)

For each component, execute the build and review phases sequentially as two distinct steps:

**Step A — Build (Steps 1–3):** Read and follow `{skillRoot}/7-build-component/7a/SKILL.md`. This analyzes the source, creates the Figma node, captures the initial screenshot, and writes `.temp/figma-from-code/build-results/{ComponentName}-built.json`.

**Step B — Review/Fix (Steps 4–7):** Read the `-built.json` handoff. If `status` is `built`, read and follow `{skillRoot}/7-build-component/7b-review-fix-component/SKILL.md`. If `status` is anything other than `built` (`needs_authorization`, `rejected`, `failed`), skip the review phase and write the final result directly by copying the handoff fields to `.temp/figma-from-code/build-results/{ComponentName}.json`.

Build components sequentially within a tier — complete both steps for one component before starting the next. Do not proceed to the next tier until all components for the current tier have been built and reviewed.

### After All Components Complete

1. Read each `.temp/figma-from-code/build-results/{ComponentName}.json`
2. Collect all node IDs, match scores, and failures
3. Log any components that failed entirely (no result file)

## Orchestrator Behavior Between Tiers

After all components for a tier are built:

1. Write `build-tier{N}.json` with completed/failed/match lists **and `tierFrameId`**
2. Merge new node IDs into `builtComponents` in state.json
3. Update `state.figmaNodes.tier{N}FrameId` from `build-tier{N}.json → tierFrameId`
4. Spot-check: `get_screenshot(fileKey, tierFrameId)` — verify components have realistic, varied heights (not all thin strips)
5. Update `tierProgress.tier{N}` and `phase3` status
6. Report comparison results: how many matched, how many fixed, how many remain mismatched
7. **Checkpoint with user** — ask to proceed to next tier
8. Do not auto-proceed across tier boundaries

## Output Files

Written to `.temp/figma-from-code/`:

| File                                 | Contents                                                        |
| ------------------------------------ | --------------------------------------------------------------- |
| `build-results/{ComponentName}.json` | Per-component result (written by tier agent)                    |
| `build-tier{N}.json`                 | Tier summary (written by orchestrator after collecting results) |

### Per-component result format

See the canonical schema in `{skillRoot}/7-build-component/7b-review-fix-component/SKILL.md` § "Result File Schema". That file is the single source of truth for the `build-results/{ComponentName}.json` structure.

### Tier summary format

Written to `.temp/figma-from-code/build-tier{N}.json` by the orchestrator after collecting all per-component results for the tier. The `tierFrameId` must be reported by the tier agent in its return so the orchestrator can pass it to `collect-tier-results.js --tier-frame-id <id>`.

```json
{
  "tier": 1,
  "tierFrameId": "456:78",
  "status": "complete | complete_with_failures",
  "completed": [
    { "name": "Button", "nodeId": "123:45", "variants": [{ "name": "Variant=primary, State=Default", "nodeId": "123:46" }], "matchPct": 94.2 }
  ],
  "failed": [{ "name": "Calendar", "status": "failed", "reason": "use_figma exceeded incremental limit" }]
}
```

`status` values:

- `complete` — all components in the tier built and reviewed without failures
- `complete_with_failures` — at least one component has `status: "failed"` or `status: "rejected"`

## Tier Definitions

Tiers are dynamic — they come from the `site-component-map` output stored at `.temp/figma-from-code/component-map.json` during Phase 0a. Read `state.json → buildOrder.tiers` for the current build order.

## Skip / Resume

If called with `resume: true`, check `state.json → tierProgress` for completed tiers and `build-results/` for individual component results. Only build components without a result file.

## Error Handling

| Scenario                                | Action                                                                |
| --------------------------------------- | --------------------------------------------------------------------- |
| `use_figma` fails                       | Retry once; if still fails, write error to result file                |
| `use_figma` incremental limit           | Split component builds across multiple `use_figma` calls              |
| Components all same thin height         | `fixSizing()` was not run — run it on the tier frame, re-screenshot   |
| Text node padding error                 | Wrap text in an auto-layout frame (see build-component skill)         |
| Library component has no source file    | Check icon/asset preamble; build nav link variant if router primitive |
| Component build produces no result file | Log as failed, report at checkpoint                                   |
| `createNodeFromSvg()` fails for icon    | Create 24x24 placeholder rectangle so higher tiers can instantiate    |
