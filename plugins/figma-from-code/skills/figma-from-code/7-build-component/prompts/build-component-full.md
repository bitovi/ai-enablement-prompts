# Build One Figma Component — Full Pipeline (Steps 1–7)

> **Note:** This is the single-agent reference (all 7 steps in one agent). The active workflow
> path is the **4-stage split** under `prompts/stages/{analyze,build,compare,fix}.md`, where each
> stage runs as its own focused agent. Keep this file in sync with those when the build logic
> changes; it remains the authoritative end-to-end description and the basis for any single-agent
> or 2-stage variant.

You are building a single Figma component from its React source, then comparing it
against the app screenshot and iterating until it matches. Execute all seven steps
below in order. This document is self-contained — do not read other SKILL.md files.

## Inputs (interpolated by the orchestrator)

- Component name: `{componentName}`
- Source file: `{sourceFile}` (may be empty for synthesized Icon/Asset components)
- Source dir (modlet root whose `.figma/` holds the tracking files): `{sourceDir}`
- Figma file key: `{fileKey}`
- Parent frame node ID (the tier frame to append into): `{parentFrameId}`
- Dev server URL: `{devServerUrl}`
- Screenshot dir: `.temp/figma-from-code/screenshots/{componentName}/`
- Built components registry: `.temp/figma-from-code/builtComponents.json`
- Pre-existing components: `state.json → preExistingComponents`

## Tool & script paths

- Live inspection: `node ${CLAUDE_SKILL_DIR}/10-validator/inspect-styles.js`
- Prereq gate: `node ${CLAUDE_SKILL_DIR}/7-build-component/check-prereqs.js <componentName> <sourceFile>`
- Instance gate: `node ${CLAUDE_SKILL_DIR}/7-build-component/check-instances.js <componentName> <sourceDir>`
- Pixel compare: `node ${CLAUDE_SKILL_DIR}/10-validator/compare.js <app.png> <figma.png> <outDir>/`

## Early-exit gates (check BEFORE any work)

1. **Pre-existing master** — if `{componentName}` is a key in `preExistingComponents`,
   it predates this run. Write `{ "componentName": "{componentName}", "status": "needs_authorization", "preExistingTouched": ["{componentName}"] }`
   to `.temp/figma-from-code/build-results/{componentName}.json` and **return immediately**.
   Do not analyze, do not write `code.json`, do not call `use_figma`.
2. **Missing children** — if any child component (sub-component or `Icon/{Name}`) the
   source uses is absent from `builtComponents`, write `{ "componentName": "...", "status": "rejected", "reason": "missing_children", "missingChildren": [...] }`
   to the build-results file and **return immediately**.

Instancing a child that is itself in `preExistingComponents` is fine (reuse, not
modification). The fix loop must never edit a node in `preExistingComponents`.

---

# Step 1 — Analyze the source → write `code.json`

Produce `{sourceDir}/.figma/code.json`. Create `.figma/` (and parents) first.
Write a skeleton immediately (crash-recovery signal), accumulate sub-step results in
memory, then write the complete file once at the end of 1g (or 1f if 1g is skipped).

`code.json` schema (fields filled across sub-steps):

```json
{
  "componentName": "...",
  "sourceFile": "...",
  "analyzedAt": "<ISO 8601 UTC>",
  "lastCommit": { "hash": "...", "date": "...", "message": "..." },
  "liveInspection": "complete" | "skipped_no_dev_server" | "skipped_explicitly",
  "layout": { "direction": "VERTICAL"|"HORIZONTAL", "widthIntent": "...", "heightIntent": "..." },
  "variantAxes": [ /* see 1b */ ],
  "variantCombos": [ /* see 1b-iii */ ],
  "variantStrategy": "representative",
  "totalPossibleCombinations": 0,
  "iconUsage": [ { "name": "Star", "figmaComponent": "Icon/Star", "size": 20 } ],
  "childComponents": [ { "figmaName": "...", "nodeId": "...", "usageCount": 1, "usages": ["..."] } ],
  "textContent": { /* from text.json */ },
  "computedStyles": { /* from Step 1g */ },
  "states": { /* from Step 1g */ }
}
```

**Step 0 — skeleton.** Get the git commit: `git log -1 --format="%H|%aI|%s" -- {sourceFile}`
(all null if untracked). Write the skeleton with all analysis fields `null`.

