# Step 2: Build the Component in Figma

## 2-pre. Resolve child components BEFORE building (mandatory)

Before writing any `use_figma` code, read `code.json.childComponents` (written incrementally during Step 1) and resolve every entry to a Figma node reference. This is the **instance manifest** — every name in this list MUST appear as an `INSTANCE` in the final build. No exceptions, no plain-text substitutions.

Read `code.json.childComponents` (the array of objects written incrementally during Step 1). Each object has `{ figmaName, nodeId, usageCount, usages }`. This IS the instance manifest — no guesswork:

```json
// From code.json.childComponents:
[
  { "figmaName": "EditableTitle", "nodeId": "1199:2", "usageCount": 3, "usages": ["first name", "last name", "username"] },
  { "figmaName": "EditableText",  "nodeId": "1213:35", "usageCount": 1, "usages": ["email field"] },
  { "figmaName": "Button",        "nodeId": "1196:12", "usageCount": 1, "usages": ["more options trigger"] },
  { "figmaName": "Icon/Star",     "nodeId": "1189:6",  "usageCount": 5, "usages": ["satisfaction stars"] },
  ...
]
```

For each entry: call `figma.getNodeById(nodeId)` to get the master, then call `.createInstance()` exactly `usageCount` times. Use the `usages` descriptions to map each instance to the correct position in the layout and apply the correct text overrides.

**Rules:**

- If a child appears N times in the source JSX, create N instances (e.g., 3 `EditableTitle` instances for first name, last name, username).
- Portal-rendered children (`ConfirmationDialog`, `AlertDialog`, toasts) get one instance each, appended as a detached example (visible or hidden) — they MUST be present for Step 4a.
- If a child is a component set (has variants), pick the appropriate variant via `instance.setProperties({ State: 'Rest' })` after creating the instance.
- Override **only text content** (`characters`) inside instances using `findOne`/`findAll` + `loadFontAsync` + `setCharacters` (see §2c). NEVER replace an instance with a text node because it "looks the same." NEVER override styling properties (`fontSize`, `fontName`, `lineHeight`, `fills`) during the build step — keep the master's defaults and let the comparison step (Step 4) flag any visual mismatches. Style overrides belong in the fix loop (Step 5) where the diff image provides visual evidence of what actually needs changing.

**Structure your `use_figma` code in this order:**

1. Resolve all masters from `instanceManifest` via `figma.getNodeById()`
2. Create all instances via `master.createInstance()`
3. Override text content (characters only) on each instance
4. Create the component shell (layout, padding, fills)
5. Append instances + any plain text nodes (only for text NOT owned by a child component) into the shell
6. Run `fixSizing()` and append to parent

This order ensures instances are the primary building blocks, not an afterthought.

## 2-bg. Ensure a white background frame exists

When the orchestrator dispatches a build, it provides `parentFrameId` — a tier frame with a white background already set up. The component is appended directly into that frame.

For **standalone builds** (no orchestrator, no `parentFrameId`), create a container frame before drawing:

```javascript
// use_figma — only when parentFrameId is not provided
const page = figma.currentPage;
const rightEdge = page.children.reduce((max, n) => Math.max(max, n.x + n.width), 0);

const parentFrame = figma.createFrame();
parentFrame.name = '{componentName} — Build';
parentFrame.x = rightEdge + 100;
parentFrame.y = 0;
parentFrame.resize(800, 600);
parentFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
parentFrame.layoutMode = 'VERTICAL';
parentFrame.primaryAxisSizingMode = 'AUTO';
parentFrame.counterAxisSizingMode = 'AUTO';
parentFrame.paddingLeft = 40;
parentFrame.paddingRight = 40;
parentFrame.paddingTop = 40;
parentFrame.paddingBottom = 40;

return { parentFrameId: parentFrame.id };
```

Use the returned `parentFrameId` in subsequent build calls. This ensures the component is always drawn on a white background — matching how it renders in the app — regardless of whether the orchestrator or a user triggered the build.

## 2a. Single component (no variants)

