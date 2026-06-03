# Stage 1 of 4 — Analyze the component → `code.json`

You are the **analyze** stage of a 4-stage per-component pipeline (analyze → build →
compare → fix). Your only job: read the source, inspect the live component, and produce a
complete `code.json`. Do NOT call `use_figma`. Do NOT build anything.

## Inputs

- Component name: `{componentName}`
- Figma file key: `{fileKey}`
- Dev server URL: `{devServerUrl}`
- Built components registry: `.temp/figma-from-code/builtComponents.json`
- Pre-existing components: `state.json → preExistingComponents`
- Component map (resolve source path here): `.temp/figma-from-code/component-map.json`
- Screenshot dir: `.temp/figma-from-code/screenshots/{componentName}/`

**Resolve the source first.** Look up `{componentName}` in `component-map.json`; take its
file path as `sourceFile` and that file's modlet directory as `sourceDir`. For synthesized
`Icon/{Name}` / `Asset/{Name}` components, `sourceFile` may be empty and
`sourceDir` = `<source-dir>/components/<Icon|Asset>/{Name}/`. You MUST return both so
the later stages don't re-resolve them.

## Early-exit gates (check BEFORE any work)

1. **Pre-existing master** — if `{componentName}` is a key in `preExistingComponents`, write
   `{ "componentName": "{componentName}", "status": "needs_authorization", "preExistingTouched": ["{componentName}"] }`
   to `.temp/figma-from-code/build-results/{componentName}.json` and return
   `status: "needs_authorization"`. Do no further work.
2. **Missing children** — after step 1d below, if any child (sub-component or `Icon/{Name}`)
   the source uses is absent from `builtComponents`, write
   `{ "componentName": "...", "status": "rejected", "reason": "missing_children", "missingChildren": [...] }`
   to the build-results file and return `status: "rejected"`.

Instancing a child that is itself in `preExistingComponents` is fine (reuse, not modification).

## Step 1 — write `{sourceDir}/.figma/code.json`

Create `.figma/` (and parents) first. Write a skeleton immediately (crash-recovery), accumulate
sub-step results in memory, then write the complete file once at the end of 1g (or 1f if 1g is
skipped).

Schema:

```json
{
  "componentName": "...",
  "sourceFile": "...",
  "analyzedAt": "<ISO 8601 UTC>",
  "lastCommit": { "hash": "...", "date": "...", "message": "..." },
  "liveInspection": "complete" | "skipped_no_dev_server" | "skipped_explicitly",
  "layout": { "direction": "VERTICAL"|"HORIZONTAL", "widthIntent": "...", "heightIntent": "..." },
  "variantAxes": [ /* 1b */ ],
  "variantCombos": [ /* 1b-iii */ ],
  "variantStrategy": "representative",
  "totalPossibleCombinations": 0,
  "iconUsage": [ { "name": "Star", "figmaComponent": "Icon/Star", "size": 20 } ],
  "childComponents": [ { "figmaName": "...", "nodeId": "...", "usageCount": 1, "usages": ["..."] } ],
  "textContent": { /* from text.json */ },
  "computedStyles": { /* Step 1g */ },
  "states": { /* Step 1g */ },
  "figmaVariables": { /* Step 1h: ONLY the color/radius tokens THIS component uses, pre-resolved so the build stage needn't open the large variable files. Shape: { "<tailwindClass|cssVar>": { "id": "<figmaVariableId|null>", "rgb": { "r":_, "g":_, "b":_, "a":_ } } } */ }
}
```

**Step 0 — skeleton.** `git log -1 --format="%H|%aI|%s" -- {sourceFile}` (null if untracked).
Write the skeleton with all analysis fields `null`.

**1a — structure & sizing intent.** Layout direction (`flex-col`→VERTICAL; `flex`/`flex-row`→
HORIZONTAL). Classify each axis of the *outermost* container:
- `fill` — `w-full`, `flex-1`, `flex: 1`, `min-w-full`, or in a flex parent without sized siblings
- `fixed:NNN` — explicit `w-[200px]`, `w-64`, `h-10`
- `hug` — content-driven

Promotions: (a) **parent-context (1g ran):** read `layoutContext` from `computed-styles.json`;
if `parent.clientWidth − padL − padR ≥ element.offsetWidth × 1.25` AND gap ≥ 200px, promote
`hug` → `fill:<parentContentWidth>` (never over an explicit `fixed:NNN`). (b) **role hint:** path
under `pages/`/`routes/` or name ends `Page`/`Screen`/`Layout` → page-level, default to filling
the screen body (~1380×768 from `screensFrameId`). (c) **page-consumed fallback (1g skipped):**
file imported under `pages/`/`routes/` → treat page-level.

**1b — variant axes & representative combos.**
- *1b-i variant library:* find `cva()`/`tv()`/`defineRecipe()`/`styleVariants()`. Per `variants`
  key → axis `{ property: PascalCase(key), values, defaultValue, source: "variant-library", classMap: <verbatim Tailwind per value> }`. Also keep the cva base classes (first arg) and `compoundVariants`.