**1a — structure & sizing intent.** Read the source. Determine layout direction
(`flex-col` → VERTICAL; `flex`/`flex-row` → HORIZONTAL). Classify each axis of the
*outermost* container as:
- `fill` — `w-full`, `flex-1`, `flex: 1`, `min-w-full`, or in a flex parent without sized siblings
- `fixed:NNN` — explicit `w-[200px]`, `w-64`, `h-10`
- `hug` — content-driven (none of the above)

Record `layout: { direction, widthIntent, heightIntent }`. Step 4b verifies this.

Sizing promotions:
- **Parent-context (1g ran):** read `layoutContext` from `computed-styles.json`. If
  `parent.clientWidth - paddingL - paddingR ≥ element.offsetWidth × 1.25` AND that gap
  ≥ 200px, promote `widthIntent` from `hug` to `fill:<parentContentWidth>`. Never promote
  over an explicit `fixed:NNN`.
- **Role hint:** path under `pages/`/`routes/`, or name ends in `Page`/`Screen`/`Layout`
  → page-level; default to filling the screen body (read body size from `screensFrameId`,
  ~1380×768).
- **Page-consumed fallback (1g skipped):** if the file is imported by anything under
  `pages/`/`routes/`, treat as page-level for sizing.

**1b — variant axes & representative combos.** Extract axes from these sources:

- *1b-i variant library:* find `cva()`/`tv()`/`defineRecipe()`/`styleVariants()`. For each
  key in `variants`, create an axis `{ property: PascalCase(key), values, defaultValue (from defaultVariants or first), source: "variant-library", classMap: <verbatim Tailwind strings per value> }`.
  Also capture the cva base classes (first arg) for the shared layout foundation, and
  `compoundVariants` if present.
- *1b-ii CSS pseudo-states:* if Step 1g's `states.json` has any `captured: true` state, add
  `{ property: "State", values: ["Default", ...captured], defaultValue: "Default", source: "css-pseudo-state", stateStyles: <resolved RGB/box-shadow/opacity diffs> }`.
- *1b-iii responsive breakpoints:* scan JSX for paired visibility classes
  (`lg:hidden` vs `hidden lg:flex`, etc.). When blocks differ structurally, add a `Layout`
  axis `{ values: ["Desktop","Mobile",...], defaultValue: "Desktop", source: "responsive-breakpoint", breakpoint, visibilityMap: { <value>: { include:[...], exclude:[...] } } }`.
  Keep the largest breakpoint as default.
- *1b-iv prop-driven states:* scan for `useState` controlling overlays/modals/menus and
  conditional overlay rendering. Add/merge a `State` axis with
  `stateConfig: { <value>: { description, overlays: [{ component, trigger, content/props, position }] } }`.
  Do NOT extract hover/focus/disabled here (those are 1b-ii) or non-visual state.

Compute the **representative combo set** (vary one axis at a time from the default):

```
defaultCombo = { axis.property: axis.defaultValue for each axis }
combos = [defaultCombo]
for each axis: for each value != defaultValue: combos.push({ ...defaultCombo, [axis.property]: value })
```

Yields `1 + Σ(values−1)` combos. If > 30, drop values from lower-priority axes
(priority: responsive layout > visual-identity > prop states > interactive states > sizes > roundness).
Single-variant components: `variantAxes: []`, `variantCombos: [{}]`.

**1c — icons.** From `lucide-react` imports, map each to `Icon/{Name}` and size by class:
`h-3 w-3`=12, `h-3.5 w-3.5`=14, `h-4 w-4`=16, `h-5 w-5`=20, `h-6 w-6`=24. Record `iconUsage`.

**1d — instance reuse → `childComponents`.** One entry per *direct* design-system child
the source uses (PascalCase imports from `./components/`, `@/components/`, or `lucide-react`
that resolve to a `builtComponents` key; `Star`→`Icon/Star`). Each:
`{ figmaName, nodeId: builtComponents[figmaName], usageCount, usages }`. Portal children
(`ConfirmationDialog`, `AlertDialog`, toasts) MUST be included with `usages` prefixed `"portal:"`.
Exclude the component itself and transitive grandchildren. **This list is the Step 4a contract** —
substituting a text node or local frame for any entry is a hard rejection.

**1e — prerequisite gate.** Verify every required child exists in `builtComponents`. If any
is missing, write the `rejected` / `missing_children` result and STOP. Then run:

```bash
node ${CLAUDE_SKILL_DIR}/7-build-component/check-prereqs.js {componentName} {sourceFile}
```

