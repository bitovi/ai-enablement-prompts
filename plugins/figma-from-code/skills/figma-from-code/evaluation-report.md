# `figma-from-code` Skill Evaluation Report

Generated: 2026-05-22

Three independent subagents evaluated the skill from different angles:

1. **Context Reduction** — opportunities to reduce the orchestrator's token load
2. **Artifact Analysis** — redundancies, unnecessary data, and organizational issues in produced files
3. **Inconsistency Detection** — conflicting commands and internal contradictions

---

## Agent 1 — Orchestrator Context Reduction

**Root cause:** Sub-skill SKILL.md files serve two audiences (orchestrator dispatch + subagent execution), so the orchestrator loads ~5–10x more content than it needs.

### High-Impact Findings

| Finding                                                                                                                                                               | Est. Token Savings | Risk     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------- |
| `build-screens/SKILL.md`: orchestrator loads ~650 lines, needs ~100 (full workflow, fixSizing, pitfalls, error tables are subagent-only)                              | ~5,000–5,500       | Medium   |
| `discovery-components/SKILL.md`: ~260 lines loaded, ~30 needed (steps 1–11 internal workflow)                                                                         | ~1,800–2,000       | Medium   |
| `build-tier/SKILL.md`: JS "Icon creation reference" code blocks loaded but never used by orchestrator or received by subagent                                         | ~400–500           | Medium   |
| Orchestrator itself: "Screenshot Scale Convention" (subagent-only), 4 "NOT orchestrator" file rows, standalone "Checkpoint Protocol" (redundant with per-phase notes) | ~170–200           | Very low |

**Total estimated savings:** ~8,000–9,800 tokens per pipeline run.

### Structural Fix

Add an `## Orchestrator Interface` section at the top of each sub-skill containing only:

1. The subagent prompt template
2. Required inputs table
3. Output files table (summary files only)
4. Skip/resume rules

Direct the orchestrator to read only that section. Subagents continue to read the full file.

### Full Findings

#### Finding 1 — `build-screens/SKILL.md`: Orchestrator loads ~650 lines but only needs ~100

The orchestrator reads `8-build-screens/SKILL.md` to dispatch Phase 4. Orchestrator-relevant content is only ~100 lines:

| Section                                           | Orchestrator needs? |
| ------------------------------------------------- | ------------------- |
| Subagent Prompt Template (~30 lines)              | Yes                 |
| Required Inputs table (~20 lines)                 | Yes                 |
| Output Files table (~10 lines)                    | Yes                 |
| Pre-Existing Screens Rule (~30 lines)             | Yes                 |
| Skip/Resume (~5 lines)                            | Yes                 |
| Step 0–7 full workflow (~350 lines)               | No                  |
| `fixSizing()` variant + code block (~30 lines)    | No                  |
| Common Pitfalls table (~25 lines)                 | No                  |
| Error Handling table (~25 lines)                  | No                  |
| Step 2c–2e Figma code patterns (~80 lines)        | No                  |
| Step 4 sizing check + verdict table (~50 lines)   | No                  |
| Step 5 fix-loop per-iteration process (~50 lines) | No                  |

#### Finding 2 — `build-tier/SKILL.md`: "Icon creation reference" JS code is dead weight

Lines ~83–140 contain full JavaScript code blocks for icon creation. The orchestrator dispatches the icon preamble as a pre-written text prompt — it never executes or adapts this code. The preamble subagent receives only the text prompt, not the build-tier SKILL.md.

**Fix:** Embed the JS code into the "Icon Preamble Subagent Prompt Template" itself so the subagent actually receives it.

#### Finding 3 — `build-tier/SKILL.md`: Result format JSON schemas not needed by orchestrator

The orchestrator collects tier results by running `collect-tier-results.js` and reading its one-line JSON stdout — it does not parse per-component schemas directly.

#### Finding 4 — `build-tier/SKILL.md`: "Handling Library Components" table is subagent implementation detail

The "Handling Library Components" table instructs subagents on how to handle icons/routers during per-tier builds. The orchestrator doesn't need this.

#### Finding 5 — Orchestrator SKILL.md: "Screenshot Scale Convention" section

