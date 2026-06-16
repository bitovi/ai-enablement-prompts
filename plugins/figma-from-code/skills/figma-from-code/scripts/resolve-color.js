/**
 * resolve-color.js
 *
 * Single-color lookup CLI so build/fix agents never Read variables.json or
 * resolved-colors.json into context. Joins the two Phase 1 artifacts into a
 * reverse RGB -> Figma-variable index and answers three query shapes:
 *
 *   Tailwind class:  bg-primary, text-muted-foreground, hover:bg-primary/90
 *   CSS variable:    var(--primary)  or  --primary
 *   Raw color:       '#2563eb', 'rgb(37, 99, 235)', '37,99,235', '0.145,0.388,0.922'
 *
 * Usage:
 *   node resolve-color.js <query> [--context fill|stroke|text] [--tolerance <n>]
 *   node resolve-color.js --dump-index [--output <path>]
 *
 * Options:
 *   --vars <path>      variables.json       (default .temp/figma-from-code/variables.json)
 *   --colors <path>    resolved-colors.json (default .temp/figma-from-code/resolved-colors.json)
 *   --context <c>      disambiguation hint: fill | stroke | text
 *   --tolerance <n>    per-channel match tolerance in 8-bit units (default 3)
 *   --dump-index       print the full reverse index (for inlining into use_figma scripts)
 *   --output <path>    with --dump-index, write to file instead of stdout
 *
 * Query output (JSON on stdout):
 * {
 *   "query": "bg-primary/90",
 *   "match": "exact" | "tolerance" | "none",
 *   "cssVar": "--primary",
 *   "opacity": 0.9,                      // only for /NN opacity-modified classes
 *   "variable": { "id", "name", "collectionName", "scopes" },
 *   "rgb": { "r", "g", "b" },            // 0-1 floats, for the fallback fill
 *   "candidates": [ ... ]                // all matches, best first
 * }
 *
 * Dump-index output:
 * {
 *   "tolerance8bit": 3,
 *   "index": { "37,99,235": [ { "cssVar", "id", "name", "collection", "scopes" } ], ... }
 * }
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_VARS = '.temp/figma-from-code/variables.json';
const DEFAULT_COLORS = '.temp/figma-from-code/resolved-colors.json';
const KNOWN_PREFIXES = ['bg-', 'text-', 'border-', 'ring-', 'fill-', 'stroke-', 'decoration-'];

// ---------------------------------------------------------------------------
// Raw color parsing
// ---------------------------------------------------------------------------

/** Clamp a value to [0, 1]. */
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Parse a raw color string to { r, g, b } floats in [0, 1].
 * Accepts #rgb/#rrggbb/#rrggbbaa, rgb()/rgba(), "r,g,b" (8-bit or floats).
 * @param {string} input
 * @returns {{ r: number, g: number, b: number } | null}
 */
function parseRawColor(input) {
  const v = input.trim();

  if (v.startsWith('#')) {
    const h = v.slice(1);
    if (h.length === 3 || h.length === 4) {
      return {
        r: parseInt(h[0] + h[0], 16) / 255,
        g: parseInt(h[1] + h[1], 16) / 255,
        b: parseInt(h[2] + h[2], 16) / 255,
      };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16) / 255,
        g: parseInt(h.slice(2, 4), 16) / 255,
        b: parseInt(h.slice(4, 6), 16) / 255,
      };
    }
    return null;
  }

  const rgbMatch = v.match(
    /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*(?:[,/]\s*[\d.%]+)?\s*\)$/i
  );
  if (rgbMatch) {
    return {
      r: clamp01(parseFloat(rgbMatch[1]) / 255),
      g: clamp01(parseFloat(rgbMatch[2]) / 255),
      b: clamp01(parseFloat(rgbMatch[3]) / 255),
    };
  }

  const bareMatch = v.match(/^([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)$/);
  if (bareMatch) {
    const nums = [parseFloat(bareMatch[1]), parseFloat(bareMatch[2]), parseFloat(bareMatch[3])];
    const isFloat = nums.every((n) => n <= 1);
    const div = isFloat ? 1 : 255;
    return { r: clamp01(nums[0] / div), g: clamp01(nums[1] / div), b: clamp01(nums[2] / div) };
  }

  return null;
}

/** Quantize a 0-1 float channel to 8-bit. */
function to8bit(v) {
  return Math.round(clamp01(v) * 255);
}

/** 8-bit "r,g,b" key for the reverse index. */
function rgbKey(rgb) {
  return `${to8bit(rgb.r)},${to8bit(rgb.g)},${to8bit(rgb.b)}`;
}