It writes `.temp/figma-from-code/prereqs/{componentName}.ok` (exit 0) or prints rejection JSON
(exit 1). A `PreToolUse` hook blocks `use_figma` master creation without a fresh `.ok` marker.
Do not evade the hook. Only proceed past Step 1 if it exits 0.

**1f — text content.** Read `text.json` from the screenshot dir; hold as `textContent`. Use exact
strings — never placeholders. If 1g will be skipped, write the complete `code.json` now with
`liveInspection: "skipped_..."`, omitting `computedStyles`/`states`.

**1g — live inspection (authoritative; do not silently skip).**

```bash
node ${CLAUDE_SKILL_DIR}/10-validator/inspect-styles.js \
  "{devServerUrl}/{route}" --selector "{selector}" \
  --output ".temp/figma-from-code/screenshots/{componentName}/"
```

Produces `computed-styles.json` (resolved colors/spacing/typography/borders + `layoutContext`),
`state-*.png` (only when visually different), and `states.json`. Use resolved RGB values
directly. Each captured state screenshot becomes a `State` variant. Skipped states get no variant.

If `{devServerUrl}` is provided, use it. If no route/selector is known, derive: grep for routes
rendering `{componentName}`, use `[data-component='{componentName}']` or a text match. Only skip
1g if no dev server is reachable AND it's been confirmed unavailable — record
`liveInspection: "skipped_no_dev_server"` in the result so the validator can re-check.

**Final write:** merge all in-memory values, set `liveInspection`, fill `computedStyles`/`states`,
apply any 1a width promotion from `layoutContext`, and overwrite `code.json` in one write.

---

# Step 2 — Build in Figma via `use_figma`

> Before any `use_figma` call, invoke the `figma:figma-use` skill (mandatory prerequisite).

**2-pre. Resolve children first.** Read `code.json.childComponents` — this is the instance
manifest. Every name MUST appear as an `INSTANCE` in the final build. For each entry,
`figma.getNodeById(nodeId)` then `.createInstance()` exactly `usageCount` times. Override
**only text** (`characters`) inside instances; never override `fontSize`/`fontName`/`lineHeight`/`fills`
during build (the fix loop handles style mismatches with diff evidence). Never replace an
instance with a text node because it "looks the same."

Build order inside the script: (1) resolve masters → (2) create instances → (3) override
characters → (4) create component shell (layout/padding/fills) → (5) append instances + plain
text nodes (only for text NOT owned by a child) → (6) `fixSizing()` + append to parent.

