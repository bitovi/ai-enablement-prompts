# Skill: Build Screens (Phase 4)

Builds full-page screen frames in Figma by composing built component instances into `screenBodySize` layouts (default 1440x900). Each screen assembles navigation, list panels, and detail/form panels using instances of components already created in Phase 3, then validates them visually against an app screenshot — iterating up to 3 fix passes to converge on visual fidelity.

> **All Figma MCP tools (`use_figma`, `get_screenshot`, etc.) are available.** This skill runs its entire workflow — analyze, build, screenshot, compare, fix — inline when dispatched by the orchestrator.

## When to Use

- When `figma-from-code` reaches Phase 4
- Standalone to rebuild screen layouts after component changes
- To add new screens after adding pages to the app

## Required Inputs

| Input                | Description                                                                                    | Source                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `screenName`         | PascalCase name (e.g., `CasesPage`, `CreateCasePage`)                                          | Route → PascalCase conversion                                |
| `route`              | URL path on the dev server (e.g., `/cases`, `/cases/new`)                                      | `component-map.json → routes`                                |
| `pageSourceFile`     | Path to the page's `.tsx` source                                                               | Component source discovery                                   |
| `fileKey`            | Figma file key                                                                                 | State ledger or caller                                       |
| `screensFrameId`     | Node ID of the Screens container to append into                                                | `state.json → figmaNodes`                                    |
| `appScreenshot`      | Path to the app screenshot PNG                                                                 | `.temp/figma-from-code/screenshots/screens/{name}/app.png`   |
| `textContent`        | Extracted text JSON from the live page                                                         | `.temp/figma-from-code/screenshots/screens/{name}/text.json` |
| `keyComponents`      | Top-level components rendered on the route + their descendants                                 | `component-map.json → tree`                                  |
| `builtComponents`    | Map of `{componentName: nodeId}` for all components built in Phase 3                           | `state.json → builtComponents`                               |
| `preExistingScreens` | Immutable snapshot of screen frames that existed in Figma BEFORE this orchestrator run started | `state.json → preExistingScreens` (Phase 0a snapshot)        |
| `screenshotDir`      | Directory for saving Figma screenshots and diff artifacts                                      | `.temp/figma-from-code/screenshots/screens/{name}/`          |

### Optional Inputs

