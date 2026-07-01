#!/usr/bin/env node
// merge-state.js — Deep-merges a JSON patch into state.json.
// Usage: node merge-state.js <state-file-path> '<json-patch>'
//
// Used by the workflow's bookkeeping agents to update state.json without
// requiring the agent to reason about file I/O — just run the command.

const fs = require('fs');
const statePath = process.argv[2];
const patch = JSON.parse(process.argv[3]);

function deepMerge(target, source) {
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
const merged = deepMerge(state, patch);
fs.writeFileSync(statePath, JSON.stringify(merged, null, 2));
