#!/usr/bin/env node
/**
 * PreToolUse hook for the Figma `use_figma` MCP tool (any server prefix —
 * see hooks.json matcher).
 *
 * Gates fresh component builds in Figma until the build-component skill's
 * check-prereqs.js has written an OK marker for the component being built.
 * Icon/ and Asset/ masters are exempt: the icon preamble creates them in bulk
 * from SVG with no per-component prereq step.
 *
 * Trigger heuristic:
 *   The hook only blocks calls whose `code` parameter contains a top-level
 *   `figma.createComponent()` call (i.e. a fresh master). Edits, instance
 *   creation, audits, and screenshots flow through unimpeded.
 *
 * Component-name resolution:
 *   The hook scans the code for the FIRST `<varName>.name = '...'` assignment
 *   on the variable returned by `createComponent()` (or `createComponentSet`).
 *   If no name can be extracted, the call is blocked with an actionable error
 *   so the model can either name the master or run a precheck.
 *
 * Marker requirement:
 *   Marker must exist at .temp/figma-from-code/prereqs/<Name>.ok and be less
 *   than HOOK_MARKER_TTL_MS (default 1 hour) old. Stale markers are rejected.
 *
 * Hook protocol:
 *   - Reads the PreToolUse event JSON on stdin.
 *   - Exit 0  = allow.
 *   - Exit 2  = block; stderr is surfaced to the model.
 */
const fs = require('fs');
const path = require('path');

const TTL_MS = Number(process.env.HOOK_MARKER_TTL_MS || 60 * 60 * 1000);
const checkPrereqsScript = path.join(
  __dirname,
  '..',
  'skills',
  'figma-from-code',
  'scripts',
  'check-prereqs.js'
);

function read() {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.on('data', (c) => (buf += c));
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

function block(message) {
  process.stderr.write(`[figma-prereqs-gate] ${message}\n`);
  process.exit(2);
}

(async () => {
  let event;
  try {
    const raw = await read();
    event = JSON.parse(raw || '{}');
  } catch (err) {
    process.exit(0);
  }

  const code = event?.tool_input?.code;
  if (typeof code !== 'string' || !code.includes('figma.createComponent(')) {
    process.exit(0);
  }

  const createMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*figma\.createComponent\s*\(\s*\)/);
  if (!createMatch) {
    process.exit(0);
  }
  const varName = createMatch[1];

  const nameAssignRe = new RegExp(`${varName}\\s*\\.\\s*name\\s*=\\s*['"]([^'"]+)['"]`);
  const nameMatch = code.match(nameAssignRe);
  if (!nameMatch) {
    block(
      `use_figma is creating a fresh component (via \`${varName} = figma.createComponent()\`) but no \`${varName}.name = '...'\` assignment was found. ` +
        `Set the component name in the same call, or split the build into two calls (one to name it, one to populate).`
    );
  }
  const componentName = nameMatch[1];

  if (componentName.startsWith('Icon/') || componentName.startsWith('Asset/')) {
    process.exit(0);
  }

  const cwd = event?.cwd || process.cwd();
  const markerPath = path.join(cwd, '.temp/figma-from-code/prereqs', `${componentName}.ok`);

  if (!fs.existsSync(markerPath)) {
    block(
      `Refusing to build "${componentName}" — no prereq marker at ${markerPath}. ` +
        `Run:\n  node ${checkPrereqsScript} ${componentName} <pathToSource.tsx>\n` +
        `If the script reports missing children, STOP and report the rejection to the user (per skill Step 1e). ` +
        `Do not work around this hook by renaming the master or editing this script.`
    );
  }

  const ageMs = Date.now() - fs.statSync(markerPath).mtimeMs;
  if (ageMs > TTL_MS) {
    block(
      `Prereq marker for "${componentName}" is stale (${Math.round(ageMs / 60000)} min old, ttl ${Math.round(TTL_MS / 60000)} min). ` +
        `Re-run check-prereqs.js to refresh it.`
    );
  }

  try {
    const body = JSON.parse(fs.readFileSync(markerPath, 'utf-8'));
    if (body.status !== 'ok') {
      block(`Marker for "${componentName}" exists but its status is "${body.status}". Re-run check-prereqs.js.`);
    }
  } catch (err) {
    block(`Marker for "${componentName}" is unreadable: ${err.message}. Re-run check-prereqs.js.`);
  }

  process.exit(0);
})();
