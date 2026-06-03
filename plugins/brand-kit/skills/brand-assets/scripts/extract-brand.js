#!/usr/bin/env node

/**
 * Brand Asset Extractor
 *
 * Pulls a brand's visual assets straight from its live website so an AI agent
 * can build on-brand artifacts. Fetches the page HTML and its stylesheets,
 * ranks the color palette by usage, collects font stacks, and downloads logos
 * and icons. No external dependencies — Node 18+ (native fetch) only.
 *
 * Usage:
 *   node extract-brand.js <website-url> [options]
 *
 * Options:
 *   --output <dir>   Output directory for the brand kit (default: brand-kit)
 *   --max-css <n>    Max external stylesheets to fetch (default: 20)
 *   --timeout <ms>   Per-request timeout in ms (default: 15000)
 *
 * Environment:
 *   (none required)
 *
 * Output (written under <output>/):
 *   - extracted.json   Ranked palette, fonts, and asset manifest (evidence)
 *   - assets/          Downloaded logos, favicons, and inline SVG marks
 *
 * Everything fails soft: a single failed fetch is logged and skipped, never
 * aborting the run.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_OUTPUT_DIR = 'brand-kit';
const DEFAULT_MAX_CSS = 20;
const DEFAULT_TIMEOUT_MS = 15000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// ============================================================================
// Argument parsing
// ============================================================================

function parseArgs(argv) {
  const args = { url: null, output: DEFAULT_OUTPUT_DIR, maxCss: DEFAULT_MAX_CSS, timeout: DEFAULT_TIMEOUT_MS };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--output') args.output = rest[++i];
    else if (a === '--max-css') args.maxCss = parseInt(rest[++i], 10) || DEFAULT_MAX_CSS;
    else if (a === '--timeout') args.timeout = parseInt(rest[++i], 10) || DEFAULT_TIMEOUT_MS;
    else if (!a.startsWith('--') && !args.url) args.url = a;
  }
  return args;
}

// ============================================================================
// Network utilities
// ============================================================================

async function fetchText(url, timeout) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBinary(url, timeout) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, contentType: res.headers.get('content-type') || '' };
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrl(base, ref) {
  try {
    return new URL(ref, base).href;
  } catch {
    return null;
  }
}

// ============================================================================
// Color extraction & normalization
// ============================================================================

function clamp255(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('');
}

// Expand #abc -> #aabbcc; lowercase; drop alpha from #rrggbbaa.
function normalizeHex(hex) {
  let h = hex.toLowerCase().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/.test(h)) return null;
  return '#' + h;
}

function rgbToHex(r, g, b) {
  return toHex(r, g, b);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Returns {h,s,l} with h in [0,360), s/l in [0,100].
function hexToHsl(hex) {
  let [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

// Pull every color literal out of a CSS/HTML blob and tally frequency.
function tallyColors(css, counts) {
  // #hex (3/4/6/8)
  const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
  let m;
  while ((m = hexRe.exec(css))) {
    const norm = normalizeHex(m[0]);
    if (norm) counts[norm] = (counts[norm] || 0) + 1;
  }
  // rgb()/rgba()
  const rgbRe = /rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/gi;
  while ((m = rgbRe.exec(css))) {
    const hex = rgbToHex(+m[1], +m[2], +m[3]);
    const norm = normalizeHex(hex);
    if (norm) counts[norm] = (counts[norm] || 0) + 1;
  }
  // hsl()/hsla()
  const hslRe = /hsla?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/gi;
  while ((m = hslRe.exec(css))) {
    const hex = hslToHex(+m[1], +m[2], +m[3]);
    const norm = normalizeHex(hex);
    if (norm) counts[norm] = (counts[norm] || 0) + 1;
  }
}

// Capture declared CSS custom properties that hold a color, e.g. --brand: #d97757
function extractColorVars(css) {
  const vars = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;}{]+)[;}]/gi;
  let m;
  while ((m = re.exec(css))) {
    const name = m[1].trim();
    const value = m[2].trim();
    const counts = {};
    tallyColors(value, counts);
    const hexes = Object.keys(counts);
    if (hexes.length === 1) vars[name] = hexes[0];
  }
  return vars;
}

// Heuristic role grouping. Neutrals = very low saturation OR near black/white.
// Among the rest, the most-used vivid color is "primary", the others "accents".
function groupColors(ranked) {
  const neutrals = [];
  const vivid = [];
  for (const c of ranked) {
    const { s, l } = hexToHsl(c.hex);
    if (s < 12 || l < 6 || l > 96) neutrals.push(c);
    else vivid.push(c);
  }
  return {
    primary: vivid.slice(0, 1),
    accents: vivid.slice(1, 5),
    neutrals: neutrals.slice(0, 6),
  };
}

// ============================================================================
// Font extraction
// ============================================================================

function extractFonts(css) {
  const stacks = new Set();
  const families = new Set();
  const re = /font-family\s*:\s*([^;}{]+)[;}]/gi;
  let m;
  while ((m = re.exec(css))) {
    const stack = m[1].replace(/\s+/g, ' ').trim().replace(/["']/g, '');
    if (!stack || stack.startsWith('var(') || stack === 'inherit') continue;
    stacks.add(stack);
    const first = stack.split(',')[0].trim();
    if (first && !first.startsWith('var(')) families.add(first);
  }
  return { stacks: [...stacks].slice(0, 30), families: [...families] };
}

function extractFontFaceSrc(css, baseUrl) {
  const urls = new Set();
  const faceRe = /@font-face\s*{[^}]*}/gi;
  let block;
  while ((block = faceRe.exec(css))) {
    const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
    let u;
    while ((u = urlRe.exec(block[0]))) {
      const abs = resolveUrl(baseUrl, u[1]);
      if (abs && /\.(woff2?|ttf|otf)(\?|$)/i.test(abs)) urls.add(abs);
    }
  }
  return [...urls];
}

// ============================================================================
// HTML parsing (regex-based; intentionally dependency-free)
// ============================================================================

function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', 'i'));
  return m ? m[1] : null;
}

function findStylesheetHrefs(html, baseUrl) {
  const hrefs = [];
  const linkRe = /<link\b[^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    const tag = m[0];
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    if (!rel.includes('stylesheet')) continue;
    const href = attr(tag, 'href');
    if (href) {
      const abs = resolveUrl(baseUrl, href);
      if (abs) hrefs.push(abs);
    }
  }
  return hrefs;
}

function findInlineStyles(html) {
  let css = '';
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(html))) css += '\n' + m[1];
  // also style="..." attributes
  const inlineRe = /style\s*=\s*["']([^"']+)["']/gi;
  while ((m = inlineRe.exec(html))) css += '\n' + m[1];
  return css;
}

function findGoogleFontLinks(html) {
  const links = [];
  const linkRe = /<link\b[^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    const href = attr(m[0], 'href');
    if (href && /fonts\.googleapis\.com/i.test(href)) links.push(href);
  }
  return links;
}

function findMetaContent(html, prop) {
  const metaRe = /<meta\b[^>]*>/gi;
  let m;
  while ((m = metaRe.exec(html))) {
    const tag = m[0];
    const p = (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase();
    if (p === prop.toLowerCase()) return attr(tag, 'content');
  }
  return null;
}

// Candidate logo/icon asset URLs, in priority order.
function findAssetCandidates(html, baseUrl) {
  const out = [];
  const push = (url, kind) => {
    const abs = resolveUrl(baseUrl, url);
    if (abs) out.push({ url: abs, kind });
  };

  // <link rel="icon" | "apple-touch-icon" | "mask-icon" | "shortcut icon">
  const linkRe = /<link\b[^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    const tag = m[0];
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    const href = attr(tag, 'href');
    if (!href) continue;
    if (rel.includes('apple-touch-icon')) push(href, 'apple-touch-icon');
    else if (rel.includes('mask-icon')) push(href, 'mask-icon');
    else if (rel.includes('icon')) push(href, 'favicon');
  }

  // og:image / twitter:image
  const og = findMetaContent(html, 'og:image');
  if (og) push(og, 'og-image');
  const tw = findMetaContent(html, 'twitter:image');
  if (tw) push(tw, 'twitter-image');

  // <img> whose src/alt/class hints "logo" — prefer ones in header/nav
  const headerScope = (html.match(/<header[\s\S]*?<\/header>/i) || [])[0] || '';
  const navScope = (html.match(/<nav[\s\S]*?<\/nav>/i) || [])[0] || '';
  const scopes = [headerScope, navScope, html];
  const seen = new Set();
  for (const scope of scopes) {
    const imgRe = /<img\b[^>]*>/gi;
    while ((m = imgRe.exec(scope))) {
      const tag = m[0];
      const src = attr(tag, 'src') || attr(tag, 'data-src');
      if (!src || seen.has(src)) continue;
      const hint = ((attr(tag, 'alt') || '') + ' ' + (attr(tag, 'class') || '') + ' ' + src).toLowerCase();
      if (hint.includes('logo') || hint.includes('brand')) {
        seen.add(src);
        push(src, 'logo-img');
      }
    }
  }

  // Inline <svg> logos in header/nav
  const svgScope = headerScope || navScope;
  if (svgScope) {
    const svgRe = /<svg\b[\s\S]*?<\/svg>/gi;
    let s;
    let idx = 0;
    while ((s = svgRe.exec(svgScope)) && idx < 3) {
      out.push({ url: null, kind: 'inline-svg', svg: s[0] });
      idx++;
    }
  }

  // de-dupe by url, keep first (priority) occurrence
  const byUrl = new Map();
  const inlineSvgs = [];
  for (const c of out) {
    if (c.kind === 'inline-svg') inlineSvgs.push(c);
    else if (c.url && !byUrl.has(c.url)) byUrl.set(c.url, c);
  }
  return [...byUrl.values(), ...inlineSvgs];
}

function extFromContentType(ct, fallbackUrl) {
  if (ct.includes('svg')) return '.svg';
  if (ct.includes('png')) return '.png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('x-icon') || ct.includes('vnd.microsoft.icon')) return '.ico';
  if (ct.includes('gif')) return '.gif';
  const m = (fallbackUrl || '').match(/\.(svg|png|jpe?g|webp|ico|gif)(\?|$)/i);
  return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : '.img';
}

function safeName(kind, ext, index) {
  return `${kind}${index ? '-' + index : ''}${ext}`;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs(process.argv);
  if (!args.url) {
    console.error('Usage: node extract-brand.js <website-url> [--output <dir>] [--max-css <n>] [--timeout <ms>]');
    process.exit(1);
  }
  if (!/^https?:\/\//i.test(args.url)) args.url = 'https://' + args.url;

  const outDir = path.resolve(process.cwd(), args.output);
  const assetsDir = path.join(outDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  console.error(`\nExtracting brand assets from: ${args.url}`);

  // 1. Fetch HTML
  let html = '';
  try {
    html = await fetchText(args.url, args.timeout);
  } catch (e) {
    console.error(`FATAL: could not fetch page HTML: ${e.message}`);
    process.exit(1);
  }

  // 2. Gather CSS (inline + external)
  let css = findInlineStyles(html);
  const cssHrefs = findStylesheetHrefs(html, args.url).slice(0, args.maxCss);
  let fetchedCss = 0;
  for (const href of cssHrefs) {
    try {
      css += '\n' + (await fetchText(href, args.timeout));
      fetchedCss++;
    } catch (e) {
      console.error(`  skip stylesheet (${e.message}): ${href}`);
    }
  }
  console.error(`  stylesheets fetched: ${fetchedCss}/${cssHrefs.length}`);

  // 3. Colors
  const counts = {};
  tallyColors(css, counts);
  tallyColors(html, counts); // catch inline-attribute colors too
  const ranked = Object.entries(counts)
    .map(([hex, count]) => ({ hex, count, hsl: roundHsl(hexToHsl(hex)) }))
    .sort((a, b) => b.count - a.count);
  const colorVars = extractColorVars(css);
  const grouped = groupColors(ranked);
  console.error(`  unique colors: ${ranked.length} (named CSS vars: ${Object.keys(colorVars).length})`);

  // 4. Fonts
  const fonts = extractFonts(css);
  const fontFiles = extractFontFaceSrc(css, args.url);
  const googleFonts = findGoogleFontLinks(html);
  console.error(`  font families: ${fonts.families.length}; google-fonts links: ${googleFonts.length}`);

  // 5. Assets
  const candidates = findAssetCandidates(html, args.url);
  const downloaded = [];
  const kindIndex = {};
  for (const c of candidates) {
    if (c.kind === 'inline-svg') {
      const idx = (kindIndex['logo-svg'] = (kindIndex['logo-svg'] || 0) + 1);
      const file = safeName('logo-svg', '.svg', idx > 1 ? idx : 0);
      try {
        fs.writeFileSync(path.join(assetsDir, file), c.svg, 'utf8');
        downloaded.push({ kind: 'inline-svg', file: `assets/${file}`, source: 'inline <svg>' });
      } catch (e) {
        console.error(`  skip inline svg (${e.message})`);
      }
      continue;
    }
    try {
      const { buf, contentType } = await fetchBinary(c.url, args.timeout);
      const ext = extFromContentType(contentType, c.url);
      const idx = (kindIndex[c.kind] = (kindIndex[c.kind] || 0) + 1);
      const file = safeName(c.kind, ext, idx > 1 ? idx : 0);
      fs.writeFileSync(path.join(assetsDir, file), buf);
      downloaded.push({ kind: c.kind, file: `assets/${file}`, source: c.url, bytes: buf.length });
    } catch (e) {
      console.error(`  skip asset (${e.message}): ${c.url}`);
    }
  }
  console.error(`  assets downloaded: ${downloaded.length}`);

  // 6. Write evidence
  const result = {
    source: args.url,
    fetchedStylesheets: fetchedCss,
    colors: {
      ranked: ranked.slice(0, 40),
      namedVars: colorVars,
      grouped,
    },
    fonts: {
      families: fonts.families,
      stacks: fonts.stacks,
      googleFontsLinks: googleFonts,
      fontFiles,
    },
    assets: downloaded,
  };
  const jsonPath = path.join(outDir, 'extracted.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  // 7. Human summary
  console.error('\n=== Summary ===');
  console.error('Primary:  ' + grouped.primary.map((c) => `${c.hex} (${c.count})`).join(', '));
  console.error('Accents:  ' + grouped.accents.map((c) => `${c.hex} (${c.count})`).join(', '));
  console.error('Neutrals: ' + grouped.neutrals.map((c) => `${c.hex} (${c.count})`).join(', '));
  console.error('Fonts:    ' + fonts.families.slice(0, 6).join(', '));
  console.error('Assets:   ' + downloaded.map((d) => d.file).join(', '));
  console.error(`\nWrote ${path.relative(process.cwd(), jsonPath)} and ${downloaded.length} asset(s) to ${path.relative(process.cwd(), assetsDir)}/`);
}

function roundHsl({ h, s, l }) {
  return { h: Math.round(h), s: Math.round(s), l: Math.round(l) };
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
