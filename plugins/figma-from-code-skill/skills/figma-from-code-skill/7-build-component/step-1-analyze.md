# Step 1: Analyze the Component

> **This step runs inline.** Read the component source, reference material, and live styles. Produce `code.json` following the schema below. If `componentName` is in `preExistingComponents`, write a `needs_authorization` rejection and return immediately. If any child component is missing from builtComponents, write a rejection result and return immediately.

Before writing any `use_figma` code, analyze all inputs to plan the Figma structure.

## Pre-Existing Components Rule

**Check this before doing any work.**

- If `componentName` itself is a key in `preExistingComponents`: write `status: "needs_authorization"` and `preExistingTouched: ["<name>"]` to `.temp/figma-from-code/build-results/{componentName}.json` and return immediately. Do not analyze, do not write `code.json`, do not call `use_figma`.
- If a _child_ you would instantiate (icon, sub-component) is in `preExistingComponents`: **instancing is fine** — that is reuse, not modification. Do not modify its master.
- The fix-loop (Step 5) must never edit a node in `preExistingComponents`. If the comparison requires it, surface the conflict in the result and let the orchestrator decide.

This rule overrides all analysis steps when in conflict.

## Error Handling

| Scenario                                             | Action                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `componentName` in `preExistingComponents`           | Write `needs_authorization` result, stop immediately                                                                |
| Any child component not in `builtComponents`         | Write `rejected` result with `missingChildren` list, stop immediately                                               |
| Any icon not in `builtComponents` as `Icon/{Name}`   | Include in `missingChildren`, write `rejected` result, stop immediately                                             |
| `code.json` write fails (permission, missing parent) | Log error; surface in Step 7 result under `trackingFile: { written: false, error: "..." }` — do not block the build |

> **Pre-flight: dev server is required for Step 1g (live inspection).** Step 1g — inspecting the rendered component in a browser via `inspect-styles.js` — is the authoritative source for colors, spacing, typography, and interactive states. **Do not silently skip it.** If you don't already have a dev server URL (from the orchestrator state ledger, project memory, or the caller's arguments), pause and ask the user for one before proceeding past Step 1. Only skip Step 1g if the user explicitly says no dev server is available, or has already said so earlier in this conversation. See Step 1g for the full decision tree.

---

## code.json Schema Reference

This is the contract that Step 2 (build) and Step 4a (instance gate) consume. Each sub-step below writes its fields incrementally — by the end of Step 1g, the file is complete.

