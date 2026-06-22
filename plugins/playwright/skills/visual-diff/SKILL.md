---
name: visual-diff
description: Compare a baseline URL against a dev or Storybook URL by taking Playwright screenshots at multiple breakpoints, running a pixel-level image diff, and reporting results to guide style and HTML corrections. Use when replicating an existing page or component, verifying visual accuracy, or checking responsive fidelity.
---

# Skill: Visual Diff

Compare two URLs visually — a **baseline** (e.g. production site) and a **current** (e.g. local dev server or Storybook story) — to find pixel-level differences and guide corrections.

---

## When to Use

- Replicating an existing page or section in Storybook or the Astro site
- Verifying visual accuracy of a component against a reference design
- Checking responsive fidelity across breakpoints after style changes
- Iterating on CSS/HTML until a component matches its reference

## When NOT to Use

- Content-only changes (text updates, copy edits) where layout is unchanged
- Comparing designs from Figma — use the Figma MCP skill instead
- Performance or accessibility audits — use Lighthouse or the a11y addon

---

## Prerequisites

Before starting, confirm:

1. **Playwright MCP** is configured in `.vscode/mcp.json` with `--caps=vision`
2. **pixelmatch** and **pngjs** are installed: check `package.json` devDependencies
3. **The baseline URL is accessible** (external site, or a running server)
4. **The current URL is accessible** (dev server on `:4321`, Storybook on `:6006`, etc.)
5. **The `temp/` directory exists** in the workspace root (it's gitignored)

If the dev server or Storybook isn't running, start them using the VS Code tasks:
- Dev server: use the **Dev Server** task
- Storybook: use the **Storybook** task

---

## Workflow

### Step 1: Receive inputs

The agent needs:

| Input | Required | Example |
|-------|----------|---------|
| Baseline URL | Yes | `https://www.bitovi.com/` |
| Current URL | Yes | `http://localhost:4321/` or `http://localhost:6006/?path=/story/card--default` |
| CSS selector | No | `#hero-section` or `.card-grid` (for element-scoped comparison) |
| Breakpoints | No | Defaults to mobile (375×667), tablet (768×1024), desktop (1280×720) |

### Step 2: Screenshot the baseline

#### Component-scoped comparison (preferred when comparing a single component)

When comparing a specific component — especially when the Storybook story renders only that component but the baseline page has a full page around it — **crop to the component's bounding box** so the diff isn't polluted by unrelated page sections (nav bars, sticky overlays, other modules above/below).

**How to crop on the baseline page:**

1. Navigate to the baseline URL
2. Resize viewport to `{ width: 1280, height: 720 }`
3. Scroll the target element into view:
   ```js
   () => document.querySelector('<selector>').scrollIntoView({ behavior: 'instant', block: 'start' })
   ```
4. Measure the component's rendered height:
   ```js
   () => document.querySelector('<selector>').getBoundingClientRect().height
   ```
5. Resize the viewport height to match that exact height (keeps width constant):
   ```js
   mcp_playwright_browser_resize → { width: 1280, height: <measured height> }
   ```
6. Take the screenshot — it now captures only the component area.

> **Background bleed warning:** What's visible *behind* the component will differ between Storybook (blank) and the baseline page (other modules). Common cases: sticky/local nav bars overlapping the top, modals/overlays with other page content visible behind them, and partially transparent components. These residual diffs cluster outside the component's own content and are not actionable — ignore them.

**How to crop on the Storybook story:**

Storybook `iframe.html` renders only the component with no surrounding chrome — no resizing needed. Just navigate and screenshot:

```
mcp_playwright_browser_navigate → { url: "http://localhost:6006/iframe.html?id=<story-id>&viewMode=story" }
mcp_playwright_browser_resize → { width: 1280, height: <same height as baseline crop> }
mcp_playwright_browser_take_screenshot → { filename: "temp/vdiff-current-desktop.png" }
```

#### Full-page viewport screenshot (when comparing full pages)

```
1. mcp_playwright_browser_navigate → { url: "<baseline-url>" }
2. mcp_playwright_browser_resize → { width: 1280, height: 720 }
3. mcp_playwright_browser_wait_for → { time: 2 }       # let page fully render
4. mcp_playwright_browser_take_screenshot → {
     type: "png",
     filename: "temp/vdiff-baseline-desktop.png"
   }
```

**Repeat for each breakpoint:**

| Breakpoint | Width | Height | Filename suffix |
|------------|-------|--------|-----------------|
| Mobile | 375 | 667 | `-mobile` |
| Tablet | 768 | 1024 | `-tablet` |
| Desktop | 1280 | 720 | `-desktop` |

### Step 3: Screenshot the current

Repeat the exact same process for the current URL, using `temp/vdiff-current-{breakpoint}.png` filenames.

**Important:** Use the same viewport dimensions and the same cropping strategy (component-scoped or full-page) on both sides so the comparison is apples-to-apples.

### Step 4: Run the diff script

For each breakpoint, run the visual-diff script in the terminal:

```bash
node scripts/visual-diff.mjs \
  --baseline temp/vdiff-baseline-desktop.png \
  --current temp/vdiff-current-desktop.png \
  --output temp/vdiff-diff-desktop.png
```

The script outputs JSON to stdout:

```json
{
  "totalPixels": 921600,
  "diffPixels": 4521,
  "diffPercent": 0.49,
  "width": 1280,
  "height": 720,
  "baselineDimensions": { "width": 1280, "height": 720 },
  "currentDimensions": { "width": 1280, "height": 720 },
  "dimensionsMismatch": false,
  "diffImagePath": "/absolute/path/to/temp/vdiff-diff-desktop.png"
}
```

**If `dimensionsMismatch` is true**, the images had different sizes. The script pads the smaller image with transparent pixels before comparing. This often indicates a layout issue worth investigating.

### Step 5: View the diff image

Start a temporary HTTP server to serve the `temp/` directory, then navigate Playwright to the diff image:

```bash
# Start server in background (run once per session)
npx -y http-server temp/ -p 8787 --cors -c-1 &
```

Then navigate Playwright to the diff image:

```
mcp_playwright_browser_navigate → { url: "http://localhost:8787/vdiff-diff-desktop.png" }
mcp_playwright_browser_take_screenshot → {}   # triggers vision — agent can now see the diff
```

The `--caps=vision` flag on Playwright MCP means the agent can see the image directly in the screenshot output.

**Note:** `file://` URLs are blocked by Playwright MCP, so the HTTP server is required. Start it once and reuse it for all diff images in the session.

**Reading the diff image:**
- **Red pixels** = differences between baseline and current
- **Yellow pixels** = anti-aliasing differences (usually ignorable)
- **Dimmed original** = areas that match (shown at 30% opacity for context)
- **Large red clusters** = structural issues (missing elements, layout shifts, wrong sizing)
- **Scattered red dots** = sub-pixel rendering, font smoothing, or anti-aliasing (usually acceptable)
- **Red bands at edges** = dimension mismatch or padding/margin differences

### Step 6: Interpret and act

Combine the quantitative JSON data with the visual diff inspection:

| diffPercent | Interpretation | Action |
|-------------|---------------|--------|
| < 1% | Visually identical | Minor sub-pixel differences only. No action needed. |
| 1–5% | Close match | Inspect diff image for spacing, font weight, or border differences. Small CSS tweaks likely needed. |
| 5–15% | Notable differences | Layout shifts, color mismatches, or missing elements. Review the red clusters in the diff to identify which sections need work. |
| > 15% | Significant gap | Major structural or styling differences. Focus on the largest red regions first — these indicate the biggest layout discrepancies. |

**When interpreting the diff image, note:**
- Where on the page are the red clusters? (top, middle, bottom, left, right)
- Are they associated with specific elements? (navigation, hero, cards, footer)
- Do the clusters suggest spacing issues, color differences, or missing content?

### Step 7: Fix and re-diff

1. Make CSS/HTML corrections based on the diff analysis
2. Repeat **Steps 3–6** (only re-screenshot the current URL)
3. Continue until `diffPercent` reaches an acceptable level

**Typical targets:**
- Exact replication: < 2%
- Reasonable match: < 5%
- Structural match (different content): < 15%

---

## Full-page screenshots

By default, screenshots capture only the visible viewport. For long pages, use the `fullPage` option:

```
mcp_playwright_browser_take_screenshot → {
  type: "png",
  fullPage: true,
  filename: "temp/vdiff-baseline-desktop-full.png"
}
```

**Warning:** Full-page screenshots produce large images and slower diffs. Only use when comparing entire page layouts.

---

## Storybook-specific tips

When screenshotting Storybook stories:

1. **Use the iframe URL** for cleaner screenshots (no Storybook chrome):
   ```
   http://localhost:6006/iframe.html?id=components-card--default&viewMode=story
   ```

2. **Wait for render** — Storybook stories may take a moment to hydrate:
   ```
   mcp_playwright_browser_wait_for → { time: 3 }
   ```

3. **Element screenshots** work well for isolating the story content from any Storybook padding.

---

## Threshold tuning

The `--threshold` flag (0 to 1) controls pixelmatch sensitivity:

| Value | Sensitivity | Use case |
|-------|------------|----------|
| 0.05 | Very strict | Exact pixel matching, catches everything |
| 0.1 | Default | Good balance, ignores most anti-aliasing |
| 0.2 | Lenient | Tolerates font rendering differences across systems |
| 0.3 | Very lenient | Only catches major color/layout differences |

```bash
node scripts/visual-diff.mjs \
  --baseline temp/vdiff-baseline-desktop.png \
  --current temp/vdiff-current-desktop.png \
  --output temp/vdiff-diff-desktop.png \
  --threshold 0.2
```

---

## Example: Comparing a hero section

```
# 1. Screenshot baseline (production site hero)
mcp_playwright_browser_navigate → { url: "https://www.bitovi.com/" }
mcp_playwright_browser_resize → { width: 1280, height: 720 }
mcp_playwright_browser_wait_for → { time: 2 }
mcp_playwright_browser_snapshot → {}
# Find ref for hero section, e.g. ref="hero-[1]"
mcp_playwright_browser_take_screenshot → {
  type: "png",
  element: "hero section",
  ref: "hero-[1]",
  filename: "temp/vdiff-baseline-hero-desktop.png"
}

# 2. Screenshot current (Storybook story)
mcp_playwright_browser_navigate → { url: "http://localhost:6006/iframe.html?id=components-hero--default" }
mcp_playwright_browser_resize → { width: 1280, height: 720 }
mcp_playwright_browser_wait_for → { time: 3 }
mcp_playwright_browser_take_screenshot → {
  type: "png",
  filename: "temp/vdiff-current-hero-desktop.png"
}

# 3. Run diff (in terminal)
node scripts/visual-diff.mjs \
  --baseline temp/vdiff-baseline-hero-desktop.png \
  --current temp/vdiff-current-hero-desktop.png \
  --output temp/vdiff-diff-hero-desktop.png

# 4. Start temp server (once per session, in background terminal)
npx -y http-server temp/ -p 8787 --cors -c-1 &

# 5. View diff image via Playwright
mcp_playwright_browser_navigate → { url: "http://localhost:8787/vdiff-diff-hero-desktop.png" }
mcp_playwright_browser_take_screenshot → {}   # triggers vision

# 6. Interpret: read JSON output + visually inspect diff
# 7. Fix styles, re-screenshot current, re-diff
```

---

## Cleanup

All output files go to `temp/` which is gitignored. To clean up after a session:

```bash
rm -f temp/vdiff-*.png
```
