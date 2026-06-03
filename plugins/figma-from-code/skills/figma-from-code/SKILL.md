---
name: figma-from-code
description: Orchestrates the full code-to-Figma rebuild workflow for a web application. Thin dispatcher that delegates all substantial work to subagents and reads only small summary files. Runs eight tracked phases (phase0a, phase0b, phase1, phase2, phase2_5, phase3, phase4, phase5). Never calls use_figma or get_screenshot directly.
---

# Skill: Build Figma from Code (Orchestrator)

Thin dispatcher. Delegates every phase to a subagent, reads only small summary files, and tracks progress in `state.json`. Never calls `use_figma` or `get_screenshot` directly.

## Required Inputs

- `fileKey`: Figma file key
- `resume` (optional): `true` to skip completed phases

---

## Hard Gates — Files the Orchestrator Must Never Read

The orchestrator is a **thin dispatcher**. It must not open, read, or load any sub-skill `SKILL.md` files. Those files are for subagents only.

**Forbidden reads (orchestrator):**

| File                                                 | Why forbidden                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| `1-discovery-components/SKILL.md`                    | Subagent reads it to execute Phase 0a                                 |
| `2-discovery-assets/SKILL.md`                        | Subagent reads it to execute Phase 0b                                 |
| `3-setup-tokens/SKILL.md`                            | Subagent reads it to execute Phase 1                                  |
| `4-setup-structure/SKILL.md`                         | Subagent reads it to execute Phase 2                                  |
| `5-precapture/SKILL.md`                              | Subagent reads it to execute Phase 2.5                                |
| `6-build-tier/SKILL.md`                              | Subagent reads it to execute Phase 3                                  |
| `7-build-component/7a/SKILL.md`                      | Subagent reads it to execute per-component **build** (steps 1–3)      |
| `7-build-component/7b-review-fix-component/SKILL.md` | Subagent reads it to execute per-component **review/fix** (steps 4–7) |
| `8-build-screens/SKILL.md`                           | Subagent reads it to execute Phase 4                                  |
| `9-validate/SKILL.md`                                | Subagent reads it to execute Phase 5                                  |
| `10-validator/SKILL.md`                              | Subagent reads it for validation logic and Component App Map          |

**What the orchestrator reads instead:** only small summary/output files under `.temp/figma-from-code/` (e.g., `discovery-summary.json`, `tokens-summary.json`, `structure-summary.json`).

If you find yourself opening a sub-skill `SKILL.md` to understand inputs, outputs, or workflow steps — stop. That information belongs in the dispatch table and per-phase notes in _this_ file. If those notes are missing, ask the user before proceeding.

---

## Subagent Dispatch Pattern

When dispatching a subagent:

1. Give the subagent **only**: the skill filepath + `fileKey` + any state fields it needs (listed in the table below)
2. Instruct the subagent to read its own skill file for full instructions
3. Tell the subagent to **report back only**: `{ "success": true/false, "outputFile": "<path>" }`
4. Read the output file yourself after the subagent completes

The orchestrator never re-explains what a skill does — the skill file is the source of truth.
The orchestrator never opens a sub-skill's `SKILL.md` file — see Hard Gates above.

---

## State Ledger

Maintain `.temp/figma-from-code/state.json`:

```json
{
  "fileKey": "{fileKey}",
  "startedAt": "ISO timestamp",
  "phases": {
    "phase0a": "complete|in_progress|pending",
    "phase0b": "complete|in_progress|pending",
    "phase1": "complete|in_progress|pending",
    "phase2": "complete|in_progress|pending",
    "phase2_5": "complete|in_progress|pending",
    "phase3": "complete|in_progress|pending",
    "phase4": "complete|in_progress|pending",
    "phase5": "complete|in_progress|pending"
  },
  "tierProgress": { "tier1": "complete|in_progress|pending" },
  "buildOrder": { "tierCount": 0, "tiers": [{ "tier": 1, "label": "...", "components": ["..."] }] },
  "figmaNodes": {
    "foundationsPageId": "...",
    "componentsPageId": "...",
    "screensPageId": "...",
    "foundationsFrameId": "...",
    "iconsFrameId": "...",
    "screensFrameId": "...",
    "tier1FrameId": "...",
    "tier2FrameId": "..."
  },
  "existingCollections": [],
  "existingPages": [],
  "variableMapPath": ".temp/figma-from-code/variables.json",
  "builtComponents": {},
  "preExistingComponents": {},
  "preExistingScreens": {},
  "iconDiscovery": { "iconCount": 0, "icons": [], "assetCount": 0, "assets": [] }
}
```

