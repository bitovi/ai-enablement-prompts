#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const tierIdx = args.indexOf('--tier');
const componentsIdx = args.indexOf('--components');

if (tierIdx === -1 || componentsIdx === -1) {
  console.error('Usage: collect-tier-results.js --tier <N> --components "Comp1,Comp2,..."');
  process.exit(1);
}

const tier = parseInt(args[tierIdx + 1], 10);
const components = args[componentsIdx + 1].split(',').map(s => s.trim()).filter(Boolean);
const baseDir = '.temp/figma-from-code';
const resultsDir = path.join(baseDir, 'build-results');
const statePath = path.join(baseDir, 'state.json');

const completed = [];
const failed = [];
let matched = 0;
let minorDiff = 0;
let mismatched = 0;
let noRef = 0;

for (const name of components) {
  const resultPath = path.join(resultsDir, `${name}.json`);
  if (!fs.existsSync(resultPath)) {
    failed.push({ name, error: 'no_result_file' });
    continue;
  }
  try {
    const result = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    if (result.status === 'rejected' || result.status === 'needs_authorization') {
      failed.push({ name, error: result.status, reason: result.reason });
      continue;
    }
    const entry = {
      name: result.componentName || name,
      nodeId: result.nodeId,
      figmaScreenshot: result.figmaScreenshot,
    };
    if (result.comparison) {
      entry.verdict = result.comparison.verdict;
      entry.matchPct = result.comparison.matchPct;
    }
    completed.push(entry);
    if (entry.verdict === 'match') matched++;
    else if (entry.verdict === 'minor_diff') minorDiff++;
    else if (entry.verdict === 'no_app_reference') noRef++;
    else mismatched++;
  } catch (e) {
    failed.push({ name, error: `parse_error: ${e.message}` });
  }
}

const tierSummary = { tier: `tier${tier}`, completed, failed };
fs.writeFileSync(
  path.join(baseDir, `build-tier${tier}.json`),
  JSON.stringify(tierSummary, null, 2)
);

const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
if (!state.builtComponents) state.builtComponents = {};
for (const c of completed) {
  if (c.nodeId) state.builtComponents[c.name] = c.nodeId;
}
state.tierProgress = state.tierProgress || {};
// Honest status: a tier is only "complete" when nothing failed. Otherwise record
// "complete_with_failures" plus the failed component names so state.json reflects
// reality — the orchestrator and any resume must not treat a partial tier as done.
state.tierProgress[`tier${tier}`] = failed.length === 0 ? 'complete' : 'complete_with_failures';
state.tierFailures = state.tierFailures || {};
if (failed.length === 0) {
  delete state.tierFailures[`tier${tier}`];
} else {
  state.tierFailures[`tier${tier}`] = failed.map(f => f.name);
}
fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

// Merge this tier's completed node IDs INTO the existing builtComponents.json
// rather than overwriting it from state.json. Mid-Phase-3, state.json lags behind
// the orchestrator's in-memory registry (it does not yet hold icons or freshly
// built earlier tiers), so rewriting from it would truncate the registry that the
// next tier depends on. Merging preserves everything already on disk.
const builtPath = path.join(baseDir, 'builtComponents.json');
let built = {};
if (fs.existsSync(builtPath)) {
  try {
    built = JSON.parse(fs.readFileSync(builtPath, 'utf-8'));
  } catch {
    built = {};
  }
}
for (const c of completed) {
  if (c.nodeId) built[c.name] = c.nodeId;
}
fs.writeFileSync(builtPath, JSON.stringify(built, null, 2));

const summary = {
  tierStatus: failed.length === 0 ? 'complete' : 'complete_with_failures',
  completed: completed.length,
  failed: failed.length,
  failedComponents: failed.map(f => f.name),
  matched,
  minorDiff,
  mismatched,
  noRef,
};
console.log(JSON.stringify(summary));