| Input            | Description                                                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `computedStyles` | Resolved CSS values from `computed-styles.json` (produced by `inspect-styles.js` against the page root). Authoritative for colors, spacing, typography on screen chrome (the page's own elements, not its component children) |
| `screenBodySize` | Body dimensions read from `state.json → screenBodySize` if the project uses a non-default screen size (default 1440x900)                                                                                                      |

> **Config placeholders** like `{pagesRoot}` resolve from `state.json → config` (fields: `devServerUrl`, `devServerStart`, `sourceDir`, `componentsRoot`, `pagesRoot`, `cssPath`, `tailwindConfigPath`, `iconLibrary`, `skillRoot`).

---

## Pre-Existing Screens Rule

Before doing any work that resolves to a node ID in `preExistingScreens`, **stop**. That node existed in Figma before this run; modifying it (rebuild, resize, delete + recreate, restructure) requires explicit user authorization.

Concretely:

- If `screenName` itself maps to a node in `preExistingScreens` and the caller's intent is to **rebuild** that node: write a result file with `"status": "needs_authorization"` and `"preExistingTouched": ["<name>"]`, then return. Do not call `use_figma` to delete, replace, resize, or restyle the existing node. Building a _fresh_ screen with the same name into the same `screensFrameId` is also a modification (creates a duplicate the orchestrator must reconcile) — don't do it without authorization.
- Instancing a component that is itself in `preExistingComponents` is fine — that's reuse, not modification.
- The fix-loop in Step 5 must never edit a node in `preExistingScreens`. If the comparison says you need to, escalate to the orchestrator instead.

This rule overrides Steps 2–5 of the workflow when in conflict.

---

## Execution Mode

The orchestrator dispatches one subagent per screen. Each subagent runs the **entire workflow** (Steps 1–7) independently — analyze, build via `use_figma`, screenshot via `get_screenshot`, compare, fix loop, and return results.

The subagent writes its result to `.temp/figma-from-code/build-results/screens/{screenName}.json`. The orchestrator collects results after all subagents complete using `collect-screen-results.js`.

Screens can run in parallel — they only instantiate (not modify) already-built Phase 3 components.

### Agent Prompt Template

The orchestrator dispatches one agent per screen. Send all agents in a **single message** so they run in parallel.

```
Build a Figma screen frame by composing built component instances, then validate visually.

Follow this skill's workflow (all 7 steps):
0. Verify all referenced components exist in builtComponents
1. FIRST study the app screenshot to understand what the default view shows,
   THEN analyze the page source — only include components visible in the screenshot.
   Exclude components behind conditional branches (ternaries, state guards, URL params)
   and portal-rendered overlays (Dialog, Sheet, etc.) that aren't visible by default.
2. Build the screen in Figma via use_figma (`screenBodySize` frame, default 1440x900)
3. Screenshot the result via get_screenshot
4. Structural check (content must match), then sizing check, then pixel diff
5. If mismatch, diagnose and fix (up to 3 iterations)
6. Write figma-screen.json tracking file
7. Write results to .temp/figma-from-code/build-results/screens/{screenName}.json

Inputs:
- Screen name: {screenName}
- Route: {route}
- Page source file: {pageSourceFile}
- Figma file key: {fileKey}
- Screens frame node ID: {screensFrameId}
- App screenshot: .temp/figma-from-code/screenshots/screens/{screenName}/app.png
- Text content: .temp/figma-from-code/screenshots/screens/{screenName}/text.json
- Screenshot dir: .temp/figma-from-code/screenshots/screens/{screenName}/
- Built components (for instance reuse): .temp/figma-from-code/builtComponents.json
- Pre-existing screens (DO NOT MODIFY): {JSON.stringify(preExistingScreens)}

Read plugins/figma-from-code/skills/figma-from-code/8-build-screens/SKILL.md for the full workflow,
fixSizing() function, variant resolution, and common pitfalls.
```

---

## Workflow

```
Step 0    Prereqs       Verify all referenced components exist in builtComponents
Step 1    Analyze       Study appScreenshot first, then read page source; filter out non-default conditional branches
Step 2    Build         Create the screen frame in Figma via use_figma
Step 3    Screenshot    Capture the Figma result via get_screenshot
Step 4    Compare       Structural check + sizing sanity check + pixel diff against the app screenshot
Step 5    Fix Loop      If mismatch, diagnose and fix (up to 3 iterations)
Step 6    Track         Write figma-screen.json into the page folder
Step 7    Return        Report result with node ID, match score, and any remaining issues
```

---

## Step 0: Verify all components exist (prerequisite gate)

Before building any screen, verify that **every component** referenced by the screen exists in `builtComponents` from `state.json`.

Identify the screen's key components from `component-map.json → tree` (the top-level components on that route and all their descendants). Check each one against `builtComponents`. Also check every icon imported by the page source (e.g., `Icon/Check`).

If **any** component or icon is missing from `builtComponents`:

**STOP — do not proceed to Step 1.** Return immediately with a rejection result:

```json
{
  "screenName": "CasesPage",
  "status": "rejected",
  "reason": "missing_components",
  "missingComponents": ["CaseDetails", "MenuList"],
  "missingIcons": ["Icon/Trash"],
  "availableComponents": ["AppHeader", "Sidebar", "Button"]
}
```

Write this to `.temp/figma-from-code/build-results/screens/{screenName}.json` so the orchestrator can see what's missing.

**Standalone (no orchestrator)** — if the caller is the user directly, surface the rejection in the conversation and ask how to proceed. Don't fall back to inlining the missing components, building stubs, or downgrading the build into "best effort" — those produce a different artifact than the skill is supposed to produce. The right options are: (a) build the missing components first via `plugins/figma-from-code/skills/figma-from-code/7-build-component/SKILL.md`, (b) abandon the screen, or (c) get explicit user authorization to deviate.

Only proceed to Step 1 if every required component and icon is confirmed present.

---

## Step 1: Analyze the Screen

Before writing any `use_figma` code, analyze all inputs to plan the screen structure.

> **Pre-flight: dev server is required for Step 1f (live inspection).** Step 1f — inspecting the rendered page in a browser via `inspect-styles.js` — is the authoritative source for colors, spacing, and layout on the page chrome (the elements the page itself renders, outside of component children). **Do not silently skip it.** If you don't already have a dev server URL (from the orchestrator state ledger, project memory, or the caller's arguments), pause and ask the user for one before proceeding past Step 1. Only skip Step 1f if the user explicitly says no dev server is available.

### 1-pre. Screenshot-first composition (MANDATORY)

**Before reading source code, look at `appScreenshot` (app.png).** This screenshot shows the ACTUAL default view of the page as rendered in the browser with no user interaction. It is the **ground truth** for what the screen should look like.

Study the screenshot and identify:

- Which regions are visible (sidebar, main content area, detail panels, headers, footers)
- Whether the main content area shows populated data or an empty/placeholder state (e.g., "No case selected", "Select an item")
- Which component instances are actually rendered vs hidden by conditional logic
- Whether any overlays, dialogs, or menus are open (they should not be in the default state)

**The source code analysis in Steps 1a–1b must MATCH what the screenshot shows, not the full component tree from the JSX.** If the source code contains components behind conditional branches that are not visible in the screenshot, those components must be excluded from composition.

### 1a. Identify the page composition

Read the page source file and determine:

- **Layout direction**: Is the page root a vertical stack (`flex-col`), horizontal row (`flex`, `flex-row`), or a grid (`grid`)?
- **Sizing**: Screens are **always fixed** at `screenBodySize` (default 1440x900; read from `state.json → screenBodySize`). The outermost screen frame is `primaryAxisSizingMode='FIXED'` and `counterAxisSizingMode='FIXED'`. Capture this explicitly — Step 4a verifies it.
- **Container children**: What is the top-level region structure? Typical pages have: top nav (full width), sidebar (fixed width), main content (fill), or a hero + sections stack. Identify each region and which built component instance lives there.
- **Spacing**: `gap-*` classes on the page root map to `itemSpacing`. `p-*`, `px-*`, `py-*` map to padding.
- **Background**: `bg-*` class on the page root. Resolve through CSS variables if needed (see Step 1g of `plugins/figma-from-code/skills/figma-from-code/7-build-component/step-1-analyze.md` for the full chain).

### 1b. Identify component instances (default state only)

Walk the page source JSX and list component references, but **only include components visible in the default state** (as shown in `appScreenshot` from Step 1-pre).

For each included component:

- Map it to `builtComponents[name]` — that's the node ID to instantiate
- Note the variant props passed in code (e.g., `<Button variant="primary" size="lg">`) — these resolve to a specific variant inside the component set
- Note any sizing classes applied at the call site (`className="w-full"`, `className="flex-1"`) — these translate to `layoutSizingHorizontal='FILL'` etc. on the instance

```tsx
// Source has: <Sidebar className="w-64" />
// builtComponents has: { "Sidebar": "230:5" }
// → Instantiate Sidebar at fixed width 256 inside the page frame
```

#### Conditional rendering analysis

When walking the JSX, identify and handle conditional patterns:

1. **Ternary expressions** (`condition ? <A /> : <B />`): Determine which branch is visible when the page first loads with no user interaction and no URL params beyond the base route. Cross-reference with `appScreenshot` — only include the branch that matches.

   ```tsx
   // Example: {id ? <CaseDetails /> : <EmptyState />}
   // If appScreenshot shows "No case selected" → include EmptyState, EXCLUDE CaseDetails
   ```

2. **URL-param-gated components**: For components guarded by `useParams()` values (e.g., `id ? <Detail /> : <Fallback />`), use the param-absent branch as default since the screen captures the base route.

3. **State-hook-gated components**: Components behind `useState(false)` or `useState(null)` guards are hidden by default — exclude them.

   ```tsx
   // Example: const [isOpen, setIsOpen] = useState(false);
   // {isOpen && <Modal />}  → EXCLUDE Modal from default screen
   ```

4. **Logical AND guards** (`{flag && <C />}`): Exclude unless the guard's initial value is truthy.

**DO NOT** compose components from non-default conditional branches. Those belong in separate screen variants if the pipeline supports them.

#### Portal-rendered overlay exclusion

Portal-rendered overlays — Dialog, Sheet, ConfirmationDialog, DropdownMenu, Popover, Drawer, AlertDialog, Tooltip, etc. — are **NEVER** visible in the default resting state. Exclude them from screen composition unless the `appScreenshot` explicitly shows them open.

These components are already handled by the component-level State axis in Phase 3 (see `7-build-component/step-1-analyze.md` → "Conditional rendering of overlays"). Do not duplicate them in the screen frame.

### 1c. Identify icon usage on the page chrome

If the page renders any Lucide icons directly (not via a child component), map each to its `builtComponents` entry (`Icon/{Name}`) and size from the className. See Step 1c of `plugins/figma-from-code/skills/figma-from-code/7-build-component/step-1-analyze.md` for the size mapping table.

### 1d. Plan text content

Use `textContent` (from `text.json`) for any text the page itself renders (page titles, section headings, empty states). Never use generic placeholders. Text rendered _inside_ a component instance is handled by that component's own master — don't try to override it from the screen.

### 1e. Identify pre-existing screen conflicts