// ---------------------------------------------------------------------------
// Index construction
// ---------------------------------------------------------------------------

/**
 * Join variables.json + resolved-colors.json into a flat candidate list.
 * Entries without a resolved color (FLOAT variables, non-color values) are skipped.
 * @returns {Array<{ cssVar, id, name, collection, scopes, rgb }>}
 */
function buildCandidates(varMap, cssVariables) {
  const candidates = [];
  for (const [key, entry] of Object.entries(varMap)) {
    if (entry.resolvedType && entry.resolvedType !== 'COLOR') continue;
    const cssVar = key.replace(/^var\(/, '').replace(/\)$/, '').trim();
    const resolved = cssVariables[cssVar];
    if (!resolved || !resolved.rgb) continue;
    candidates.push({
      cssVar,
      id: entry.id,
      name: entry.name,
      collection: entry.collectionName,
      scopes: entry.scopes || null,
      rgb: resolved.rgb,
    });
  }
  return candidates;
}

/** Group candidates by 8-bit RGB key. */
function buildIndex(candidates) {
  const index = {};
  for (const c of candidates) {
    const key = rgbKey(c.rgb);
    if (!index[key]) index[key] = [];
    index[key].push({
      cssVar: c.cssVar,
      id: c.id,
      name: c.name,
      collection: c.collection,
      scopes: c.scopes,
    });
  }
  return index;
}

// ---------------------------------------------------------------------------
// Matching + disambiguation
// ---------------------------------------------------------------------------

const CONTEXT_SCOPES = {
  fill: ['FRAME_FILL', 'SHAPE_FILL', 'ALL_FILLS', 'ALL_SCOPES'],
  text: ['TEXT_FILL', 'ALL_FILLS', 'ALL_SCOPES'],
  stroke: ['STROKE_COLOR', 'ALL_SCOPES'],
};

const CONTEXT_NAME_HINTS = {
  fill: /(^|-)(background|card|popover|sidebar|primary|secondary|muted|accent|destructive)(-|$)/,
  text: /foreground/,
  stroke: /(^|-)(border|ring|outline|input)(-|$)/,
};

/**
 * Score a candidate for ranking. Higher is better.
 * Semantic collection beats Palette; scope/name agreement with --context beats neither.
 */