```javascript
// use_figma
const parentFrame = figma.getNodeById('{parentFrameId}');

// ── 1. Resolve masters from instanceManifest ──
const editableTitleMaster = figma.getNodeById('{builtComponents.EditableTitle}');
const editableTextMaster = figma.getNodeById('{builtComponents.EditableText}');
const iconStarMaster = figma.getNodeById('{builtComponents["Icon/Star"]}');
// ... resolve ALL entries from code.json.childComponents ...

// ── 2. Create instances ──
const firstNameInst = editableTitleMaster.createInstance();
const lastNameInst = editableTitleMaster.createInstance();
const usernameInst = editableTitleMaster.createInstance();
const emailInst = editableTextMaster.createInstance();
const star1 = iconStarMaster.createInstance();
// ... etc for every child usage ...

// ── 3. Override text/properties on instances ──
// (see §2c for override patterns)

// ── 4. Create component shell ──
const comp = figma.createComponent();
comp.name = '{componentName}';
comp.layoutMode = '{VERTICAL or HORIZONTAL}';
comp.primaryAxisSizingMode = 'AUTO';
comp.counterAxisSizingMode = 'AUTO';
comp.itemSpacing = { gapValue };
comp.paddingTop = { pt };
comp.paddingBottom = { pb };
comp.paddingLeft = { pl };
comp.paddingRight = { pr };
comp.cornerRadius = { radius };
comp.fills = [{ fill }];
comp.strokes = [{ stroke }]; // if bordered
comp.strokeWeight = 1;
comp.strokeAlign = 'OUTSIDE'; // always OUTSIDE to match CSS box model

// ── 5. Append instances + layout frames into shell ──
// Build the frame hierarchy, placing instances where the source code uses child components.
// Only use plain text nodes for text NOT owned by a child component (e.g. "@" literal, "Date Joined" label).

// ── 6. Finalize ──
fixSizing(comp);
parentFrame.appendChild(comp);
return JSON.stringify({ name: comp.name, id: comp.id });
```

## 2b. Component with variants

**When to use 2b vs 2a:** If `code.json.variantAxes` has any entries (length > 0), use 2b. If `variantAxes` is empty, use 2a (single component).

Before writing any `use_figma` code, read `code.json.variantAxes` and `code.json.variantCombos`. This is the authoritative build manifest. **Do not hardcode variant values in the use_figma script** — iterate the combos from code.json.

**Build instructions:**

1. Read `code.json.variantAxes` and `code.json.variantCombos`
2. Inline the variant data into the `use_figma` script (the plugin sandbox has no filesystem access)
3. For `variant-library` axes: parse the `classMap` Tailwind classes using the §2d mapping table and §2e color resolution chain to determine per-variant Figma property overrides
4. For `css-pseudo-state` axes: apply the `stateStyles` diffs directly — these are already resolved computed values, no Tailwind parsing needed
5. For `responsive-breakpoint` axes: each variant builds a **different subset of children** — see §2b-responsive below
6. For `prop-state` axes: each variant builds the base component plus any **overlay/modal content** visible in that state — see §2b-states below
7. Base properties (shared by all variants) come from the cva base classes (first argument) or `computedStyles` from Step 1g
8. Per-combo overrides only change what differs from the default combo — don't re-apply all base properties
9. Children (instances, text nodes) are the same across all **style** variants — but may differ across **structural** variants (responsive-breakpoint, prop-state)
10. The §2c instance rules apply: resolve masters from instanceManifest, override only characters, never substitute plain text for instances