The orchestrator never calls `get_screenshot` or `screenshot.js` directly (explicitly stated in the skill header). This section is purely for subagents. Same convention is already documented in `step-4-compare.md`.

#### Finding 6 — Per-Agent Output Files table lists files the orchestrator explicitly doesn't read

Four entries with explicit `NOT orchestrator` annotations still consume context. Remove them — they remain documented in their respective sub-skills.

#### Finding 7 — Standalone "Checkpoint Protocol" section is redundant

Each of the 5 checkpointed phases already has an inline checkpoint instruction. The standalone general policy section adds minimal value.

#### Finding 8 — "Orchestrator Behavior Between Tiers" is orchestrator logic inside a sub-skill

`build-tier/SKILL.md` has a section describing state.json merge, spot-check, and checkpoint behavior that belongs in the orchestrator. Editing this behavior requires updating two places.

#### Finding 9 — `build-component/SKILL.md` and `build-screens/SKILL.md`: Divergent `fixSizing()` implementations

Two slightly different `fixSizing()` implementations across sub-skills. Not an orchestrator context issue, but creates maintenance risk. A shared `figma-utils.md` reference file would prevent drift.

#### Finding 10 — `discovery-components/SKILL.md`: Orchestrator loads extensive internal workflow detail

~260 lines loaded, ~30 needed. Steps 1–11 (crawl, normalize, scanner commands, Figma inspection, `.figma.json` writing) are subagent implementation details.

---

## Agent 2 — Artifact Redundancy & Organization

### Bugs (would cause failures)

#### Finding 1 — `builtComponents.json` Triple Redundancy + Stale Bug (CRITICAL)

`builtComponents` exists in five places simultaneously:

1. `state.json → builtComponents`
2. `builtComponents.json` (materialized snapshot)
3. `discovery-summary.json → builtComponents` (seed)
4. Every `build-results/{Name}.json → nodeId`
5. Every `build-tier{N}.json → completed[].nodeId`

**Critical bug:** `builtComponents.json` is materialized once after the icon preamble and never updated after Phase 3 tier builds. Phase 4 screen-build subagents read it from disk — meaning they see only preamble icons, not any components built in Phase 3. Phase 4 Step 0 prerequisite checks will fail for virtually every screen.

**Fix:** Either re-write `builtComponents.json` after every tier, or eliminate the file entirely and deliver `builtComponents` inline in all subagent prompts (tier-builds already do this). The inline approach is cleaner.

#### Finding 3 — `preExistingScreens` Missing from `state.json` Schema (CRITICAL)

`8-build-screens` references `state.json → preExistingScreens` as a required input for the authorization gate. This field does not appear in the state.json schema and is never populated in Phase 0a. Every build-screens subagent receives `preExistingScreens: undefined`, silently disabling the pre-existing screen protection.

**Fix:** Add a `preExistingScreens` capture step to Phase 0a (alongside `preExistingComponents`), add the field to the state.json schema, and pass it explicitly to build-screens subagents.

#### Finding 4 — Normalization Re-Read Is an Undocumented Implicit Side Effect (BUG RISK)

The orchestrator says after Phase 0b: _"re-read `discovery-summary.json` (the normalization script should update it)"_. But `normalize-component-map.js` is documented to write only to `component-map.json`. If the script doesn't update the summary, `buildOrder` retains pre-normalization names (e.g., `Check` instead of `Icon/Check`), causing Phase 3 subagents to reference wrong component names.

**Fix:** Either have the orchestrator explicitly re-run the summary generation step after normalization, or document that the normalize script must also update `discovery-summary.json`.

### Design Smells

#### Finding 2 — `state.json` Duplicates Every Phase Summary

`state.json` has absorbed the complete output of every phase summary file:

| state.json field        | Also in                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| `buildOrder`            | `discovery-summary.json`                                                   |
| `preExistingComponents` | `discovery-summary.json`                                                   |
| `builtComponents`       | `discovery-summary.json` + `builtComponents.json`                          |
| `iconDiscovery`         | `icons-summary.json`                                                       |
| `figmaNodes`            | `structure-summary.json`                                                   |
| `variableMapPath`       | Always `".temp/figma-from-code/variables.json"` — a constant, never varies |