```json
{
  "componentName": "CustomerInformation",
  "sourceFile": "<source-dir>/components/.../CustomerInformation.tsx",
  "analyzedAt": "2026-05-19T15:00:00Z",
  "lastCommit": { "hash": "...", "date": "...", "message": "..." },
  "liveInspection": "complete",
  "layout": { "direction": "VERTICAL", "widthIntent": "fill", "heightIntent": "hug" },
  "variantAxes": [
    {
      "property": "Variant",
      "values": ["primary", "secondary", "outline", "ghost", "ghost-muted", "destructive"],
      "defaultValue": "primary",
      "source": "variant-library",
      "classMap": {
        "primary": "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        "secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        "outline": "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground shadow-sm",
        "ghost": "hover:bg-accent hover:text-accent-foreground",
        "ghost-muted": "hover:bg-accent/50 text-muted-foreground",
        "destructive": "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
      }
    },
    {
      "property": "Size",
      "values": ["large", "regular", "small", "mini"],
      "defaultValue": "regular",
      "source": "variant-library",
      "classMap": {
        "large": "h-10 px-6 text-sm gap-2",
        "regular": "h-9 px-4 text-sm gap-2",
        "small": "h-8 px-3 text-sm gap-2",
        "mini": "h-6 px-2 text-xs gap-1.5"
      }
    },
    {
      "property": "Roundness",
      "values": ["default", "round"],
      "defaultValue": "default",
      "source": "variant-library",
      "classMap": { "default": "rounded-lg", "round": "rounded-full" }
    },
    {
      "property": "State",
      "values": ["Default", "Hover", "Focus", "Disabled"],
      "defaultValue": "Default",
      "source": "css-pseudo-state",
      "stateStyles": {
        "Hover": { "backgroundColor": "rgb(37, 99, 235)" },
        "Focus": { "boxShadow": "0 0 0 3px rgb(203, 213, 225)" },
        "Disabled": { "opacity": "0.5" }
      }
    }
  ],
  "variantCombos": [
    { "Variant": "primary", "Size": "regular", "Roundness": "default", "State": "Default" },
    { "Variant": "secondary", "Size": "regular", "Roundness": "default", "State": "Default" },
    { "Variant": "outline", "Size": "regular", "Roundness": "default", "State": "Default" },
    { "Variant": "ghost", "Size": "regular", "Roundness": "default", "State": "Default" },
    { "Variant": "ghost-muted", "Size": "regular", "Roundness": "default", "State": "Default" },
    { "Variant": "destructive", "Size": "regular", "Roundness": "default", "State": "Default" },
    { "Variant": "primary", "Size": "large", "Roundness": "default", "State": "Default" },
    { "Variant": "primary", "Size": "small", "Roundness": "default", "State": "Default" },
    { "Variant": "primary", "Size": "mini", "Roundness": "default", "State": "Default" },
    { "Variant": "primary", "Size": "regular", "Roundness": "round", "State": "Default" },
    { "Variant": "primary", "Size": "regular", "Roundness": "default", "State": "Hover" },
    { "Variant": "primary", "Size": "regular", "Roundness": "default", "State": "Focus" },
    { "Variant": "primary", "Size": "regular", "Roundness": "default", "State": "Disabled" }
  ],
  "variantStrategy": "representative",
  "totalPossibleCombinations": 192,
  "iconUsage": [
    { "name": "Star", "figmaComponent": "Icon/Star", "size": 20 }
  ],
  "childComponents": [
    { "figmaName": "EditableTitle", "nodeId": "1199:2", "usageCount": 3, "usages": ["first name", "last name", "username"] },
    { "figmaName": "EditableText", "nodeId": "1213:35", "usageCount": 1, "usages": ["email field"] },
    { "figmaName": "MoreOptionsMenu", "nodeId": "1214:37", "usageCount": 1, "usages": ["portal: more actions menu"] },
    { "figmaName": "ConfirmationDialog", "nodeId": "1214:48", "usageCount": 1, "usages": ["portal: delete confirmation"] },
    { "figmaName": "Icon/Star", "nodeId": "1189:6", "usageCount": 5, "usages": ["satisfaction stars"] }
  ],
  "textContent": { ... },
  "computedStyles": { ... },
  "states": { ... }
}
```

### File location

Resolve the component directory from the source file path:

- `Button` → `<source-dir>/components/Button/.figma/code.json`
- Nested modlet (e.g. `CustomerInformation` under `CustomerDetails/components/...`) → `<source-dir>/components/CustomerDetails/components/CustomerInformation/.figma/code.json`
- `Icon/Star` → `<source-dir>/components/Icon/Star/.figma/code.json` (synthesized — Lucide icons have no local source file)
- `Asset/CartonLogoSvg` → `<source-dir>/components/Asset/CartonLogoSvg/.figma/code.json`

Create the `.figma/` directory (and any missing parents) before writing.

### Write protocol

Step 0 writes a skeleton file immediately (crash-recovery signal). Sub-steps 1a–1g accumulate their results **in working memory only** — no intermediate disk writes. At the end of Step 1g (or at the end of the last completed sub-step if 1g is skipped), write the complete code.json in a single atomic operation. This eliminates ~6 redundant file writes per component.

**Failure handling:** if the final write fails (permission, missing parent), log the failure and surface it in the eventual Step 7 result under `trackingFile: { written: false, error: "..." }`. Do not block the build on a write failure — the gate will fail at Step 4a instead, with a clearer error.

---

## Step 0. Initialize code.json

Write the skeleton file immediately. This acts as a crash-recovery signal — if the agent is interrupted, downstream steps see `null` fields and know analysis did not complete. Sub-steps 1a–1g accumulate their results in memory only; the final complete write happens at the end of Step 1g (or 1f if 1g is skipped). Do NOT write to code.json again between Step 0 and the final write.

**Get the git commit for the source file:**

```bash
git log -1 --format="%H|%aI|%s" -- {sourceFilePath}
```

Parse pipe-delimited into `hash`, `date`, `message`. If untracked, all three are `null`.

**Write code.json** with this initial content:

```json
{
  "componentName": "{componentName}",
  "sourceFile": "{sourceFilePath}",
  "analyzedAt": "{ISO 8601 UTC now}",
  "lastCommit": { "hash": "...", "date": "...", "message": "..." },
  "liveInspection": null,
  "layout": null,
  "variantAxes": null,
  "variantCombos": null,
  "variantStrategy": null,
  "totalPossibleCombinations": null,
  "iconUsage": null,
  "childComponents": null,
  "textContent": null,
  "computedStyles": null,
  "states": null
}
```

---

## 1a. Identify the component structure

Read the source code and determine:

- **Layout direction**: Is the root a vertical stack (`flex-col`) or horizontal row (`flex`, `flex-row`)?
- **Sizing intent** (CAPTURE THIS EXPLICITLY — Step 4a verifies the built component matches): For the _outermost_ container, classify each axis as one of:
  - `fill` — has `w-full`, `flex-1`, `flex: 1`, `min-w-full`, or in a flex parent without sized siblings (Figma equivalent: `primaryAxisSizingMode='FIXED'` on the parent + `layoutSizingHorizontal='FILL'` on the child; or for masters, fixed width matching the consumer)
  - `fixed:NNN` — has explicit value like `w-[200px]`, `w-64`, `h-10` (Figma: fixed width/height matching NNN)
  - `hug` — none of the above; content-driven (Figma: `*SizingMode='AUTO'`)
    Repeat per axis (width AND height). Capture this as `{widthIntent: 'fill' | 'fixed:NNN' | 'hug', heightIntent: ...}`. Record it now — Step 4a uses it.
- **Parent-context promotion** (when Step 1g ran): read `layoutContext` from `computed-styles.json`. If `parent.clientWidth - parent.paddingLeft - parent.paddingRight ≥ element.offsetWidth × 1.25` AND that gap is ≥ 200px (i.e. the parent slot is meaningfully wider than the element is currently rendering), promote `widthIntent` from `hug` to `fill:<parentContentWidth>`. This catches composites that are _consumed by_ a wider page slot but whose outermost div lacks `w-full`/`flex-1` — a common silent narrowing source. Record the parent width as the expected fill target so Step 4a can verify it. Do NOT promote when the source classification is already `fixed:NNN` — explicit widths win.
- **Role hint**: If the source file path is under `pages/` or `routes/`, OR the component name ends in `Page` / `Screen` / `Layout`, treat it as a **page-level** component. Page-level components default to filling the screen body (typically ~1380×768 — read `screensFrameId` body size from state if available) regardless of how the captured `app.png` looks, because the precapture selector may have grabbed a hug-content wrapper.
- **Page-consumed fallback** (when Step 1g was skipped — no dev server): if the component file is imported by anything under `pages/` or `routes/` (grep for `import.*{ ${componentName} }.*from` under those folders), treat it as page-level for sizing purposes. Less precise than the parent-context promotion above — the page-body width is inferred from `figmaNodes.screensFrameId` rather than measured — but prevents the silent-narrow failure mode when no live signal is available.
- **Spacing**: `gap-*` classes map to `itemSpacing` in Figma. `p-*`, `px-*`, `py-*` map to padding.
- **Colors**: `bg-*`, `text-*`, `border-*` classes. Resolve CSS variables from `index.css` if needed.
- **Typography**: Font size, weight, line height from Tailwind classes.
- **Border radius**: `rounded-*` classes.
- **Children**: What sub-elements exist? Which are text, which are icons, which are instances of other components?

**Hold in memory:** `layout: { direction, widthIntent, heightIntent }`. Include in final write.

---

## 1b. Extract variant axes and compute representative combos

Extract variant axes from two sources (in order), then compute the representative set of combinations to build.

### 1b-i. Extract from variant library definitions

Search the component source for `cva()`, `tv()`, `defineRecipe()`, `styleVariants()`, or similar variant-library calls. For each key in the `variants` object, create an axis:

- `property` — PascalCase the key name (e.g., `variant` → `Variant`, `size` → `Size`)
- `values` — array of value names from the variant object keys
- `defaultValue` — from `defaultVariants` (or first value if no default specified)
- `source` — `"variant-library"`
- `classMap` — verbatim Tailwind class strings per value. Copy the exact string from the source code for each variant value (e.g., `{"primary": "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm", "ghost": "hover:bg-accent hover:text-accent-foreground"}`)

Also capture the cva base classes (the first argument to `cva()`) separately — Step 2b uses these as the shared layout foundation for all variants.

Also capture `compoundVariants` if present (for components where axis combinations override base styles).

