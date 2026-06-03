# Stage 2 of 4 — Build the component in Figma

You are the **build** stage of a 4-stage per-component pipeline (analyze → build → compare →
fix). The analyze stage already wrote `{sourceDir}/.figma/code.json`. Your job: build the Figma
component fresh from `code.json` into `{parentFrameId}`, screenshot it, and write
`{sourceDir}/.figma/figma.json`. Do NOT compare or fix.

> Before any `use_figma` call, invoke the `figma:figma-use` skill (mandatory prerequisite).

## Inputs

- Component name: `{componentName}`
- Figma file key: `{fileKey}`
- Parent frame node ID (tier frame — build INTO this): `{parentFrameId}`
- Source dir (holds `.figma/code.json`): `{sourceDir}`
- Built components registry: `.temp/figma-from-code/builtComponents.json`
- Screenshot dir: `.temp/figma-from-code/screenshots/{componentName}/`
- Colors: **primary source is `code.json.figmaVariables`** (pre-resolved by the analyze stage — only
  the tokens THIS component uses, each as `{ id, rgb }`). The large files
  `.temp/figma-from-code/variables.json` and `.temp/figma-from-code/resolved-colors.json` are a
  **fallback only** — open them solely if a required token is absent from `figmaVariables` (this keeps
  your context small; do not read them routinely).

## Idempotency check FIRST — then build fresh into `{parentFrameId}`

**Before building, check whether this component already exists INSIDE `{parentFrameId}`.** A crash
mid-tier or a resumed run may have already created it. Query the parent frame's direct children by
name: if a `COMPONENT` or `COMPONENT_SET` named exactly `{componentName}` is already a child of
`{parentFrameId}`, do NOT rebuild it — this would create a duplicate node. Refresh
`{sourceDir}/.figma/figma.json` if needed and return `status: "built"` with that existing node's
`id` as `nodeId`. This is what makes Phase 3 safe to re-run after a crash without duplicating nodes.

Otherwise create this component fresh and append it to `{parentFrameId}`. You will likely find an
existing master with the same name on **another page** (via `.figma/figma.json`, a by-name search,
or a prior run) — **ignore it.** This run must produce a fresh node inside `{parentFrameId}`. If
`figma.getNodeById('{parentFrameId}')` returns null, the tier frame may not have synced yet —
re-query once or twice; if still null, return `status: "failed"`, `reason: "parent_frame_missing"`.
Do NOT fall back to an off-page master or a stale tier frame.

## Step 2 — build via `use_figma`

**2-pre. Resolve children first.** Read `code.json.childComponents` — the instance manifest.
Every name MUST become an `INSTANCE`. For each: `figma.getNodeById(nodeId)` then
`.createInstance()` × `usageCount`. Override **only text** (`characters`); never override
`fontSize`/`fontName`/`lineHeight`/`fills` at build time (the fix stage handles style mismatches
with diff evidence). Never replace an instance with a text node.

Script order: (1) resolve masters → (2) create instances → (3) override characters → (4) create
component shell → (5) append instances + plain text nodes (only for text NOT owned by a child) →
(6) `fixSizing()` + append to `{parentFrameId}`.

**2a — single component** (`code.json.variantAxes` empty):

```javascript
// use_figma
const parentFrame = figma.getNodeById('{parentFrameId}');
const comp = figma.createComponent();
comp.name = '{componentName}';
comp.layoutMode = 'VERTICAL'; // or HORIZONTAL from layout.direction
comp.primaryAxisSizingMode = 'AUTO';
comp.counterAxisSizingMode = 'AUTO';
comp.itemSpacing = GAP; comp.paddingTop = PT; comp.paddingBottom = PB;
comp.paddingLeft = PL; comp.paddingRight = PR;
comp.cornerRadius = RADIUS; comp.fills = [FILL];
comp.strokes = [STROKE]; comp.strokeWeight = 1; comp.strokeAlign = 'OUTSIDE'; // if bordered
// append instances + layout frames + plain text…
fixSizing(comp);
parentFrame.appendChild(comp);
return JSON.stringify({ name: comp.name, id: comp.id });
```

**2b — with variants** (`variantAxes` non-empty): inline `variantAxes` + `variantCombos` from
`code.json` (the sandbox has no `fs`); iterate combos (don't hardcode). Per combo: base layout
from cva base classes / `computedStyles`, then per-axis overrides — `variant-library` parses
`classMap[val]` via §2d table + §2e colors; `css-pseudo-state` applies `stateStyles[val]` directly;
`responsive-breakpoint` builds only `visibilityMap[val].include` (mobile typically fill @ 375px);
`prop-state` builds base + `stateConfig[val].overlays`. Name each `"Prop=val, Prop2=val2"`. Then:

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

**2c — child patterns.** Text: `await figma.loadFontAsync({family:'Inter',style})`, `createText()`;
text nodes don't support padding — wrap in an auto-layout frame (`fills:[]`). Icon:
`getNodeById(builtComponents['Icon/Check']).createInstance()` + `resize(16,16)`. Override text in
an instance: pick variant via `setProperties`, `findOne(n=>n.type==='TEXT'&&...)` (or `findAll` by
position/name), `await loadFontAsync(text.fontName)`, set `characters`. Divider: `createRectangle()`,
`resize(W,1)`, `fills`, `layoutSizingHorizontal='FILL'`.

**2d — Tailwind → Figma:**

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

**2e — colors.** Primary source: **`code.json.figmaVariables`** — the analyze stage pre-resolved
every color/radius token this component uses into `{ "<class|var>": { "id": <figmaVariableId|null>,
"rgb": {...} } }`. Use its `id` to bind the Figma variable and its `rgb` as the literal fallback;
you should NOT need to open `variables.json`/`resolved-colors.json`. COLOR: set fill then
`node.setBoundVariable('fills',0, await figma.variables.getVariableByIdAsync(id))` (same for
`strokes`, text-node `fills`). FLOAT (radius): bind four corners. **Only if** a required token is
absent from `figmaVariables`, fall back by reading the full files: `variables.json` for the id, then
`resolved-colors.json.tailwindMap[class]`→`cssVariables[var].rgb`; bare `var(--x)`→strip→
`cssVariables['--x'].rgb`; last resort `computed-styles.json`.

**2f — enumerate instances → `{sourceDir}/.figma/figma.json`** (the built-derived 4a contract):

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

Write `{ fileKey, nodeId, url, componentName, createdAt (preserve if present else now), updatedAt: now, dependencies:[{componentName,nodeId,url,dependencies}] }`. `dependencies` recomputed live; read each child's own `.figma/figma.json` for its sub-deps (`[]` if missing).

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

Set sizing modes to `AUTO` BEFORE `resize()` (else resize locks height). If `use_figma` hits the
incremental limit, split across multiple calls. If the node is null after Step 2, return `status: "failed"`.

## Step 3 — screenshot

If `{screenshotDir}/figma.png` already exists, reuse it. Otherwise resolve the node to capture
(for a set, the variant matching the app screenshot; else the component), then
`get_screenshot(fileKey, screenshotNodeId)` at `scale: 1`, and
`curl -sL "{image_url}" -o "{screenshotDir}/figma.png"`.

## Return (StructuredOutput)

```json
{
  "componentName": "{componentName}",
  "status": "built" | "failed",
  "reason": "parent_frame_missing",
  "nodeId": "188:81",
  "screenshotNodeId": "188:81",
  "type": "COMPONENT" | "COMPONENT_SET",
  "variants": [ { "name": "Layout=Desktop", "nodeId": "..." } ]
}
```

`nodeId` MUST be the fresh node inside `{parentFrameId}`. `reason` only when failed.