**Subagents do not modify state.json.** Each writes its own output file; the orchestrator reads it and updates state.

`figmaNodes` uses the pattern `tier{N}FrameId` for each tier (e.g., `tier1FrameId`, `tier2FrameId`, ...). The number of keys matches `buildOrder.tierCount`.

### Fresh Run: Initialize state.json

Before Phase 0a, create `.temp/figma-from-code/state.json` from the template above. Set `fileKey` and `startedAt` to current ISO timestamp; all `phases` values to `"pending"`; all other fields empty.

---

## Pre-Existing Components Rule

`preExistingComponents` is an **immutable snapshot** from Phase 0a. Never update it after Phase 0a.

**Hard rule:** Pause and get explicit user authorization before any action that modifies, replaces, or deletes a node in `preExistingComponents`. This includes rebuilding, running the icon preamble over existing icons, or any Phase 3 build that resolves to a pre-existing node.

---

## Phase Dispatch Table

All skill files live under `${CLAUDE_SKILL_DIR}/`. Shell steps (normalization after Phase 0b, aggregation scripts after Phase 3 tiers and Phase 4) are in Per-Phase Notes. After each subagent succeeds, set `phases.{phase}: complete` in addition to the listed state fields.

**Important:** Each subagent does all of its work inline — no subagent spawns further subagents. The tier subagent (Phase 3) builds all components in that tier sequentially. The validation subagent (Phase 5) processes all tiers sequentially.

| Phase   | Skill file                                       | Inputs to pass                                                                                                                                                                                                      | Output file to read          | State fields to update                                                                                                                                                                                | Skip if                                                                    |
| ------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 0a      | `1-discovery-components/SKILL.md`                | `fileKey`                                                                                                                                                                                                           | `discovery-summary.json`     | `buildOrder`, `builtComponents`, `preExistingComponents`, `preExistingScreens`; also extract `figma.variableCollections` → `existingCollections` and `figma.pages` → `existingPages` from the summary | `phase0a: complete`                                                        |
| 0b      | `2-discovery-assets/SKILL.md`                    | `sourceDir` (e.g., `<source-dir>/`)                                                                                                                                                                          | `icons-summary.json`         | `iconDiscovery`                                                                                                                                                                                       | `phase0b: complete`                                                        |
| 1       | `3-setup-tokens/SKILL.md`                        | `fileKey`, `existingCollections`                                                                                                                                                                                    | `tokens-summary.json`        | `variableMapPath`                                                                                                                                                                                     | `phase1: complete` AND `.temp/figma-from-code/tokens-summary.json` exists  |
| 2       | `4-setup-structure/SKILL.md`                     | `fileKey`, `existingPages`                                                                                                                                                                                          | `structure-summary.json`     | `figmaNodes` (`foundationsPageId`, `componentsPageId`, `screensPageId`, `foundationsFrameId`, `iconsFrameId`, `screensFrameId`)                                                                       | `phase2: complete` AND page/icons/screens IDs in `figmaNodes` are non-null |
| 2.5     | `5-precapture/SKILL.md` (one subagent)           | `fileKey` only — subagent builds all manifests itself from `component-map.json`                                                                                                                                     | `precapture-all.json`        | `phases.phase2_5`                                                                                                                                                                                     | `phase2_5: complete`                                                       |
| 3 pre   | `6-build-tier/SKILL.md` (icon preamble mode)     | `fileKey`, `figmaNodes`; subagent reads `builtComponents.json` from disk                                                                                                                                            | `icon-preamble-results.json` | merge `created` into `builtComponents`; rewrite `builtComponents.json`                                                                                                                                | all icons already in `builtComponents`                                     |
| 3 tiers | `6-build-tier/SKILL.md` (one subagent/tier)      | `fileKey`, `tier` (number), `tierLabel`, `componentsPageId` (from `figmaNodes`); subagent reads `builtComponents.json` from disk                                                                                    | `build-tier{N}.json`         | `builtComponents`, `figmaNodes.tier{N}FrameId` (from `build-tier{N}.json`), `tierProgress.tier{N}`; rewrite `builtComponents.json`; set `phases.phase3: complete` after all tiers                     | `tierProgress.tier{N}: complete`                                           |
| 4       | `8-build-screens/SKILL.md` (one subagent/screen) | `fileKey`, `figmaNodes`, `preExistingScreens`; per-screen: `screenName`, `route`, `pageSourceFile`, `keyComponents` (read from `component-map.json → routes/tree`); subagent reads `builtComponents.json` from disk | `build-screens.json`         | `phases.phase4`                                                                                                                                                                                       | `phase4: complete`                                                         |
| 5       | `9-validate/SKILL.md`                            | `fileKey`, `builtComponents`, `figmaNodes`, `buildOrder`                                                                                                                                                            | `validation-summary.json`    | `phases.phase5`                                                                                                                                                                                       | always runs                                                                |