```javascript
// use_figma
const parentFrame = figma.getNodeById('{parentFrameId}');

// ── 1. Resolve masters from instanceManifest (same as 2a) ──
const iconMaster = figma.getNodeById('{builtComponents["Icon/Check"]}');
// ... resolve ALL entries from code.json.childComponents ...

// ── 2. Inline variant manifest from code.json ──
// (plugin sandbox has no fs — inline the data)
const variantAxes = {
  Variant: {
    source: 'variant-library',
    defaultValue: 'primary',
    classMap: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
      // ... all values from code.json.variantAxes[0].classMap
    },
  },
  Size: {
    source: 'variant-library',
    defaultValue: 'regular',
    classMap: {
      large: 'h-10 px-6 text-sm gap-2',
      regular: 'h-9 px-4 text-sm gap-2',
      small: 'h-8 px-3 text-sm gap-2',
      mini: 'h-6 px-2 text-xs gap-1.5',
    },
  },
  Roundness: {
    source: 'variant-library',
    defaultValue: 'default',
    classMap: { default: 'rounded-lg', round: 'rounded-full' },
  },
  State: {
    source: 'css-pseudo-state',
    defaultValue: 'Default',
    stateStyles: {
      Hover: { backgroundColor: 'rgb(37, 99, 235)' },
      Focus: { boxShadow: '0 0 0 3px rgb(203, 213, 225)' },
      Disabled: { opacity: '0.5' },
    },
  },
};
const variantCombos = [
  { Variant: 'primary', Size: 'regular', Roundness: 'default', State: 'Default' },
  { Variant: 'secondary', Size: 'regular', Roundness: 'default', State: 'Default' },
  // ... all combos from code.json.variantCombos
];

// ── 3. Base style values (from cva base classes + computedStyles) ──
// Parse the cva() first argument to get shared layout properties.
// Use computedStyles from Step 1g as the authoritative fallback.
const baseLayout = 'HORIZONTAL'; // from inline-flex
const basePadding = { top: 0, bottom: 0, left: 16, right: 16 }; // from px-4
const baseGap = 8; // from gap-2
const baseRadius = 8; // from rounded-lg (default roundness)

// ── 4. Build each variant ──
const variants = [];

for (const combo of variantCombos) {
  const v = figma.createComponent();
  // Variant naming convention: "Variant=primary, Size=regular, State=Default"
  v.name = Object.entries(combo)
    .map(([k, val]) => `${k}=${val}`)
    .join(', ');

  // Start with base layout properties (shared by all variants)
  v.layoutMode = baseLayout;
  v.primaryAxisSizingMode = 'AUTO';
  v.counterAxisSizingMode = 'AUTO';
  v.primaryAxisAlignItems = 'CENTER';
  v.counterAxisAlignItems = 'CENTER';
  v.itemSpacing = baseGap;
  v.paddingTop = basePadding.top;
  v.paddingBottom = basePadding.bottom;
  v.paddingLeft = basePadding.left;
  v.paddingRight = basePadding.right;
  v.cornerRadius = baseRadius;
  // Apply default fills, strokes from base classes or computedStyles

  // Apply per-axis overrides for this combo
  for (const [prop, val] of Object.entries(combo)) {
    const axis = variantAxes[prop];
    if (!axis) continue;

    if (axis.source === 'variant-library' && axis.classMap?.[val]) {
      // Parse Tailwind classes from classMap to override specific properties.
      // Use the §2d Tailwind-to-Figma mapping table for property translation.
      // Use the §2e color resolution chain (variables.json → resolved-colors.json → computedStyles).
      //
      // Examples:
      //   'h-10 px-6 text-sm gap-2' → resize height to 40, paddingLeft/Right to 24, gap to 8
      //   'bg-destructive text-destructive-foreground' → override fills and text color
      //   'rounded-full' → cornerRadius = 9999
      //   'border border-input bg-transparent' → add stroke, clear fills
      const classes = axis.classMap[val];
      // ... parse and apply each relevant class to v ...
    }

    if (axis.source === 'css-pseudo-state' && axis.stateStyles?.[val]) {
      // Apply computed style diffs directly as Figma property overrides.
      // These are already resolved values — no Tailwind parsing needed.
      const styles = axis.stateStyles[val];
      if (styles.backgroundColor) {
        // Parse 'rgb(R, G, B)' → { r: R/255, g: G/255, b: B/255 }
        v.fills = [{ type: 'SOLID', color: parseRgb(styles.backgroundColor) }];
      }
      if (styles.boxShadow) {
        // Parse CSS box-shadow → Figma DROP_SHADOW or INNER_SHADOW effect
        v.effects = [parseShadow(styles.boxShadow)];
      }
      if (styles.opacity) {
        v.opacity = parseFloat(styles.opacity);
      }
    }
  }

  // ── Build children (same for all style variants) ──
  // Create instances from instanceManifest per §2c rules.
  // Override only characters on instances (screenshot-first rule).
  // Add text nodes for text NOT owned by a child component.

  fixSizing(v);
  variants.push(v);
}

// ── 5. Combine into a component set ──
const set = figma.combineAsVariants(variants, parentFrame);
set.name = '{componentName}';
set.layoutMode = 'HORIZONTAL';
set.layoutWrap = 'WRAP';
set.primaryAxisSizingMode = 'AUTO';
set.counterAxisSizingMode = 'AUTO';
set.paddingTop = 16;
set.paddingBottom = 16;
set.paddingLeft = 16;
set.paddingRight = 16;
set.itemSpacing = 16;
set.counterAxisSpacing = 16;

for (const v of set.children) fixSizing(v);
fixSizing(set);

return JSON.stringify({
  name: set.name,
  id: set.id,
  variants: set.children.map((c) => ({ name: c.name, id: c.id })),
});
```

## 2b-responsive. Building responsive breakpoint variants

When a combo includes a `responsive-breakpoint` axis value, the variant must include **only** the JSX blocks visible at that breakpoint. Read the `visibilityMap` from the axis data to determine which blocks to include and exclude.

**Key principle:** Each responsive variant is a structurally different component — different children, different layout, sometimes different sizing. Don't just toggle `visible` on nodes; build separate content for each variant.

**How to apply the visibilityMap:**

1. Read `visibilityMap[value].include` and `visibilityMap[value].exclude` for the current combo's Layout value
2. For included blocks: build their full child tree (instances, text, icons)
3. For excluded blocks: skip them entirely — don't create hidden nodes

