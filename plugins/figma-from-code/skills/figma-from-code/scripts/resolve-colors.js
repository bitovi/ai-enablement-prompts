/**
 * resolve-colors.js
 *
 * Pre-computes all CSS custom property colors as sRGB values so that
 * Phase 3 subagents can look up { r, g, b } directly — no LLM arithmetic.
 *
 * Usage:
 *   node resolve-colors.js <css-file> [--tailwind <tailwind.config.js>] --output <out.json>
 *
 * Supports:
 *   - Hex:               #rgb / #rrggbb / #rrggbbaa
 *   - HSL (bare):        "240 5.9% 10%"          (shadcn format, no wrapper)
 *   - HSL (wrapped):     "hsl(240 5.9% 10%)"     or "hsl(240, 5.9%, 10%)"
 *   - OKLCH (wrapped):   "oklch(0.141 0.005 285.823)"
 *   - RGB (wrapped):     "rgb(255, 255, 255)"     or "rgb(255 255 255)"
 *
 * Output JSON schema:
 * {
 *   cssVariables: {
 *     "--primary": { raw: "...", format: "hex|hsl|oklch|rgb", rgb: { r, g, b } },
 *     ...
 *   },
 *   tailwindMap: {
 *     "bg-primary": "--primary",
 *     ...
 *   }
 * }
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Color conversion helpers
// ---------------------------------------------------------------------------

/**
 * Gamma-expand a single sRGB channel value (0-1) to linear light.
 * @param {number} v
 * @returns {number}
 */
function linearize(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Apply sRGB gamma compression to a linear-light channel (0-1).
 * @param {number} v
 * @returns {number}
 */
function gammaCompress(v) {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** Clamp a value to [0, 1]. */
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * OKLCH → sRGB
 * Path: OKLCH → OKLab → LMS (linear) → linear sRGB → sRGB
 *
 * @param {number} L   Lightness [0, 1]
 * @param {number} C   Chroma    [0, ∞)
 * @param {number} h   Hue       [0, 360) degrees
 * @returns {{ r: number, g: number, b: number }}  All channels in [0, 1]
 */
function oklchToRgb(L, C, h) {
  const hRad = (h * Math.PI) / 180;

  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return {
    r: clamp01(gammaCompress(rLin)),
    g: clamp01(gammaCompress(gLin)),
    b: clamp01(gammaCompress(bLin)),
  };
}

/**
 * HSL → sRGB
 * @param {number} h   Hue       [0, 360)
 * @param {number} s   Saturation [0, 100]
 * @param {number} l   Lightness  [0, 100]
 * @returns {{ r: number, g: number, b: number }}  All channels in [0, 1]
 */
function hslToRgb(h, s, l) {
  const sn = s / 100;
  const ln = l / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }

  return {
    r: clamp01(r + m),
    g: clamp01(g + m),
    b: clamp01(b + m),
  };
}

/**
 * Hex → sRGB
 * Handles #rgb, #rrggbb, #rrggbbaa (alpha channel is discarded).
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r: r / 255, g: g / 255, b: b / 255 };
  }
  if (h.length === 6 || h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r: r / 255, g: g / 255, b: b / 255 };
  }
  return null;
}

// ---------------------------------------------------------------------------
// CSS parsing helpers
// ---------------------------------------------------------------------------

/**
 * Remove CSS comments from source text.
 * @param {string} src
 * @returns {string}
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Parse all CSS custom properties from :root / [data-theme] / .dark blocks.
 * Returns a Map of varName → raw value string.
 * @param {string} css
 * @returns {Map<string, string>}
 */
function parseCssVariables(css) {
  const result = new Map();
  const cleaned = stripComments(css);

  const PROP_RE = /--([\w-]+)\s*:\s*([^;]+);/g;

  const rootBlockRE = /(?::root|\[data-theme[^\]]*\]|\.dark|\.light|@layer\s+base\s*\{[^}]*\{)\s*\{([^}]*)\}/gs;
  let blockMatch;
  while ((blockMatch = rootBlockRE.exec(cleaned)) !== null) {
    const block = blockMatch[blockMatch.length - 1];
    let propMatch;
    while ((propMatch = PROP_RE.exec(block)) !== null) {
      const name = '--' + propMatch[1].trim();
      const value = propMatch[2].trim();
      result.set(name, value);
    }
  }

  if (result.size === 0) {
    let propMatch;
    while ((propMatch = PROP_RE.exec(cleaned)) !== null) {
      const name = '--' + propMatch[1].trim();
      const value = propMatch[2].trim();
      result.set(name, value);
    }
  }

  return result;
}