---

## Phase Execution Order

Phases have dependency constraints but several can overlap. Follow this wave structure to minimize wall-clock time:

```
Wave 1  (parallel): Phase 0a  ||  Phase 0b
          - 0a: browser crawl + Figma inspection
          - 0b: static icon/asset scan (no Figma, no browser needed)
          ⏸ PAUSE — write progress.md, ask user to continue or stop

Wave 2  (as soon as 0a is done, don't wait for 0b):
          Phase 1  ||  Phase 2  (parallel — both only need 0a outputs)
          After 0b completes: run normalization script
          ⏸ PAUSE — write progress.md, ask user to continue or stop

Wave 3  (starts when normalization + Phase 1 + Phase 2 are ALL done):
          Phase 2.5 — dispatch ONE subagent with unified manifest (all
          components in a single sorted batch; chunked at 15 entries per
          script run to stay within the 60s timeout)
          Write manifests before dispatching; read precapture-all.json after complete.
          ⏸ PAUSE — write progress.md, ask user to continue or stop

Wave 4  (sequential): Phase 3 preamble → Phase 3 tiers (one tier at a time)
          Each tier waits for the prior tier; preamble runs before Tier 1.
          ⏸ PAUSE after preamble
          ⏸ PAUSE after EACH tier — write progress.md, ask user

Wave 5  (parallel): Phase 4 screens — dispatch ALL in parallel
          Screens only instance built components, never modify masters.
          ⏸ PAUSE — write progress.md, ask user to continue or stop

Wave 6  (sequential): Phase 5 validation
          ⏸ PAUSE — write final progress.md (build complete)
```

**Dependency summary:**

- Phase 1 needs: Phase 0a (`existingCollections`)
- Phase 2 needs: Phase 0a (`existingPages`)
- Phase 2.5 needs: normalization done (normalized `component-map.json` for selectors); Phase 1 + Phase 2 must also be done before Phase 3 can start, but Phase 2.5 itself only needs normalization
- Phase 3 needs: Phase 1 (`variables.json`), Phase 2 (`figmaNodes`), Phase 2.5 (screenshots)
- Phase 4 needs: Phase 3 (`builtComponents`), Phase 2 (`figmaNodes.screensFrameId`)
- Phase 5 needs: Phase 4 (all screens built)

---

## Per-Phase Notes

### After Phase 0b: Normalization (Phase 0b+)

Run the normalization script, then re-read `discovery-summary.json` to refresh `buildOrder` in state. Skip if `phase0b: complete` AND `phase3` is `in_progress` or `complete` (normalization already applied).

```bash
node ${CLAUDE_SKILL_DIR}/1-discovery-components/normalize-component-map.js \
  .temp/figma-from-code/component-map.json \
  .temp/figma-from-code/icons.json \
  --write
```

The script regenerates `discovery-summary.json` automatically. Re-read it and update `buildOrder` in state.

### Phase 2.5: Reading pre-capture results

After the pre-capture subagent completes, read `precapture-all.json` and `precapture-screens.json` and verify that screenshot file counts are non-zero. There is no aggregation script — the orchestrator reads each file directly.

### Before Phase 3 (preamble): Materialize builtComponents.json

`builtComponents.json` is the on-disk pass mechanism for all Phase 3 and Phase 4 subagents — they read it directly rather than receiving `builtComponents` inline. Keep it in sync with `state.builtComponents` before every dispatch.

Write current `state.builtComponents` to disk before dispatching the preamble subagent:

```bash
node -e "const s=JSON.parse(require('fs').readFileSync('.temp/figma-from-code/state.json','utf-8')); require('fs').writeFileSync('.temp/figma-from-code/builtComponents.json', JSON.stringify(s.builtComponents||{},null,2));"
```

After preamble completes, merge new icons into `state.builtComponents` and rewrite `builtComponents.json`. The file persists through all of Phase 3 and Phase 4 as the live registry of built components.

### Phase 3 Tiers: Post-tier aggregation

After all subagents for a tier complete, run:

```bash
node ${CLAUDE_SKILL_DIR}/collect-tier-results.js --tier {N} --components "{comma-separated}"
```

Read stdout for the one-line JSON summary. Then follow the **End-of-Phase Pause Protocol**: update `state.json`, write `progress.md`, and ask the user whether to continue to the next tier or stop. Each tier is a full pause point — the user may stop and a new orchestrator agent can resume from the next tier.

### Phase 4: Post-screen aggregation