**Fix:** Slim `state.json` to progress tracking only:

```json
{
  "fileKey": "...",
  "startedAt": "...",
  "phases": { "phase0a": "complete", ... },
  "tierProgress": { "tier1": "complete", ... }
}
```

#### Finding 5 — `tokens-summary.json` Contains Only Constants

`variableMapPath` and `resolvedColorsPath` are hardcoded constants that never vary. Including them in state.json implies they could be dynamic. Remove these fields from both the summary and state.json.

#### Finding 6 — Unused Fields in Tier and Structure Summaries

`build-tier{N}.json → completed[].figmaScreenshot` and `structure-summary.json → foundationsScreenshot` are not consumed by any downstream phase. Strip them or move to a `debug-info` key.

#### Finding 7 — Phase 5 Output Split Across Two Directories

`report.md` → `.temp/figma-validation/`  
`validation-summary.json` → `.temp/figma-from-code/`

The orchestrator's output files table only lists the summary. The split is unexplained and someone debugging must know to look in a second location.

**Fix:** Either copy the report into `.temp/figma-from-code/validation-report.md`, or document both paths in the orchestrator's output table.

#### Finding 8 — No Aggregate Precapture Summary

Every other phase that produces parallel sub-results has a single-file aggregate summary (`build-tier{N}.json`, `build-screens.json`). Phase 2.5 has no `precapture-summary.json`, making resume and debugging harder.

#### Finding 9 — `code.json` Lives in the Source Tree, Not `.temp/`

`build-component` Step 1 writes `code.json` to `<source-dir>/components/{Name}/.figma/code.json`. This is a pipeline intermediate, not a persistent record — but it lives alongside the intentionally persistent `figma.json`. It will pollute git diffs and may contain stale analysis from previous runs.

**Fix:** Write to `.temp/figma-from-code/analysis/{Name}/code.json`. Add `**/.figma/code.json` to `.gitignore` as a minimum mitigation.

#### Finding 10 — `discovery-summary.json` Naming Inconsistency

All other summary files follow a noun pattern: `icons-summary.json`, `tokens-summary.json`, `structure-summary.json`, `validation-summary.json`. Phase 0a uses a verb: `discovery-summary.json`. Since Phase 0b is also "discovery", this is ambiguous.

**Fix:** Rename to `components-summary.json`.

#### Finding 11 — Mixed `builtComponents` Delivery Modes

- Tier-build subagents: receive inline `{JSON.stringify(builtComponents)}`
- Icon preamble subagent: reads `builtComponents.json` from disk
- Screen-build subagents: reads `builtComponents.json` from disk
- Validate subagent: receives inline from orchestrator

**Fix:** Standardize on inline delivery for all subagents. Eliminate `builtComponents.json` entirely.

#### Finding 12 — `build-tier{N}.json` Drops Match Score Data

The tier summary captures only name + nodeId per component. Match scores (matchPct, iterations, fixes) exist only in per-component `build-results/{Name}.json`. Phase 5 must re-read all individual files; the tier summary provides no shortcut.

**Fix:** Either enrich `build-tier{N}.json` to include `matchPct` per component (enabling Phase 5 to prioritize fix loops), or remove the file and have Phase 5 scan `build-results/` directly.

---

## Agent 3 — Inconsistencies & Conflicting Commands

### Critical (workflow-breaking)

#### C1 — `preExistingScreens` referenced in build-screens but never collected or stored

**Conflict:**

`8-build-screens/SKILL.md` Required Inputs:

> `preExistingScreens | Immutable snapshot of screen frames that existed in Figma BEFORE this orchestrator run started | state.json → preExistingScreens (Phase 0a snapshot)`

`figma-from-code/SKILL.md` state.json schema only defines `builtComponents` and `preExistingComponents`. `preExistingScreens` does not appear anywhere in the schema, and no Phase 0a step captures it.

**Impact:** Every build-screens subagent receives `preExistingScreens: undefined`. The authorization gate ("stop if screen is pre-existing") silently becomes a no-op, allowing pre-existing Figma screens to be overwritten without user authorization.

**Resolution:** Add a `preExistingScreens` capture step to Phase 0a, add the field to the state.json schema, and pass it explicitly in Phase 4 dispatch.