/**
 * Determine the color format and parse raw value string to { r, g, b }.
 * Returns null if the value is not a recognised color (e.g. a length token).
 * @param {string} raw
 * @returns {{ format: string, rgb: { r, g, b } } | null}
 */
function parseColor(raw) {
  const v = raw.trim();

  if (v.startsWith('#')) {
    const rgb = hexToRgb(v);
    return rgb ? { format: 'hex', rgb } : null;
  }

  const oklchMatch = v.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*[\d.%]+)?\s*\)$/i);
  if (oklchMatch) {
    let L = parseFloat(oklchMatch[1]);
    if (oklchMatch[1].endsWith('%')) L /= 100;
    const C = parseFloat(oklchMatch[2]);
    const h = parseFloat(oklchMatch[3]);
    return { format: 'oklch', rgb: oklchToRgb(L, C, h) };
  }

  const hslWrappedMatch = v.match(/^hsl\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:\/\s*[\d.%]+)?\s*\)$/i);
  if (hslWrappedMatch) {
    const h = parseFloat(hslWrappedMatch[1]);
    const s = parseFloat(hslWrappedMatch[2]);
    const l = parseFloat(hslWrappedMatch[3]);
    return { format: 'hsl', rgb: hslToRgb(h, s, l) };
  }

  const rgbMatch = v.match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*(?:[,/]\s*[\d.%]+)?\s*\)$/i);
  if (rgbMatch) {
    return {
      format: 'rgb',
      rgb: {
        r: clamp01(parseFloat(rgbMatch[1]) / 255),
        g: clamp01(parseFloat(rgbMatch[2]) / 255),
        b: clamp01(parseFloat(rgbMatch[3]) / 255),
      },
    };
  }

  const bareHslMatch = v.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (bareHslMatch) {
    const h = parseFloat(bareHslMatch[1]);
    const s = parseFloat(bareHslMatch[2]);
    const l = parseFloat(bareHslMatch[3]);
    return { format: 'hsl', rgb: hslToRgb(h, s, l) };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Tailwind config parsing
// ---------------------------------------------------------------------------

/**
 * Attempt to extract a Tailwind theme color → CSS-variable mapping from a
 * tailwind.config.js source file using a bracket-depth-aware token walk.
 * No `require()` — stays dependency-free even on configs that import plugins.
 *
 * Handles flat keys:
 *   background: 'var(--background)',
 * Nested object keys (DEFAULT and named sub-keys):
 *   primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' }
 *   sidebar:  { DEFAULT: 'var(--sidebar)', primary: 'var(--sidebar-primary)' }
 *
 * Returns a Map of Tailwind class suffix → cssVarName.
 * e.g.  "primary"             → "--primary"
 *       "primary-foreground"  → "--primary-foreground"
 *       "sidebar"             → "--sidebar"
 *       "sidebar-primary"     → "--sidebar-primary"
 *
 * @param {string} src
 * @returns {Map<string, string>}
 */
function parseTailwindConfig(src) {
  const result = new Map();

  const colorsBlockMatch = src.match(/colors\s*:\s*\{([\s\S]*)\},?\s*\}/);
  if (!colorsBlockMatch) {
    const re = /["']?([\w-]+)["']?\s*:\s*["'][^"']*var\(--([\w-]+)\)[^"']*["']/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      result.set(m[1], '--' + m[2]);
    }
    return result;
  }

  const colorsText = extractBalancedBraces(src, src.indexOf('colors'));
  if (!colorsText) {
    return result;
  }

  parseColorObject(colorsText, '', result);
  return result;
}

/**
 * Extract the text of the balanced { } block starting at or after `startIndex`.
 * @param {string} src
 * @param {number} startIndex
 * @returns {string | null}
 */