After all screen subagents complete:

```bash
mkdir -p .temp/figma-from-code/build-results/screens
node ${CLAUDE_SKILL_DIR}/collect-screen-results.js --screens "{comma-separated}"
```

---

## Progress File

After every pause point, the orchestrator writes `.temp/figma-from-code/progress.md` — a human-readable narrative that allows a **fresh orchestrator agent** (with no memory of prior work) to understand what happened and where to continue.

`progress.md` is the **handoff document**. `state.json` is the machine-readable truth. Both must exist and stay in sync.

### Template

```markdown
# Figma-from-Code Build Progress

**File Key:** {fileKey}
**Last Updated:** {ISO timestamp}
**Status:** Paused after {phase/tier description}

## Completed Phases

| Phase | Description          | Key Output                                       | Completed At |
| ----- | -------------------- | ------------------------------------------------ | ------------ |
| 0a    | Component discovery  | {component count} components, {tier count} tiers | {timestamp}  |
| 0b    | Asset/icon discovery | {icon count} icons, {asset count} assets         | {timestamp}  |
| ...   | ...                  | ...                                              | ...          |

## Current State

- **Built components:** {count} / {total}
- **Tiers completed:** {N} / {total tiers}
- **Screens built:** {count} / {total}
- **Figma nodes created:** {list key node IDs}

## Next Step

**Phase to execute:** {phase ID and name}
**Prerequisites:** {what must be true — e.g., "dev server running on localhost:5173"}
**What it does:** {one-sentence description}
**Estimated dispatches:** {number of subagents or script runs}

## Warnings / Partial State

- {any incomplete tiers, failed retries, or pre-existing component conflicts}
```

---

## Startup Protocol

On **every invocation**, before doing any work:

1. Check if `.temp/figma-from-code/progress.md` exists
2. **If it exists:**
   - Read `progress.md` in full
   - Present a concise summary to the user: which phases are done, what comes next
   - Ask: _"A previous build was paused after {phase}. Resume from {next phase}?"_
   - If user confirms → read `state.json`, validate it matches `progress.md`, skip to next incomplete phase
   - If user declines → ask if they want a fresh start (which deletes `.temp/figma-from-code/`) or manual phase selection
3. **If it does not exist:**
   - Check if `state.json` exists (orphaned state without progress file)
   - If `state.json` exists → warn user, offer to reconstruct progress from state or start fresh
   - If neither exists → initialize fresh run (create `state.json` from template, proceed to Phase 0a)

---

## End-of-Phase Pause Protocol

After completing any pause point (see Pause Points below), the orchestrator MUST:

1. **Update `state.json`** — mark the phase/tier complete, update all relevant state fields
2. **Write `progress.md`** — regenerate the full file from current `state.json` using the template above
3. **Report to user** — show key metrics (counts, node IDs, any warnings)
4. **Ask the user:**

   > _"{Phase/tier} complete. {Brief metric summary}. Continue to {next phase/tier}, or stop here so a new agent can resume later?"_

5. **If user says stop** → confirm `progress.md` is written, say "Build paused. A new agent can resume by invoking this skill." and terminate
6. **If user says continue** → proceed to the next dispatch

The orchestrator **never auto-continues** to the next pause point without explicit user confirmation.

### Pause Points

Every wave boundary and every Phase 3 tier is a mandatory pause point:

| Pause Point      | After                                    | Before                            |
| ---------------- | ---------------------------------------- | --------------------------------- |
| Wave 1 → 2       | Phase 0a + 0b complete (+ normalization) | Phase 1 + Phase 2                 |
| Wave 2 → 3       | Phase 1 + Phase 2 complete               | Phase 2.5                         |
| Wave 3 → 4       | Phase 2.5 complete                       | Phase 3 preamble                  |
| Phase 3 preamble | Icon preamble complete                   | Tier 1                            |
| Phase 3 Tier N   | Tier N complete                          | Tier N+1 (or Wave 5 if last tier) |
| Wave 4 → 5       | Phase 3 all tiers complete               | Phase 4 screens                   |
| Wave 5 → 6       | Phase 4 screens complete                 | Phase 5 validation                |
| End              | Phase 5 complete                         | — (build finished)                |

---

## Error Handling

| Scenario                                  | Action                                                      |
| ----------------------------------------- | ----------------------------------------------------------- |
| Dev server not running                    | Halt before Phase 2.5, tell user to start it                |
| Subagent reports `success: false`         | Report error, offer retry — never silently skip             |
| State inconsistency                       | Trust per-tier build JSON files; rebuild state from outputs |
| Pre-existing component needs modification | Pause, apply authorization protocol, wait for user          |