**Example — CustomerInformation with Layout axis:**

```javascript
// For Layout=Desktop:
// - Include: "hidden lg:flex" title row (name + inline three-dot menu)
// - Exclude: "lg:hidden" mobile title, "lg:hidden" mobile more actions button

// For Layout=Mobile:
// - Include: "lg:hidden" mobile title (stacked name), "lg:hidden" more actions button
// - Exclude: "hidden lg:flex" desktop title row
```

**Sizing per variant:** Mobile variants typically use `widthIntent: 'fill'` at a narrower reference width (375px for phone). Desktop variants use the standard fill width from Step 1a. Set the component's `resize()` accordingly so each variant previews at its natural breakpoint width.

**Child components shared across variants:** The same child instances (EditableTitle, EditableText, etc.) appear in both variants but may be arranged differently. Create separate instances for each variant — don't try to share instances between variant components.

## 2b-states. Building prop-driven structural state variants

When a combo includes a `prop-state` axis value, the variant must include the base component content **plus** any overlay or modal content that becomes visible in that state. Read `stateConfig[value].overlays` from the axis data.

**Key principle:** State variants show what the user sees at a specific moment in an interaction flow. The base component is always present; overlays are added on top of or alongside it.

**How to build each state:**

### State = Default

Build the component normally — all overlays closed, no menus visible.

### State = Menu Open

Build the base component, then add the dropdown menu content positioned near its trigger:

```javascript
// 1. Build base component content (same as Default)
// 2. Add the open menu as a child frame

const menuFrame = figma.createFrame();
menuFrame.name = 'Menu Dropdown';
menuFrame.layoutMode = 'VERTICAL';
menuFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
menuFrame.cornerRadius = 8;
menuFrame.effects = [
  {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 4 },
    radius: 12,
    visible: true,
  },
];
menuFrame.paddingTop = 4;
menuFrame.paddingBottom = 4;

// Add menu items from stateConfig overlays[].content
// Each menu item: icon instance + text label in a horizontal row
// Use destructive styling (red text) when specified
```

Position the menu relative to its trigger using absolute positioning within a wrapper frame, or append it as a sibling in the layout and annotate with the position description from `stateConfig`.

### State = Dialog/Modal Open

Build the base component, then add the modal as a detached overlay:

```javascript
// 1. Build base component content (same as Default, optionally dimmed)
// 2. Add modal overlay

const modalFrame = figma.createFrame();
modalFrame.name = 'Modal Overlay';
modalFrame.layoutMode = 'VERTICAL';

// Backdrop (semi-transparent)
const backdrop = figma.createFrame();
backdrop.name = 'Backdrop';
backdrop.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.5 }];

// Dialog content from stateConfig overlays[].props
// Title, description, confirm/cancel buttons
// Apply confirmClassName for destructive actions (red button)
```

**Overlay content source:** Read the exact text strings from `stateConfig[value].overlays[].props` (title, description, confirmText, etc.). These were extracted from the source code's JSX props during Step 1b-iv. Never use placeholder text.

**Instance reuse in overlays:** If the overlay component (ConfirmationDialog, MoreOptionsMenu) exists in `builtComponents`, create an instance and override its text content per §2c rules. If it doesn't exist in `builtComponents`, build the overlay content inline using frames and text nodes — the comparison step will validate the visual output either way.

## 2c. Creating child elements

**Text nodes:**

> **Font family — use `Inter` deliberately, not by accident.** This project ships no custom web font: text resolves to the OS system stack (`ui-sans-serif, system-ui, sans-serif` in `code.json`), which renders as the platform UI font (SF Pro on macOS, Segoe UI on Windows). `system-ui` cannot be rendered portably in Figma, so this project maps every system stack to **Inter** as the documented, portable proxy. Inter is a *deliberate approximation*, not a true match — Step 4 must treat any residual text diff accordingly (see the font guardrail in Step 4c). Only build text in a different family when `code.json`'s `fontFamily` names a real, loadable web font (not a system stack); in that case load and use that family instead.

```javascript
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
const text = figma.createText();
text.characters = '{exact text from text.json}';
text.fontSize = { size };
text.fontName = { family: 'Inter', style: '{Regular|Medium|Semi Bold|Bold}' };
text.fills = [{ type: 'SOLID', color: { rgb } }];
text.lineHeight = { value: { lh }, unit: 'PIXELS' };
parent.appendChild(text);
```

**Text nodes do NOT support padding.** Wrap in a frame:

```javascript
// WRONG: text.paddingLeft = 4;
// CORRECT:
const wrapper = figma.createFrame();
wrapper.layoutMode = 'HORIZONTAL';
wrapper.primaryAxisSizingMode = 'AUTO';
wrapper.counterAxisSizingMode = 'AUTO';
wrapper.paddingLeft = 4;
wrapper.paddingRight = 4;
wrapper.fills = [];
wrapper.appendChild(text);
```

**Icon instances:**

```javascript
const iconComp = figma.getNodeById(builtComponents['Icon/Check']);
const iconInstance = iconComp.createInstance();
iconInstance.resize(16, 16); // h-4 w-4
parent.appendChild(iconInstance);
```

**Sub-component instances:**

```javascript
const subComp = figma.getNodeById(builtComponents['Button']);
const instance = subComp.createInstance();
parent.appendChild(instance);
```

**Overriding text inside an instance** — when the source code passes a custom string (e.g. `<EditableTitle value="Lisa" />`, `<EditableText label="Email Address" value="..." />`), find the instance's internal TEXT node and override its `characters`. **Do not** substitute a plain text node for the instance — Step 4a rejects that.

**Screenshot-first override rule:** Only override `characters` (text content) during the initial build. Do NOT override styling properties (`fontSize`, `fontName`, `lineHeight`, `fills`) based on source code analysis — source code className interpretation is error-prone (e.g. confusing mobile-only styles with desktop styles, misreading conditional classes). Instead:

1. **Build with master defaults** — override only `characters`, keep the master's font size, weight, color, and line height.
2. **Let the comparison step (Step 4) catch mismatches** — if the master's default styling doesn't match the app screenshot, the pixel diff will show exactly where and how.
3. **Fix in Step 5 using the diff image** — the fix loop has the app screenshot and the diff overlay as visual evidence. Apply style overrides there, guided by what the diff actually shows rather than what the source code suggests.

This prevents the common failure mode where source code analysis produces confident-but-wrong style overrides that pass the comparison threshold but don't match the live app.

```javascript
const inst = subComp.createInstance();

// Pick the variant first if the master is a component set:
inst.setProperties({ State: 'Rest' });

// Find the target text node by current characters (placeholder), name, or position:
const text = inst.findOne(
  (n) => n.type === 'TEXT' && n.characters === 'Title' // placeholder in the master
);
await figma.loadFontAsync(text.fontName); // mandatory — instance text inherits the master font
text.characters = 'Lisa';
// DO NOT override fontSize, fontName, lineHeight, or fills here.
// The master's defaults are used. Step 4 comparison will flag mismatches.

parent.appendChild(inst);
```

Multi-field components (e.g. `EditableText` with a label slot and a value slot) typically expose multiple text descendants. Match each by its placeholder string, name, or `findAll` index. Example:

```javascript
const inst = editableTextComp.createInstance();
const [labelText, valueText] = inst.findAll((n) => n.type === 'TEXT');
await figma.loadFontAsync(labelText.fontName);
await figma.loadFontAsync(valueText.fontName);
labelText.characters = 'Email Address';
valueText.characters = 'lisa.anderson@customer.com';
```

If the masters' placeholder strings change, `findOne(characters === 'X')` will stop matching. Prefer matching by _position_ within `findAll((n) => n.type === 'TEXT')` (label first, value second) or by the text node's `name` field — both survive content edits to the master.

**Rectangles (dividers, backgrounds, decorative elements):**

```javascript
const divider = figma.createRectangle();
divider.name = 'Divider';
divider.resize(200, 1);
divider.fills = [{ type: 'SOLID', color: { r: 0.898, g: 0.906, b: 0.922 } }];
divider.layoutSizingHorizontal = 'FILL'; // stretch to fill parent width
parent.appendChild(divider);
```

## 2d. Tailwind-to-Figma mapping reference

