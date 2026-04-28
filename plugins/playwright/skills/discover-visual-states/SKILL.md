---
name: discover-visual-states
description: Discover all visual states of a component by interactively exploring the production baseline page — not by reading story files. Finds every interactive element (nav items, dropdowns, toggles, buttons) that produces a distinct visual state, records the interactions needed to reach each one, and saves a pixel-perfect.config.json that the pixel-perfect skill uses to replay those same interactions on both production and Storybook. Run this once per component; re-run when the production page changes.
---

# Skill: Discover Visual States

Explore the production page to discover every distinct visual state a component can be in. Save the interactions needed to reach each state to `pixel-perfect.config.json`. The pixel-perfect skill then replays those same interactions on both production and Storybook — no separate story per state required.

---

## When to Use

- Before running `pixel-perfect` on a component for the first time
- When the production page has gained new interactive states
- When `pixel-perfect.config.json` does not exist yet for a component

## When NOT to Use

- When `pixel-perfect.config.json` already exists and is up to date (pixel-perfect will tell you)
- For components with no interactive states (config will just have the default state)

---

## Inputs

| Input | Required | Example |
|-------|----------|---------|
| Baseline URL | Yes | `https://www.bitovi.com` |
| Component scope hint | Yes | `navbar`, `header nav`, `[aria-label="Main navigation"]` — narrows which part of the page to inspect |
| Storybook default story URL | Yes | `http://localhost:6007/iframe.html?id=components-meganavbar--default&viewMode=story` |
| Config output path | Auto-derived | `temp/MegaNavBar/pixel-perfect.config.json` — always `temp/{ComponentName}/pixel-perfect.config.json` |

---

## Output: pixel-perfect.config.json

```json
{
  "baselineUrl": "https://www.bitovi.com",
  "storybookUrl": "http://localhost:6007/iframe.html?id=components-meganavbar--default&viewMode=story",
  "configPath": "temp/MegaNavBar/pixel-perfect.config.json",
  "states": [
    {
      "label": "default",
      "description": "Component in resting state — no interactions",
      "interactions": []
    },
    {
      "label": "services-dropdown",
      "description": "Services dropdown open",
      "interactions": [
        { "type": "hover", "target": "text:Services" }
      ]
    },
    {
      "label": "our-work-dropdown",
      "description": "Our work dropdown open",
      "interactions": [
        { "type": "hover", "target": "text:Our work" }
      ]
    },
    {
      "label": "contact-form",
      "description": "Contact form panel open",
      "interactions": [
        { "type": "click", "target": "text:Contact Us" }
      ]
    }
  ]
}
```

---

## Workflow

### Step 1: Check for existing config

Derive the config path from the component name: `temp/{ComponentName}/pixel-perfect.config.json`
(e.g. `MegaNavBar` → `temp/MegaNavBar/pixel-perfect.config.json`). Create the directory if it does not exist.

Look for `pixel-perfect.config.json` at that path.

- **If it exists**: read it, show the user the current states, ask whether to re-discover or use as-is.
- **If it does not exist**: proceed to Step 2.

---

### Step 2: Navigate to baseline and scope the component

1. Navigate to the baseline URL with Playwright
2. Dismiss any cookie banners or overlays
3. Resize viewport to 1280x720
4. Wait for the page to fully load (2 seconds)
5. Use `mcp_playwright_browser_evaluate` to find the component root element using the scope hint:

```js
() => {
  const el = document.querySelector('[aria-label="Main navigation"]')
    || document.querySelector('nav')
    || document.querySelector('header');
  return el ? {
    tag: el.tagName,
    id: el.id,
    class: el.className.substring(0, 100),
    rect: el.getBoundingClientRect()
  } : null;
}
```

---

### Step 3: Discover interactive elements

Within the scoped component, find all elements that can produce a distinct visual state. Run this evaluation:

```js
() => {
  const scope = document.querySelector('[aria-label="Main navigation"]') || document.querySelector('nav');
  if (!scope) return [];

  const candidates = [];

  // Buttons and role=button elements
  scope.querySelectorAll('button, [role="button"]').forEach(el => {
    if (el.offsetParent === null) return; // skip hidden
    candidates.push({
      type: 'button',
      text: el.textContent.trim().substring(0, 40),
      ariaExpanded: el.getAttribute('aria-expanded'),
      ariaLabel: el.getAttribute('aria-label'),
    });
  });

  // Links that might reveal sub-menus
  scope.querySelectorAll('a[aria-haspopup], li[aria-haspopup]').forEach(el => {
    candidates.push({
      type: 'link-with-popup',
      text: el.textContent.trim().substring(0, 40),
    });
  });

  // List items with cursor:pointer that aren't plain links
  scope.querySelectorAll('li').forEach(el => {
    if (window.getComputedStyle(el).cursor === 'pointer') {
      const text = el.querySelector('button, a')?.textContent?.trim()?.substring(0, 40);
      if (text) candidates.push({ type: 'clickable-li', text });
    }
  });

  return candidates;
}
```

Deduplicate by `text`. This gives a raw list of interactive elements.