- *1b-ii CSS pseudo-states:* if 1g `states.json` has `captured: true` states, add a `State` axis
  `{ values: ["Default", ...captured], source: "css-pseudo-state", stateStyles: <resolved diffs> }`.
- *1b-iii responsive:* paired visibility classes (`lg:hidden` vs `hidden lg:flex`) with structurally
  different blocks → `Layout` axis `{ values:["Desktop","Mobile",...], source:"responsive-breakpoint", breakpoint, visibilityMap:{<v>:{include:[],exclude:[]}} }`. Default = largest breakpoint.
- *1b-iv prop states:* `useState` controlling overlays/modals/menus → `State` axis with
  `stateConfig:{<v>:{description, overlays:[{component,trigger,content/props,position}]}}`. Do NOT
  put hover/focus/disabled here (those are 1b-ii).

Representative set (vary one axis at a time from default):
`combos = [defaultCombo]; for each axis: for each value≠default: combos.push({...defaultCombo,[prop]:value})`.
If > 30, drop values from lower-priority axes (responsive > visual-identity > prop states >
interactive states > sizes > roundness). Single-variant: `variantAxes:[]`, `variantCombos:[{}]`.

**1c — icons.** `lucide-react` imports → `Icon/{Name}`, size by class (`h-3`=12, `h-3.5`=14,
`h-4`=16, `h-5`=20, `h-6`=24). Record `iconUsage`.

**1d — instance reuse → `childComponents`.** One entry per *direct* design-system child
(PascalCase imports from `./components/`, `@/components/`, `lucide-react` that resolve to a
`builtComponents` key; `Star`→`Icon/Star`): `{ figmaName, nodeId: builtComponents[figmaName], usageCount, usages }`. Portal children (`ConfirmationDialog`, `AlertDialog`, toasts) included with
`usages` prefixed `"portal:"`. Exclude self + transitive grandchildren. **This list is the
compare-stage 4a contract** — do not omit any.

**1e — prerequisite gate.** Verify every required child is in `builtComponents`; if any missing,
write the `rejected`/`missing_children` result and return. Then run:

```bash
node ${CLAUDE_SKILL_DIR}/7-build-component/check-prereqs.js {componentName} {sourceFile}
```

Exit 0 writes `.temp/figma-from-code/prereqs/{componentName}.ok`. Exit 1 = rejection — write it
and return. (A `PreToolUse` hook blocks the build stage's `use_figma` without a fresh `.ok`.)

**1f — text content.** Read `text.json` from the screenshot dir → `textContent` (exact strings,
never placeholders). If 1g will be skipped, write the complete `code.json` now with
`liveInspection: "skipped_..."`, omitting `computedStyles`/`states`.

**1g — live inspection (authoritative; do not silently skip).**

```bash
node ${CLAUDE_SKILL_DIR}/10-validator/inspect-styles.js \
  "{devServerUrl}/{route}" --selector "{selector}" \
  --output ".temp/figma-from-code/screenshots/{componentName}/"
```

Produces `computed-styles.json` (resolved colors/spacing/typography/borders + `layoutContext`),
`state-*.png` (only when visually different), `states.json`. Use resolved RGB directly; each
captured state becomes a `State` variant. If no route/selector known, derive: grep routes
rendering `{componentName}`, use `[data-component='{componentName}']` or a text match. Only skip
1g if no dev server is reachable AND confirmed unavailable — record `liveInspection: "skipped_no_dev_server"`.

**1h — pre-resolve variables (shrinks the build stage's context).** Collect every color/radius
token this component actually uses (fills, strokes, text colors, corner radii gathered across
1a–1g). Resolve each ONCE here against `.temp/figma-from-code/variables.json` (→ Figma variable
`id`) and `.temp/figma-from-code/resolved-colors.json` (`tailwindMap`/`cssVariables` → `rgb`). Inline
ONLY those used entries into `code.json.figmaVariables` as
`{ "<tailwindClass|cssVar>": { "id": <figmaVariableId|null>, "rgb": {r,g,b,a} } }`. Do NOT dump the
whole variable files — the build stage reads only this subset (and falls back to the full files
solely for a token missing here), so keeping it minimal is what keeps the build agent's context
small.

**Final write:** merge all in-memory values, set `liveInspection`, fill `computedStyles`/`states`,
add `figmaVariables`, apply any 1a width promotion, overwrite `code.json` in one write.

## Return (StructuredOutput)

```json
{
  "componentName": "{componentName}",
  "status": "proceed" | "needs_authorization" | "rejected" | "failed",
  "sourceFile": "...",
  "sourceDir": "...",
  "route": "/example",
  "selector": "[data-component='...']",
  "hasVariants": true,
  "liveInspection": "complete" | "skipped_no_dev_server" | "skipped_explicitly",
  "missingChildren": []
}
```

Return `status: "proceed"` only when `code.json` is complete and the prereq gate passed.
`route`/`selector` are what you used for 1g (pass them downstream for re-inspection).