Check whether `screenName` is in `preExistingScreens`. If yes — apply the **Pre-Existing Screens Rule** above and stop.

### 1f. Inspect the live page in Playwright

Before building, inspect the actual rendered page in the browser to capture computed styles on the page chrome. This provides ground-truth values for the page-level background, padding, and layout — more reliable than inferring from Tailwind classes alone.

Run `inspect-styles.js` against the page root selector on the dev server:

```bash
node {skillRoot}/10-validator/inspect-styles.js \
  "{devServerUrl}/{route}" \
  --selector "[data-page='{ScreenName}'], main, #root > div" \
  --output ".temp/figma-from-code/screenshots/screens/{ScreenName}/"
```

This produces:

| File                   | Contents                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `computed-styles.json` | Resolved CSS properties on the page root (background, padding, layout direction, gap), the element's class list, and `layoutContext` (viewport, offsetWidth/Height) |

**How to use the outputs:**

Use exact `padding` and `gap` values to set Figma properties — these are the authoritative values for the page chrome. For **colors**, the computed RGB values are authoritative for *what* the color is, but not for *how* to apply it: reverse-match each one against the variable index first (`node {skillRoot}/10-validator/resolve-color.js 'rgb(...)' --context fill`) and bind the matched variable (see §2e). Hardcode the RGB only when the match is `"none"`.

**Dev server is required — don't silently skip this step.**

See Step 1g of `plugins/figma-from-code/skills/figma-from-code/7-build-component/step-1-analyze.md` for the full decision tree: orchestrator-dispatched vs standalone vs auto/non-interactive, how to derive selectors, and when escalation to the user is required.

---

## Step 2: Build the Screen in Figma

### 2a. Create the screen frame

```javascript
// use_figma
const screensFrame = figma.getNodeById('{screensFrameId}');
screensFrame.layoutWrap = 'WRAP';
screensFrame.counterAxisSpacing = 80;

const screen = figma.createFrame();
screen.name = '{screenName}';
screen.resize(1440, 900); // or screenBodySize values
screen.layoutMode = '{VERTICAL or HORIZONTAL}'; // from page root direction
screen.primaryAxisSizingMode = 'FIXED';
screen.counterAxisSizingMode = 'FIXED';
screen.itemSpacing = { gapValue };
screen.paddingTop = { pt };
screen.paddingBottom = { pb };
screen.paddingLeft = { pl };
screen.paddingRight = { pr };
screen.fills = [{ type: 'SOLID', color: { ...pageBackground } }];
// Bind the background variable when §2e reverse-match found one (it almost always does):
// screen.setBoundVariable('fills', 0, await figma.variables.getVariableByIdAsync('{backgroundVariableId}'));
screen.clipsContent = true;

// ... add region frames and component instances (Step 2b) ...

screensFrame.appendChild(screen); // do NOT set x/y — wrap layout positions it
return JSON.stringify({ name: screen.name, id: screen.id });
```

### 2b. Add component instances

For each component identified in Step 1b:

```javascript
const comp = figma.getNodeById(builtComponents['{ComponentName}']);

// If component is a COMPONENT_SET, resolve the target variant
let master = comp;
if (comp.type === 'COMPONENT_SET') {
  const targetProps = { Variant: 'primary', Size: 'regular' }; // from source props
  master =
    comp.children.find((child) =>
      Object.entries(targetProps).every(
        ([k, v]) => child.variantProperties?.[k]?.toLowerCase() === v.toLowerCase()
      )
    ) ?? comp.children[0];
}

const instance = master.createInstance();
// Apply call-site sizing classes
if (callSiteHasWFull) instance.layoutSizingHorizontal = 'FILL';
if (callSiteHasFlex1) instance.layoutSizingHorizontal = 'FILL';
if (callSiteHasHFull) instance.layoutSizingVertical = 'FILL';
parent.appendChild(instance);
```

### 2c. Add region frames for nested layout

When the page source nests multiple components inside a layout container (e.g., a sidebar + main content row), create a region frame:

```javascript
const row = figma.createFrame();
row.layoutMode = 'HORIZONTAL';
row.primaryAxisSizingMode = 'FIXED';
row.counterAxisSizingMode = 'FIXED';
row.layoutSizingHorizontal = 'FILL';
row.layoutSizingVertical = 'FILL';
row.itemSpacing = 0;
row.fills = [];
// ... append child instances ...
screen.appendChild(row);
```

### 2d. Tailwind-to-Figma mapping

> Read `{skillRoot}/7-build-component/figma-utils.md` for the canonical `fixSizing()` definition and the Tailwind→Figma mapping table.

