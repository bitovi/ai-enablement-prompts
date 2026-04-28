---
name: pixel-perfect
description: Orchestrate a complete visual QA workflow to make a dev/Storybook page match a baseline URL pixel-for-pixel. Combines the visual-diff skill (screenshot comparison) with the computed-styles skill (CSS property extraction) in a loop until the pages match. Use when replicating a production page, matching a design reference, or achieving pixel perfection on a component.
---

# Skill: Pixel-Perfect Orchestration

Drive a page or component to pixel-perfect fidelity with a baseline by orchestrating **visual-diff** (screenshot comparison) and **computed-styles** (CSS property extraction) in a converging loop.

---

## When to Use

- Replicating a production page's look in the local codebase
- Matching a Storybook component to a live reference
- Any task where the user says "make it match" or "pixel perfect"

## When NOT to Use

- Building new designs from scratch (no baseline exists)
- Content-only changes with no visual target
- Figma-based design work (use the Figma MCP skill instead)

---

## Prerequisites

1. All prerequisites from the `visual-diff` and `computed-styles` skills are met
2. The baseline URL and current URL are known
3. The dev server or Storybook is running

---

## Design System

All fixes must use the Bitovi design token system defined in `src/styles/bitovi-theme.css`. Prefer token-based Tailwind classes over arbitrary values. Only use `[arbitrary]` syntax when no matching token exists in the theme.

---

## Workflow Overview

```
┌─────────────────────────────────────┐
│  For each breakpoint:               │
│  desktop → tablet → mobile          │
│                                     │
│  1. VISUAL DIFF                     │
│     Screenshot both pages           │
│     Run pixel diff                  │
│     Identify problem regions        │
│     diffPercent < 2%? ──── YES ──── next breakpoint (or DONE if all 3 pass)
│              │                      │
│              NO                     │
│              ▼                      │
│  2. COMPUTED STYLES                 │
│     Extract CSS from both pages     │
│     Build property diff table       │
│     Fix mismatches with Tailwind    │
│     Verify fixes took effect        │
│              │                      │
│              ▼                      │
│  3. RE-DIFF                         │
│     Re-screenshot current page      │
│     Run pixel diff again            │
│     diffPercent < 2%? ──── YES ──── next breakpoint
│              │                      │
│              NO                     │
│              ▼                      │
│     Go to step 2 with new regions   │
└─────────────────────────────────────┘
```

---

## Detailed Steps

### Step 1: Initial Visual Diff

Load the `visual-diff` skill and run the full workflow:

1. Screenshot the baseline at desktop breakpoint (1280x720)
2. Screenshot the current page at the same breakpoint
3. Run `node scripts/visual-diff.mjs` to produce the diff image and JSON stats
4. View the diff image through the HTTP server + Playwright vision
5. Record the `diffPercent` and identify which regions (top, middle, bottom) have red clusters

**If `diffPercent` < 2%**, the pages are effectively matching. Report success and stop.

**If `diffPercent` >= 2%**, proceed to Step 2.

#### Interpreting the Diff Image

Map red clusters to specific DOM regions:

| Red cluster location | Likely DOM region | Example |
|---------------------|-------------------|---------|
| Top band | Navigation bar | Height, padding, logo, nav items |
| Below nav | Hero section | Font sizes, spacing, background |
| Middle grid | Card layout | Card sizing, gaps, typography |
| Bottom | Footer | Link colors, spacing, background |
| Full-width bands | Container width | Max-width, padding differences |
| Scattered dots only | Font rendering | Usually acceptable, not actionable |

### Step 2: Computed Style Extraction

Load the `computed-styles` skill. Based on the regions identified in Step 1:

1. **Plan extraction targets**: Map each red region to specific DOM elements and CSS properties
2. **Extract from baseline**: Use `mcp_playwright_browser_evaluate` on the baseline URL
3. **Extract from current**: Use `mcp_playwright_browser_evaluate` on the current URL (remember the Storybook iframe pattern if applicable)
4. **Build diff table**: Compare every property, flag mismatches
5. **Fix mismatches**: Apply Tailwind classes — always resolve computed values to design tokens from `src/styles/bitovi-theme.css` first (see the **Design System** section above). Only use `[arbitrary]` values when no token matches.
6. **Verify each fix**: Re-extract from current to confirm the computed value now matches

#### Prioritization

Fix differences in this order (highest visual impact first):

1. **Layout**: width, height, maxWidth, padding, margin, display, flexDirection
2. **Typography**: fontSize, fontWeight, fontFamily, lineHeight, letterSpacing
3. **Colors**: color, backgroundColor, borderColor
4. **Decoration**: borderRadius, boxShadow, opacity
5. **Fine-tuning**: textTransform, gap, overflow

### Step 3: Re-Diff

After fixing a batch of computed style differences:

