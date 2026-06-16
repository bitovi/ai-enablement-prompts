#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const tierIdx = args.indexOf('--tier');
const componentsIdx = args.indexOf('--components');
const tierFrameIdIdx = args.indexOf('--tier-frame-id');

if (tierIdx === -1 || componentsIdx === -1) {
  console.error('Usage: collect-tier-results.js --tier <N> --components "Comp1,Comp2,..." [--tier-frame-id <id>]');
  process.exit(1);
}

const tier = parseInt(args[tierIdx + 1], 10);
const components = args[componentsIdx + 1].split(',').map(s => s.trim()).filter(Boolean);
const tierFrameId = tierFrameIdIdx !== -1 ? args[tierFrameIdIdx + 1] : null;
const baseDir = '.temp/figma-from-code';
const resultsDir = path.join(baseDir, 'build-results');
const statePath = path.join(baseDir, 'state.json');

const completed = [];
const failed = [];
let matched = 0;
let mismatched = 0;
let noRef = 0;

for (const name of components) {
  const resultPath = path.join(resultsDir, `${name}.json`);
  if (!fs.existsSync(resultPath)) {
    failed.push({ name, status: 'no_result_file', reason: null });
    continue;
  }
  try {
    const result = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    if (result.status === 'rejected' || result.status === 'needs_authorization') {
      failed.push({ name, status: result.status, reason: result.reason || null });
      continue;
    }
    const entry = {
      name: result.componentName || name,
      nodeId: result.nodeId,
      variants: result.variants || null,
      matchPct: result.comparison ? result.comparison.matchPct : null,
    };
    const verdict = result.comparison ? result.comparison.verdict : null;
    completed.push(entry);
    if (verdict === 'match' || verdict === 'minor_diff') matched++;
    else if (verdict === 'no_app_reference') noRef++;
    else mismatched++;
  } catch (e) {
    failed.push({ name, status: 'parse_error', reason: e.message });
  }
}

const tierSummary = {
  tier,
  tierFrameId,
  status: failed.length > 0 ? 'complete_with_failures' : 'complete',
  completed,
  failed,
};
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
state.tierProgress[`tier${tier}`] = 'complete';
fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

fs.writeFileSync(
  path.join(baseDir, 'builtComponents.json'),
  JSON.stringify(state.builtComponents, null, 2)
);

const summary = {
  completed: completed.length,
  failed: failed.length,
  matched,
  mismatched,
  noRef,
};
console.log(JSON.stringify(summary));