| Tailwind            | Figma Property                                           | Value                          |
| ------------------- | -------------------------------------------------------- | ------------------------------ |
| `flex-col`          | `layoutMode`                                             | `'VERTICAL'`                   |
| `flex` / `flex-row` | `layoutMode`                                             | `'HORIZONTAL'`                 |
| `items-center`      | `counterAxisAlignItems`                                  | `'CENTER'`                     |
| `justify-between`   | `primaryAxisAlignItems`                                  | `'SPACE_BETWEEN'`              |
| `justify-center`    | `primaryAxisAlignItems`                                  | `'CENTER'`                     |
| `gap-{n}`           | `itemSpacing`                                            | `n * 4` (px)                   |
| `p-{n}`             | all paddings                                             | `n * 4`                        |
| `px-{n}`            | `paddingLeft/Right`                                      | `n * 4`                        |
| `py-{n}`            | `paddingTop/Bottom`                                      | `n * 4`                        |
| `rounded-md`        | `cornerRadius`                                           | `6`                            |
| `rounded-lg`        | `cornerRadius`                                           | `8`                            |
| `rounded-xl`        | `cornerRadius`                                           | `12`                           |
| `rounded-full`      | `cornerRadius`                                           | `9999`                         |
| `border`            | `strokeWeight`                                           | `1`, `strokeAlign: 'OUTSIDE'`  |
| `text-sm`           | `fontSize`                                               | `14`, lineHeight `20`          |
| `text-base`         | `fontSize`                                               | `16`, lineHeight `24`          |
| `text-lg`           | `fontSize`                                               | `18`, lineHeight `28`          |
| `text-xl`           | `fontSize`                                               | `20`, lineHeight `28`          |
| `text-2xl`          | `fontSize`                                               | `24`, lineHeight `32`          |
| `font-medium`       | fontName style                                           | `'Medium'`                     |
| `font-semibold`     | fontName style                                           | `'Semi Bold'`                  |
| `font-bold`         | fontName style                                           | `'Bold'`                       |
| `w-full` / `flex-1` | `layoutSizingHorizontal`                                 | `'FILL'`                       |
| `h-full`            | `layoutSizingVertical`                                   | `'FILL'`                       |
| `w-[Npx]`           | `resize(N, ...)` then `layoutSizingHorizontal = 'FIXED'` | explicit width                 |
| `truncate`          | `textTruncation`                                         | `'ENDING'`, `maxLines: 1`      |
| `overflow-hidden`   | `clipsContent`                                           | `true`                         |
| `shadow-sm`         | `effects`                                                | `[{type: 'DROP_SHADOW', ...}]` |
| `opacity-{n}`       | `opacity`                                                | `n / 100`                      |

## 2e. Resolving Tailwind color variables

When source code references Tailwind semantic colors (e.g., `bg-primary`, `text-muted-foreground`, `border-input`), use the Figma variable system as the **primary path** and hardcoded RGB as the **fallback**.

### Step 1 — Before writing `use_figma` code (Node.js context, has `fs`)

Read `variables.json` at the start of Step 2 and extract the entries relevant to this component:

```javascript
const fs = require('fs');
const varMap = JSON.parse(fs.readFileSync('.temp/figma-from-code/variables.json', 'utf-8'));
// varMap keys are CSS var names like "var(--primary)", "var(--radius)", etc.
// varMap values: { id, name, collectionName, resolvedType }
```

Identify every Tailwind class in the component's source, resolve it to a CSS variable name via `tailwind.config.js`, then check if that CSS variable name exists in `varMap`. Embed the **relevant subset** as an inline JSON literal inside the `use_figma` script (the plugin sandbox has no `fs` access — you must inline the data):

```javascript
// use_figma — inline the relevant variable entries
const variableMap = {
  'var(--primary)': { id: 'VariableID:123:1', resolvedType: 'COLOR' },
  'var(--background)': { id: 'VariableID:123:2', resolvedType: 'COLOR' },
  'var(--muted-foreground)': { id: 'VariableID:123:3', resolvedType: 'COLOR' },
  'var(--input)': { id: 'VariableID:123:4', resolvedType: 'COLOR' },
  'var(--radius)': { id: 'VariableID:123:5', resolvedType: 'FLOAT' },
  // only include vars actually used by this component
};
```

### Step 2 — Inside `use_figma` (plugin sandbox): bind variables, fallback to RGB

**COLOR variables** (fills, strokes, text fills):

```javascript
// After resolving "bg-primary" → "--primary" → "var(--primary)":
const varEntry = variableMap['var(--primary)'];
if (varEntry) {
  const figmaVar = await figma.variables.getVariableByIdAsync(varEntry.id);
  // For fills[0]:
  comp.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // set fill type first
  comp.setBoundVariable('fills', 0, figmaVar);
} else {
  // Fallback: hardcode the resolved RGB
  comp.fills = [{ type: 'SOLID', color: { r: 0.141, g: 0.31, b: 0.722 } }];
}
```

**Binding fills vs strokes vs text fills** — the property name differs by node type:

```javascript
// fills — frame, component, rectangle
comp.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
comp.setBoundVariable('fills', 0, figmaVar); // binds fills[0]

// strokes — frame, component, rectangle
comp.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
comp.setBoundVariable('strokes', 0, figmaVar); // binds strokes[0]

// text fills — text node (same API, different node)
textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
textNode.setBoundVariable('fills', 0, figmaVar); // binds text color
```

**FLOAT variables** (corner radius, spacing):