### 2e. Resolving page background colors

When the page root uses semantic colors (`bg-background`, `bg-muted`), resolve and **bind the Figma variable** — page chrome colors are exactly the colors that should stay coupled to tokens. The reverse-match-before-hardcode rule from `7-build-component/step-2-build.md` §2e Step 0 applies to screens too:

1. Resolve the class or the computed RGB from `computed-styles.json` (Step 1f) via the lookup CLI:
   ```bash
   node {skillRoot}/10-validator/resolve-color.js 'bg-background' --context fill
   # or, from computed styles:
   node {skillRoot}/10-validator/resolve-color.js 'rgb(255, 255, 255)' --context fill
   ```
2. On `match: "exact"` or `"tolerance"`, set the fill then bind: `screen.setBoundVariable('fills', 0, await figma.variables.getVariableByIdAsync('{id}'))`.
3. Only on `match: "none"`, hardcode the RGB from `computed-styles.json`.

(If `tailwindConfigPath` is null in state, class-based lookups still work — the CLI falls back to stripping known prefixes and matching CSS variable names directly.)

---

## Step 3: Screenshot the Figma Result

```
get_screenshot(fileKey, screenFrameId)
```

Save to `{screenshotDir}/figma.png`:

```bash
curl -sL "{image_url}" -o "{screenshotDir}/figma.png"
```

---

## Step 4: Compare Against App Screenshot

### 4-pre. Structural match check (run BEFORE sizing or pixel checks)

Before running any automated comparison, **visually inspect both `app.png` and `figma.png`** side by side. Check whether the two images show the same content structure:

- Do both show the same regions filled with the same type of content (list, detail, empty state)?
- Does one show an empty state ("No case selected") while the other shows a populated detail view?
- Are there overlays, dialogs, or menus visible in the Figma screenshot that don't appear in the app screenshot?
- Are there entire sections present in one but missing in the other?

If the two images show **fundamentally different content** — not just styling differences, but different components or states entirely — flag as `structural_mismatch`. This indicates the composition in Step 1b included wrong conditional branches and the screen must be rebuilt, not patched.

A `structural_mismatch` **overrides any pixel score**. Do not accept a high match percentage as valid when the content is visibly different — structural similarity in shared chrome (headers, sidebars) can inflate pixel scores even when the main content area is completely wrong.

```json
"comparison": {
  "structuralCheck": {
    "verdict": "pass" | "structural_mismatch",
    "issues": ["Figma shows case detail view but app shows empty state 'No case selected'"]
  }
}
```

If `structural_mismatch`: enter Step 5 fix loop, but the fix is to **re-run Step 1b** with stricter screenshot-informed filtering, not to patch colors or spacing.

### 4a. Sizing sanity check (run BEFORE the pixel compare)

A pixel diff against `app.png` can pass even when the screen is built much smaller than 1440x900 — most commonly when the outermost frame collapsed to hug content. Run this check first; it is independent of the screenshot.

Inspect the built screen (`use_figma`) and read its top-level frame:

```javascript
const node = figma.getNodeById('{screenNodeId}');
const built = {
  w: Math.round(node.width),
  h: Math.round(node.height),
  primaryAxisSizingMode: node.primaryAxisSizingMode,
  counterAxisSizingMode: node.counterAxisSizingMode,
  layoutMode: node.layoutMode,
};
```

Compare against the expected screen body size (default 1440x900, or `screenBodySize` from state):

| Check                  | Pass criteria                                                                                   | Flag if …                             |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| Width                  | `built.w === expectedW ± 2px`                                                                   | Off by more than 2px                  |
| Height                 | `built.h === expectedH ± 2px`                                                                   | Off by more than 2px                  |
| Sizing modes           | `primaryAxisSizingMode === 'FIXED'` AND `counterAxisSizingMode === 'FIXED'`                     | Either is `'AUTO'`                    |
| Layout mode            | Set (`'VERTICAL'` or `'HORIZONTAL'`)                                                            | `'NONE'` — children won't auto-layout |
| Top-level region count | Matches the page source structure (e.g., 2 for nav + body, 3 for header + sidebar row + footer) | Region count differs from source      |
| Fill children          | Any child whose call-site has `flex-1` / `w-full` has `layoutSizingHorizontal='FILL'`           | Source says fill, built says hug      |

If any check fails, **treat this as a `size_mismatch` discrepancy and feed it into Step 5 alongside (or before) the pixel diff results.** Do not declare a match based on pixel score alone if the sizing check failed — pixel match against a too-small `app.png` is a false positive.

