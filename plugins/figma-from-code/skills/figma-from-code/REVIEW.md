# figma-from-code — Improvement & Extraction-Readiness Review

**Date:** 2026-06-10
**Method:** 5 parallel focused audits (portability, redundancy, dead artifacts, data structures, contract consistency) + adversarial verification of every delete/dead claim via repo-wide grep.
**Goal:** Prepare the skill for extraction as a plugin usable in any project (originally scoped as a copyable skill folder; superseded by Decision 1 below).
**Supersedes:** `evaluation-report.md` (2026-05-22) and repo-root `figma-from-code-review.md` (2026-05-21) — both predate the numbered-subdirectory restructure; their still-open items are folded in below.

## Decisions (2026-06-10)

1. **Packaging:** develop in-repo as a **plugin** (`plugins/figma-from-code/` with `.claude-plugin/plugin.json`), loaded via `claude --plugin-dir` + `/reload-plugins`; moved to a dedicated marketplace repo later. The former project-level `.claude/skills/figma-from-code/` copy and the cached `bitovi-ai-enablement` plugin are retired now that the plugin dir is canonical. Internal script paths use the `{skillRoot}` config placeholder (`${CLAUDE_PLUGIN_ROOT}/skills/figma-from-code` when installed as a plugin).
2. **Phase 3 architecture:** 7a/7b inline (sequential per tier) is canonical. The plugin workflow's 4-stage pipeline and `prompts/stages/` are dropped.
3. **Workflow variant:** kept, but rewritten as a thin batch runner over the same phase sub-skills and contracts as the skill orchestrator — one architecture, two entry points.
4. **Gate hooks:** fix and ship both via the plugin's `hooks/hooks.json` (auto-registered) — apply §1.1 and §1.5 fixes first.
5. **Bundling:** fold everything in — merge `figma-setup-variables`/`figma-setup-file-structure` into the 3-/4- phase dirs (§3.3), vendor `compare.js` + one canonical `browser-connect.js` into `10-validator/`. Zero external skill dependencies.
6. **npm deps:** document `@playwright/test` + chromium as host-project prerequisites for now (`${CLAUDE_PLUGIN_DATA}` install option later).
7. **Tracking files:** keep writing `.figma/figma.json` into the host source tree, path derived from each component's `sourcePath` (with `componentsRoot` array as fallback for synthetic components), documented as consumer-visible behavior.
8. **Per-project config:** orchestrator prompts for unknowns on first run and persists them to `state.json`; checked-in config-file override later.
9. **Sequencing:** plugin skeleton + `git mv` first → §1 correctness fixes → §3 deletions → §2/§5 parameterization → §3.3/§3.7 consolidation → §4 efficiency. Acceptance test: clean pipeline run against this app after the §1 fixes, before the efficiency work.

Severity scale: 🔴 blocker (breaks a run or breaks extraction) · 🟠 high · 🟡 medium · ⚪ low

## Progress (2026-06-10)

> Note: findings below cite pre-migration `.claude/skills/...` paths and pre-fix line numbers; some citations were also altered by the bulk path rewrite. Treat them as historical evidence, not current locations.

**Done:**

