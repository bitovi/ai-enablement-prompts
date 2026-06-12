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

let m;
while ((m = namedRe.exec(source))) {
  const origin = m[2];
  const names = m[1]
    .split(',')
    .map((s) => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0])
    .filter(Boolean);
  for (const n of names) {
    if (!/^[A-Z][A-Za-z0-9_]+$/.test(n)) continue;
    if (strict ? origin.startsWith('.') || origin.startsWith('@/') : COMPONENT_ORIGIN_RE.test(origin)) {
      candidates.add(n);
    } else {
      ignored.push({ name: n, origin });
    }
  }
}
while ((m = defaultRe.exec(source))) {
  const origin = m[2];
  const name = m[1];
  if (strict ? origin.startsWith('.') || origin.startsWith('@/') : COMPONENT_ORIGIN_RE.test(origin)) {
    candidates.add(name);
  } else {
    ignored.push({ name, origin });
  }
}

candidates.delete(componentName);

const missing = [];
const available = [];
for (const child of candidates) {
  if (built[child] || built[`Icon/${child}`] || built[`Asset/${child}`]) {
    available.push(child);
  } else {
    missing.push(child);
  }
}

const result = {
  componentName,
  sourceFile: sourcePath,
  availableChildren: available.sort(),
  missingChildren: missing.sort(),
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
  checkedAt: new Date().toISOString(),
  builtComponentsCache: resolvedSource,
};
fs.writeFileSync(markerPath, JSON.stringify(markerBody, null, 2));
console.log(`OK ${componentName}: ${available.length} child(ren) verified. Marker: ${markerPath}`);
process.exit(0);