---

#### C2 — `discovery-summary.json` not updated by normalization script, but orchestrator expects it to be

**Conflict:**

`figma-from-code/SKILL.md` Phase 0b:

> _"After normalization, re-read `discovery-summary.json` **(the normalization script should update it)** and refresh `buildOrder` in state."_

`figma-from-code/1-discovery-components/SKILL.md` Step 4:

```bash
node ${CLAUDE_SKILL_DIR}/1-discovery-components/normalize-component-map.js \
  .temp/figma-from-code/component-map.json \
  .temp/figma-from-code/icons.json \
  --write
```

> _"The `--write` flag writes back to `component-map.json`."_

The normalization script only updates `component-map.json`. The summary is generated by a separate `node -e "..."` script in Step 10 and is not touched by normalization.

**Impact:** After normalization, `discovery-summary.json` still has pre-normalization names (e.g., `Check` instead of `Icon/Check`). The orchestrator re-reads the stale summary and stores wrong names in `buildOrder`. All of Phase 3 uses incorrect component names.

**Resolution:** Have the orchestrator explicitly re-run the summary generation step after normalization, rather than relying on an undocumented implicit side effect.

---

#### C3 — `builtComponents.json` read by preamble subagent but materialized only after preamble completes

**Conflict (within `6-build-tier/SKILL.md`):**

Icon Preamble Subagent Prompt Template:

> _"Steps: 1. Read `icons.json` and **`builtComponents.json`**; 2. Filter out icons/assets already in `builtComponents`"_

After the preamble subagent completes:

> _"3. Materialize `builtComponents.json`"_

The orchestrator only materializes `builtComponents.json` _after_ the preamble completes. On any run, the file does not exist when the preamble subagent tries to read it.

**Impact:** The preamble subagent fails to find the file. The skip-already-built logic silently fails, potentially recreating all icons including pre-existing ones — triggering unauthorized modifications.

**Resolution:** Materialize `builtComponents.json` from `state.json → builtComponents` **before** dispatching the preamble subagent. Move step 3 to the pre-preamble setup block.

---

### Moderate

#### M1 — `build-screens.json` aggregate: who writes it?

`figma-from-code/SKILL.md` Per-Agent Output Files:

> `build-screens.json  # Phase 4: screen summary (written by collect-screen-results.js)`

`8-build-screens/SKILL.md` Step 7 "Aggregate output":

> _"Across all screens, write `.temp/figma-from-code/build-screens.json`:"_ (followed by schema)

The build-screens skill uses the verb "write" with no qualifier, suggesting individual subagents write it — but each subagent handles only one screen and has no visibility into others. Only the orchestrator (via `collect-screen-results.js`) can write the aggregate.

**Resolution:** Update build-screens Step 7 header to "Aggregate output (**written by orchestrator** via `collect-screen-results.js`)" and frame the schema as expected format, not a write instruction.

---

#### M2 — Per-screen result filename: `{N}` vs `{screenName}`

`figma-from-code/SKILL.md` Per-Agent Output Files:

> `build-results/screens/{N}.json`

`8-build-screens/SKILL.md` Subagent Prompt Template:

> `7. Write results to .temp/figma-from-code/build-results/screens/**{screenName}**.json`

**Impact:** When the orchestrator runs `collect-screen-results.js`, it cannot find files if names don't match. One convention completely breaks the collector.

**Resolution:** Standardize on `{screenName}` in both files.

---

#### M3 — `pw-server.pid` referenced in Phase 5 but never documented as created

`9-validate/SKILL.md` Step 3:

```bash
kill $(cat .temp/figma-from-code/pw-server.pid 2>/dev/null) 2>/dev/null
```

No skill or orchestrator step documents that `browser-server.js` writes a PID file. `pw-endpoint.txt` is documented; `pw-server.pid` is not.

**Impact:** The kill command silently fails. The `2>/dev/null` suppresses the error, leaving the Playwright server running indefinitely as an orphaned process.

**Resolution:** Either document that `browser-server.js` writes `pw-server.pid` (and verify it does), or replace with `pkill -f browser-server.js`.

---

