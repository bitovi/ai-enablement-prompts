#!/usr/bin/env node
/**
 * PreToolUse hook for `Write` / `Edit` on the build-results file
 * `.temp/figma-from-code/build-results/<componentName>.json`. That file is
 * the canonical end-of-build artifact emitted by the build-component skill
 * (Step 7 / Mode B subagent return), so blocking its write is equivalent to
 * blocking "the build is considered done".
 *
 * Requires `.temp/figma-from-code/instances/<componentName>.ok` (written by
 * check-instances.js — Step 4a) to exist and be fresh. Without it, the
 * skill's structural-correctness gate was skipped or rejected, and the build
 * should not be reported as complete.
 *
 * Trigger heuristic:
 *   Fires only on `Write` / `Edit` tool calls whose `file_path` ends with
 *   `.temp/figma-from-code/build-results/<name>.json`. Exempt:
 *   - `<name>-built.json` — the 7a→7b handoff file, written before Step 4a runs
 *   - results whose `status` is an early-exit value (rejected,
 *     needs_authorization, failed, no_app_reference) — those do not claim a
 *     completed build, so the structural gate does not apply
 *
 * Marker requirement:
 *   `.temp/figma-from-code/instances/<componentName>.ok` must exist, be
 *   < HOOK_MARKER_TTL_MS old (default 1 hour), and parse as JSON with
 *   `status: "ok"`.
 *
 * Hook protocol:
 *   - Reads the PreToolUse event JSON on stdin.
 *   - Exit 0 = allow.
 *   - Exit 2 = block; stderr is surfaced to the model.
 */
const fs = require('fs');
const path = require('path');

const TTL_MS = Number(process.env.HOOK_MARKER_TTL_MS || 60 * 60 * 1000);
const checkInstancesScript = path.join(
  __dirname,
  '..',
  'skills',
  'figma-from-code',
  'scripts',
  'check-instances.js'
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
  process.stderr.write(`[figma-instances-gate] ${message}\n`);
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

  const toolName = event?.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit') {
    process.exit(0);
  }

  const filePath = event?.tool_input?.file_path;
  if (typeof filePath !== 'string') {
    process.exit(0);
  }

  const buildResultsRe = /\.temp\/figma-from-code\/build-results\/([^/]+)\.json$/;
  const m = filePath.match(buildResultsRe);
  if (!m) {
    process.exit(0);
  }

  const stem = m[1];
  if (stem.endsWith('-built')) {
    process.exit(0);
  }
  const componentName = stem;

  const EARLY_EXIT_STATUSES = ['rejected', 'needs_authorization', 'failed', 'no_app_reference'];
  const content = event?.tool_input?.content;
  if (typeof content === 'string') {
    let status = null;
    try {
      status = JSON.parse(content)?.status ?? null;
    } catch (err) {
      const sm = content.match(/"status"\s*:\s*"([^"]+)"/);
      status = sm ? sm[1] : null;
    }
    if (status && EARLY_EXIT_STATUSES.includes(status)) {
      process.exit(0);
    }
  }

  const cwd = event?.cwd || process.cwd();
  const markerPath = path.join(cwd, '.temp/figma-from-code/instances', `${componentName}.ok`);

  if (!fs.existsSync(markerPath)) {
    block(
      `Refusing to write build-results for "${componentName}" — no instance-gate marker at ${markerPath}. ` +
        `Step 4a was not run (or rejected). Before marking this build complete:\n` +
        `  1. Re-enumerate post-build instances and refresh <sourceDir>/.figma/figma.json (Step 2f / Step 5c).\n` +
        `  2. Run: node ${checkInstancesScript} ${componentName} <sourceDir>\n` +
        `If the gate rejects, replace the missing local stand-ins with real component instances (see step-2-build.md §2c "Overriding text inside an instance"). Do not work around this hook by renaming the result file or editing this script.`
    );
  }

  const ageMs = Date.now() - fs.statSync(markerPath).mtimeMs;
  if (ageMs > TTL_MS) {
    block(
      `Instance-gate marker for "${componentName}" is stale (${Math.round(ageMs / 60000)} min old, ttl ${Math.round(TTL_MS / 60000)} min). ` +
        `The build was modified after the gate last passed — re-run Step 2f + check-instances.js to refresh.`
    );
  }

  try {
    const body = JSON.parse(fs.readFileSync(markerPath, 'utf-8'));
    if (body.status !== 'ok') {
      block(`Marker for "${componentName}" exists but its status is "${body.status}". Re-run check-instances.js.`);
    }
  } catch (err) {
    block(`Marker for "${componentName}" is unreadable: ${err.message}. Re-run check-instances.js.`);
  }

  process.exit(0);
})();
