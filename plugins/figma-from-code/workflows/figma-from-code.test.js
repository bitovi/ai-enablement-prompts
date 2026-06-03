import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, 'figma-from-code.js'), 'utf-8');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { console.log('  \x1b[32m✓\x1b[0m', msg); passed++; }
function fail(msg) { console.error('  \x1b[31m✗\x1b[0m', msg); failed++; }
function warn(msg) { console.warn('  \x1b[33m⚠\x1b[0m', msg); warnings++; }

// --- 1. Meta block ---

console.log('\n1. Meta block');

const metaMatch = src.match(/export const meta = (\{[\s\S]*?\n\})/m);
if (!metaMatch) {
  fail('No meta block found');
} else {
  pass('Meta block present');

  let meta;
  try {
    meta = eval('(' + metaMatch[1] + ')');
    pass('Meta block is a pure literal');
  } catch (e) {
    fail('Meta block parse error: ' + e.message);
  }

  if (meta) {
    if (meta.name && typeof meta.name === 'string') {
      pass('meta.name: "' + meta.name + '"');
    } else {
      fail('meta.name missing or not a string');
    }

    if (meta.description && typeof meta.description === 'string') {
      pass('meta.description present');
    } else {
      fail('meta.description missing or not a string');
    }

    if (Array.isArray(meta.phases) && meta.phases.length > 0) {
      pass('meta.phases: ' + meta.phases.length + ' entries');
      for (const p of meta.phases) {
        if (!p.title) fail('Phase missing title: ' + JSON.stringify(p));
      }
    } else {
      fail('meta.phases missing or empty');
    }

    // Check for computed values in meta (template literals, function calls, variables)
    const metaStr = metaMatch[1];
    if (/`/.test(metaStr)) fail('Meta contains template literals');
    else if (/\$\{/.test(metaStr)) fail('Meta contains interpolation');
    else if (/\.\.\.|\.call|\.apply|\.bind/.test(metaStr)) fail('Meta contains spread/call/apply');
    else pass('Meta has no computed values');
  }
}

// --- 2. Forbidden runtime patterns ---

console.log('\n2. Forbidden runtime patterns');

const forbidden = [
  [/\bDate\.now\s*\(/g, 'Date.now() — breaks resume'],
  [/\bMath\.random\s*\(/g, 'Math.random() — breaks resume'],
  [/\bnew Date\s*\(\s*\)/g, 'new Date() — breaks resume'],
  [/\brequire\s*\(/g, 'require() — no Node.js API in workflow scripts'],
  [/\bfs\.\w/g, 'fs.* — no filesystem access in workflow script'],
  [/\bprocess\.\w/g, 'process.* — no Node.js API'],
  [/\bconsole\.\w/g, 'console.* — use log() instead'],
];

for (const [pat, msg] of forbidden) {
  const hits = src.match(pat);
  if (hits) {
    fail(msg + ' (' + hits.length + ' occurrence(s))');
  } else {
    pass('No ' + msg.split('—')[0].trim());
  }
}

// --- 3. TypeScript annotations ---

console.log('\n3. TypeScript annotations');

const lines = src.split('\n');
let tsCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("type: '") || line.includes('type: "')) continue;
  if (line.trim().startsWith('//')) continue;
  if (/:\s+(string|number|boolean|any|void|never)\s*[,;\)\]\}]/.test(line)
    && !line.includes("'") && !line.includes('"')) {
    fail('TypeScript annotation at line ' + (i + 1) + ': ' + line.trim());
    tsCount++;
  }
}
if (tsCount === 0) pass('No TypeScript annotations found');

// --- 4. JavaScript syntax ---

console.log('\n4. JavaScript syntax');

const body = src.replace(/^export const meta[\s\S]*?\n\}/m, '');
const wrapped = '(async function(agent, parallel, phase, log, args, budget) {' + body + '})';
try {
  new Function(wrapped);
  pass('JavaScript syntax valid (async-wrapped)');
} catch (e) {
  fail('Syntax error: ' + e.message);
}

// --- 5. Schema definitions ---

console.log('\n5. Schema definitions');

const schemaNames = [...src.matchAll(/const (\w+_SCHEMA)\s*=\s*\{/g)].map(m => m[1]);
if (schemaNames.length === 0) {
  fail('No schema definitions found');
} else {
  pass(schemaNames.length + ' schemas defined');
}

for (const name of schemaNames) {
  const usages = (src.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
  if (usages < 2) {
    warn(name + ' defined but never referenced in an agent() call');
  } else {
    pass(name + ' referenced ' + (usages - 1) + ' time(s)');
  }
}

// Verify each schema parses as valid JSON-like structure
for (const name of schemaNames) {
  const schemaMatch = src.match(new RegExp('const ' + name + '\\s*=\\s*(\\{[\\s\\S]*?\\n\\})'));
  if (schemaMatch) {
    try {
      eval('(' + schemaMatch[1] + ')');
      pass(name + ' parses as valid object');
    } catch (e) {
      fail(name + ' parse error: ' + e.message);
    }
  }
}

// --- 6. Phase consistency ---

console.log('\n6. Phase consistency');

const phaseCalls = [...src.matchAll(/phase\('([^']+)'\)/g)].map(m => m[1]);
let meta2;
try { meta2 = eval('(' + metaMatch[1] + ')'); } catch (_) {}

if (meta2) {
  const metaTitles = new Set(meta2.phases.map(p => p.title));
  const usedTitles = new Set(phaseCalls);

  for (const p of phaseCalls) {
    if (metaTitles.has(p)) {
      pass('phase("' + p + '") matches meta.phases');
    } else {
      warn('phase("' + p + '") has no matching meta.phases entry');
    }
  }

  for (const t of metaTitles) {
    if (!usedTitles.has(t)) {
      warn('meta.phases "' + t + '" never called via phase()');
    }
  }
}

// --- 7. Agent calls ---

console.log('\n7. Agent calls');

const agentCalls = (src.match(/await agent\(/g) || []).length;
const parallelCalls = (src.match(/await parallel\(/g) || []).length;
pass(agentCalls + ' agent() calls');
pass(parallelCalls + ' parallel() calls');

// Check that agent calls inside parallel() use thunk wrappers
const parallelBlocks = [...src.matchAll(/await parallel\(\[([\s\S]*?)\]\)/g)];
for (let i = 0; i < parallelBlocks.length; i++) {
  const block = parallelBlocks[i][1];
  const bareAgents = block.match(/[^(]\bagent\s*\(/g);
  const thunks = block.match(/(?:function\s*\(\)|=>\s*\{|=>\s*agent|\(\)\s*=>)/g);
  if (thunks && thunks.length > 0) {
    pass('parallel() block ' + (i + 1) + ' uses thunk wrappers');
  } else {
    fail('parallel() block ' + (i + 1) + ' may have bare agent() calls (need () => agent(...))');
  }
}

// --- 8. Phase skip logic ---

console.log('\n8. Phase skip logic');

if (src.includes('shouldRunPhase') || src.includes('shouldRunWave')) {
  pass('Phase skip functions defined');
} else {
  fail('No phase skip logic found');
}

if (src.includes('PHASE_ORDER')) {
  const orderMatch = src.match(/PHASE_ORDER\s*=\s*\[([\s\S]*?)\]/);
  if (orderMatch) {
    const phases = orderMatch[1].match(/'[^']+'/g).map(s => s.replace(/'/g, ''));
    const expected = ['phase0a', 'phase0b', 'phase1', 'phase2', 'phase2_5', 'phase3', 'phase4', 'phase5'];
    const match = JSON.stringify(phases) === JSON.stringify(expected);
    if (match) {
      pass('PHASE_ORDER matches expected sequence');
    } else {
      fail('PHASE_ORDER mismatch. Got: ' + JSON.stringify(phases));
    }
  }
} else {
  fail('No PHASE_ORDER constant found');
}

// --- 9. State hydration ---

console.log('\n9. State hydration');

if (src.includes('needsHydration')) {
  pass('State hydration logic present');
} else {
  fail('No state hydration logic');
}

if (src.includes('HYDRATION_SCHEMA')) {
  pass('HYDRATION_SCHEMA defined');
} else {
  fail('No HYDRATION_SCHEMA');
}

// --- 10. Error handling ---

console.log('\n10. Error handling');

const errorReturns = (src.match(/return \{.*error/g) || []).length;
if (errorReturns > 0) {
  pass(errorReturns + ' error return path(s)');
} else {
  warn('No error return paths found');
}

const successChecks = (src.match(/\.success\b/g) || []).length;
if (successChecks > 0) {
  pass(successChecks + ' success field checks');
} else {
  warn('No success field checks');
}

// --- Summary ---

console.log('\n' + '─'.repeat(40));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed, ' + warnings + ' warnings');
console.log('Lines: ' + lines.length);

if (failed > 0) {
  console.log('\x1b[31m\nFAILED\x1b[0m');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\x1b[33m\nPASSED with warnings\x1b[0m');
} else {
  console.log('\x1b[32m\nPASSED\x1b[0m');
}