Record the sizing check result in the eventual result file:

```json
"comparison": {
  "sizingCheck": {
    "verdict": "pass" | "fail",
    "issues": ["counterAxisSizingMode='AUTO' (expected FIXED)", "built height 412 (expected 900)"],
    "builtSize": {"w": 1440, "h": 412},
    "expectedSize": {"w": 1440, "h": 900}
  },
  "matchPct": 95.26,
  ...
}
```

### 4b. Pixel diff comparison

Run the pixel diff comparison:

```bash
node {skillRoot}/10-validator/compare.js \
  "{screenshotDir}/app.png" \
  "{screenshotDir}/figma.png" \
  "{screenshotDir}/"
```

This produces:

- `diff.png` — red pixels mark differences, matching pixels dimmed
- `comparison.json` — `{ matchPct, borderMatchPct, verdict, borderVerdict }`

**Verdict thresholds (combined with Step 4a result):**

- 4a passed AND `matchPct >= 88%` AND `borderMatchPct >= 80%` → **match** (done)
- 4a failed (regardless of pixel score) → **size_mismatch** (needs fixing — fix sizing first, then re-screenshot, then re-run 4a + 4b)
- 4a passed AND `matchPct 72-88%` or `borderMatchPct < 80%` → **minor_diff** (needs fixing)
- 4a passed AND `matchPct < 72%` → **mismatch** (needs fixing)

Screen thresholds are slightly more lenient than component thresholds because screens contain many instances whose internal pixels are already validated at the component level — a small per-instance drift compounds across the page.

A passing pixel verdict alone is NOT enough — 4a must also pass. Otherwise the build is silently wrong-sized and the validation phase will reject it later.

If no app screenshot exists (`appScreenshot` is null), skip pixel comparison — but still run Step 4a. Report `no_app_reference` only if 4a also passes; otherwise report `size_mismatch`.

---

## Step 5: Fix Loop (Up to 3 Iterations)

If the verdict is `minor_diff`, `mismatch`, or `size_mismatch`, enter the fix loop.

### Per-iteration process

**5a. Diagnose the discrepancy**

Use all five inputs together to identify specific differences:

1. **Step 4a sizing check result** — if it failed, address sizing FIRST. A wrong-sized screen will mask everything else and will re-fail validation later.
2. **Read `diff.png`** — red regions show exactly where pixels differ
3. **Read `app.png`** — what the screen should look like
4. **Read `figma.png`** — what was actually built
5. **Read page source `.tsx`** — Tailwind classes reveal intended values

Cross-reference to identify the exact Figma properties that need correction. Common screen-level discrepancy patterns:

| Symptom                                             | Likely Cause                                                           | Fix                                                                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4a failed** (frame collapsed to hug)              | Outermost frame has `*SizingMode='AUTO'`                               | `node.primaryAxisSizingMode='FIXED'; node.counterAxisSizingMode='FIXED'; node.resizeWithoutConstraints(1440, 900)`. Order matters — modes before resize. |
| **4a failed** (region didn't fill width)            | Child region missing `layoutSizingHorizontal='FILL'`                   | Set `child.layoutSizingHorizontal='FILL'` (and `Vertical` if appropriate)                                                                                |
| Sidebar / header in wrong position                  | Layout direction wrong, or x/y manually set inside auto-layout         | Set `screen.layoutMode` correctly; remove any manual x/y assignments                                                                                     |
| Component instance shows wrong variant              | Targeted the wrong variant during Step 2b                              | `instance.setProperties({ Variant: 'secondary' })` or recreate from correct master                                                                       |
| Whole page shifted by ~24px                         | Wrong padding on the screen frame                                      | Adjust `paddingTop/Bottom/Left/Right`                                                                                                                    |
| Background color wrong                              | Wrong fill on the screen frame                                         | Adjust `screen.fills` — prefer `computed-styles.json` resolved RGB                                                                                       |
| Two components touching where source has gap        | Wrong `itemSpacing` on the parent region                               | Set `region.itemSpacing` to match source `gap-*` class                                                                                                   |
| Missing region (e.g., footer absent)                | Region frame not created during Step 2c                                | Add the missing region with its children                                                                                                                 |
| Component appears tiny in the corner                | Instance added before auto-layout was set, or appended to wrong parent | Re-parent the instance; verify `screen.layoutMode` is set before appending children                                                                      |
| Screen positioned at wrong x/y inside Screens frame | Manual x/y set despite `screensFrame.layoutWrap='WRAP'`                | Remove x/y assignments — let the wrap layout position it                                                                                                 |

**5b. Apply the fix via `use_figma`**

Write a targeted fix — change only the properties identified in diagnosis:

```javascript
// use_figma — fix specific property
const node = figma.getNodeById('{nodeId}');
node.primaryAxisSizingMode = 'FIXED';
node.counterAxisSizingMode = 'FIXED';
node.resizeWithoutConstraints(1440, 900);
fixSizing(node, { exemptRoot: true }); // root stays FIXED, descendants may auto
return 'fixed';
```

**5c. Re-screenshot and re-compare**

```
get_screenshot(fileKey, screenFrameId)
```

Save to `{screenshotDir}/figma.png` (overwrite previous).

```bash
node {skillRoot}/10-validator/compare.js \
  "{screenshotDir}/app.png" \
  "{screenshotDir}/figma.png" \
  "{screenshotDir}/"
```

**5d. Evaluate and continue or stop**

- If verdict is now `match` → exit loop, report as fixed
- If verdict improved but still `minor_diff`, `mismatch`, or `size_mismatch` → continue to next iteration
- If iteration count reaches 3 → exit loop, report remaining issues

### Structural audit (run before first comparison if issues suspected)

```javascript
// use_figma
function auditScreen(node) {
  const issues = [];
  if (node.layoutMode === 'NONE') {
    issues.push({ type: 'no_layout_mode', node: node.id, name: node.name });
  }
  if (node.primaryAxisSizingMode === 'AUTO' || node.counterAxisSizingMode === 'AUTO') {
    issues.push({ type: 'screen_not_fixed', node: node.id });
  }
  for (const child of node.children) {
    if (child.x !== 0 && child.parent?.layoutMode && child.parent.layoutMode !== 'NONE') {
      issues.push({ type: 'manual_xy_in_autolayout', node: child.id });
    }
  }
  return issues;
}
const node = figma.getNodeById('{screenNodeId}');
return JSON.stringify(auditScreen(node));
```

Fix structural issues before screenshotting — manual x/y inside an auto-layout parent causes silent layout drift, and missing `layoutMode` collapses all children to (0,0).

---

## Step 6: Write figma-screen.json tracking file

Write a tracking record to the page's source folder so the codebase has a durable link back to the Figma screen node.

**Path:** Resolve from `pageSourceFile`. If the page is `{pagesRoot}/CasesPage.tsx`, write to `{pagesRoot}/CasesPage.figma-screen.json`. If pages live in a folder (`{pagesRoot}/CasesPage/index.tsx`), write to `{pagesRoot}/CasesPage/figma-screen.json`.

**Schema:**

```json
{
  "fileKey": "{figmaFileKey}",
  "nodeId": "{screenFrameId}",
  "url": "https://figma.com/design/{fileKey}?node-id={nodeIdWithDashes}",
  "screenName": "CasesPage",
  "route": "/cases",
  "createdAt": "2026-05-15T14:32:00Z",
  "updatedAt": "2026-05-15T14:32:00Z"
}
```

**Read-then-write semantics:**

1. If `figma-screen.json` already exists at the target path: parse it, preserve the existing `createdAt`, and refresh `nodeId`, `url`, `updatedAt` (and `screenName`/`route` if they changed) with current values.
2. If it does not exist: write a fresh file with `createdAt` and `updatedAt` both set to the current ISO 8601 UTC timestamp.

**Failure handling:** if the write fails (permission, missing parent path that can't be created), log the failure and continue — do not fail the build. Surface the failure in the Step 7 return result under a `trackingFile` field with `{ written: false, error: "..." }` so the orchestrator can report it.

---

## Step 7: Return Result

Return a structured result for the caller:

```json
{
  "screenName": "CasesPage",
  "nodeId": "600:1",
  "route": "/cases",
  "comparison": {
    "matchPct": 92.4,
    "borderMatchPct": 86.0,
    "verdict": "match",
    "iterations": 1,
    "fixes": ["counterAxisSizingMode AUTO -> FIXED, resize to 1440x900"],
    "sizingCheck": {
      "verdict": "pass",
      "builtSize": { "w": 1440, "h": 900 },
      "expectedSize": { "w": 1440, "h": 900 }
    }
  },
  "figmaScreenshot": ".temp/figma-from-code/screenshots/screens/CasesPage/figma.png",
  "trackingFile": {
    "written": true,
    "path": "{pagesRoot}/CasesPage.figma-screen.json"
  }
}
```

If no app screenshot was available:

```json
{
  "screenName": "EmptyStatePage",
  "nodeId": "600:9",
  "route": "/empty",
  "comparison": {
    "verdict": "no_app_reference",
    "matchPct": null,
    "iterations": 0,
    "sizingCheck": {
      "verdict": "pass",
      "builtSize": { "w": 1440, "h": 900 },
      "expectedSize": { "w": 1440, "h": 900 }
    }
  }
}
```

If rejected for missing components:

```json
{
  "screenName": "CasesPage",
  "status": "rejected",
  "reason": "missing_components",
  "missingComponents": ["CaseDetails"]
}
```

### Aggregate output

Across all screens, write `.temp/figma-from-code/build-screens.json`:

```json
{
  "screens": [
    {
      "name": "CasesPage",
      "nodeId": "600:1",
      "verdict": "match",
      "matchPct": 92.4,
      "iterations": 1
    }
  ],
  "failed": [],
  "rejected": []
}
```

---

## fixSizing() — for descendants, not the screen root

> Read `{skillRoot}/7-build-component/figma-utils.md` for the canonical `fixSizing()` definition and the Tailwind→Figma mapping table.

The screen frame itself must stay `FIXED` on both axes (`screenBodySize`, default 1440x900). Descendant frames may need `fixSizing()` to release height locks introduced by `resize()` calls. Call it with `{ exemptRoot: true }` to preserve the root frame's FIXED sizing while releasing descendants.

Call `fixSizing(screen, { exemptRoot: true })` after composition — the root stays at FIXED `screenBodySize` (default 1440x900) while descendants are released to grow with content.

---

## Common Pitfalls

| Pitfall                                                 | Prevention                                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Screen frame collapses to hug content                   | Set `primaryAxisSizingMode='FIXED'` and `counterAxisSizingMode='FIXED'` BEFORE `resize(1440, 900)` |
| Children stacked at (0,0)                               | `screen.layoutMode` not set — children need an auto-layout parent to position                      |
| Screen positioned at hardcoded x/y inside Screens frame | Use `screensFrame.layoutWrap='WRAP'` + `appendChild`; never set x/y                                |
| Wrong component variant rendered                        | Resolve `COMPONENT_SET` to the specific variant matching source props before `createInstance()`    |
| Sidebar appears as a thin strip                         | Forgot `layoutSizingVertical='FILL'` on the sidebar instance                                       |
| Page background missing                                 | Set `screen.fills` to the resolved page-root background, or `[]` if transparent                    |
| Manual padding inside an auto-layout child              | Use parent `itemSpacing` for gaps, child `padding*` for insets — never manual x offsets            |
| `fixSizing()` collapsed the screen to hug               | Always pass `{ exemptRoot: true }` when calling `fixSizing` on the screen frame                    |
| Modifying a pre-existing screen without authorization   | Check `preExistingScreens` in Step 1e before building                                              |
| Wrong-text inside component instance                    | Don't override component instance text from the screen — the component master owns its text        |
| Screen shows non-default conditional branch             | Study `appScreenshot` in Step 1-pre; exclude components behind ternaries/guards that aren't visible |
| Portal overlay (Dialog, Sheet, etc.) visible on screen  | Portals are never visible by default — exclude unless `appScreenshot` explicitly shows them open    |
| High pixel match but fundamentally different content    | Run Step 4-pre structural check; don't trust pixel score when content structure differs             |

---

## Error Handling

| Scenario                                 | Action                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Component missing from `builtComponents` | Reject the entire build — return `status: "rejected"` with the missing components list (Step 0)                                        |
| Icon missing from `builtComponents`      | Reject — return `status: "rejected"` with the missing icon in `missingIcons` (Step 0)                                                  |
| `use_figma` fails                        | Diagnose error, fix script, retry once. If it fails again, return screen as `failed`                                                   |
| `use_figma` incremental limit            | Split the build across multiple `use_figma` calls. Create the screen frame and regions first, then append instances in follow-up calls |
| `get_screenshot` fails                   | Retry once. If still failing, return screen as built but unvalidated                                                                   |
| `compare.js` fails                       | Report comparison error, return the screen with `nodeId` but no match score                                                            |
| App screenshot missing                   | Build from source code alone, run Step 4a sizing check, report `no_app_reference` if 4a passes                                         |
| Pre-existing screen targeted             | Return `status: "needs_authorization"` with `preExistingTouched` — do not modify                                                       |
| Dev server unavailable for Step 1f       | Ask the user (standalone) or flag `liveInspection: "skipped_no_dev_server"` (auto mode)                                                |

Never fail silently. Every error or skip must appear in the returned result.