```javascript
// cornerRadius — bind all four corners individually
const radiusVar = await figma.variables.getVariableByIdAsync(variableMap['var(--radius)'].id);
comp.setBoundVariable('topLeftRadius', radiusVar);
comp.setBoundVariable('topRightRadius', radiusVar);
comp.setBoundVariable('bottomLeftRadius', radiusVar);
comp.setBoundVariable('bottomRightRadius', radiusVar);

// itemSpacing (gap) — if a spacing token maps to a CSS var
const gapVar = await figma.variables.getVariableByIdAsync(variableMap['var(--spacing-4)'].id);
comp.setBoundVariable('itemSpacing', gapVar);
```

### Fallback resolution chain (when no variable entry exists)

If a CSS variable is not in `variableMap` (not in Phase 1 collections, or plain color value), fall back to the pre-computed color lookup:

1. Read `.temp/figma-from-code/resolved-colors.json` (generated once by the orchestrator during Phase 1 — see SKILL.md "Phase 1 post-step: Resolve CSS colors").
2. To resolve a Tailwind class (e.g. `bg-primary`):
   - Look up the class in `resolved-colors.json.tailwindMap` to get the CSS variable name (e.g. `"--primary"`).
   - Look up that variable name in `resolved-colors.json.cssVariables["--primary"].rgb`.
   - Use the pre-computed `{ r, g, b }` values directly — no arithmetic needed.
3. To resolve a bare CSS variable (e.g. `var(--muted-foreground)`):
   - Strip the `var()` wrapper to get `--muted-foreground`.
   - Look up `resolved-colors.json.cssVariables["--muted-foreground"].rgb` directly.
4. Only if the variable is absent from `resolved-colors.json`: fall back to `computed-styles.json` values from Step 1g as a final fallback.

Example lookup:

```javascript
const resolvedColors = JSON.parse(
  fs.readFileSync('.temp/figma-from-code/resolved-colors.json', 'utf8')
);

function resolveClass(tailwindClass) {
  const varName = resolvedColors.tailwindMap[tailwindClass];
  if (varName && resolvedColors.cssVariables[varName]) {
    return resolvedColors.cssVariables[varName].rgb;
  }
  return null;
}

function resolveVar(cssVarName) {
  const key = cssVarName
    .replace(/^var\(/, '')
    .replace(/\)$/, '')
    .trim();
  return resolvedColors.cssVariables[key]?.rgb ?? null;
}

const primaryColor = resolveClass('bg-primary');
const mutedFgColor = resolveVar('var(--muted-foreground)');
```

## 2f. Enumerate built instances + write `.figma/figma.json`

After `fixSizing` and `appendChild` have settled the structure, enumerate every `INSTANCE` inside the built component and write the result to `<sourceDir>/.figma/figma.json`. This is the **built-derived half** of the Step 4a gate. It must reflect the _actual_ Figma node tree, not the source-side intent.

**Enumerate via `use_figma`:**

```javascript
const root = figma.getNodeById('<nodeId>');
const seen = new Map(); // figmaName -> { nodeId, fileKey }
const instances = root.findAll((n) => n.type === 'INSTANCE');
for (const inst of instances) {
  const main = inst.mainComponent;
  if (!main) continue;
  const isVariant = main.parent && main.parent.type === 'COMPONENT_SET';
  const name = isVariant ? main.parent.name : main.name;
  const id = isVariant ? main.parent.id : main.id;
  if (!seen.has(name)) seen.set(name, id);
}
return JSON.stringify(
  [...seen.entries()].map(([componentName, nodeId]) => ({ componentName, nodeId }))
);
```

For each `{ componentName, nodeId }` returned, build the dependency entry:

1. `url` — `https://figma.com/design/{fileKey}?node-id={nodeId.replace(':', '-')}`.
2. `dependencies` — read from the child's own `.figma/figma.json` (e.g. `<source-dir>/components/EditableTitle/.figma/figma.json`). If missing or unparseable, use `[]`. Components are built bottom-up, so child tracking files will already exist.

**Schema (the file you write):**

```json
{
  "fileKey": "<figmaFileKey>",
  "nodeId": "<componentSetIdOrComponentId>",
  "url": "https://figma.com/design/<fileKey>?node-id=<nodeIdWithDashes>",
  "componentName": "CustomerInformation",
  "createdAt": "2026-05-15T14:32:00Z",
  "updatedAt": "2026-05-19T15:00:00Z",
  "dependencies": [
    {
      "componentName": "EditableTitle",
      "nodeId": "23:18",
      "url": "https://figma.com/design/<fileKey>?node-id=23-18",
      "dependencies": [ ... ]
    },
    ...
  ]
}
```