**If no variant library is found**, `variantAxes` from this sub-step is empty — proceed to 1b-ii. Components without a variant library may still have CSS pseudo-state variants.

**Example — Button.tsx:**

```js
cva('inline-flex items-center justify-center gap-2 ...', {
  variants: {
    variant: {
      primary: 'bg-primary ...',
      secondary: 'bg-secondary ...',
      outline: '...',
      ghost: '...',
      'ghost-muted': '...',
      destructive: '...',
    },
    size: {
      large: 'h-10 px-6 text-sm gap-2',
      regular: 'h-9 px-4 text-sm gap-2',
      small: 'h-8 px-3 text-sm gap-2',
      mini: 'h-6 px-2 text-xs gap-1.5',
    },
    roundness: { default: 'rounded-lg', round: 'rounded-full' },
  },
  defaultVariants: { variant: 'primary', size: 'regular', roundness: 'default' },
});
```

→ 3 axes: Variant (6 values, default "primary"), Size (4 values, default "regular"), Roundness (2 values, default "default").

### 1b-ii. Merge CSS pseudo-states from states.json

If Step 1g produced `states.json` with any `captured: true` state, add a `State` axis:

- `property`: `"State"`
- `values`: `["Default"]` + each captured state name capitalized (e.g., `"Hover"`, `"Focus"`, `"Disabled"`)
- `defaultValue`: `"Default"`
- `source`: `"css-pseudo-state"`
- `stateStyles`: per-state computed style diffs from states.json — include the exact resolved values (RGB colors, box-shadow strings, opacity values)

If no states were captured (all `captured: false` in states.json), do not add this axis.

**How CSS states become Figma variants:** CSS pseudo-states cannot be "set" on a static Figma component. Each state becomes a separate variant where the style overrides are baked into the variant's properties:

- `State=Hover`: override fill color to the hover background from `stateStyles.Hover.backgroundColor`
- `State=Focus`: add a box-shadow effect from `stateStyles.Focus.boxShadow`
- `State=Disabled`: set `opacity` from `stateStyles.Disabled.opacity`

### 1b-iii. Compute representative variant combos

Compute the combinations to build using the **representative set** algorithm — vary one axis at a time from the default:

```
defaultCombo = { axis.property: axis.defaultValue for each axis }
combos = [defaultCombo]
for each axis in variantAxes:
  for each value in axis.values where value != axis.defaultValue:
    combo = copy(defaultCombo)
    combo[axis.property] = value
    combos.push(combo)
```

This yields `1 + SUM(values_per_axis - 1)` combos — every distinct visual treatment without combinatorial explosion.

**Example — Button** with Variant(6) × Size(4) × Roundness(2) × State(4):

- Full cross-product: 192 combos
- Representative set: 1 + 5 + 3 + 1 + 3 = **13 combos**

**Budget guardrail:** If combos exceed 30, truncate by dropping values from lower-priority axes. Priority order: responsive layout > visual-identity axes (variant, type) > prop-driven states > interactive states (hover, focus, disabled) > sizes > shape modifiers (roundness).

### 1b-iii. Extract responsive breakpoint variants

Scan the JSX for paired Tailwind responsive visibility classes that show/hide entire JSX blocks at different viewport widths. These indicate the component has structurally different layouts per breakpoint.

**Detection patterns:**

| Mobile-only block             | Desktop-only block                                      | Breakpoint    |
| ----------------------------- | ------------------------------------------------------- | ------------- |
| `className="...lg:hidden..."` | `className="...hidden lg:flex..."` or `hidden lg:block` | `lg` (1024px) |
| `className="...md:hidden..."` | `className="...hidden md:flex..."` or `hidden md:block` | `md` (768px)  |
| `className="...sm:hidden..."` | `className="...hidden sm:flex..."` or `hidden sm:block` | `sm` (640px)  |

**When to create a Layout axis:**

- At least one JSX block uses a responsive hide class (`lg:hidden`, `hidden lg:flex`, etc.)
- The hidden/shown blocks contain meaningfully different content or layout (not just a minor style tweak)

**Axis creation:**

```json
{
  "property": "Layout",
  "values": ["Desktop", "Mobile"],
  "defaultValue": "Desktop",
  "source": "responsive-breakpoint",
  "breakpoint": "lg",
  "visibilityMap": {
    "Desktop": {
      "include": ["blocks with 'hidden lg:flex' or 'hidden lg:block'"],
      "exclude": ["blocks with 'lg:hidden'"]
    },
    "Mobile": {
      "include": ["blocks with 'lg:hidden' or no responsive prefix"],
      "exclude": ["blocks with 'hidden lg:flex' or 'hidden lg:block'"]
    }
  }
}
```