function extractBalancedBraces(src, startIndex) {
  const open = src.indexOf('{', startIndex);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

/**
 * Walk the tokens of a colors object body and populate `result`.
 * `prefix` is the accumulated Tailwind key prefix (e.g. "sidebar").
 * @param {string} body         Raw text between the outer { }
 * @param {string} prefix       Accumulated key prefix (dash-joined)
 * @param {Map<string,string>} result
 */
function parseColorObject(body, prefix, result) {
  const KEY_VALUE_RE = /["']?([\w-]+)["']?\s*:\s*(?:(\{)|["']([^"']*)["'])/g;
  let m;
  while ((m = KEY_VALUE_RE.exec(body)) !== null) {
    const rawKey = m[1];
    const isObject = !!m[2];
    const strValue = m[3];

    if (isObject) {
      const objectStart = m.index + m[0].length - 1;
      const innerText = extractBalancedBraces(body, objectStart);
      if (innerText !== null) {
        const childPrefix = prefix ? `${prefix}-${rawKey}` : rawKey;
        parseColorObject(innerText, childPrefix, result);
        const afterBlock = objectStart + innerText.length + 2;
        KEY_VALUE_RE.lastIndex = afterBlock;
      }
    } else if (strValue !== undefined) {
      const varMatch = strValue.match(/var\(--([\w-]+)\)/);
      if (varMatch) {
        let tailwindKey;
        if (rawKey === 'DEFAULT') {
          tailwindKey = prefix || rawKey;
        } else {
          tailwindKey = prefix ? `${prefix}-${rawKey}` : rawKey;
        }
        if (tailwindKey && tailwindKey !== 'DEFAULT') {
          result.set(tailwindKey, '--' + varMatch[1]);
        }
      }
    }
  }
}

/**
 * Expand a Tailwind color key to the canonical set of utility classes.
 * e.g. "primary" → ["bg-primary", "text-primary", "border-primary", ...]
 * @param {string} key
 * @returns {string[]}
 */
function tailwindPrefixes(key) {
  return ['bg-', 'text-', 'border-', 'ring-', 'fill-', 'stroke-', 'decoration-'].map(p => p + key);
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help') {
    process.stderr.write(
      'Usage: node resolve-colors.js <css-file> [--tailwind <tailwind.config.js>] --output <out.json>\n'
    );
    process.exit(1);
  }

  const cssPath = args[0];
  let tailwindPath = null;
  let outputPath = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--tailwind' && args[i + 1]) {
      tailwindPath = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[++i];
    }
  }

  if (!outputPath) {
    process.stderr.write('Error: --output <path> is required\n');
    process.exit(1);
  }

  if (!fs.existsSync(cssPath)) {
    process.stderr.write(`Error: CSS file not found: ${cssPath}\n`);
    process.exit(1);
  }

  const cssSource = fs.readFileSync(cssPath, 'utf8');
  const rawVars = parseCssVariables(cssSource);

  const cssVariables = {};
  for (const [name, raw] of rawVars) {
    const parsed = parseColor(raw);
    if (parsed) {
      cssVariables[name] = {
        raw,
        format: parsed.format,
        rgb: {
          r: Math.round(parsed.rgb.r * 1000) / 1000,
          g: Math.round(parsed.rgb.g * 1000) / 1000,
          b: Math.round(parsed.rgb.b * 1000) / 1000,
        },
      };
    }
  }

  const tailwindMap = {};
  if (tailwindPath && fs.existsSync(tailwindPath)) {
    const twSource = fs.readFileSync(tailwindPath, 'utf8');
    const twMap = parseTailwindConfig(twSource);
    for (const [key, cssVar] of twMap) {
      for (const cls of tailwindPrefixes(key)) {
        tailwindMap[cls] = cssVar;
      }
    }
  }

  const output = { cssVariables, tailwindMap };

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  const varCount = Object.keys(cssVariables).length;
  const mapCount = Object.keys(tailwindMap).length;
  process.stdout.write(
    `resolve-colors: wrote ${varCount} CSS variables and ${mapCount} Tailwind class mappings to ${outputPath}\n`
  );
}

main();