---

### Step 4: Probe each element to confirm it produces a distinct visual state

For each candidate, probe it by hovering and clicking to see if the page changes:

1. **Reset**: reload the baseline URL (fresh state)
2. **Apply interaction** (`hover` first, then `click` if hover produces nothing):
   - Use `mcp_playwright_browser_snapshot` to find the element ref by its text
   - Use `mcp_playwright_browser_hover` or `mcp_playwright_browser_click`
   - Wait 500ms
3. **Check if state changed**: look for newly visible elements (dropdowns, panels, overlays) using:

```js
() => {
  // Find elements that became visible (have content and are now visible)
  return Array.from(document.querySelectorAll('[aria-expanded="true"], [class*="dropdown"][style*="block"], [class*="open"], [class*="active"]'))
    .filter(el => el.offsetParent !== null)
    .map(el => ({ tag: el.tagName, class: el.className.substring(0, 60) }));
}
```

4. **If new content appeared**: take a screenshot, record this as a distinct state with the interaction that triggered it
5. **If nothing changed**: skip this element — it doesn't produce a distinct visual state in the component's scope

---

### Step 5: Determine interaction type (hover vs click)

For nav items and dropdowns, prefer `hover` if it opens the state — it more accurately reflects the production behavior. Use `click` for toggles (contact forms, mobile menus, accordions).

Heuristic:
- If the element has `aria-expanded` that changes on hover → use `hover`
- If clicking is required to toggle → use `click`
- If both work → prefer `hover` for dropdowns, `click` for forms/panels

---

### Step 6: Build and confirm the config

Assemble the states list:

1. Always include `{ label: "default", interactions: [] }` as the first state
2. Add one entry per probed interaction that produced a distinct visual state
3. Use kebab-case for `label` derived from the element text (e.g. "Services" → "services-dropdown", "Contact Us" → "contact-form")

**Show the proposed config to the user** in a formatted block:

```
Discovered N visual states for [component] on [baselineUrl]:

  ✅ default             → no interactions (resting state)
  ✅ services-dropdown   → hover "Services"
  ✅ our-work-dropdown   → hover "Our work"
  ✅ community-dropdown  → hover "Community"
  ✅ contact-form        → click "Contact Us"

Storybook URL: http://localhost:6007/iframe.html?id=...--default

Does this look correct? Confirm to save, or describe any changes needed.
```

Wait for user confirmation before saving.

---

### Step 7: Verify interactions work on Storybook too

Navigate to the `storybookUrl`. For each state (except default), attempt the interaction on the Storybook component using the same text/role target.

- If the element is found and the interaction works → mark ✅
- If the element is not found or produces no visible change → mark ⚠️ and note it in the config with `"storybookWarning": "element not found"`

This catches mismatches early — e.g. if the Storybook component uses different text for a button.

---

### Step 8: Save config

Write `pixel-perfect.config.json` to the specified output path. Confirm the saved path to the user.

---

## Interaction Object Reference

```ts
// Hover interaction
{ "type": "hover", "target": "text:Services" }

// Click interaction
{ "type": "click", "target": "text:Contact Us" }

// Keyboard interaction
{ "type": "keydown", "target": "text:Search", "key": "Enter" }

// Type into a field
{ "type": "type", "target": "label:Search", "value": "consulting" }
```

**Target format:**
- `text:X` — find the first visible element whose trimmed text content is `X`
- `role:button:X` — find `<button>` or `role="button"` with accessible name `X`
- `label:X` — find an input associated with label text `X`
- `selector:X` — use `X` directly as a CSS selector (last resort)

When replaying interactions in pixel-perfect, translate targets to Playwright MCP calls:
1. `mcp_playwright_browser_snapshot` → find the ref matching the target description
2. `mcp_playwright_browser_hover` / `mcp_playwright_browser_click` with that ref

---

## Example Output

```
User: "Discover visual states for the MegaNavBar.
       Baseline: https://www.bitovi.com
       Scope: nav[aria-label='Main navigation']
       Storybook: http://localhost:6007/iframe.html?id=components-meganavbar--default&viewMode=story
       Config: temp/MegaNavBar/pixel-perfect.config.json"

Agent:
1. Navigate to https://www.bitovi.com
2. Dismiss cookie banner
3. Scope to <nav> — found navigation element
4. Discover interactive elements:
   - Buttons: Services, Our work, Community, Contact Us
   - Clickable LIs: About, Careers
5. Probe each:
   - "Services" hover → dropdown appeared (Project management, Product design...) ✅
   - "Our work" hover → dropdown appeared (Showcase, More Projects...) ✅
   - "Community" hover → dropdown appeared (Blog, Academy...) ✅
   - "Contact Us" click → form panel appeared ✅
   - "About" click → navigates away — skip (full navigation, not a visual state)
   - "Careers" click → navigates away — skip
6. Verify on Storybook:
   - All 4 interactions work on Storybook default story ✅
7. Config saved to temp/MegaNavBar/pixel-perfect.config.json
   5 states: default, services-dropdown, our-work-dropdown,
             community-dropdown, contact-form
```
