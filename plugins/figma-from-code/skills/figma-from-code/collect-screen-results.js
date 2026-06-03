#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const screensIdx = args.indexOf('--screens');

if (screensIdx === -1) {
  console.error('Usage: collect-screen-results.js --screens "Screen1,Screen2,..."');
  process.exit(1);
}

const screens = args[screensIdx + 1].split(',').map(s => s.trim()).filter(Boolean);
const baseDir = '.temp/figma-from-code';
const resultsDir = path.join(baseDir, 'build-results', 'screens');

const completed = [];
const failed = [];
const rejected = [];

for (const name of screens) {
  const resultPath = path.join(resultsDir, `${name}.json`);
  if (!fs.existsSync(resultPath)) {
    failed.push({ name, error: 'no_result_file' });
    continue;
  }
  try {
    const result = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    if (result.status === 'rejected') {
      rejected.push({ name, reason: result.reason, missingComponents: result.missingComponents });
      continue;
    }
    if (result.status === 'needs_authorization') {
      rejected.push({ name, reason: 'needs_authorization' });
      continue;
    }
    completed.push({
      name: result.screenName || name,
      nodeId: result.nodeId,
      verdict: result.comparison?.verdict,
      matchPct: result.comparison?.matchPct,
      iterations: result.comparison?.iterations,
    });
  } catch (e) {
    failed.push({ name, error: `parse_error: ${e.message}` });
  }
}

const screenStatus = failed.length === 0 && rejected.length === 0 ? 'complete' : 'complete_with_failures';
const output = { status: screenStatus, screens: completed, failed, rejected };
fs.writeFileSync(
  path.join(baseDir, 'build-screens.json'),
  JSON.stringify(output, null, 2)
);

const summary = {
  status: screenStatus,
  completed: completed.length,
  failed: failed.length,
  rejected: rejected.length,
  matched: completed.filter(s => s.verdict === 'match').length,
  minorDiff: completed.filter(s => s.verdict === 'minor_diff').length,
};
console.log(JSON.stringify(summary));