function scoreCandidate(c, context) {
  let score = 0;
  if (c.collection === 'Semantic') score += 4;
  if (context) {
    if (Array.isArray(c.scopes) && c.scopes.length > 0) {
      if (c.scopes.some((s) => CONTEXT_SCOPES[context].includes(s))) score += 2;
    } else if (CONTEXT_NAME_HINTS[context].test(c.cssVar)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Find all candidates within tolerance of the target color.
 * @returns {Array<candidate & { distance8bit: number, score: number }>} best first
 */
function matchColor(candidates, rgb, tolerance, context) {
  const t = { r: to8bit(rgb.r), g: to8bit(rgb.g), b: to8bit(rgb.b) };
  const matches = [];
  for (const c of candidates) {
    const d = Math.max(
      Math.abs(to8bit(c.rgb.r) - t.r),
      Math.abs(to8bit(c.rgb.g) - t.g),
      Math.abs(to8bit(c.rgb.b) - t.b)
    );
    if (d <= tolerance) {
      matches.push({ ...c, distance8bit: d, score: scoreCandidate(c, context) });
    }
  }
  matches.sort((a, b) => a.distance8bit - b.distance8bit || b.score - a.score);
  return matches;
}

// ---------------------------------------------------------------------------
// Query classification
// ---------------------------------------------------------------------------

/**
 * Strip Tailwind variant modifiers (hover:, lg:, dark:, ...) and an opacity
 * suffix (/90) from a class. Returns { base, opacity }.
 */
function normalizeTailwindClass(cls) {
  const base = cls.split(':').pop();
  const opacityMatch = base.match(/^(.+)\/(\d{1,3})$/);
  if (opacityMatch) {
    return { base: opacityMatch[1], opacity: parseInt(opacityMatch[2], 10) / 100 };
  }
  return { base, opacity: null };
}

/**
 * Resolve a query to { cssVar, rgb, opacity } using whichever shape it matches.
 * cssVar is null for raw colors; rgb is null when a class/var has no resolved color.
 */
function resolveQuery(query, cssVariables, tailwindMap) {
  const varMatch = query.match(/^(?:var\()?(--[\w-]+)\)?$/);
  if (varMatch) {
    const cssVar = varMatch[1];
    return { kind: 'css-var', cssVar, rgb: cssVariables[cssVar]?.rgb ?? null, opacity: null };
  }

  const raw = parseRawColor(query);
  if (raw) {
    return { kind: 'raw', cssVar: null, rgb: raw, opacity: null };
  }

  const { base, opacity } = normalizeTailwindClass(query);
  let cssVar = tailwindMap[base] ?? null;
  if (!cssVar) {
    const prefix = KNOWN_PREFIXES.find((p) => base.startsWith(p));
    if (prefix) {
      const stem = '--' + base.slice(prefix.length);
      if (cssVariables[stem]) cssVar = stem;
    }
  }
  if (cssVar) {
    return { kind: 'tailwind', cssVar, rgb: cssVariables[cssVar]?.rgb ?? null, opacity };
  }

  return { kind: 'unknown', cssVar: null, rgb: null, opacity: null };
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help') {
    process.stderr.write(
      'Usage: node resolve-color.js <class|var|color> [--context fill|stroke|text] [--tolerance n]\n' +
        '       node resolve-color.js --dump-index [--output <path>]\n'
    );
    process.exit(1);
  }

  let query = null;
  let varsPath = DEFAULT_VARS;
  let colorsPath = DEFAULT_COLORS;
  let context = null;
  let tolerance = 3;
  let dumpIndex = false;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--vars' && args[i + 1]) varsPath = args[++i];
    else if (a === '--colors' && args[i + 1]) colorsPath = args[++i];
    else if (a === '--context' && args[i + 1]) context = args[++i];
    else if (a === '--tolerance' && args[i + 1]) tolerance = parseInt(args[++i], 10);
    else if (a === '--output' && args[i + 1]) outputPath = args[++i];
    else if (a === '--dump-index') dumpIndex = true;
    else if (query === null) query = a;
  }

  if (context && !CONTEXT_SCOPES[context]) {
    process.stderr.write(`Error: --context must be fill, stroke, or text (got "${context}")\n`);
    process.exit(1);
  }

  for (const [label, p] of [['variables.json', varsPath], ['resolved-colors.json', colorsPath]]) {
    if (!fs.existsSync(p)) {
      process.stderr.write(`Error: ${label} not found at ${p} — run Phase 1 (3-setup-tokens) first\n`);
      process.exit(1);
    }
  }

  const varMap = JSON.parse(fs.readFileSync(varsPath, 'utf8'));
  const resolved = JSON.parse(fs.readFileSync(colorsPath, 'utf8'));
  const cssVariables = resolved.cssVariables || {};
  const tailwindMap = resolved.tailwindMap || {};
  const candidates = buildCandidates(varMap, cssVariables);

  if (dumpIndex) {
    const out = JSON.stringify({ tolerance8bit: tolerance, index: buildIndex(candidates) }, null, 2);
    if (outputPath) {
      const outDir = path.dirname(outputPath);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outputPath, out);
      process.stdout.write(
        `resolve-color: wrote reverse index (${candidates.length} color variables) to ${outputPath}\n`
      );
    } else {
      process.stdout.write(out + '\n');
    }
    return;
  }

  if (query === null) {
    process.stderr.write('Error: no query given\n');
    process.exit(1);
  }

  const resolvedQuery = resolveQuery(query, cssVariables, tailwindMap);
  const result = {
    query,
    match: 'none',
    cssVar: resolvedQuery.cssVar,
    rgb: resolvedQuery.rgb,
    variable: null,
    candidates: [],
  };
  if (resolvedQuery.opacity !== null) result.opacity = resolvedQuery.opacity;

  if (resolvedQuery.cssVar) {
    const direct = candidates.find((c) => c.cssVar === resolvedQuery.cssVar);
    if (direct) {
      result.match = 'exact';
      result.variable = {
        id: direct.id,
        name: direct.name,
        collectionName: direct.collection,
        scopes: direct.scopes,
      };
      result.rgb = direct.rgb;
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return;
    }
  }

  if (resolvedQuery.rgb) {
    const matches = matchColor(candidates, resolvedQuery.rgb, tolerance, context);
    if (matches.length > 0) {
      const best = matches[0];
      result.match = best.distance8bit === 0 ? 'exact' : 'tolerance';
      result.cssVar = best.cssVar;
      result.variable = {
        id: best.id,
        name: best.name,
        collectionName: best.collection,
        scopes: best.scopes,
      };
      result.candidates = matches.map((m) => ({
        cssVar: m.cssVar,
        id: m.id,
        name: m.name,
        collectionName: m.collection,
        distance8bit: m.distance8bit,
        score: m.score,
      }));
    }
  }

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main();