- Plugin skeleton: `plugins/figma-from-code/` (plugin.json v2.0.0, hooks/hooks.json, README), repo-root marketplace.json, 55 files moved via `git mv`, `claude plugin validate` passes
- §1.1 + §1.5 hook fixes (matcher covers all `use_figma` tool-name forms; `-built`/early-exit exemptions; Icon//Asset/ preamble exemption; remediation paths via `__dirname`) — 5 simulated-event tests pass
- §1.2 `normalize-component-map.js` now regenerates `discovery-summary.json` (fixture-tested); orchestrator claim corrected
- §1.3 Phase 2.5 screens capture: prompt steps added (screens screenshot batch, screen text entries, `precapture-screens.json` results with documented schema); manifest ownership contradiction resolved (subagent owns)
- §1.4 `collect-tier-results.js`: `--tier-frame-id`, numeric `tier`, `complete_with_failures`, `matchPct` in completed entries (replaces unused `figmaScreenshot`) — fixture-tested
- §1.6 result schema unified: 7b is canonical (adds `figmaScreenshot`, `screenshotNodeId`, `matchPct`, `error`); step-7-return + 6-build-tier point to it; 7a handoff schema declares `error`
- §1.9 interactive confirmation removed from Phase 0a; orchestrator surfaces componentDirectories at Wave 1→2 pause
- §1.10 minors: Phase 5 inputs, Phase 1 skip condition, browser-server start step, icon-preamble direct dispatch, wave-boundary consistency, `builtScreens` + `screenBodySize` in state schema, `missingDetails` phantom removed
- §3 deletions: legacy `figma-from-code-build-component/` skill, `figma-component-dependency-map/` skill, `7-build-component/prompts/`, 8 dead debug scripts, 3 meta-docs (skill-tree/skill-graph/evaluation-report); all stale cross-references fixed (site-component-map paths, 8-build-screens section pointers, CLAUDE.md rows)
- §2.1/§5 parameterization: `config` object in state.json (devServerUrl, devServerStart, sourceDir, componentsRoot (array), pagesRoot, cssPath, tailwindConfigPath, iconLibrary, skillRoot) with first-run detection + user confirmation; all literals replaced with `{placeholder}` convention across every phase file
- §2.2 script fixes: `extract-icons.js` project-root walk-up + `--project-root` flag; `normalize-component-map.js` uses `require.resolve('lucide-react')` with graceful degradation — both live-tested against this repo

- §3.3/§3.7 consolidation (Decision 5): `figma-setup-variables`/`figma-setup-file-structure` folded into the 3-/4- phase dirs (top-level skills reduced to pointers; CLAUDE.md updated); `compare.js` vendored into `10-validator/` (all references now `{skillRoot}/10-validator/compare.js`); `fixSizing()` + Tailwind→Figma table single-sourced in `7-build-component/figma-utils.md` (exemptRoot variant canonical; step-2-build, 8-build-screens, 7a all point there)

- §1.7 + workflow rewrite (Decision 3, 2026-06-11): `plugins/figma-from-code/workflows/figma-from-code.js` rewritten as a thin batch runner — each phase is one subagent reading its sub-skill SKILL.md; Phase 3 is one agent per tier executing 7a→7b inline sequentially (4-stage `prompts/stages/` pipeline and per-component parallel chains dropped); `startPhase` defaults to `phase0a`; state updates via haiku bookkeeping agents (phase subagents never write state.json); contracts aligned with current specs (`collect-tier-results.js --tier-frame-id`, `precapture-screens.json` screen list, §1.10 validate inputs); Wave 2 runs tokens→structure sequentially because 4-setup-structure's foundations docs bind Phase 1 variables; static lint test ported (`workflows/figma-from-code.test.js`, 60/60 pass)

- Color-variable coverage (2026-06-11): hardcoded-hex leak fixed end-to-end. New `10-validator/resolve-color.js` CLI (also covers the §4.2 lookup-CLI item for colors): resolves Tailwind class / CSS var / raw hex-rgb to a Figma variable via reverse RGB→variable matching (per-channel tolerance, `--context fill|stroke|text` disambiguation, opacity-modifier classes like `bg-primary/90` return base var + `opacity`, `--dump-index` emits the inlineable index); Phase 1 (`3-setup-tokens`) now records variable `scopes` in `variables.json` and writes `color-index.json` (new Step 4b, summary + skip-resume updated); step-2-build §2e gains "Step 0: reverse-match before hardcoding" (applies to stateStyles, computed-styles, arbitrary values; reassigning `fills`/`strokes` clears `boundVariables` → re-bind), pseudo-state variant block and §2c divider example now bind variables; step-5 fix loop §5b routes color fixes through the CLI, and new **Step 5R rebind sweep** (always runs, even on first-compare match) walks the built tree, binds any unbound SOLID paint matching a token (skips INSTANCE subtrees), reports `rebindSweep: { rebound, alreadyBound, unmatched }` in the 7b result schema; 8-build-screens §1f/§2a/§2e bind page-chrome colors instead of "use resolved RGB directly". CLI live-tested against this repo's Phase 1 artifacts (exact/tolerance/none, context scoring, ambiguous-white index keys)

- Discovery coverage (2026-06-11): screenshot-coverage gaps fixed end-to-end (last run: 34 captured / 54 skipped / 4 failed of 92). Root causes: map-components.js dropped the route a selector was derived on (precapture paired selectors with `routes[0]`); passive crawl never revealed interaction-gated components (dialogs/menus/Editable* edit modes) or `navigate()`-only routes (`/cases/new`); positional `nth-of-type` selector chains; fiber walk attributed elements to Radix internals (`SlotClone`) that library-filter then discarded. Fixes: `detect-components.js` — `generateSelectorCandidates()` (testid → id → aria → anchored-relative → stable-class → placeholder/type → positional last resort, all uniqueness-validated), library-pattern walk-through in attribution (hop-capped), memo unwrap; `map-components.js` — per-component `capture` object (`url` exact concrete route, `selector`, `fallbackSelectors`, `interaction`, `viewport`), `--interactions` scenario runner (pre/post `discoverOnPage` diff, Escape + fresh goto per scenario, `interactionResults` in output), `--augment` re-run mode; `screenshot.js`/`extract-text.js` — `click` arrays + fallback-selector retry with drift logging; `discover-code-components.js` carries `capture` through the merge; 1-discovery SKILL gains steps 3a–3d (static route enumeration, interactions.json authoring with destructive-action safety rules, augment pass, max-2 refine loop); 5-precapture SKILL builds manifests from `capture` (never `routes[0]`), skips only when both `capture` and legacy `selector` are null. Partially discharges §4.4's keyed `selectors.json` idea — `capture` is the keyed selector record.

**Remaining:**

- Acceptance test: clean pipeline run against this app (Decision 9 — before efficiency work; now also exercises the new discovery capture path)
- §4 efficiency: step-file diet, artifact slicing/minification, resolve-color lookup CLI for non-color variables.json/tailwindMap slimming, model-policy block

---

## 1. Correctness bugs (would break or corrupt a run today)

### 1.1 🔴 `figma-instances-gate.js` blocks every component's `-built.json` handoff write

- Evidence: `.claude/hooks/figma-instances-gate.js:68-81` — regex `build-results/([^/]+)\.json$` exempts only stems ending `.instances`. `7-build-component/7a/SKILL.md:37` writes `build-results/{Name}-built.json` **before** the Step 4a instance check runs, so the required `instances/{Name}-built.ok` marker can never exist. Early-exit writes of `{Name}.json` (rejected / needs_authorization, from `step-1-analyze.md:11,534`) are blocked the same way. The hook header comment shows it predates the 7a/7b split. Verified: the regex and exemption are exactly as described.
- Also: the hook's remediation message points to the deleted path `plugins/figma-from-code/skills/figma-from-code-build-component/check-instances.js` (`figma-instances-gate.js:88`; same stale path in `figma-prereqs-gate.js:83`). Agents hitting the gate route around it with Bash heredocs, defeating its purpose.
- Vestigial: nothing ever writes a `*.instances.json` file, so the one exemption that exists guards nothing.
- Fix: exempt `stem.endsWith('-built')`, allow marker-less writes when `status` is `rejected`/`needs_authorization`/`failed` (or pre-create markers for early exits), correct both remediation paths, drop the `.instances` exemption.

### 1.2 🔴 Orchestrator's normalization claim is false → stale buildOrder

- Evidence: `SKILL.md:194` ("The script regenerates `discovery-summary.json` automatically. Re-read it…") and plugin workflow `figma-from-code.js:688` make the same claim. Verified by grep: `1-discovery-components/normalize-component-map.js` contains **no** reference to the summary file — it writes only `component-map.json` (`:157-162`).
- Impact: after normalization the orchestrator refreshes `buildOrder` from a stale summary containing scanner names (`EllipsisVertical`, `CartonLogo`) instead of normalized Figma names (`Icon/MoreVertical`, `Asset/CartonLogoSvg`). Phase 3 skip-matching against `builtComponents` then fails → duplicate icon builds or rejected components. This is the old eval-report bug C2, "fixed" by editing the doc claim rather than the code.
- Fix: make `normalize-component-map.js` re-emit the summary (it has all the data), or change both orchestrators to re-run the Step 10 summary extraction (`1-discovery-components/SKILL.md:204-235`).

### 1.3 🔴 Phase 2.5 never captures screen screenshots; Phase 4 depends on them

- Evidence: `5-precapture/SKILL.md:115` has the subagent build `manifests/precapture-screens.json`, but the prompt's run steps (`:120-130`) batch only `all-screenshots.json` and `all-text.json`. Nothing runs the screens manifest or writes the results file `.temp/figma-from-code/precapture-screens.json` — yet that file is listed as an output (`:139-147`), required by the skip check (`:173-175`), read by the orchestrator (`SKILL.md:198`), and is Phase 4's source of screen `app.png` references (`8-build-screens/SKILL.md:22,86`). The orchestrator also self-contradicts on manifest ownership: `SKILL.md:127` ("subagent builds all manifests itself") vs `SKILL.md:154` ("Write manifests before dispatching").
- Bonus defects: the plugin workflow's hydration (`figma-from-code.js:564-567`) expects a `screenName/route/pageSourceFile/keyComponents` schema that neither spec produces; and `screens/{Name}/text.json` is read by Phase 4 (`8-build-screens/SKILL.md:23,87`) but the text manifest covers components only (`5-precapture/SKILL.md:27,113`) — never written.
- Fix: add explicit prompt steps 3–4 (run screens batch incl. text extraction, write `precapture-screens.json`), pick one manifest owner, align the schema with the workflow's hydration needs.

### 1.4 🟠 `tierFrameId` is read from a file that never contains it

- Evidence: orchestrator `SKILL.md:129` says to persist `figmaNodes.tier{N}FrameId` "from `build-tier{N}.json`"; `6-build-tier/SKILL.md:127,164-175` documents the field (and `tier` as a number). The actual writer `collect-tier-results.js:56-60` emits only `{tier: "tier1" (string), completed, failed}`. The tier frame ID exists only in the subagent's conversational summary, so a resumed run cannot reconstruct tier frames from disk; Phase 5 cleanup (`9-validate/SKILL.md:52-66`) depends on them.
- Fix: add `--tier-frame-id` to `collect-tier-results.js` (or have it merge a field from the tier agent's result files); align the `tier` field type across the three declarations.

### 1.5 🟠 `figma-prereqs-gate.js` is silently dead (matcher mismatch)

- Evidence: `.claude/settings.json:5` matches `mcp__claude_ai_Figma__use_figma`; the plugin-served tool is `mcp__plugin_figma_figma__use_figma`. The prereq gate never fires; the protection documented at `step-1-analyze.md:544` is fiction.
- Caution when fixing: once live, the gate would block the icon preamble (creates `Icon/...` components with no prereq markers) — needs an exemption.
- Fix: matcher covering both schemes (e.g. `use_figma$`-style regex if supported, or both literals) + icon-preamble exemption.

### 1.6 🟠 Final per-component result file has three conflicting schemas

- Evidence: `7b-review-fix-component/SKILL.md:40-58` (has `status`, `trackingFile`; no `figmaScreenshot`) vs `step-7-return.md:5-24` (no `status`; has `figmaScreenshot`) vs `6-build-tier/SKILL.md:147-162` (no `status`). Consumer `collect-tier-results.js:34-46` needs **both** `status` and `figmaScreenshot` — no declared schema satisfies it. A subagent following step-7-return.md emits no `status` → rejected/needs_auth results get mis-collected as completed.
- Fix: make 7b's schema the single source (add the screenshot fields, plus the `error` field that `7a:157`/`7b:86` reference but never declare); have step-7-return.md and 6-build-tier point to it.

### 1.7 🟠 Plugin workflow defaults `startPhase = 'phase3'`

- Evidence: `~/.claude/plugins/cache/bitovi-ai-enablement/figma-from-code/1.0.0/workflows/figma-from-code.js:354`. A no-args invocation silently skips discovery/tokens/structure/precapture — leftover from a test run. Fix: default `'phase0a'`.

### 1.8 🟡 `prompts/analyze.md` contradicts the 7a handoff contract

- Evidence: `prompts/analyze.md:24-28` says early-exit results go to `build-results/{componentName}.json`; `7a/SKILL.md:74,104-105` requires `{componentName}-built.json` with handoff propagation. Following the prompt skips the handoff. (See also §3.4 — the prompts dir is mostly vestigial.)

### 1.9 🟡 Interactive user-confirmation step inside a subagent

- Evidence: `1-discovery-components/SKILL.md:91-100` (Step 5: "Wait for user confirmation" of componentDirectories) — but Phase 0a runs as a subagent, which cannot pause for input. Move the confirmation to the orchestrator pre-dispatch pause point; pass confirmed dirs as input.

### 1.10 🟡 Minor contract drift (fix opportunistically)

- Phase 5 dispatch omits `preExistingComponents` + `devServerUrl` required by `9-validate/SKILL.md:12-19` (the read-only protection for pre-existing components rides on it). Orchestrator `SKILL.md:131`.
- Phase 1 skip checks only `tokens-summary.json` existence (`SKILL.md:125`); a deleted `variables.json` passes the skip but breaks Phase 3.
- Nobody starts the shared Playwright server: `5-precapture/SKILL.md:15-19` says "started by orchestrator", orchestrator never mentions `browser-server.js`; `9-validate/SKILL.md:79-82` kills a server nothing started. Scripts fall back to per-script browsers, so non-fatal.
- "Icon preamble mode" dispatch (`SKILL.md:128`) doesn't exist in `6-build-tier/SKILL.md` — dispatch `6-build-tier/icon-preamble/SKILL.md` directly and remove the preamble from the per-tier flow.
- Status-enum drift: workflow schemas use `built`, skill uses `success`; `8-build-screens` success results have no `status` field at all (`:594-617`) while the workflow schema requires one; project `collect-tier-results.js` always writes `complete` even with failures while the plugin copy writes `complete_with_failures` — neither documented in the state-ledger enum (`SKILL.md:65-75`).
- `step-4-compare.md:35-51` documents a `missingDetails[]` rejection shape `check-instances.js:87-104` doesn't emit.
- Normalization straddles the Wave 1→2 pause inconsistently (`SKILL.md:140-148` vs `:317`).
- `state.json` on disk has a `builtScreens` field absent from the documented schema (`SKILL.md:62-94`); `screenBodySize` is documented as input (`8-build-screens/SKILL.md:34,409`) but no producer ever writes it.

---

## 2. Extraction blockers (breaks when copied to another project)

### 2.1 🔴 No config surface — project values are baked into prose and scripts

The orchestrator's only declared inputs are `fileKey` + `resume` (`SKILL.md:10-13`). Hard-coded throughout:

- `localhost:5173` — `1-discovery-components/SKILL.md:14,20,42,51`, `5-precapture/SKILL.md:13,62,75,88`, `step-1-analyze.md:584,618,623`, `8-build-screens/SKILL.md:237`, `9-validate/SKILL.md:19`, `10-validator/SKILL.md:19,271,281,296`, `SKILL.md:266`
- `packages/client/src/...` — `3-setup-tokens/SKILL.md:63-66` (resolve-colors command), `1-discovery-components/SKILL.md:95-96,149,165`, `step-1-analyze.md:125-128`, `step-2-build.md:668-705`, `step-6-track.md:24-27`, `7a/SKILL.md:49`, `8-build-screens/SKILL.md:565,614`, `SKILL.md:124`
- `tailwind.config.js` (Tailwind v3 assumption; breaks on v4/no-config) — `3-setup-tokens`, `step-2-build.md:538`, `8-build-screens/SKILL.md:348`
- Fix: adopt the config block in §5 and persist it into `state.json` so every subagent reads config from state instead of literals. The plugin workflow already parameterizes `fileKey/sourceDir/devServerUrl/skillDir` — backport that.

### 2.2 🔴 Path-resolution bugs in scripts that only work in this monorepo

- `10-validator/extract-icons.js:161` — `projectRoot = path.resolve(srcDir, '../../..')` assumes `srcDir` is exactly `packages/client/src`; for a plain `src/` it resolves **above** the project. Fix: walk upward until `node_modules/lucide-react` is found, or accept `--project-root`.
- `1-discovery-components/normalize-component-map.js:43-46` — `path.join(process.cwd(), 'node_modules/lucide-react/...')` assumes root hoisting. Fix: `require.resolve('lucide-react')`.
- Lucide is the only supported icon system (`2-discovery-assets/SKILL.md:14,82-83`, `extract-icons.js:36,162`) — make `iconLibrary` a config input and document graceful degradation.

### 2.3 🔴 Hooks live outside the skill folder and ship nowhere

- `.claude/hooks/figma-prereqs-gate.js` + `figma-instances-gate.js`, registered in `.claude/settings.json` — a copied skill folder loses both gates silently (the plugin already ships **no** hooks, so plugin consumers have no gates today). Fix: include the hooks + a settings.json fragment in the extraction, with an install step; fix the matcher (§1.5) and the `-built` blocking (§1.1) first.

### 2.4 🔴 Hard dependency on sibling skills by literal path

- `node {skillRoot}/10-validator/compare.js` — `10-validator/SKILL.md:21,387`, `8-build-screens/SKILL.md:442,522`, `step-4-compare.md:125`, `step-5-fix-loop.md:79`, `7b/SKILL.md:139`. The plugin solves this by vendoring `compare.js` into `10-validator/` — do the same in the repo tree (and consolidate `browser-connect.js`, which exists as two drifted copies: `10-validator/` has diagnostics, `screenshot-comparison/` doesn't).
- `3-setup-tokens/SKILL.md:29` and `4-setup-structure/SKILL.md:27` load `figma-setup-variables` / `figma-setup-file-structure` by name — must ship (or be folded in, see §3.3).
- All intra-skill paths assume installation at exactly `plugins/figma-from-code/skills/figma-from-code/` — adopt the plugin's `skillDir` parameter.

### 2.5 🟠 npm dependency contract is implicit

No `package.json` anywhere under `.claude/skills/` — every script resolves `@playwright/test` from the **host project's** root `node_modules`, with cwd required to be project root (the `pw-endpoint.txt` handshake is cwd-relative). Fix: document prerequisites (`@playwright/test` + `npx playwright install chromium`, optionally `lucide-react`) or ship a skill-local `package.json`. Note: no pixelmatch/pngjs needed — pixel diff runs in a browser canvas.

### 2.6 🟡 Remaining portability nits

- 7 debug scripts hard-code the Carton route `localhost:5173/cases/` (`10-validator/check_h1.js:8` etc.) — delete (see §3.5).
- Carton example names (`CasesPage`, `EditableTitle`, `CartonLogoSvg`) used illustratively across step files — acceptable, optionally genericize so models don't pattern-match on them.
- Figma plugin prerequisite (`figma:figma-use`, `use_figma`, `get_screenshot`) — inherent; document it.
- `.temp/` is cwd-relative — document + suggest gitignore entry (`.figma/` is already gitignored).

---

## 3. High-value cleanups (redundancy & dead files — all delete claims grep-verified)

### 3.1 🟠 Delete the orphaned legacy skill `plugins/figma-from-code/skills/figma-from-code-build-component/`

Full pre-restructure duplicate (10 files), still registered as an invocable skill describing the obsolete parallel-per-component model. step-1/2/4/5 files have drifted behind the canonical copies (186/215/46/46 diff lines). Verified consumers: only the stale hook remediation messages (§1.1), one `settings.local.json` permission entry, a code comment, and the old root review doc. Delete it; fix the hook messages to point at `7-build-component/check-*.js`.

### 3.2 🟠 Resolve repo-vs-plugin dual source of truth

The plugin cache holds a full second copy of the tree (~27 files differ) plus a 1,266-line programmatic orchestrator with **material conflicts**:

- Workflow builds tier components **in parallel**; `6-build-tier/SKILL.md:3` + orchestrator `SKILL.md:119` mandate sequential.
- Workflow's Phase 3 uses a 4-stage subagent pipeline reading `7-build-component/prompts/stages/` — which exists only in the plugin; pointed at the repo tree it 404s on every stage. The repo's 7a/7b handoff design doesn't exist in the workflow.
- Plugin has files the repo deleted (`prompts/stages/`, `build-component-full.md` — which self-documents "keep this file in sync", a manual-sync anti-pattern); repo has files the plugin lacks.
Decide one canonical source (plugin as distributable, repo as dev tree with a sync script is the natural split), reconcile sequential-vs-parallel tier policy, and reconcile 7a/7b vs stage-pipeline into one Phase 3 architecture.

### 3.3 🟡 Flatten the double-delegation wrapper layers

`3-setup-tokens` → "load `figma-setup-variables`" → "load `figma:figma-use`" (and `4-setup-structure` → `figma-setup-file-structure`; `9-validate` is 131 lines wrapping `10-validator`'s 570). Each phase spans two SKILL.mds with overlapping When-to-Use/inputs/collection descriptions and mild idempotency-phrasing drift. Fold each inner skill's body into the phase dir (keeping a standalone-usage note), or reduce the wrapper to a 5-line pointer. This also removes two sibling-skill ship requirements from §2.4.

### 3.4 🟡 Delete verified-dead files

| Path | Evidence |
|---|---|
| `10-validator/check_{h1,buttons,page,textarea,visibility}.js`, `inspect_details.js`, `capture_editcontrols.js`, `screenshot_nth.js` | Zero references from any SKILL.md/script; hard-code Carton routes; absent from plugin copy |
| `7-build-component/prompts/compare.md`, `prompts/fix.md` | Zero references (only `analyze.md` is referenced, `7a/SKILL.md:116` — fold its ~10 unique lines into 7a and delete the dir, fixing §1.8) |
| empty `scripts/` dir | — |
| `.claude/skills/figma-component-dependency-map/` | Superseded by Phase 0a dynamic discovery (`1-discovery-components/SKILL.md:56` says so explicitly); its hard-coded tier list is 13 months stale. Update the CLAUDE.md skills table, which still bills it as Phase 3 input |
| `figma-setup-variables`/`figma-setup-file-structure` as separate skills | If §3.3 merge is done |

### 3.5 🟡 Meta-docs: don't ship, mostly delete

`skill-tree.md`, `skill-graph.md`, `evaluation-report.md` (no external references — verified). skill-tree actively contradicts the current architecture: claims per-route-group Haiku precapture subagents, per-component parallel Opus dispatch with nested per-step subagents (violates `SKILL.md:119` "no nested subagents"), Haiku for compare, and an 8KB orchestrator (it's 22.6KB). evaluation-report lists C1–C3 as open; all are fixed (C2 regressed into the doc/code mismatch in §1.2). Delete skill-tree.md; regenerate skill-graph.md if a map is wanted; archive evaluation-report.md outside the skill dir. The plugin currently ships two of these — drop them there too.

### 3.6 🟡 Fix broken/stale cross-references (subagents chase these today)

- `site-component-map/SKILL.md` lines 44,58,66,90,93,141,159,192: eight references to `plugins/figma-from-code/skills/figma-from-code-validator/` — directory doesn't exist (now `figma-from-code/10-validator/`). Every command in that skill fails as written.
- `8-build-screens/SKILL.md:136,169,219,254,334` and `1-discovery-components/SKILL.md:149,166`: references to "Step 1g / Step 1c / Section 2d / Step 6 of `7-build-component/SKILL.md`" — that file is now a 34-line index; the sections moved to `step-*.md`. A screen agent chasing them ends up loading the 78KB step files for one table.
- `8-build-screens/SKILL.md:92`: prompt template says "Read the figma-from-code-build-screens skill" (pre-rename name).
- `step-1-analyze.md` has two sections labeled "1b-iii".

### 3.7 🟡 Single-source the duplicated JS/prose between component and screen pipelines

- `fixSizing()`: divergent signatures — `step-2-build.md:713-731` `(node, depth)` vs `8-build-screens/SKILL.md:672-692` `(node, {exemptRoot}, depth)`; also invoked in `step-5-fix-loop.md`. Keep the `exemptRoot` variant in one shared reference (e.g. `7-build-component/figma-utils.md`) alongside the Tailwind→Figma mapping table (full copy `step-2-build.md:~480-523`, subset `8-build-screens/SKILL.md:332-344`) and the color-resolution chain.
- 8-build-screens restates the whole step-4/step-5 compare + fix-loop pipeline with intentionally looser thresholds (88/80/72 vs 90/85/75) — but invokes `compare.js` with default flags, so the script's emitted verdict disagrees with the prose ladder. Parameterize over the step files; pass thresholds as compare.js flags.
- Pre-Existing Components Rule restated in 7 files — keep full text only in step-1-analyze (already designated canonical), pointers elsewhere. Same for acceptance thresholds (7b + step-4) and 7a's duplicate workflow sections (`7a/SKILL.md:89-110` vs `:120-130`).

### 3.8 ⚪ Remaining dead-artifact verdicts

- `component-map.md` — written (`map-components.js:557`), never read. Keep as human-facing report but label it so, or drop the `--markdown` flag.
- `screenshots/foundations.png` / `foundationsScreenshot` field — written (`4-setup-structure/SKILL.md:74-98`), never read. Drop or mark debug-only.
- `build-tier{N}.json → completed[].figmaScreenshot` — collected (`collect-tier-results.js:41`), never consumed; meanwhile `matchPct` is dropped though wanted (old eval Findings 6+12). Swap them.
- `pages/{Name}/figma-screen.json` — self-read only (preserves `createdAt`). Keep as the screen analog of `.figma/figma.json`, but note no enforcing consumer exists (unlike `check-instances.js` for components).
- Refuted (keep): `.figma/code.json` (build manifest + gate input), `progress.md` (Startup Protocol reads it in full — though the workflow variant never writes it, so cross-orchestrator resume always hits the "orphaned state" path), `tier-{N}-results.json` (merged intra-skill at `10-validator/SKILL.md:237`), `pw-server.pid` (killed by `9-validate/SKILL.md:80`).

---

## 4. Efficiency improvements (~250–400k addressable output tokens per full run)

### 4.1 🟠 The 6× per-tier instruction chain (~210k tokens/run)

Each tier agent loads `6-build-tier` + index + 7a + step-1 (38.9KB) + step-2 (39.4KB) + step-3 + 7b + step-4 + step-5 + step-6/7 ≈ **143KB ≈ 35k tokens × 6 tiers** — more in practice, since a tier agent building 15–36 components compacts and re-reads. Reductions:

- step-1-analyze.md: compress the 85-line Button `code.json` example to a field table; move standalone/auto-mode dev-server decision trees to a `standalone.md`; drop "future extension points" (~8–10KB).
- step-2-build.md: extract `figma-utils.md` (fixSizing + Tailwind table + color chains, see §3.7) (~10KB + drift elimination).
- 6-build-tier: move "Orchestrator Behavior Between Tiers" to the orchestrator's Per-Phase Notes (tier agents currently read state-write instructions they must not execute; old eval M5).
- Consider bounding tier batches (≤10 components per agent) or per-component sub-spawns with slim briefs, so compaction doesn't force chain re-reads.

### 4.2 🟠 `8-build-screens/SKILL.md` (42KB × 6 screen agents ≈ 63k tokens)

- Step 0 instructs re-reading `component-map.json → tree` even though the orchestrator already passes `keyComponents` inline — fully redundant (~12k tokens × 6).
- Stale section pointers (§3.6) can force a +19.5k/screen detour into the step files.
- Orchestrator-only sections (prompt template, aggregate output) load into every screen agent. Split orchestrator-interface from worker workflow; target ~25KB.

### 4.3 🟠 `resolved-colors.json` (63KB) — 33KB is mechanically derivable

All 1,008 `tailwindMap` entries are just 7 known prefixes (`bg- text- border- ring- fill- stroke- decoration-`) + var stem. Delete the map, state the prefix-strip rule in step-2 §2e (63KB→~17KB), and ship a `resolve-color.js <class|var>` lookup CLI so agents never Read the JSON into context (up to ~95k tokens/run if each tier agent currently Reads it). Same CLI can serve `variables.json` lookups (~45% of that file — `name`, `collectionName` — is never used by build code; ~26k tokens).

### 4.4 🟡 Artifact shape & hygiene

- `component-map.json`: 42% of its 49.6KB is pretty-print whitespace; `tiers[].components[]` arrays force full scans for one lookup. Write machine-only artifacts minified (~11k tokens across consumers); have discovery Step 10 also emit a keyed `selectors.json` and add routes + per-route components to `discovery-summary.json` so precapture/validator/orchestrator consume slices (~90k total with §4.2's Step 0 fix).
- `icons.json`: drop the `elements` array (~5KB) — it duplicates path data already in `svgString`; no consumer uses it.
- `state.json` duplicates `builtComponents.json`, `discovery-summary`, `icons-summary`, `structure-summary` facts with manual sync ("rewrite builtComponents.json before every dispatch"). Make `builtComponents.json` the single source for built components (scripts already read it); state holds phase/tier progress only. Add the undocumented `builtScreens` field to the schema or drop it.
- Hand-written summaries (`structure-summary.json`, `precapture-all.json`, `validation-summary.json`) follow prose templates — cheap to script, removing format-drift risk. Scripted ones (`discovery-summary`, `icons-summary`, collectors) are fine apart from §1.2/§1.4.
- `5-precapture` chunking: the agent hand-slices `chunk-01/02.json` from the manifest because `screenshot.js` has a 60s timeout — add `--offset/--limit` to the script instead.

### 4.5 🟡 Model policy lives only in stale side-docs and the workflow, and they disagree

Workflow policy (opus build/fix/screens/validate, sonnet analyze/compare/setup/precapture, haiku bookkeeping; aliases only — no exact model IDs anywhere, good) vs skill-tree.md's defunct fan-out assignments vs an orchestrator SKILL.md with no model guidance at all. Add the workflow's policy block to the orchestrator dispatch table; delete the contradicting side-docs (§3.5).

---

## 5. Proposed config surface

Single block in the orchestrator's Required Inputs, persisted to `state.json` so subagents inherit it:

```jsonc
{
  "fileKey": "<required>",
  "resume": false,
  "devServerUrl": "http://localhost:5173",   // §2.1 — all localhost references
  "devServerStart": "npm run dev",           // optional; step-1 auto-start + precapture prereq
  "sourceDir": "src/",                       // Phase 0b dispatch, asset scan, extract-icons root
  "componentsRoot": ["src/components"],   // array of component dirs (supports monorepos); .figma/ paths derived from sourcePath
  "pagesRoot": "src/pages",                  // figma-screen.json paths
  "cssPath": "src/index.css",                // 3-setup-tokens resolve-colors command
  "tailwindConfigPath": "tailwind.config.js",// optional (null = Tailwind v4 / vanilla CSS)
  "iconLibrary": "lucide-react",             // or null → skip icon extraction gracefully
  "screenSize": { "w": 1440, "h": 900 },     // writes state.screenBodySize (currently a read-only ghost)
  "skillDir": "plugins/figma-from-code/skills/figma-from-code" // all `node .claude/skills/...` command paths
}
```

## 6. Extraction manifest

**Ship (after fixes above):**

1. `plugins/figma-from-code/skills/figma-from-code/` — entire tree, **minus**: `skill-tree.md`, `skill-graph.md`, `evaluation-report.md`, the 8 dead `10-validator` debug scripts, `prompts/` (post-§3.4), empty `scripts/`
2. `screenshot-comparison`'s `compare.js` + one canonical `browser-connect.js` — vendored into `10-validator/` (plugin already does this)
3. `figma-setup-variables` + `figma-setup-file-structure` — folded into `3-setup-tokens`/`4-setup-structure` per §3.3, or shipped alongside
4. Hooks: `figma-prereqs-gate.js` + `figma-instances-gate.js` (fixed per §1.1/§1.5) + a settings.json registration fragment with both MCP tool-name forms, as a documented install step
5. `site-component-map` — optional standalone (fix its 8 broken paths first); the pipeline calls the scripts from `10-validator/` directly

**Do not ship:** `figma-component-dependency-map` (Carton-specific, superseded), legacy `figma-from-code-build-component/`, the three meta-docs, root `figma-from-code-review.md`.

**Target-project prerequisites (document in the skill README):** Figma MCP server + `figma:figma-use` skill; `@playwright/test` installed at project root + `npx playwright install chromium`; `lucide-react` if `iconLibrary` set; scripts invoked with cwd = project root; gitignore `.temp/` and decide policy for persistent `**/.figma/*.json` tracking files.

## 7. Suggested fix order

1. **Gates & data flow** (run-breaking): §1.1 instances-gate, §1.2 discovery-summary regen, §1.3 screens precapture, §1.4 tierFrameId, §1.5 prereqs matcher, §1.6 result schema, §1.7 workflow default phase.
2. **Deletions** (5 minutes each, immediately reduce confusion): §3.1 legacy skill, §3.4 dead files, §3.5 meta-docs, broken pointers §3.6.
3. **Parameterization** (§2.1–2.5 + §5): config block, script path fixes, vendor compare.js, hook packaging.
4. **Consolidation** (§3.3, §3.7): flatten wrappers, single-source shared JS/prose, reconcile repo-vs-plugin (§3.2).
5. **Efficiency** (§4): step-file diet, artifact slicing, resolve-color CLI, model policy.
