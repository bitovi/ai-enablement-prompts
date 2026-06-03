#!/usr/bin/env node
/**
 * Verify that a component's child dependencies exist in the target Figma file
 * before allowing a build to start.
 *
 * Usage:
 *   node check-prereqs.js <componentName> <sourcePath> [--strict]
 *
 *   componentName  PascalCase name of the component to be built (e.g. "CaseDetails")
 *   sourcePath     Path to the React source file (.tsx)
 *   --strict       Treat any UNCLASSIFIED import (PascalCase from a relative path)
 *                  as a required child. Default: only treat imports whose origin
 *                  is `./components/...` or `@/components/...` as required.
 *
 * Inputs read:
 *   .temp/figma-from-code/builtComponents.json  -- map of { "Name": "nodeId" }
 *
 * Outputs:
 *   On success: writes .temp/figma-from-code/prereqs/<componentName>.ok with
 *     { status: "ok", componentName, availableChildren, checkedAt }
 *   On failure: prints rejection JSON to stderr and exits 1.
 *
 * Exit codes:
 *   0  All required children present, marker written
 *   1  Missing children (rejection) or other validation failure
 *   2  Usage error
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const positional = args.filter((a) => !a.startsWith('--'));
const [componentName, sourcePath] = positional;

if (!componentName || !sourcePath) {
  console.error('Usage: check-prereqs.js <componentName> <sourcePath> [--strict]');
  process.exit(2);
}

const cwd = process.cwd();
const stateJsonPath = path.join(cwd, '.temp/figma-from-code/state.json');
const builtMapPath = path.join(cwd, '.temp/figma-from-code/builtComponents.json');

let built;
let resolvedSource;

if (fs.existsSync(stateJsonPath)) {
  try {
    const state = JSON.parse(fs.readFileSync(stateJsonPath, 'utf-8'));
    if (state.builtComponents && typeof state.builtComponents === 'object') {
      built = state.builtComponents;
      resolvedSource = stateJsonPath;
    }
  } catch (err) {
    console.error(`Invalid JSON in ${stateJsonPath}: ${err.message}`);
    process.exit(1);
  }
}

if (!built) {
  if (fs.existsSync(builtMapPath)) {
    try {
      built = JSON.parse(fs.readFileSync(builtMapPath, 'utf-8'));
      resolvedSource = builtMapPath;
    } catch (err) {
      console.error(`Invalid JSON in ${builtMapPath}: ${err.message}`);
      process.exit(1);
    }
  }
}

if (!built) {
  console.error(
    JSON.stringify(
      {
        status: 'error',
        reason: 'missing_built_components_cache',
        checkedPaths: [stateJsonPath, builtMapPath],
        howToFix:
          'Either run the figma-from-code orchestrator (which writes state.json → builtComponents) or populate .temp/figma-from-code/builtComponents.json with a JSON map { "ComponentName": "nodeId", ... }. The figma-explore skill or get_metadata MCP tool can produce this.',
      },
      null,
      2
    )
  );
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Source file not found: ${sourcePath}`);
  process.exit(1);
}

const source = fs.readFileSync(sourcePath, 'utf-8');

const namedRe = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
const defaultRe = /import\s+([A-Z][A-Za-z0-9_]+)\s+(?:,\s*\{[^}]*\}\s+)?from\s+['"]([^'"]+)['"]/g;

const COMPONENT_ORIGIN_RE = /^(\.\.?\/|@\/)(components|pages)\//;

const candidates = new Set();
const ignored = [];
// Per-candidate import context: the set of origins it was imported from, and the
// set of sibling names sharing each import statement. Used to resolve compound
// sub-exports (e.g. SelectTrigger from a built Select) without masking genuinely
// independent siblings.
const candidateContext = new Map();

function recordCandidate(name, origin, siblings) {
  candidates.add(name);
  let ctx = candidateContext.get(name);
  if (!ctx) {
    ctx = { origins: new Set(), siblings: new Set() };
    candidateContext.set(name, ctx);
  }
  ctx.origins.add(origin);
  for (const s of siblings) if (s !== name) ctx.siblings.add(s);
}

// Last path segment of an import origin, with a trailing "/index" collapsed and
// any extension stripped — i.e. the component a file-module is named after.
function originBasename(origin) {
  const parts = origin.replace(/\/index$/, '').split('/');
  return (parts[parts.length - 1] || '').replace(/\.[a-zA-Z]+$/, '');
}

let m;
while ((m = namedRe.exec(source))) {
  const origin = m[2];
  const names = m[1]
    .split(',')
    .map((s) => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0])
    .filter(Boolean)
    .filter((n) => /^[A-Z][A-Za-z0-9_]+$/.test(n));
  const accepted = strict ? origin.startsWith('.') || origin.startsWith('@/') : COMPONENT_ORIGIN_RE.test(origin);
  for (const n of names) {
    if (accepted) {
      recordCandidate(n, origin, names);
    } else {
      ignored.push({ name: n, origin });
    }
  }
}
while ((m = defaultRe.exec(source))) {
  const origin = m[2];
  const name = m[1];
  if (strict ? origin.startsWith('.') || origin.startsWith('@/') : COMPONENT_ORIGIN_RE.test(origin)) {
    recordCandidate(name, origin, [name]);
  } else {
    ignored.push({ name, origin });
  }
}

candidates.delete(componentName);
candidateContext.delete(componentName);

function isBuilt(name) {
  return Boolean(built[name] || built[`Icon/${name}`] || built[`Asset/${name}`]);
}

// A child is satisfied as a compound sub-export when:
//  (a) basename rule — it is imported from a module file that is itself a built
//      component (e.g. `MenuItem` from `.../MoreOptionsMenu`, `SelectItem` from
//      `.../Select`), or
//  (b) prefix-sibling rule — it shares an import statement with a built component
//      whose name is a prefix of the child's (e.g. `PopoverContent` alongside the
//      built `Popover`, even from a barrel like `@/components/ui`).
// Both are deliberately narrow so independent siblings imported together (e.g.
// `CaseList` and `CaseDetails`) are NOT falsely satisfied for one another.
function subExportParent(child) {
  const ctx = candidateContext.get(child);
  if (!ctx) return null;
  for (const origin of ctx.origins) {
    const base = originBasename(origin);
    if (base && base !== child && isBuilt(base)) return base;
  }
  for (const sib of ctx.siblings) {
    if (sib !== child && child.startsWith(sib) && isBuilt(sib)) return sib;
  }
  return null;
}

const missing = [];
const available = [];
const resolvedSubExports = [];
for (const child of candidates) {
  if (isBuilt(child)) {
    available.push(child);
    continue;
  }
  const parent = subExportParent(child);
  if (parent) {
    available.push(child);
    resolvedSubExports.push({ child, parent });
  } else {
    missing.push(child);
  }
}

const result = {
  componentName,
  sourceFile: sourcePath,
  availableChildren: available.sort(),
  missingChildren: missing.sort(),
  resolvedSubExports,
  ignoredImports: ignored,
  strict,
};

if (missing.length > 0) {
  result.status = 'rejected';
  result.reason = 'missing_children';
  result.howToFix =
    'Build the missing children first (each must appear in builtComponents.json), then re-run this check.';
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

const markerDir = path.join(cwd, '.temp/figma-from-code/prereqs');
fs.mkdirSync(markerDir, { recursive: true });
const markerPath = path.join(markerDir, `${componentName}.ok`);
const markerBody = {
  status: 'ok',
  componentName,
  sourceFile: sourcePath,
  availableChildren: available.sort(),
  resolvedSubExports,
  checkedAt: new Date().toISOString(),
  builtComponentsCache: resolvedSource,
};
fs.writeFileSync(markerPath, JSON.stringify(markerBody, null, 2));
console.log(`OK ${componentName}: ${available.length} child(ren) verified. Marker: ${markerPath}`);
process.exit(0);
