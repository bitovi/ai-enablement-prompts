#!/usr/bin/env node
/**
 * Verify that every design-system child the source code uses appears as an
 * INSTANCE inside the built Figma component, by comparing the two `.figma/`
 * tracking files written during the build.
 *
 * Inputs:
 *   <componentDir>/.figma/code.json   — analysis snapshot (Step 1h).
 *                                       Field: childComponents = [Figma names]
 *   <componentDir>/.figma/figma.json  — built-state record (Step 2f / Step 5).
 *                                       Field: dependencies[].componentName
 *
 * The script diffs `code.childComponents` against `figma.dependencies[].componentName`.
 * Mismatch is the failure that produced "I rendered EditableTitle as a text node"
 * — visually identical at rest, but design-system-broken.
 *
 * Usage:
 *   node check-instances.js <componentName> <componentDir>
 *
 *   componentName   PascalCase name (used in marker + rejection JSON)
 *   componentDir    Directory containing `.figma/code.json` and `.figma/figma.json`
 *                   (typically the modlet directory)
 *
 * Outputs:
 *   On success: writes .temp/figma-from-code/instances/<componentName>.ok
 *   On failure: prints rejection JSON to stderr and exits 1.
 *
 * Exit codes:
 *   0  Every required child is instanced.
 *   1  At least one required child is missing (rejection), or a tracking file
 *      is missing / malformed.
 *   2  Usage error.
 */
const fs = require('fs');
const path = require('path');

const [, , componentName, componentDir] = process.argv;

if (!componentName || !componentDir) {
  console.error('Usage: check-instances.js <componentName> <componentDir>');
  process.exit(2);
}

const cwd = process.cwd();
const resolvedDir = path.resolve(cwd, componentDir);
const codePath = path.join(resolvedDir, '.figma', 'code.json');
const figmaPath = path.join(resolvedDir, '.figma', 'figma.json');

function readTracking(label, p) {
  if (!fs.existsSync(p)) {
    console.error(
      JSON.stringify(
        {
          status: 'error',
          reason: `missing_${label}`,
          expectedPath: p,
          howToFix:
            label === 'code_json'
              ? 'Step 1h must write `.figma/code.json` from the analysis snapshot before this gate runs.'
              : 'Step 2f must write `.figma/figma.json` (with dependencies enumerated from the built component) before this gate runs.',
        },
        null,
        2
      )
    );
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (err) {
    console.error(`Invalid JSON in ${p}: ${err.message}`);
    process.exit(1);
  }
}

const code = readTracking('code_json', codePath);
const figma = readTracking('figma_json', figmaPath);

const rawChildren = Array.isArray(code.childComponents) ? code.childComponents : [];
const required = rawChildren.map((c) => (typeof c === 'string' ? c : c.figmaName));
const builtDeps = Array.isArray(figma.dependencies) ? figma.dependencies : [];
const actual = new Set(builtDeps.map((d) => d.componentName));

const missing = required.filter((name) => !actual.has(name));
const unexpected = [...actual].filter((name) => !required.includes(name));

const result = {
  componentName,
  componentDir: resolvedDir,
  codeJson: codePath,
  figmaJson: figmaPath,
  requiredInstances: [...required].sort(),
  presentInstances: required.filter((n) => actual.has(n)).sort(),
  missingInstances: [...missing].sort(),
  unexpectedInstances: unexpected.sort(),
};

if (missing.length > 0) {
  result.status = 'rejected';
  result.reason = 'missing_instances';
  result.howToFix =
    'The build rendered the listed components as plain text or local frames instead of instancing them. Replace each local subtree with `figma.getNodeById(builtComponents[name]).createInstance()`. For instances of component sets, pick the right variant via setProperties(). To override text inside an instance, findOne(n => n.type === "TEXT"), loadFontAsync(text.fontName), then setCharacters. After fixing, re-run Step 2f to refresh `.figma/figma.json` and re-run this check.';
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

const markerDir = path.join(cwd, '.temp/figma-from-code/instances');
fs.mkdirSync(markerDir, { recursive: true });
const markerPath = path.join(markerDir, `${componentName}.ok`);
fs.writeFileSync(
  markerPath,
  JSON.stringify(
    {
      status: 'ok',
      componentName,
      componentDir: resolvedDir,
      requiredInstances: result.requiredInstances,
      checkedAt: new Date().toISOString(),
    },
    null,
    2
  )
);
console.log(
  `OK ${componentName}: ${result.presentInstances.length} required instance(s) verified. Marker: ${markerPath}`
);
process.exit(0);
