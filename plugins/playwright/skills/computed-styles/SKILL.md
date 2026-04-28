---
name: computed-styles
description: Extract and compare computed CSS styles between a baseline URL and a dev/Storybook URL using Playwright MCP evaluate calls. Use when visual differences have been identified and you need to find the exact CSS property mismatches to fix. Pairs with the visual-diff skill for a complete visual QA workflow.
---

# Skill: Computed Style Comparison

Use Playwright MCP's `evaluate` to extract `getComputedStyle()` values from a **baseline** page and a **current** page, compare them property-by-property, and fix the differences with Tailwind classes.

---

## When to Use

- After the `visual-diff` skill has identified pixel differences between two pages
- When you need exact CSS property values to guide Tailwind class changes
- When visual comparison alone is ambiguous (e.g., is the font 20px or 24px?)
- When fixing a component to match production styling

## When NOT to Use

- For initial discovery of visual differences (use `visual-diff` first)
- When the pages have fundamentally different HTML structures
- For layout issues caused by content differences, not style differences

---

## Prerequisites

1. **Playwright MCP** is configured in `.vscode/mcp.json`
2. **Both URLs are accessible** (baseline and current)
3. **You know which elements to compare** (from visual-diff results or user input)

---

## Key Concepts

### Accessing Storybook Content

Storybook renders stories inside an iframe. You must access elements through it:

```js
// Inside mcp_playwright_browser_evaluate
const iframe = document.querySelector('#storybook-preview-iframe');
const doc = iframe.contentDocument;
const cs = doc.defaultView.getComputedStyle.bind(doc.defaultView);

const element = doc.querySelector('nav');
const styles = cs(element);
```

### Accessing Regular Pages

For production or dev server pages, access elements directly:

```js
const cs = window.getComputedStyle.bind(window);
const element = document.querySelector('nav');
const styles = cs(element);
```

### Tailwind v4 Theme Gotcha

This project uses Tailwind v4 with a custom theme in `src/styles/bitovi-theme.css`. Standard utility classes may not map to expected values. For example, `text-xl` in this project is `1.5rem` (24px), not the standard 20px. Always verify with `getComputedStyle()` after applying Tailwind classes, and use arbitrary values like `text-[20px]` when standard classes don't produce the right output.

### CSS Specificity in Tailwind v4

Tailwind v4 uses CSS layers, so class order in the HTML doesn't determine specificity the way it did in v3. If you apply both `lg:text-teal-950` and `lg:text-teal-600` to the same element, whichever comes later in the generated CSS wins, not whichever is last in the class attribute. To conditionally apply colors, use ternary expressions:

```tsx
// WRONG: both classes always present, CSS layer order wins
className={`lg:text-teal-950 ${isActive ? 'lg:text-teal-600' : ''}`}

// RIGHT: only one color class at a time
className={isActive ? 'lg:text-teal-600' : 'lg:text-teal-950'}
```

---

## Workflow

### Step 1: Plan which elements and properties to extract

Based on the visual-diff results, identify the regions with differences and map them to DOM elements. Build a list of element/property pairs to extract.

**Common element targets:**

| Region | Typical selector | Key properties |
|--------|-----------------|----------------|
| Nav container | `nav`, `nav` parent | height, padding, maxWidth, boxShadow, backgroundColor |
| Logo | `nav img`, `nav svg` | width, height |
| Nav items | `nav ul > li` | fontSize, fontWeight, color, lineHeight, margin, fontFamily |
| CTA button | `button` with CTA text | height, padding, borderRadius, backgroundColor, fontSize |
| Dropdown panel | `[id^="dropdown-"]` | backgroundColor, borderRadius, overflow, maxWidth |
| Card / list items | `li`, `.card` | margin, padding, fontSize, fontWeight, color, lineHeight |
| Headings | `h1`–`h6`, `[class*="uppercase"]` | fontSize, fontWeight, color, letterSpacing, textTransform |
| Links | `a` | color, fontSize, fontWeight, textDecoration |

**Common properties to compare:**

```
fontSize, fontWeight, fontFamily, lineHeight, letterSpacing, textTransform,
color, backgroundColor, borderRadius, boxShadow,
width, height, maxWidth, minHeight,
padding, margin, gap,
display, alignItems, justifyContent, flexDirection,
overflow, opacity
```

### Step 2: Extract styles from the baseline

Navigate to the baseline URL and use `mcp_playwright_browser_evaluate` to extract all target properties in a single call. Return a structured object.

**Template for production pages:**

```js
// mcp_playwright_browser_evaluate
() => {
  const cs = window.getComputedStyle.bind(window);

  // Find elements — use text content or structure, not brittle selectors
  const nav = document.querySelector('nav');
  // ... find other elements ...

  return {
    nav: {
      height: cs(nav).height,
      padding: cs(nav).padding,
      maxWidth: cs(nav).maxWidth,
    },
    // ... other elements ...
  };
}
```