**Read-then-write for `createdAt`:**

1. If `<sourceDir>/.figma/figma.json` exists, parse it and preserve `createdAt`. Refresh everything else.
2. If a legacy `<sourceDir>/figma.json` (root-level, pre-`.figma/` layout) exists, read it only to recover `createdAt`.
3. If neither exists, set both `createdAt` and `updatedAt` to the current ISO 8601 UTC timestamp.

`dependencies` is **always recomputed from the live enumeration** — never carried over from a prior run. The whole point of this file is to mirror current Figma state.

**Folder resolution** (same rules as Step 1 — see schema reference at top of step-1-analyze.md):

- `Button` → `<source-dir>/components/Button/.figma/figma.json`
- Nested modlets follow the source path.
- `Icon/{Name}` → `<source-dir>/components/Icon/{Name}/.figma/figma.json` (synthesized).
- `Asset/{Name}` → `<source-dir>/components/Asset/{Name}/.figma/figma.json` (synthesized).

**Failure handling:** if the write fails, log the error and surface it in the Step 7 result under `trackingFile`. The Step 4a gate will then fail (missing `figma.json`), making the failure unambiguous.

After Step 2f completes, the two `.figma/*.json` files exist and Step 4a is ready to diff them.

---

## fixSizing() — Mandatory After Every Build

Call `fixSizing()` on every component and every variant before appending to the parent frame. This corrects frames whose height was locked by a `resize()` call during construction.

```javascript
function fixSizing(node, depth = 0) {
  if (depth > 10 || !node) return;
  const hasLayout =
    (node.type === 'COMPONENT' || node.type === 'FRAME' || node.type === 'COMPONENT_SET') &&
    node.layoutMode &&
    node.layoutMode !== 'NONE';
  if (hasLayout) {
    if (node.layoutMode === 'VERTICAL') node.primaryAxisSizingMode = 'AUTO';
    node.counterAxisSizingMode = 'AUTO';
  }
  const children = 'children' in node ? node.children : [];
  for (const child of children) fixSizing(child, depth + 1);
}
```

**During construction**, always set sizing modes to `AUTO` before `resize()` — otherwise `resize()` locks the height:

```javascript
// WRONG — locks height to 10px
comp.counterAxisSizingMode = 'FIXED';
comp.resize(200, 10);

// CORRECT — height grows with content; resize() sets width only
comp.primaryAxisSizingMode = 'AUTO';
comp.counterAxisSizingMode = 'AUTO';
comp.resize(200, 10);
```

---

## Pitfalls

| Pitfall                                               | Prevention                                                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| All components appear as thin strips                  | `fixSizing()` was not called — run it on every component and variant                                                                                 |
| Text node padding error                               | Text nodes do not support padding — wrap in an auto-layout frame (see §2c)                                                                           |
| `strokeAlign: 'INSIDE'` double-border                 | Always use `strokeAlign: 'OUTSIDE'` to match the CSS box model                                                                                       |
| Placeholder text instead of real text                 | Always use exact strings from `textContent` / `text.json`                                                                                            |
| Rebuilding a sub-component that already exists        | Check `builtComponents` first, create an instance instead                                                                                            |
| Rebuilding an icon that already exists                | Check `builtComponents` for `Icon/{Name}`, create an instance                                                                                        |
| Component set has no layout after `combineAsVariants` | Explicitly set `layoutMode`, sizing, padding, and spacing on the set                                                                                 |
| Manual x/y positioning inside auto-layout parent      | Never set x/y when the parent frame has `layoutMode` set — auto-layout manages positioning                                                           |
| Colors don't match app                                | Resolve Tailwind CSS variables through the full chain: class → config → CSS variable → HSL/OKLCH → RGB (see §2e)                                     |
| Icon at wrong size                                    | Check Tailwind size class: `h-4 w-4` = 16×16, `h-5 w-5` = 20×20, `h-6 w-6` = 24×24                                                                   |
| Instance styling overrides don't match the live app   | During Step 2, only override `characters` — never `fontSize`, `fontName`, `lineHeight`, or `fills`. Keep master defaults; let Step 4 flag mismatches |

## Error Handling

| Scenario                                          | Action                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `use_figma` fails                                 | Diagnose error, fix script, retry once. If still failing, return `status: "failed"`           |
| `use_figma` incremental limit reached             | Split the build across multiple `use_figma` calls — build sub-structures first, then assemble |
| Font not available                                | Fall back to `{ family: 'Inter', style: 'Regular' }` — Inter is always available in Figma     |
| `componentNodeId` is null or missing after Step 2 | Return `status: "failed"` immediately — do not proceed to Step 3                              |
