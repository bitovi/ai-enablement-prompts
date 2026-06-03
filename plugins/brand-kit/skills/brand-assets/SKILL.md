---
name: brand-assets
description: Pull a brand's real assets (colors, logos, fonts, typography) from its live website, then apply them so anything the AI builds stays on-brand. Use when the user gives a website URL and wants to "extract/pull brand assets", "get our brand", "grab the brand kit from <url>", OR when building UI/artifacts and the user says "make this on-brand", "use our brand", "apply brand guidelines", or a brand-kit/ folder already exists.
argument-hint: "[website-url]"
user-invocable: true
---

# Skill: Brand Assets

Closes the brand-consistency loop in two modes:

1. **Extract** — given a website URL, pull its colors, fonts, logos, and icons into a reusable `brand-kit/` folder and synthesize a `brand-guidelines.md`.
2. **Apply** — when building anything, read that `brand-guidelines.md` and use its tokens so output is on-brand by default (modeled on Anthropic's `brand-guidelines` skill).

## Choosing a mode

- A **website URL is provided** (or the kit doesn't exist yet) → **Extract mode**.
- The user asks to be on-brand / to build something **and `brand-kit/brand-guidelines.md` exists** → **Apply mode**.
- If both could apply and it's ambiguous, ask which the user wants.

The default kit location is `brand-kit/` at the project root. Honor an explicit path if the user gives one.

---

## Mode 1 — Extract

### Step 1: Run the extractor

Requires Node.js 18+ (native `fetch`). No dependencies to install.

```bash
node ${CLAUDE_SKILL_DIR}/scripts/extract-brand.js "<website-url>" --output brand-kit
```

This writes `brand-kit/extracted.json` (ranked palette, named CSS color vars, font stacks, Google-Fonts links, `@font-face` URLs, and an asset manifest) and downloads logos/favicons/OG images into `brand-kit/assets/`.

### Step 2: Sanity-check the evidence

Read `brand-kit/extracted.json`, then **verify against what the brand actually looks like** — the script ranks colors purely by frequency, so incidental colors (e.g. code-block syntax highlighting, third-party embeds) can outrank the real brand color.

- `WebFetch` the site (or view the downloaded `og-image` / logo assets) to confirm the dominant brand color and accents.
- Cross-reference `colors.namedVars` — a CSS variable literally named `--brand`, `--primary`, `--accent`, etc. is stronger evidence than raw frequency.
- Pick the **one** primary, 1–3 accents, and dark/light/mid neutrals. Discard noise.
- Identify the heading vs body font from `fonts.families` / `fonts.stacks` (the first non-generic family in each stack). Note the fallback chain.
- Pick the best primary logo from `assets/` (prefer an SVG wordmark/lockup over a favicon) and note light/dark variants if present.

### Step 3: Synthesize `brand-guidelines.md`

Copy `${CLAUDE_SKILL_DIR}/reference/brand-guidelines-template.md` to `brand-kit/brand-guidelines.md` and fill in **every** `{{PLACEHOLDER}}` from your Step 2 conclusions. Give colors semantic names + usage, list typography with fallbacks and the exact loading method (Google Fonts `<link>` or `@font-face`), and reference logo files by their `assets/...` path. Delete sections that genuinely don't apply; never leave a placeholder.

### Step 4: Report

Tell the user the kit is ready, summarize the primary color / fonts / logo found, name the folder (`brand-kit/`), and mention that Apply mode will use it automatically when building.

---

## Mode 2 — Apply

### Step 1: Load the kit

Read `brand-kit/brand-guidelines.md` (the source of truth). It already contains paste-ready CSS variables, the font stacks with fallbacks, and logo paths. If only `extracted.json` exists (no guidelines yet), synthesize the guidelines first via Mode 1, Step 3.

### Step 2: Apply consistently

- **Colors**: define the guideline's CSS variables once (`:root { --color-primary: … }`) and reference them everywhere — never hardcode a hex twice, never invent a color not derivable from a token.
- **Fonts**: load via the recorded Google Fonts `<link>` or `@font-face`, and **always keep the fallback chain** so text renders before/without the webfont. Headings use the heading font; body uses the body font.
- **Logos**: reference files from `brand-kit/assets/` by path — do not redraw, recolor, or approximate them. Use the light/dark variant that matches the background.
- **Contrast**: keep body text at AA (4.5:1). Accents are for emphasis, not body text.

### Step 3: Verify

Spot-check the built artifact against `brand-guidelines.md`: primary color on CTAs, correct fonts on headings/body, real logo asset referenced, no stray off-brand values.

---

## Files

| File | Purpose |
|---|---|
| `scripts/extract-brand.js` | Fetches HTML + CSS, ranks colors, finds fonts, downloads logos/icons → `brand-kit/` |
| `reference/brand-guidelines-template.md` | Anthropic-style template the agent fills in to produce `brand-guidelines.md` |

## Notes & limitations

- Color ranking is frequency-based — always sanity-check the primary against the screenshot/og-image and named CSS vars (Step 2).
- Sites that lazy-load CSS via JS, or block bots, may yield sparse results; supplement with `WebFetch` of the page and any public press/brand kit.
- The script only fetches the single URL given (plus its stylesheets and assets). Point it at the homepage for the strongest signal.
