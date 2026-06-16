# Step 2 Quick: Build the Component in Figma

> **Condensed reference.** For responsive-breakpoint variants, prop-driven state variants, full Tailwind mapping table, and color resolution chain details, read `step-2-build.md`.

## Build Order (mandatory)

1. Resolve all masters from `code.json.childComponents` via `figma.getNodeById(nodeId)`
2. Create all instances via `master.createInstance()` (one per `usageCount`)
3. Override ONLY text content (`characters`) on instances — never styling
4. Create the component shell (layout, padding, fills)
5. Append instances + plain text nodes into the shell
6. Run `fixSizing(comp)` and append to parent frame

## 2a. Single Component (no variants)

Use when `code.json.variantAxes` is empty (`[]`).

```javascript
// use_figma
const parentFrame = figma.getNodeById('{parentFrameId}');

// 1. Resolve masters
const childMaster = figma.getNodeById('{nodeId from code.json.childComponents}');

// 2. Create instances
const childInst = childMaster.createInstance();

// 3. Override text on instances
const textNode = childInst.findOne(n => n.type === 'TEXT');
if (textNode) {
  await figma.loadFontAsync(textNode.fontName);
  textNode.characters = '{from text.json}';
}

// 4. Create shell
const comp = figma.createComponent();
comp.name = '{componentName}';
comp.layoutMode = '{VERTICAL or HORIZONTAL}';
comp.primaryAxisSizingMode = 'AUTO';
comp.counterAxisSizingMode = 'AUTO';
comp.itemSpacing = {gap};
comp.paddingTop = {pt}; comp.paddingBottom = {pb};
comp.paddingLeft = {pl}; comp.paddingRight = {pr};
comp.cornerRadius = {radius};
comp.fills = [{fill}];

// 5. Append children
comp.appendChild(childInst);

// 6. Finalize
fixSizing(comp);
parentFrame.appendChild(comp);
return JSON.stringify({ name: comp.name, id: comp.id });
```

## 2b. Component with Variants

Use when `code.json.variantAxes` has entries.

1. Inline `variantAxes` and `variantCombos` from code.json (sandbox has no fs)
2. Parse base styles from cva base classes / computedStyles
3. For each combo: create a component, apply base + per-axis overrides, build children, `fixSizing()`
4. Combine: `figma.combineAsVariants(variants, parentFrame)`
5. Name the set `'{componentName}'`

**Variant naming:** `"Variant=primary, Size=regular, State=Default"`

**Per-axis override sources:**
- `variant-library` → parse `classMap` Tailwind classes
- `css-pseudo-state` → apply `stateStyles` resolved values directly
- `responsive-breakpoint` → different children per variant (see full ref)
- `prop-state` → overlay content per state (see full ref)

## Color Resolution (§2e)

**Before hardcoding any color in `use_figma`:**

```bash
node {skillRoot}/scripts/resolve-color.js '<color>' --context fill|text|stroke
```

- If returns a variable → bind it: `node.setBoundVariable('fills', 0, variable)`
- If `match: "none"` → hardcode RGB (rebind sweep catches it later)

## Instance Rules

- Never substitute a plain text node for a child in `builtComponents` — always instance
- Override only `characters` on instance text nodes, never styling
- Portal children (Dialog, Sheet) → include as detached examples
- If component set: pick variant via `instance.setProperties({...})`

## fixSizing() (mandatory after every build)

```javascript
function fixSizing(node, exemptRoot = false) {
  if (!exemptRoot && node.layoutMode) {
    if (node.primaryAxisSizingMode === 'FIXED') node.primaryAxisSizingMode = 'AUTO';
    if (node.counterAxisSizingMode === 'FIXED') node.counterAxisSizingMode = 'AUTO';
  }
  if ('children' in node) {
    for (const child of node.children) fixSizing(child);
  }
}
```

## After Build: Write .figma/figma.json (Step 2f)

Enumerate all instances in the built node and write tracking file:

```json
{
  "fileKey": "{fileKey}",
  "nodeId": "{comp.id}",
  "url": "https://figma.com/design/{fileKey}?node-id={nodeId}",
  "componentName": "{componentName}",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "dependencies": [{ "componentName": "Button", "nodeId": "123:45", "instanceCount": 2 }]
}
```