**`visibilityMap` format:** Each entry lists JSX block identifiers (use a short description or the element's `className` string) that should be included or excluded for that variant value. Step 2 uses this to decide which children to render in each variant.

**Example — CustomerInformation:**

```tsx
{
  /* Mobile: Title */
}
<div className="flex flex-col gap-1 lg:hidden w-full">...</div>;

{
  /* Desktop: Title + More menu */
}
<div className="hidden lg:flex items-start justify-between w-full">...</div>;

{
  /* Mobile: More menu */
}
<div className="lg:hidden">
  <MoreOptionsMenu
    trigger={
      <Button variant="outline" className="w-full">
        ...
      </Button>
    }
  >
    ...
  </MoreOptionsMenu>
</div>;
```

→ Layout axis with `Desktop` (inline three-dot menu) and `Mobile` (stacked name, full-width "More Actions" button at bottom).

**Multiple breakpoints:** If a component uses more than one breakpoint tier (e.g., both `md:` and `lg:`), create values for each distinct layout: `["Desktop", "Tablet", "Mobile"]`. Keep the default as the largest breakpoint since that matches the primary design target and the standard 1440px precapture viewport.

### 1b-iv. Extract prop-driven structural states

Scan the component source for React state hooks that control the visibility of overlays, modals, menus, dialogs, and other structural changes. These produce distinct visual states that designers need to see in Figma.

**Detection patterns:**

1. **State hooks controlling visibility:**

   ```tsx
   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   ```

2. **Conditional rendering of overlays:**

   ```tsx
   <ConfirmationDialog open={isDeleteDialogOpen} ... />
   <Sheet open={isSheetOpen} ... />
   {isLoading && <Spinner />}
   ```

3. **Portal-rendered components with trigger patterns:**
   ```tsx
   <MoreOptionsMenu trigger={<Button>...</Button>}>
     <MenuItem onClick={() => setIsDeleteDialogOpen(true)}>Delete</MenuItem>
   </MoreOptionsMenu>
   ```

**When to create a State axis:**

- At least one state hook controls an overlay (modal, dialog, menu, sheet, popover, drawer)
- The overlay produces a meaningfully different visual from the default resting state

**Axis creation:**

```json
{
  "property": "State",
  "values": ["Default", "Menu Open", "Delete Confirmation"],
  "defaultValue": "Default",
  "source": "prop-state",
  "stateConfig": {
    "Default": {
      "description": "Resting state — all overlays closed",
      "overlays": []
    },
    "Menu Open": {
      "description": "MoreOptionsMenu dropdown is visible",
      "overlays": [
        {
          "component": "MoreOptionsMenu",
          "trigger": "three-dot button",
          "content": ["MenuItem: Delete Customer (with Trash icon, destructive text)"],
          "position": "below-right of trigger"
        }
      ]
    },
    "Delete Confirmation": {
      "description": "ConfirmationDialog modal is visible",
      "overlays": [
        {
          "component": "ConfirmationDialog",
          "props": {
            "title": "Delete Customer",
            "description": "Are you sure you want to delete this customer? This action cannot be undone and will also delete all associated cases.",
            "confirmText": "Delete",
            "confirmClassName": "bg-red-600 hover:bg-red-700"
          },
          "position": "centered modal with backdrop"
        }
      ]
    }
  }
}
```

**State naming conventions:**

- Use descriptive names that match the user action: `Menu Open`, `Delete Confirmation`, `Loading`, `Error`, `Empty`
- Extract overlay content (menu items, dialog text, button labels) from the source code's JSX props
- Note the trigger element so Step 2 can position the overlay correctly

**What NOT to extract as states:**

- Hover/focus/disabled — these are CSS pseudo-states (source 2, step 1b-ii), not prop states
- Internal state that doesn't change the visual output (e.g., form field values, API loading that shows the same skeleton)
- Transient animations or transitions

**Combining with CSS pseudo-states:** If both 1b-ii (CSS states) and 1b-iv (prop states) produce a `State` axis, merge them into a single axis. CSS pseudo-states apply to the base component elements; prop states add overlay content. The representative set algorithm handles the combined axis.

### Future extension points (not implemented — noted for later)

These sources can be added to 1b when the skill encounters codebases that need them:

- **TypeScript union props**: `type?: 'Neutral' | 'Error'` — parse props interface, use `source: "typescript-prop"`
- **Boolean visual props**: `active?: boolean` — 2-value axis, use `source: "typescript-prop"`
- **Conditional class patterns**: `cn()` ternaries, style object lookups — use `source: "conditional-class"`

**Hold in memory:** `variantAxes`, `variantCombos`, `variantStrategy`, `totalPossibleCombinations`. Include in final write. Field rules:

- `variantAxes` — array of axis objects (each with `property`, `values`, `defaultValue`, `source`, and source-specific data like `classMap` or `stateStyles`). Empty array `[]` for single-variant components with no CSS states.
- `variantCombos` — array of combo objects, each mapping axis property names to values. For single-variant components: `[{}]` (one empty combo). Step 2b iterates this array to build each variant.
- `variantStrategy` — `"representative"` (default). Documents which algorithm produced the combos.
- `totalPossibleCombinations` — full cross-product count across all axes, for reference only.

---

## 1c. Identify icon and image usage

From the source code imports:

```tsx
import { Check, X, Loader2 } from 'lucide-react';
```

Map each icon to its `builtComponents` entry (e.g., `Icon/Check`) and note the size from className:

- `h-3 w-3` = 12x12
- `h-3.5 w-3.5` = 14x14
- `h-4 w-4` = 16x16
- `h-5 w-5` = 20x20
- `h-6 w-6` = 24x24

**Hold in memory:** `iconUsage` — array of `{ name, figmaComponent, size }` objects, where `figmaComponent` is the resolved Figma-space name (e.g., `"Icon/Star"`) and `size` is the pixel dimension. Include in final write.

---

## 1d. Identify instance reuse

Check if any child components in the source code are already in `builtComponents`. These should be instantiated rather than rebuilt:

```tsx
// Source has: <Button variant="primary">Save</Button>
// builtComponents has: { "Button": "123:45" }
// → Create an instance of Button, don't rebuild it
```

**The list you identify here is the contract Step 4a enforces.** Substituting a plain text node, a local frame, or any other hand-built mock for a child that exists in `builtComponents` is a **hard rejection** — even when the rest-state visual is pixel-identical. The skill's reason for existing is preserving design-system coupling (variant switching, master propagation, Code Connect snippets in Dev Mode); a text-node lookalike preserves none of that. Includes portal-rendered children like `ConfirmationDialog` — they must appear as detached examples, not be omitted.

**Hold in memory:** `childComponents` — array of child component objects. Include in final write. Field rules (this is both the Step 4a gate contract AND the Step 2 build manifest):

- One entry per _direct_ design-system child the source code uses. Each entry is an object:
  - `figmaName` — Figma-space name (`Icon/Star`, not `Star`; `EditableTitle`, not `./components/inline-edit`).
  - `nodeId` — the value from `builtComponents[figmaName]`. Step 2 uses this to call `figma.getNodeById(nodeId).createInstance()`.
  - `usageCount` — how many times this child appears in the source JSX. Step 2 creates this many instances.
  - `usages` — short descriptions of each usage (e.g., `["first name", "last name", "username"]`). Helps Step 2 map instances to the right positions and text overrides.
- Include every PascalCase import from `./components/`, `@/components/`, or `lucide-react` that resolves to a name in `builtComponents`. Resolution rule: `Star` (from `lucide-react`) → `Icon/Star`. `Button` (from `@/components/...`) → `Button`. Skip imports whose resolved name is not in `builtComponents` (those aren't design-system children).
- Portal-rendered children (`ConfirmationDialog`, `AlertDialog`, toasts) MUST be included with `usages` prefixed by `"portal:"`. The build represents them as detached examples; they are not exempt from the gate.
- Do NOT include the component itself or transitive grandchildren.

---

## 1e. Verify all child components exist in Figma (prerequisite gate)

After identifying all child components (sub-components and icons) from steps 1c and 1d, verify that **every one** exists in `builtComponents`. Build a list of required children:

- Every sub-component referenced in source code (from step 1d)
- Every icon referenced in source code (from step 1c), as `Icon/{Name}`

For each required child, check `builtComponents[childName]`. If the node ID is present, the child is available. If **any** child is missing:

**STOP — do not proceed to step 2.** Return immediately with a rejection result:

```json
{
  "componentName": "CaseDetails",
  "status": "rejected",
  "reason": "missing_children",
  "missingChildren": ["CaseComments", "Icon/Trash"],
  "availableChildren": ["Button", "CaseInformation", "Icon/Check"]
}
```

Write this result to `.temp/figma-from-code/build-results/{componentName}.json` so the orchestrator can see which children need to be built first.

**Standalone (no orchestrator)** — if the caller is the user directly, also surface the rejection in the conversation and ask how to proceed. Don't fall back to inlining the missing children, building stubs, or downgrading the build into "best effort" — those produce a different artifact than the skill is supposed to produce. The right options are: (a) build the missing children first in dependency order, (b) abandon the build, or (c) get explicit user authorization to deviate.

**Enforcement gate** — before you call `use_figma` to start building, run:

```bash
node ${CLAUDE_SKILL_DIR}/7-build-component/check-prereqs.js <componentName> <sourceFile.tsx>
```

The script reads imports from `sourceFile.tsx`, looks each one up in `.temp/figma-from-code/builtComponents.json`, and either writes `.temp/figma-from-code/prereqs/<componentName>.ok` (exit 0) or prints the rejection JSON and exits 1. A `PreToolUse` hook on `mcp__claude_ai_Figma__use_figma` blocks any `use_figma` call that creates a fresh component (contains `figma.createComponent()` with a `<var>.name = '<componentName>'` assignment) unless the matching `.ok` marker exists and is fresh (< 1 hour). The hook is configured at `.claude/hooks/figma-prereqs-gate.js`.

If the script reports `missing_children`, that _is_ the rejection — write it to the build-results file, surface it to the user (when standalone), and stop. Do not work around the hook by renaming the master, splitting `createComponent` across calls to evade the regex, or editing the hook itself.

Only proceed to step 1f and beyond if check-prereqs.js exits 0.

This step does not write to code.json — it is validation only.

---

## 1f. Plan text content

Use `textContent` (from `text.json`) for exact text strings. Never use generic placeholders like "Lorem ipsum" or "Button text". The text.json structure:

```json
{
  "full": "complete text content",
  "lines": ["line 1", "line 2"],
  "headings": ["Case Details"],
  "labels": ["Title", "Status"],
  "inputs": ["Enter case title"],
  "buttons": ["Save", "Cancel"],
  "icons": [{ "name": "Check", "size": "h-4 w-4" }]
}
```

**Hold in memory:** `textContent` — the full parsed contents of `text.json`. Omit if no `text.json` file exists. Include in final write.

> **If Step 1g will be skipped** (user confirmed no dev server): write the complete code.json here instead of waiting for 1g. Set `liveInspection: "skipped_no_dev_server"` (or `"skipped_explicitly"`), omit `computedStyles` and `states`. Do not proceed to 1g.

---

## 1g. Inspect live component in Playwright

Before building, inspect the actual rendered component in the browser to capture computed styles and interactive state screenshots. This provides ground-truth values that are more reliable than inferring from Tailwind classes alone — especially for resolved colors, inherited styles, and CSS variable chains.

Run `inspect-styles.js` against the component's selector on the dev server:

```bash
node ${CLAUDE_SKILL_DIR}/10-validator/inspect-styles.js \
  "<dev-server-url>/{route}" \
  --selector "{componentSelector}" \
  --output ".temp/figma-from-code/screenshots/{ComponentName}/"
```

This produces:

| File                   | Contents                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `computed-styles.json` | Key CSS properties from `getComputedStyle` (colors, spacing, typography, layout, borders, shadows) plus the element's class list, plus `layoutContext` (`element.offsetWidth/Height`, `parent.clientWidth` and box-model, `viewport`, and `derived.elementToParentRatio`) used by Step 1a for parent-context sizing promotion |
| `state-hover.png`      | Screenshot with `:hover` emulated — **only created if visually different from default**                                                                                                                                                                                                                                       |
| `state-focus.png`      | Screenshot with `:focus-visible` emulated — **only created if visually different**                                                                                                                                                                                                                                            |
| `state-disabled.png`   | Screenshot with `[disabled]` set — **only created if the element supports it and looks different**                                                                                                                                                                                                                            |
| `states.json`          | Index of which states were captured vs skipped, with per-state computed style diffs                                                                                                                                                                                                                                           |

**How to use the outputs:**

1. **`computed-styles.json`** — Use resolved color values (RGB) directly instead of tracing Tailwind → CSS variable → HSL → RGB. Use exact `fontSize`, `fontWeight`, `lineHeight`, `borderRadius`, `padding`, `gap` values to set Figma properties. These are the authoritative values.

2. **State screenshots** — Each captured state screenshot becomes a variant in the Figma component set. For example, if `state-hover.png` exists, create a `State=Hover` variant using the hover computed styles from `states.json`. If `state-focus.png` exists, create a `State=Focus` variant. Combine with any prop-based variants from step 1b (e.g., `Variant=primary, State=Hover`).

3. **Skipped states** — If `states.json` shows a state was skipped (`"reason": "no visual difference from default"`), do not create a variant for it.

**Batch mode** — inspect-styles can be pre-run in batch for all components in a tier:

```bash
node ${CLAUDE_SKILL_DIR}/10-validator/inspect-styles.js --batch manifest.json
```

Where `manifest.json` contains entries like:

```json
[
  {
    "url": "<dev-server-url>/example",
    "selector": "[data-component='Button']",
    "output": ".temp/figma-from-code/screenshots/Button/"
  },
  {
    "url": "<dev-server-url>/example",
    "selector": "[data-component='Input']",
    "output": ".temp/figma-from-code/screenshots/Input/"
  }
]
```

**Dev server is required — don't silently skip this step.**

The live-component inspection produces the authoritative ground truth for colors, spacing, typography, and interactive states. Skipping it means the build is inferred entirely from Tailwind classes and CSS variable chains, which routinely drifts from what the app actually renders. Only skip when the user has explicitly told you no dev server is available.

Decide what to do based on what the caller gave you:

1. **Orchestrator-dispatched call** — the orchestrator passes the dev server URL and per-component route/selector in the state ledger. Use those directly. If they're missing from the manifest, treat that as a state-ledger bug and report it back to the orchestrator; do not fall back to skipping.

2. **Standalone call (no orchestrator)** — before falling back to source-only analysis, determine whether a dev server is running:
   - Check the project for an obvious dev command (`package.json` `scripts.dev`, `npm run dev`, `vite`, etc.) and a likely URL (commonly `<dev-server-url>` for Vite, `localhost:3000` for Next.js/CRA). If memory contains a known dev server URL for this project, use that.
   - Probe the URL with a quick `curl -s -o /dev/null -w "%{http_code}" <url>` (or equivalent). If it responds, proceed with inspect-styles against it.
   - If no URL is reachable AND the user has not already told you a dev server is unavailable, **stop and ask the user**: "Is a dev server running for this project? If so, what's the URL and the route/selector for `{ComponentName}`?" Wait for the answer before continuing.
   - Only skip step 1g if the user explicitly says no dev server is available (or has said so earlier in the conversation). Record that decision in the result file's `notes` field so the omission is visible downstream.

3. **Auto/non-interactive mode** — if you cannot ask the user (e.g., running fully autonomously inside a batch), and probing finds no dev server, still attempt to start one if the project clearly supports it (e.g., `npm run dev &` with a port check loop). If starting the server isn't safe or appropriate, proceed without 1g but explicitly flag `"liveInspection": "skipped_no_dev_server"` in the result so the validator can re-check later.

**If the component has no known selector or route but the dev server IS running**, attempt to derive them: search the codebase for routes that render `{ComponentName}` (e.g., grep imports of the component file), and use a Playwright selector like `[data-component='{ComponentName}']`, the component's display class, or a text-content match from `text.json`. Only fall back to source-only analysis if this derivation also fails — and ask the user before doing so.

**Final write — write complete code.json now.** Merge all values held in memory since Step 0 (`layout`, `variantAxes`, `variantCombos`, `variantStrategy`, `totalPossibleCombinations`, `iconUsage`, `childComponents`, `textContent`) with the Step 1g values below, and overwrite the skeleton file written in Step 0 with the complete object in a single write.

Update `liveInspection` to one of `"complete"` / `"skipped_no_dev_server"` / `"skipped_explicitly"`. Update `computedStyles` and `states` with the full parsed contents of the corresponding files from Step 1g output. Omit `computedStyles` and `states` if Step 1g was skipped. If Step 1a's `layout.widthIntent` should be promoted based on `layoutContext` from `computed-styles.json`, update `layout` as well.