**Tips for finding elements on production pages:**
- Search by text content with TreeWalker or `querySelectorAll` + `.textContent` filtering
- Search by class name fragments: `[class*="nav-icon"]`
- Filter multiple matches by visibility: `getComputedStyle(el).display !== 'none'`
- Walk up from a known text node: `element.closest('li')`, `.parentElement`

### Step 3: Extract styles from the current page

Navigate to the current URL and run the same extraction. For Storybook, use the iframe access pattern.

**Template for Storybook:**

```js
// mcp_playwright_browser_evaluate
() => {
  const iframe = document.querySelector('#storybook-preview-iframe');
  const doc = iframe.contentDocument;
  const cs = doc.defaultView.getComputedStyle.bind(doc.defaultView);

  const nav = doc.querySelector('nav');
  // ... find other elements ...

  return {
    nav: {
      height: cs(nav).height,
      padding: cs(nav).padding,
      maxWidth: cs(nav).maxWidth,
    },
    // ... other elements ...
  };
}
```

### Step 4: Compare and build a diff table

Compare every extracted value. Build a table like:

| Element | Property | Baseline | Current | Match |
|---------|----------|----------|---------|-------|
| nav | height | 80px | 60px | NO |
| nav | padding | 0px 128px | 0px 32px | NO |
| nav item | fontSize | 20px | 24px | NO |
| nav item | fontWeight | 600 | 600 | YES |

Focus on the mismatches.

### Step 5: Fix with Tailwind classes

For each mismatch, determine the correct Tailwind class. Prefer standard utilities; use arbitrary values when the theme doesn't have an exact match.

| Desired value | Tailwind approach |
|--------------|-------------------|
| Standard spacing (4px, 8px, 16px...) | `p-1`, `p-2`, `p-4` etc. |
| Non-standard spacing | `p-[13px]`, `m-[38px]` |
| Standard colors in theme | `text-teal-600`, `bg-teal-950` |
| Box shadows | `shadow-[0_0_24px_-4px_rgb(191,197,198)]` |
| Font sizes matching theme | Check `bitovi-theme.css` `@theme` block first |
| Font sizes not in theme | `text-[20px]` |

### Step 6: Verify the fix

After applying changes, re-extract computed styles from the current page and confirm the values now match the baseline. This is critical because:

1. Tailwind theme overrides can produce unexpected values
2. CSS specificity conflicts can prevent classes from taking effect
3. Parent element styles can cascade and override child styles

### Step 7: Repeat for remaining differences

Work through the diff table systematically. After fixing a batch of related properties (e.g., all nav container styles), re-extract and verify before moving to the next batch.

---

## Comprehensive Extraction Pattern

For efficiency, extract all properties in a single evaluate call rather than making many small calls. Here's a pattern for extracting a full nav component:

```js
() => {
  const cs = window.getComputedStyle.bind(window);
  const props = (el) => !el ? null : ({
    fontSize: cs(el).fontSize,
    fontWeight: cs(el).fontWeight,
    fontFamily: cs(el).fontFamily.split(',')[0].trim(),
    color: cs(el).color,
    backgroundColor: cs(el).backgroundColor,
    lineHeight: cs(el).lineHeight,
    letterSpacing: cs(el).letterSpacing,
    height: cs(el).height,
    width: cs(el).width,
    padding: cs(el).padding,
    margin: cs(el).margin,
    borderRadius: cs(el).borderRadius,
    boxShadow: cs(el).boxShadow,
  });

  const nav = document.querySelector('nav');
  // ... find elements ...

  return {
    nav: props(nav),
    // ... other elements ...
  };
}
```

---

## Common Pitfalls

1. **Storybook iframe**: Always access through `#storybook-preview-iframe`. Queries on the top-level `document` won't find story content.

2. **Multiple matching elements**: Production pages often have duplicate elements (mobile vs desktop nav). Filter by `display !== 'none'` or check for the presence of child elements unique to the visible version.

3. **React state in Storybook**: You cannot trigger React state changes via `dispatchEvent` inside `evaluate`. Use Storybook story variants (e.g., `--services-dropdown-open`) or the `play` function in stories to set the desired state.

4. **Color format differences**: `rgb(0, 132, 139)` and `#00848B` are the same color. Compare numerically if needed, but `getComputedStyle` always returns `rgb()` or `rgba()` format on both sides.

5. **Subpixel rendering**: Values like `37.6406px` vs `38px` are acceptable matches. Don't chase fractional pixel differences.

6. **Font family strings**: `getComputedStyle` returns the full stack (e.g., `Inter, sans-serif`). Split on comma and compare only the first family.

---

## Cleanup

No files are created on disk. All data lives in the evaluate return values and the conversation context.