**Background frame — build fresh into `{parentFrameId}`, never reuse a master elsewhere.**
The orchestrator provides `{parentFrameId}` (a white tier frame); create this component fresh
and append it there. You will likely find an existing master with the same name on another page
(via the source modlet's `.figma/figma.json`, a by-name search, or a prior run) — **ignore it.**
Reusing or returning an off-page master defeats the build: this run must produce a fresh node
inside `{parentFrameId}`. The only legitimate skip is when `{componentName}` is already a key in
`builtComponents.json` (the orchestrator already filtered those out before dispatching you).

If `figma.getNodeById('{parentFrameId}')` returns null, the tier frame may not have synced to
your session yet — re-query once or twice before proceeding. Do **not** fall back to an existing
off-page master or a stale tier frame; if it is still null after retries, return
`status: "failed"` with `reason: "parent_frame_missing"` so the orchestrator can re-dispatch.

**2a — single component (variantAxes empty):**

```javascript
// use_figma
const parentFrame = figma.getNodeById('{parentFrameId}');
// resolve masters from code.json.childComponents, create instances, override characters…
const comp = figma.createComponent();
comp.name = '{componentName}';
comp.layoutMode = 'VERTICAL'; // or HORIZONTAL from layout.direction
comp.primaryAxisSizingMode = 'AUTO';
comp.counterAxisSizingMode = 'AUTO';
comp.itemSpacing = GAP; comp.paddingTop = PT; comp.paddingBottom = PB;
comp.paddingLeft = PL; comp.paddingRight = PR;
comp.cornerRadius = RADIUS;
comp.fills = [FILL];
comp.strokes = [STROKE]; comp.strokeWeight = 1; comp.strokeAlign = 'OUTSIDE'; // if bordered
// append instances + layout frames + plain text nodes…
fixSizing(comp);
parentFrame.appendChild(comp);
return JSON.stringify({ name: comp.name, id: comp.id });
```

**2b — component with variants (variantAxes non-empty).** Inline `variantAxes` and
`variantCombos` from `code.json` into the script (the plugin sandbox has no `fs`). Iterate
`variantCombos`; do not hardcode variant values. For each combo: create a component, apply
base layout (from cva base classes / `computedStyles`), then per-axis overrides:
- `variant-library` → parse `classMap[val]` via the §2d table + §2e color chain
- `css-pseudo-state` → apply `stateStyles[val]` directly (already resolved)
- `responsive-breakpoint` → build only the blocks in `visibilityMap[val].include`; mobile
  variants typically `widthIntent: fill` at 375px
- `prop-state` → build base + the overlays in `stateConfig[val].overlays` (menu dropdown,
  modal+backdrop), using exact text from the source props

Name each `"Prop=val, Prop2=val2"`. Then:

```javascript
const set = figma.combineAsVariants(variants, parentFrame);
set.name = '{componentName}';
set.layoutMode = 'HORIZONTAL'; set.layoutWrap = 'WRAP';
set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 16;
set.itemSpacing = 16; set.counterAxisSpacing = 16;
for (const v of set.children) fixSizing(v);
fixSizing(set);
return JSON.stringify({ name: set.name, id: set.id, variants: set.children.map(c => ({ name: c.name, id: c.id })) });
```

**2c — child element patterns.**
- Text: `await figma.loadFontAsync({family:'Inter', style})` then `createText()`; set
  `characters`/`fontSize`/`fontName`/`fills`/`lineHeight`. Text nodes do NOT support padding —
  wrap in an auto-layout frame with `fills:[]`.
- Icon instance: `getNodeById(builtComponents['Icon/Check']).createInstance()`, then `resize(16,16)`.
- Override text inside an instance: pick variant via `inst.setProperties({...})` if it's a set,
  `inst.findOne(n => n.type==='TEXT' && ...)` (or `findAll` by position/name), `await loadFontAsync(text.fontName)`, set `characters`. Multi-field: match label/value by `findAll` order or `name`.
- Rectangle (divider): `createRectangle()`, `resize(W,1)`, set `fills`, `layoutSizingHorizontal='FILL'`.

**2d — Tailwind → Figma map.**

| Tailwind | Figma | Value |
| --- | --- | --- |
| `flex-col` / `flex`,`flex-row` | `layoutMode` | `VERTICAL` / `HORIZONTAL` |
| `items-center` | `counterAxisAlignItems` | `CENTER` |
| `justify-between` / `justify-center` | `primaryAxisAlignItems` | `SPACE_BETWEEN` / `CENTER` |
| `gap-{n}` / `p-{n}` / `px-{n}` / `py-{n}` | `itemSpacing` / paddings | `n*4` |
| `rounded-md`/`-lg`/`-xl`/`-full` | `cornerRadius` | `6`/`8`/`12`/`9999` |
| `border` | `strokeWeight`=1, `strokeAlign` | `'OUTSIDE'` |
| `text-sm`/`-base`/`-lg`/`-xl`/`-2xl` | `fontSize` (lineHeight) | `14(20)`/`16(24)`/`18(28)`/`20(28)`/`24(32)` |
| `font-medium`/`-semibold`/`-bold` | fontName style | `Medium`/`Semi Bold`/`Bold` |
| `w-full`/`flex-1` / `h-full` | `layoutSizingHorizontal`/`Vertical` | `FILL` |
| `w-[Npx]` | `resize(N,..)` then `layoutSizingHorizontal` | `FIXED` |
| `truncate` | `textTruncation`,`maxLines` | `ENDING`,1 |
| `overflow-hidden` | `clipsContent` | `true` |
| `shadow-sm` | `effects` | `[{type:'DROP_SHADOW',...}]` |
| `opacity-{n}` | `opacity` | `n/100` |

**2e — colors.** Primary path = Figma variables; fallback = resolved RGB. Read
`.temp/figma-from-code/variables.json` (Node context) and inline the *relevant* entries into
the `use_figma` script. For COLOR vars: set a fill then
`node.setBoundVariable('fills', 0, await figma.variables.getVariableByIdAsync(id))` (same for
`strokes`, and text-node `fills`). For FLOAT (radius): bind all four corner radii; spacing via
`itemSpacing`. Fallback chain when a var is absent: `resolved-colors.json.tailwindMap[class]`
→ `cssVariables[var].rgb`; bare `var(--x)` → strip wrapper → `cssVariables['--x'].rgb`; last
resort `computed-styles.json`.

**2f — enumerate instances → write `.figma/figma.json`.** This is the built-derived half of
the Step 4a gate. After `fixSizing`+`appendChild` settle:

```javascript
const root = figma.getNodeById('<nodeId>');
const seen = new Map();
for (const inst of root.findAll(n => n.type === 'INSTANCE')) {
  const main = inst.mainComponent; if (!main) continue;
  const isVariant = main.parent && main.parent.type === 'COMPONENT_SET';
  const name = isVariant ? main.parent.name : main.name;
  const id = isVariant ? main.parent.id : main.id;
  if (!seen.has(name)) seen.set(name, id);
}
return JSON.stringify([...seen.entries()].map(([componentName, nodeId]) => ({ componentName, nodeId })));
```

Write `{sourceDir}/.figma/figma.json`: `{ fileKey, nodeId, url: https://figma.com/design/{fileKey}?node-id=<nodeId with - >, componentName, createdAt (preserve if file exists, else now), updatedAt: now, dependencies: [ { componentName, nodeId, url, dependencies } ] }`.
`dependencies` is always recomputed live; read each child's own `.figma/figma.json` for its
sub-dependencies (`[]` if missing).

**fixSizing() — mandatory after every build/variant:**

```javascript
function fixSizing(node, depth = 0) {
  if (depth > 10 || !node) return;
  const hasLayout = (node.type === 'COMPONENT' || node.type === 'FRAME' || node.type === 'COMPONENT_SET')
    && node.layoutMode && node.layoutMode !== 'NONE';
  if (hasLayout) {
    if (node.layoutMode === 'VERTICAL') node.primaryAxisSizingMode = 'AUTO';
    node.counterAxisSizingMode = 'AUTO';
  }
  for (const child of ('children' in node ? node.children : [])) fixSizing(child, depth + 1);
}
```

During construction, set sizing modes to `AUTO` BEFORE `resize()` — otherwise `resize()` locks
the height. If `use_figma` hits the incremental limit, split the build across multiple calls. If
`componentNodeId` is null after Step 2, return `status: "failed"`.

---

# Step 3 — Screenshot the Figma result

Skip guard: if `{screenshotDir}/figma.png` already exists, reuse it and go to Step 4 (the fix
loop always re-screenshots regardless). Otherwise resolve the node to capture (for a set, pick
the variant matching the app screenshot; else the component directly), then:

```
get_screenshot(fileKey, screenshotNodeId)   // request scale: 1
curl -sL "{image_url}" -o "{screenshotDir}/figma.png"
```

---

# Step 4 — Compare against the app screenshot (no fixes here)

**4a — instance gate (run FIRST, hard gate).**

```bash
node ${CLAUDE_SKILL_DIR}/7-build-component/check-instances.js {componentName} {sourceDir}
```

Exit 0 → writes `.temp/figma-from-code/instances/{componentName}.ok`. Exit 1 → at least one
required child is missing as a dependency; **stop the compare flow and jump straight to Step 5**
with `missing_instances` (do NOT run 4b/4c). Crash (non-zero, no JSON) → record
`instanceCheck: { verdict: "error" }` and treat as 4a failure → Step 5. There is no
visual-equivalence shortcut: a text-node lookalike for a required instance is always wrong.

**4b — sizing check (before pixel diff).** Inspect the built node:

```javascript
const node = figma.getNodeById('{nodeId}');
const built = { w: Math.round(node.width), h: Math.round(node.height),
  primaryAxisSizingMode: node.primaryAxisSizingMode, counterAxisSizingMode: node.counterAxisSizingMode, layoutMode: node.layoutMode };
```

Compare to Step 1a sizing intent:

| Intent | Expected | Flag if |
| --- | --- | --- |
| `fill` | master FIXED at consumer size, or root child FILL | `*SizingMode==='AUTO'` AND dimension < 50% of expected |
| `fill:NNN` | width = NNN ± 5% | width < NNN×0.85, or horizontal `AUTO` when parent ≥200px wider |
| `fixed:NNN` | dimension = NNN ± 2px | diff > 2px |
| `hug` | `*SizingMode==='AUTO'` | forced FIXED without reason |

Page-level: width ≥ 1200 AND height ≥ 600 (or screen body dims). Record
`comparison.sizingCheck { verdict, issues, builtSize, expectedSize, expectedSource }`. A
failed 4b is a `size_mismatch` → feed into Step 5; never declare match on pixel score alone.

**4c — pixel diff.**

```bash
node ${CLAUDE_SKILL_DIR}/10-validator/compare.js \
  "{screenshotDir}/app.png" "{screenshotDir}/figma.png" "{screenshotDir}/"
```

Produces `diff.png` and `comparison.json` `{ matchPct, borderMatchPct, verdict, borderVerdict }`.
Verdict (combined with 4a+4b):
- 4a+4b pass AND `matchPct ≥ 90` AND `borderMatchPct ≥ 85` → **match** (done)
- 4a fail → **missing_instances** ; 4b fail → **size_mismatch** (regardless of pixel score)
- 4a+4b pass AND `matchPct 75–90` or `borderMatchPct < 85` → **minor_diff**
- 4a+4b pass AND `matchPct < 75` → **mismatch**

If no `app.png`, skip pixel compare but still run 4a+4b; report `no_app_reference` only if both pass.

---

# Step 5 — Fix loop (up to 3 iterations)

Diagnose from `diff.png` + `comparison.json` — NOT from build assumptions. Read source `.tsx`
ONLY to resolve specific differences the comparison found. **Never apply blanket fixes to all
instances** — verify each instance against the diff before modifying it.

Per iteration:
1. **Diagnose (5a):** address 4a (`missing_instances`) FIRST, then 4b (`size_mismatch`), then
   read `diff.png` (red = differs), `app.png` (target), `figma.png` (actual), source `.tsx`.

   | Symptom | Fix |
   | --- | --- |
   | `missing_instances` | For each name: delete the local stand-in subtree, replace with `getNodeById(builtComponents[name]).createInstance()` (pick variant via `setProperties`); override text via `findOne`+`loadFontAsync`. Re-run 2f enum + check-instances. |
   | sizing: master too small for `fill` | Set modes FIRST then resize: `primaryAxisSizingMode='FIXED'; counterAxisSizingMode='FIXED'; resizeWithoutConstraints(W,H)`; fill children `layoutSizingHorizontal/Vertical='FILL'`. |
   | sizing: fixed off >2px | `resizeWithoutConstraints(W,H)` |
   | red border ring | adjust `strokes`/`strokeWeight`/`strokeAlign` |
   | red fill / red text | adjust `fills` / font props + text fills |
   | shifted content | adjust `itemSpacing`/padding |
   | missing / extra element | add / remove child |
   | all thin strips | run `fixSizing()` |

2. **Apply fix (5b):** targeted `use_figma` changing only the diagnosed properties; `fixSizing(node)`.
3. **Re-enumerate, re-screenshot, re-compare (5c):** re-run the Step 2f enumeration + rewrite
   `figma.json` (the tree changed). If the prior failure was `missing_instances`, re-run
   check-instances and don't pixel-compare until 4a passes. Then `get_screenshot` →
   overwrite `figma.png` → re-run `compare.js`.
4. **Continue/stop (5d):** `match` → exit (fixed). Improved but not match → next iteration.
   3 iterations reached → exit with `status: "partial_match"`, report remaining issues. Do not
   retry Step 5.

Optional structural audit before first compare: flag `strokeAlign==='INSIDE'` with strokes
(double border) and >1 visible fill (color blending); fix before screenshotting.

---

# Step 6 — Finalize tracking files

Both `.figma/code.json` (Step 1) and `.figma/figma.json` (Steps 2f/5c) already exist. Verify
both are present at `{sourceDir}/.figma/`. Refresh `figma.json.updatedAt` (preserve `createdAt`).
Sanity-check: `code.json.componentName === figma.json.componentName === {componentName}`;
`figma.json.fileKey` matches; `figma.json.nodeId` matches the built node; `dependencies` is an
array. Surface any violation in the result — do not silently repair.

---

# Step 7 — Write result & return

Write `.temp/figma-from-code/build-results/{componentName}.json` and return the same object:

```json
{
  "componentName": "{componentName}",
  "nodeId": "123:45",
  "type": "COMPONENT" | "COMPONENT_SET",
  "variants": [ { "name": "Variant=primary, State=Default", "nodeId": "123:46" } ],
  "comparison": { "matchPct": 94.2, "borderMatchPct": 91.0, "verdict": "match", "iterations": 1, "fixes": ["..."] },
  "screenshotNodeId": "123:46",
  "figmaScreenshot": ".temp/figma-from-code/screenshots/{componentName}/figma.png"
}
```

For early-exit / failure cases, write the corresponding status object
(`needs_authorization`, `rejected`, `failed`, `partial_match`, or
`comparison.verdict: "no_app_reference"`). The orchestrator reads `componentName`, `status`,
`nodeId`, `verdict`, `matchPct`, and `iterations` from the returned object.