1. Re-screenshot only the **current** page (baseline hasn't changed)
2. Re-run the pixel diff
3. View the new diff image

**Evaluate progress:**

| New diffPercent | Action |
|----------------|--------|
| < 2% | Done. Report final stats. |
| Decreased significantly | Good progress. If > 2%, identify remaining red regions and loop back to Step 2. |
| Unchanged or increased | Something went wrong. Check that fixes actually applied (Tailwind theme overrides, specificity conflicts). Use computed-styles to verify. |

### Step 4: Convergence

Continue the loop (Steps 2-3) until `diffPercent` < 2% or the remaining differences are confirmed to be not worth further pursuit.

#### Stop and flag for manual review — do NOT keep iterating on these:
- Sub-pixel font rendering (different OS/browser/font-smoothing)
- Anti-aliasing artifacts (icon edges, curved borders)
- Pixel-level positioning offsets (elements within 1–3px of correct position)
- Shadow or gradient rendering variance
- Third-party embedded content (reCAPTCHA, chat widgets, analytics overlays)
- Dynamic content (timestamps, user-specific data, live chat, cookie banners)
- Differences that require non-Tailwind workarounds or browser-specific hacks

When stopping for one of these reasons, clearly state:
1. What the remaining diffPercent is
2. Which specific element(s) are causing it
3. Why it is not worth automating further
4. What the user could do manually to address it

---

## Using Subagents

For complex pages with many regions to fix, use subagents to parallelize investigation:

### Investigation Subagent

Use the **Explore** agent to research element structures before extracting styles:

```
"Explore the DOM structure of [baseline URL]. Find all elements in the 
[region] section. Report element tags, class names, and nesting structure. 
Thoroughness: medium."
```

### Extraction Pattern

When extracting styles, do both pages in sequence (not parallel, since Playwright MCP shares one browser):

1. Navigate to baseline → extract → store results
2. Navigate to current → extract → store results
3. Compare in conversation context

---

## Breakpoint Strategy

Always run the pixel-perfect loop at **all three breakpoints**:

| Breakpoint | Width | Height | Order |
|------------|-------|--------|-------|
| Desktop | 1280 | 720 | 1st — fix base layout here first |
| Tablet | 768 | 1024 | 2nd — fix responsive breakpoint issues |
| Mobile | 375 | 667 | 3rd — fix mobile-specific issues |

**Workflow:**
1. Run the full visual-diff + computed-styles loop at **desktop** until `diffPercent < 2%`
2. Then run at **tablet** — resize viewport, re-screenshot both sides, diff, fix, re-diff
3. Then run at **mobile** — same process

Fix desktop first so you're not chasing responsive issues against a broken base layout. Each breakpoint has its own screenshot files (e.g. `temp/vdiff-baseline-tablet.png`, `temp/vdiff-current-tablet.png`, `temp/vdiff-diff-tablet.png`).

**Component-scoped comparison at smaller breakpoints:** Re-measure the component height at each breakpoint (it will change) and resize the viewport accordingly before screenshotting.

---

## Session Notes

Keep a running log of what was fixed and verified. This helps avoid re-checking properties and provides a summary at the end.

Use session memory (`/memories/session/`) to store:
- The diff table with baseline vs current values
- Which properties have been fixed and verified
- Current diffPercent after each round

---

## Success Criteria

| Level | diffPercent | Description |
|-------|------------|-------------|
| Pixel perfect | < 1% | Only sub-pixel rendering differences remain |
| Excellent match | 1–2% | Minor font rendering, anti-aliasing, or shadow differences — stop here |
| Good match | 2-5% | Small spacing or color differences worth fixing |
| Needs work | > 5% | Significant visual differences still present |

The default target is **< 2%**. Stop and report as soon as this threshold is met — do not keep iterating to squeeze from 1% to 0% unless the user explicitly asks. Flag remaining issues that fall into the "hard to align" bucket (font rendering, sub-pixel spacing, third-party overlays) and let the user decide whether to fix them manually.

---

## Example Session

```
User: "Make the nav component match production"

Agent:
1. Load pixel-perfect skill
2. Load visual-diff skill → screenshot production nav + Storybook nav
3. Run diff → diffPercent: 12.3%
4. View diff → red clusters at: nav height, logo area, nav item spacing, CTA button
5. Load computed-styles skill
6. Extract nav properties from production:
   nav.height = 80px, nav.padding = 0px 128px, logo.width = 108px ...
7. Extract same from Storybook:
   nav.height = 60px, nav.padding = 0px 32px, logo.width = 80px ...
8. Build diff table, fix mismatches with Tailwind — resolve to design tokens from `src/styles/bitovi-theme.css` (e.g. `bg-brand-orange`, `text-teal-500`, `font-semibold`, `p-md`)
9. Verify fixes with re-extraction
10. Re-screenshot + re-diff → diffPercent: 3.1%
11. View diff → remaining red at CTA button border-radius
12. Extract CTA styles, fix borderRadius
13. Re-diff → diffPercent: 0.8%
14. Done! Report final comparison table.
```

---

## Cleanup

After the session:

```bash
rm -f temp/vdiff-*.png
```

All computed style data lives in conversation context and session memory only.