#### M4 — discovery-assets skip/resume is ambiguous

`2-discovery-assets/SKILL.md` Skip/Resume:

> _"If called with `resume: true`, check whether `icons.json` exists. If it does, **skip and read the existing file**."_

Ambiguous: does "skip" mean skip only the extraction step, or skip the entire skill including writing `icons-summary.json`? If the whole skill skips, a deleted `icons-summary.json` with intact `icons.json` creates a situation where Phase 0b is incomplete but the skill refuses to regenerate the summary.

**Resolution:** Rewrite as: _"If `icons.json` exists, skip step 2 (extraction) only. Always execute steps 3–5 (summarize + write `icons-summary.json` + report)."_

---

#### M5 — State.json write instructions embedded inside a sub-skill

`figma-from-code/SKILL.md`:

> _"**Subagents do not modify state.json.** Each writes its own output file. The orchestrator reads those files and updates state."_

`6-build-tier/SKILL.md` — "Orchestrator Behavior Between Tiers":

> _"2. Merge new node IDs into `builtComponents` in state.json; 4. Update `tierProgress.tier{N}` and `phase3` status"_

Subagents dispatched with "Follow the `6-build-tier/SKILL.md`" read this section and may interpret the state.json write instructions as their own responsibility, creating potential race conditions.

**Resolution:** Move "Orchestrator Behavior Between Tiers" to a clearly separated appendix with header "**ORCHESTRATOR ONLY — do not execute as a subagent**", or split it into a separate file the orchestrator reads.

---

### Minor

| ID  | Issue                                                                                                                                                                             | Resolution                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| N1  | `preExistingComponents` authorization rule absent from setup-tokens, setup-structure, precapture, and discovery-assets (those phases don't touch nodes, but gap sets bad pattern) | Add one-line note: "This phase is read-only with respect to Figma components"                           |
| N2  | "Pre-Existing Components Rule" vs "Pre-Existing Screens Rule" — parallel but separately named; resolving C1 is the prerequisite                                                   | After fixing C1, unify as "Pre-Existing Nodes Rule"                                                     |
| N3  | Sub-skills don't specify expected model; orchestrator dispatch table does, but standalone invocations have no guidance                                                            | Add "Expected model: opus/sonnet" one-liner to each sub-skill header                                    |
| N4  | Phase 0a has no explicit checkpoint block while Phase 0b does                                                                                                                     | Add `**Checkpoint:** report tier count, component counts, and pre-existing component count` to Phase 0a |
| N5  | `.temp/figma-validation/report.md` not listed in orchestrator Per-Agent Output Files table                                                                                        | Add the path with a note explaining the two-directory split                                             |

---

## Priority Order

### Fix immediately (breaks workflow)

1. **C3** — Materialize `builtComponents.json` before dispatching the preamble subagent, not after
2. **C1 / Finding 3** — Capture `preExistingScreens` in Phase 0a; add to state.json schema; pass to Phase 4
3. **C2 / Finding 4** — Explicitly re-run summary generation after normalization; remove the "should update it" assumption

### Fix soon (causes incorrect behavior)

4. **Finding 1 / M2** — Standardize per-screen result filename on `{screenName}`; `collect-screen-results.js` cannot find files otherwise
5. **Finding 1 (artifact)** — Eliminate `builtComponents.json`; standardize on inline delivery for all subagents to fix the Phase 4 staleness bug
6. **M5** — Move "Orchestrator Behavior Between Tiers" out of the sub-skill to prevent subagents from attempting state.json writes

### Improve when refactoring

7. **Finding 1 (context)** — Add `## Orchestrator Interface` sections to `build-screens`, `discovery-components`, `build-tier` (~8,000–9,800 token savings)
8. **Finding 2** — Slim `state.json` to progress tracking only
9. **M3** — Fix `pw-server.pid` kill pattern
10. **M4** — Clarify discovery-assets skip/resume language
11. **Finding 9** — Move `code.json` out of source tree into `.temp/`
12. **M1** — Clarify who writes `build-screens.json`
13. **Finding 7** — Document or unify Phase 5 output directory split
14. Remaining minor findings (N1–N5, Finding 6, Finding 10, Finding 12)
