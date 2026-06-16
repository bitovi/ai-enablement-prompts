export const meta = {
  name: 'figma-from-code',
  description: 'Rebuild Figma file from codebase — discover, tokenize, build components, assemble screens, validate',
  whenToUse: 'When the user wants to run the figma-from-code pipeline as an unattended batch run. Same phase sub-skills and contracts as the figma-from-code skill orchestrator; use the skill for interactive runs with per-phase pause points.',
  phases: [
    { title: 'Hydrate', detail: 'Load state from prior phases (when starting mid-pipeline)' },
    { title: 'Discovery', detail: 'Browser crawl + icon scan (parallel)' },
    { title: 'Normalize', detail: 'Align component names with Figma conventions' },
    { title: 'Setup', detail: 'Tokens, then file structure (foundations docs bind Phase 1 variables)' },
    { title: 'Pre-capture', detail: 'Screenshot all components and screens' },
    { title: 'Build Icons', detail: 'Create icon/asset components from SVG' },
    { title: 'Build Tiers', detail: 'One subagent per component; tiers run sequentially, fresh context per component' },
    { title: 'Build Screens', detail: 'Compose screens from built components (parallel)' },
    { title: 'Validate', detail: 'Compare screen frames vs app screenshots, fix mismatches' },
  ],
}

// Thin batch runner over the same phase sub-skills and contracts as the skill
// orchestrator ({skillRoot}/SKILL.md) — one architecture, two entry points.
// Every substantive phase is ONE subagent reading its own SKILL.md; this script
// only sequences dispatches, threads contract fields between them, and keeps
// state.json in sync via haiku bookkeeping agents (phase subagents never write
// state.json, matching the orchestrator's "subagents do not modify state" rule).
//
// Differences from the interactive skill orchestrator, inherent to batch mode:
// - No pause points: the run does not stop for user confirmation between waves
//   or tiers. Components/screens that hit the Pre-Existing rule come back as
//   needs_authorization failures in the summary instead of pausing.
// - No config detection/confirmation: project values come from args (defaults
//   below); on a mid-pipeline start, state.json → config wins over defaults.

// Model policy (per-agent `model:` opt; omitting it inherits the session model):
//   inherit — tier builds, screen builds, validation, component discovery.
//             Vision/codegen reasoning where a weaker model measurably hurts.
//   sonnet  — mechanical-but-non-trivial setup agents (tokens, structure,
//             precapture, asset discovery, icon preamble).
//   haiku   — pure file I/O / shell wrappers with no judgment (state init,
//             hydration, registry writes, collectors, cleanup).

const PHASE_ORDER = [
  'phase0a', 'phase0b', 'phase1', 'phase2', 'phase2_5', 'phase3', 'phase4', 'phase5'
]

const WAVE_MEMBERS = {
  wave1: ['phase0a', 'phase0b'],
  wave2: ['phase1', 'phase2'],
  wave3: ['phase2_5'],
  wave4: ['phase3'],
  wave5: ['phase4'],
  wave6: ['phase5'],
}

function shouldRunPhase(phaseId, startPhase, endPhase) {
  const idx = PHASE_ORDER.indexOf(phaseId)
  const startIdx = startPhase ? PHASE_ORDER.indexOf(startPhase) : 0
  const endIdx = endPhase ? PHASE_ORDER.indexOf(endPhase) : PHASE_ORDER.length - 1
  return idx >= startIdx && idx <= endIdx
}

function shouldRunWave(waveName, startPhase, endPhase) {
  return WAVE_MEMBERS[waveName].some(p => shouldRunPhase(p, startPhase, endPhase))
}

// --- Schemas ---

const STATE_UPDATE_SCHEMA = {
  type: 'object',
  properties: { success: { type: 'boolean' } },
  required: ['success']
}

const TIERS_ITEMS = {
  type: 'object',
  properties: {
    tier: { type: 'number' },
    label: { type: 'string' },
    components: { type: 'array', items: { type: 'string' } }
  },
  required: ['tier', 'label', 'components']
}

const SCREEN_LIST_ITEMS = {
  type: 'object',
  properties: {
    screenName: { type: 'string' },
    route: { type: 'string' },
    pageSourceFile: { type: 'string' },
    keyComponents: { type: 'array', items: { type: 'string' } }
  },
  required: ['screenName', 'route']
}

const HYDRATION_SCHEMA = {
  type: 'object',
  properties: {
    fileKey: { type: 'string' },
    config: { type: 'object', additionalProperties: { type: ['string', 'null'] } },
    tiers: { type: 'array', items: TIERS_ITEMS },
    tierProgress: { type: 'object', additionalProperties: { type: 'string' } },
    builtComponents: { type: 'object', additionalProperties: { type: 'string' } },
    preExistingComponents: { type: 'object', additionalProperties: { type: 'string' } },
    preExistingScreens: { type: 'object', additionalProperties: { type: 'string' } },
    existingCollections: { type: 'array', items: { type: 'string' } },
    existingPages: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, id: { type: 'string' } },
        required: ['name', 'id']
      }
    },
    figmaNodes: { type: 'object', additionalProperties: { type: 'string' } },
    screens: { type: 'array', items: SCREEN_LIST_ITEMS }
  },
  required: ['fileKey', 'tiers', 'builtComponents', 'figmaNodes']
}

const DISCOVERY_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    componentCount: { type: 'number' },
    tierCount: { type: 'number' },
    componentDirectories: { type: 'array', items: { type: 'string' } },
    existingCollections: { type: 'array', items: { type: 'string' } },
    existingPages: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, id: { type: 'string' } },
        required: ['name', 'id']
      }
    }
  },
  required: ['success', 'componentCount', 'tierCount']
}

const ASSETS_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    iconCount: { type: 'number' },
    assetCount: { type: 'number' },
    icons: { type: 'array', items: { type: 'string' } },
    assets: { type: 'array', items: { type: 'string' } }
  },
  required: ['success', 'iconCount']
}

const NORMALIZE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    renameCount: { type: 'number' },
    tiers: { type: 'array', items: TIERS_ITEMS },
    builtComponents: { type: 'object', additionalProperties: { type: 'string' } },
    preExistingComponents: { type: 'object', additionalProperties: { type: 'string' } },
    preExistingScreens: { type: 'object', additionalProperties: { type: 'string' } }
  },
  required: ['success', 'tiers']
}

const TOKENS_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    variableCount: { type: 'number' },
    collections: { type: 'array', items: { type: 'string' } },
    variableMapPath: { type: 'string' }
  },
  required: ['success']
}

const STRUCTURE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    foundationsPageId: { type: 'string' },
    componentsPageId: { type: 'string' },
    screensPageId: { type: 'string' },
    foundationsFrameId: { type: 'string' },
    iconsFrameId: { type: 'string' },
    screensFrameId: { type: 'string' }
  },
  required: ['success', 'componentsPageId', 'iconsFrameId', 'screensFrameId']
}

const PRECAPTURE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    componentsCaptured: { type: 'number' },
    screensCaptured: { type: 'number' },
    skipped: { type: 'number' },
    failed: { type: 'number' },
    screens: { type: 'array', items: SCREEN_LIST_ITEMS }
  },
  required: ['success', 'screens']
}

const PREAMBLE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    created: { type: 'object', additionalProperties: { type: 'string' } },
    totalCreated: { type: 'number' },
    totalSkipped: { type: 'number' },
    totalFailed: { type: 'number' }
  },
  required: ['success', 'created']
}

const TIER_SETUP_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    tierFrameId: { type: 'string' }
  },
  required: ['success', 'tierFrameId']
}

const COMPONENT_BUILD_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    success: { type: 'boolean' },
    status: { type: 'string', enum: ['success', 'partial_match', 'failed', 'rejected', 'needs_authorization'] },
    nodeId: { type: 'string' },
    matchPct: { type: 'number' },
    reason: { type: 'string' }
  },
  required: ['name', 'success', 'status']
}

const COLLECT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    completed: { type: 'number' },
    failed: { type: 'number' }
  },
  required: ['success']
}

const SCREEN_SCHEMA = {
  type: 'object',
  properties: {
    screenName: { type: 'string' },
    status: { type: 'string', enum: ['success', 'rejected', 'needs_authorization', 'failed'] },
    nodeId: { type: 'string' },
    verdict: { type: 'string' },
    matchPct: { type: 'number' },
    missingComponents: { type: 'array', items: { type: 'string' } }
  },
  required: ['screenName', 'status']
}

const VALIDATION_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    componentsCompared: { type: 'number' },
    match: { type: 'number' },
    minorDiff: { type: 'number' },
    mismatch: { type: 'number' },
    noAppReference: { type: 'number' },
    fixedDuringValidation: { type: 'number' },
    averageMatchPct: { type: 'number' },
    overallVerdict: { type: 'string' },
    preExistingFlaggedCount: { type: 'number' },
    reportPath: { type: 'string' }
  },
  required: ['success', 'overallVerdict']
}

// --- Args ---

// Normalize: the Workflow runtime may deliver args as a JSON string rather than
// a parsed object. Also accept a space-separated "devServerUrl figmaUrl" pair
// from the skill slash-command invocation.
const _a = (function() {
  if (!args) return {}
  if (typeof args === 'object') return args
  var s = String(args).trim()
  if (s.charAt(0) === '{') { try { return JSON.parse(s) } catch (_) { return {} } }
  var result = {}
  var parts = s.split(/\s+/)
  for (var i = 0; i < parts.length; i++) {
    var m = parts[i].match(/figma\.com\/(?:design|file)\/([A-Za-z0-9_-]+)/)
    if (m) { result.fileKey = m[1] }
    else if (parts[i].indexOf('http') === 0) { result.devServerUrl = parts[i] }
  }
  return result
})()

const {
  fileKey,                  // REQUIRED — the target Figma file key (no default)
  startPhase = 'phase0a',
  endPhase = null,
} = _a

// Per-project config, mirroring the orchestrator's config block. Persisted into
// state.json → config so sub-skill {placeholder} references resolve for every
// subagent. On a mid-pipeline start, hydrated state.json config wins.
// componentsRoot accepts a string (backward-compatible) or array of strings.
const rawComponentsRoot = _a.componentsRoot || []
const config = {
  devServerUrl: _a.devServerUrl || 'http://localhost:5173',
  devServerStart: _a.devServerStart || 'npm run dev',
  sourceDir: _a.sourceDir || 'src',
  componentsRoot: Array.isArray(rawComponentsRoot) ? rawComponentsRoot : [rawComponentsRoot],
  pagesRoot: _a.pagesRoot || 'src/pages',
  cssPath: _a.cssPath || 'src/index.css',
  tailwindConfigPath: ('tailwindConfigPath' in _a) ? _a.tailwindConfigPath : 'tailwind.config.js',
  iconLibrary: ('iconLibrary' in _a) ? _a.iconLibrary : 'lucide-react',
  skillRoot: _a.skillRoot || 'plugins/figma-from-code/skills/figma-from-code',
}

if (!fileKey) {
  log('ERROR: fileKey is required. Pass it via args: { fileKey: "your-file-key" }')
  return { error: 'fileKey is required' }
}

// Validate phase args up front — a typo would otherwise make indexOf return -1,
// silently running the entire pipeline (startPhase) or nothing at all (endPhase).
if (startPhase && PHASE_ORDER.indexOf(startPhase) === -1) {
  log('ERROR: invalid startPhase "' + startPhase + '". Valid phases: ' + PHASE_ORDER.join(', '))
  return { error: 'invalid startPhase: ' + startPhase }
}
if (endPhase && PHASE_ORDER.indexOf(endPhase) === -1) {
  log('ERROR: invalid endPhase "' + endPhase + '". Valid phases: ' + PHASE_ORDER.join(', '))
  return { error: 'invalid endPhase: ' + endPhase }
}
if (startPhase && endPhase && PHASE_ORDER.indexOf(endPhase) < PHASE_ORDER.indexOf(startPhase)) {
  log('ERROR: endPhase "' + endPhase + '" precedes startPhase "' + startPhase + '"')
  return { error: 'endPhase precedes startPhase' }
}

const needsHydration = startPhase && startPhase !== 'phase0a'
const TEMP = '.temp/figma-from-code'

// --- Mutable orchestration state ---

let tiers = []
let tierProgress = {}
let builtComponents = {}
let preExistingComponents = {}
let preExistingScreens = {}
let existingCollections = []
let existingPages = []
let figmaNodes = {}
let screens = []

// --- Run-wide failure tracking (surfaced in the final summary) ---

let failedComponents = []
let skippedTiers = []
let failedScreens = []
let validationVerdict = null

// --- Helpers ---

// Retry an agent-producing thunk until isOk(result) is true or attempts run out.
// Used ONLY for idempotent infrastructure agents (registry writes, result
// collection) whose transient failure has outsized downstream blast radius.
async function withRetry(label, attempts, isOk, fn) {
  let result = null
  for (let i = 1; i <= attempts; i++) {
    result = await fn()
    if (isOk(result)) return result
    if (i < attempts) log('  retry ' + i + '/' + (attempts - 1) + ' — ' + label)
  }
  return result
}

function materializeRegistryPrompt(reason) {
  return [
    'Write the current builtComponents registry to disk so downstream agents read the correct registry. (' + reason + ')',
    '',
    'Write this JSON to ' + TEMP + '/builtComponents.json:',
    JSON.stringify(builtComponents),
  ].join('\n')
}

function mergeStatePrompt(fields) {
  return [
    'Update the figma-from-code state ledger.',
    '',
    'Read ' + TEMP + '/state.json, deep-merge the following fields into it, and write it back:',
    JSON.stringify(fields, null, 2),
  ].join('\n')
}

// === STATE HYDRATION (when starting mid-pipeline) ===

if (needsHydration) {
  phase('Hydrate')
  log('Starting mid-pipeline at ' + startPhase + ' — hydrating state from prior phases')

  const hydrated = await agent(
    [
      'Read the figma-from-code state files and return all orchestration data.',
      '',
      'Read these files from ' + TEMP + '/:',
      '  - state.json (main state ledger)',
      '  - precapture-screens.json (screen list, if it exists)',
      '',
      'From state.json, extract and return:',
      '  - fileKey',
      '  - config (the per-project config object)',
      '  - buildOrder.tiers as tiers',
      '  - tierProgress',
      '  - builtComponents',
      '  - preExistingComponents',
      '  - preExistingScreens',
      '  - existingCollections',
      '  - existingPages',
      '  - figmaNodes',
      '',
      'From precapture-screens.json (if it exists), extract the screens array.',
      'Each screen needs: screenName, route, pageSourceFile, keyComponents.',
      'If precapture-screens.json does not exist, return screens as an empty array.',
      '',
      'If state.json does not exist, return { fileKey: "", tiers: [], builtComponents: {}, figmaNodes: {} }',
      'to signal that prior phases have not been run.',
    ].join('\n'),
    { label: 'hydrate-state', phase: 'Hydrate', model: 'haiku', schema: HYDRATION_SCHEMA }
  )

  if (!hydrated || !hydrated.fileKey || !Array.isArray(hydrated.tiers) || hydrated.tiers.length === 0) {
    log('ERROR: No state found (or hydration was skipped). Run from phase0a first, or use the skill orchestrator.')
    return { error: 'No state.json found — cannot start from ' + startPhase }
  }

  Object.assign(config, hydrated.config || {})
  tiers = hydrated.tiers
  tierProgress = hydrated.tierProgress || {}
  builtComponents = hydrated.builtComponents || {}
  preExistingComponents = hydrated.preExistingComponents || {}
  preExistingScreens = hydrated.preExistingScreens || {}
  existingCollections = hydrated.existingCollections || []
  existingPages = hydrated.existingPages || []
  figmaNodes = hydrated.figmaNodes || {}
  screens = hydrated.screens || []

  log('Hydrated: ' + tiers.length + ' tiers, ' + Object.keys(builtComponents).length + ' built components, ' + Object.keys(figmaNodes).length + ' figma nodes, ' + screens.length + ' screens')

  // Phase 3/4 agents read builtComponents.json FROM DISK. Hydration loads the
  // registry into memory only, so a resume starting at/after Phase 3 would leave
  // a stale/missing on-disk registry and builds would run blind. Materialize now.
  await withRetry('materialize-built-hydrate', 2, r => r && r.success, () =>
    agent(materializeRegistryPrompt('mid-pipeline start'), {
      label: 'materialize-built-hydrate', phase: 'Hydrate', model: 'haiku', schema: STATE_UPDATE_SCHEMA
    })
  )
}

const SKILL = config.skillRoot

// === WAVE 1: Discovery (parallel) ===

if (shouldRunWave('wave1', startPhase, endPhase)) {
  phase('Discovery')

  // Sub-skill {placeholder} references resolve from state.json → config, so the
  // ledger must exist with config BEFORE any phase subagent is dispatched.
  log('Initializing state ledger with project config')
  const initResult = await withRetry('init-state', 2, r => r && r.success, () =>
    agent(
      [
        'Initialize the figma-from-code state ledger for a fresh run.',
        '',
        'Run: mkdir -p ' + TEMP + '/build-results',
        '',
        'Then write ' + TEMP + '/state.json with exactly this content, replacing',
        '<NOW> with the current ISO-8601 timestamp:',
        JSON.stringify({
          fileKey: fileKey,
          startedAt: '<NOW>',
          config: config,
          phases: {
            phase0a: 'pending', phase0b: 'pending', phase1: 'pending', phase2: 'pending',
            phase2_5: 'pending', phase3: 'pending', phase4: 'pending', phase5: 'pending'
          },
          tierProgress: {},
          buildOrder: { tierCount: 0, tiers: [] },
          figmaNodes: {},
          existingCollections: [],
          existingPages: [],
          variableMapPath: TEMP + '/variables.json',
          builtComponents: {},
          builtScreens: {},
          preExistingComponents: {},
          preExistingScreens: {},
          screenBodySize: { w: 1440, h: 900 },
          iconDiscovery: { iconCount: 0, icons: [], assetCount: 0, assets: [] }
        }, null, 2),
        '',
        'If ' + TEMP + '/state.json already exists, overwrite it (this is a fresh run).',
      ].join('\n'),
      { label: 'init-state', phase: 'Discovery', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
    )
  )
  if (!initResult || !initResult.success) {
    log('ERROR: Could not initialize state.json')
    return { error: 'state initialization failed' }
  }

  log('Wave 1: Discovering components and assets in parallel')

  const [discovery, assets] = await parallel([
    () => agent(
      [
        'Discover the complete component architecture by browser crawling the running dev server and static code scanning. Also inspect the Figma file for existing components, pages, and variable collections.',
        '',
        'Read and follow the skill instructions at: ' + SKILL + '/1-discovery-components/SKILL.md',
        '',
        'Inputs:',
        '  fileKey: ' + fileKey,
        '  devServerUrl: ' + config.devServerUrl,
        '  sourceDir: ' + config.sourceDir,
        '',
        'Write component-map.json and discovery-summary.json to ' + TEMP + '/',
        'Do NOT modify state.json — the workflow handles all state updates.',
        '',
        'Return: success, componentCount, tierCount, componentDirectories (the scanned component directories), existingCollections (from figma.variableCollections), existingPages (from figma.pages, name+id).',
      ].join('\n'),
      { label: 'discover-components', phase: 'Discovery', schema: DISCOVERY_SCHEMA }
    ),

    () => agent(
      [
        'Discover all icons and SVG assets imported across the codebase via static code analysis.',
        '',
        'Read and follow the skill instructions at: ' + SKILL + '/2-discovery-assets/SKILL.md',
        '',
        'Inputs:',
        '  sourceDir: ' + config.sourceDir,
        '  iconLibrary: ' + (config.iconLibrary || 'null (skip icon extraction, scan SVG assets only)'),
        '',
        'Write icons.json and icons-summary.json to ' + TEMP + '/',
        'Do NOT modify state.json.',
        '',
        'Return: success, iconCount, assetCount, icons (list of icon names), assets (list of asset names).',
      ].join('\n'),
      { label: 'discover-assets', phase: 'Discovery', model: 'sonnet', schema: ASSETS_SCHEMA }
    ),
  ])

  if (!discovery || !discovery.success) {
    log('ERROR: Component discovery failed')
    return { error: 'Phase 0a (component discovery) failed', details: discovery }
  }
  if (!assets || !assets.success) {
    log('ERROR: Asset discovery failed')
    return { error: 'Phase 0b (asset discovery) failed', details: assets }
  }

  existingCollections = discovery.existingCollections || []
  existingPages = discovery.existingPages || []

  log('Discovered ' + (discovery.componentCount || 0) + ' components across ' + discovery.tierCount + ' tiers')
  if (discovery.componentDirectories && discovery.componentDirectories.length) {
    // Batch mode has no Wave 1→2 pause: surface the scanned directories so the
    // user can re-run Phase 0a with exclusions if the scan picked up too much.
    log('Component directories scanned: ' + discovery.componentDirectories.join(', '))
  }
  log('Found ' + assets.iconCount + ' icons, ' + (assets.assetCount || 0) + ' assets')

  // --- Normalization (needs both 0a + 0b) ---
  phase('Normalize')
  log('Running component name normalization')

  const normResult = await agent(
    [
      'Run the component name normalization script, then persist the Phase 0a + 0b results to the state ledger and return the refreshed build order.',
      '',
      'Run this command:',
      '  node ' + SKILL + '/scripts/normalize-component-map.js ' + TEMP + '/component-map.json ' + TEMP + '/icons.json --write',
      '',
      'The script rewrites component-map.json in place with normalized names and regenerates ' + TEMP + '/discovery-summary.json from the normalized map.',
      'Read the regenerated discovery-summary.json and extract: buildOrder.tiers, builtComponents, preExistingComponents, preExistingScreens.',
      '',
      'Read ' + TEMP + '/icons-summary.json and extract: iconCount, icons, assetCount, assets.',
      '',
      'Then update ' + TEMP + '/state.json (read it, merge these fields, write it back):',
      '  phases.phase0a: "complete"',
      '  phases.phase0b: "complete"',
      '  buildOrder: { tierCount, tiers } (from the regenerated discovery-summary.json)',
      '  builtComponents, preExistingComponents, preExistingScreens (from the regenerated discovery-summary.json)',
      '  existingCollections: ' + JSON.stringify(existingCollections),
      '  existingPages: ' + JSON.stringify(existingPages),
      '  iconDiscovery: { iconCount, icons, assetCount, assets } (from icons-summary.json)',
      '',
      'Return: success, renameCount (from script stdout), tiers, builtComponents, preExistingComponents, preExistingScreens (all from the regenerated discovery-summary.json).',
    ].join('\n'),
    { label: 'normalize', phase: 'Normalize', model: 'haiku', schema: NORMALIZE_SCHEMA }
  )

  if (!normResult || !normResult.success || !normResult.tiers.length) {
    log('ERROR: Normalization failed — build order would be stale')
    return { error: 'normalization failed', details: normResult }
  }

  // The regenerated summary is keyed by normalized Figma names (Icon/X, Asset/Y) —
  // adopt it wholesale so Phase 3 skip-matching works against the right names.
  tiers = normResult.tiers
  builtComponents = normResult.builtComponents || {}
  preExistingComponents = normResult.preExistingComponents || {}
  preExistingScreens = normResult.preExistingScreens || {}
  log('Normalization: ' + (normResult.renameCount || 0) + ' components renamed')
}

// === WAVE 2: Tokens, then Structure ===
// Sequential, not parallel: 4-setup-structure builds the Foundations docs
// (color/spacing swatches) by binding the Palette/Semantic/Spacing variables
// that Phase 1 creates — its Prerequisites require Phase 1 complete.

if (shouldRunWave('wave2', startPhase, endPhase)) {
  phase('Setup')
  log('Wave 2: Setting up tokens, then file structure')

  const tokens = await agent(
    [
      'Create Figma variable collections (Palette, Semantic, Spacing) and extract the CSS-to-Figma variable map.',
      '',
      'Read and follow the skill instructions at: ' + SKILL + '/3-setup-tokens/SKILL.md',
      '',
      'Inputs:',
      '  fileKey: ' + fileKey,
      '  existingCollections (skip creation if already present): ' + JSON.stringify(existingCollections),
      '  cssPath: ' + config.cssPath,
      '  tailwindConfigPath: ' + (config.tailwindConfigPath || 'null (Tailwind v4 / vanilla CSS project)'),
      '',
      'Write tokens-summary.json, variables.json, resolved-colors.json, and color-index.json to ' + TEMP + '/',
      'Do NOT modify state.json.',
      '',
      'Return: success, variableCount, collections (list of collection names), variableMapPath.',
    ].join('\n'),
    { label: 'setup-tokens', phase: 'Setup', model: 'sonnet', schema: TOKENS_SCHEMA }
  )

  if (!tokens || !tokens.success) {
    log('ERROR: Token setup failed')
    return { error: 'Phase 1 (tokens) failed', details: tokens }
  }
  log('Tokens: ' + (tokens.variableCount || 0) + ' variables in ' + (tokens.collections || []).join(', '))

  const structure = await agent(
    [
      'Create the Figma file page skeleton (Foundations, Components, Screens pages), the Foundations documentation frames, and the Icons/Screens container frames.',
      '',
      'Read and follow the skill instructions at: ' + SKILL + '/4-setup-structure/SKILL.md',
      '',
      'Inputs:',
      '  fileKey: ' + fileKey,
      '  existingPages (skip creation if already present): ' + JSON.stringify(existingPages),
      '',
      'The Phase 1 variable collections (' + (tokens.collections || []).join(', ') + ') already exist — bind Foundations swatches to them as the skill specifies.',
      '',
      'Write structure-summary.json to ' + TEMP + '/',
      'Do NOT modify state.json.',
      '',
      'Return: success, foundationsPageId, componentsPageId, screensPageId, foundationsFrameId, iconsFrameId, screensFrameId.',
    ].join('\n'),
    { label: 'setup-structure', phase: 'Setup', model: 'sonnet', schema: STRUCTURE_SCHEMA }
  )

  if (!structure || !structure.success) {
    log('ERROR: File structure setup failed')
    return { error: 'Phase 2 (file structure) failed', details: structure }
  }

  figmaNodes = {
    ...figmaNodes,
    foundationsPageId: structure.foundationsPageId,
    componentsPageId: structure.componentsPageId,
    screensPageId: structure.screensPageId,
    foundationsFrameId: structure.foundationsFrameId,
    iconsFrameId: structure.iconsFrameId,
    screensFrameId: structure.screensFrameId,
  }
  log('Structure: pages, foundations docs, and container frames created')

  await withRetry('update-state-setup', 2, r => r && r.success, () =>
    agent(mergeStatePrompt({
      phases: { phase1: 'complete', phase2: 'complete' },
      variableMapPath: tokens.variableMapPath || (TEMP + '/variables.json'),
      figmaNodes: figmaNodes,
    }), { label: 'update-state-setup', phase: 'Setup', model: 'haiku', schema: STATE_UPDATE_SCHEMA })
  )
}

// === WAVE 3: Pre-capture ===

if (shouldRunWave('wave3', startPhase, endPhase)) {
  phase('Pre-capture')
  log('Wave 3: Capturing app screenshots for all components and screens')

  const precapture = await agent(
    [
      'Capture app screenshots and structured text content for all components and screens from the running dev server.',
      '',
      'Read and follow the skill instructions at: ' + SKILL + '/5-precapture/SKILL.md',
      '',
      'Inputs:',
      '  fileKey: ' + fileKey,
      '  devServerUrl: ' + config.devServerUrl,
      '',
      'First verify the dev server responds at ' + config.devServerUrl + ' — if it does not, report success: false (do not start it yourself; the user runs `' + config.devServerStart + '`).',
      'Then start the shared Playwright server in the background before capturing:',
      '  node ' + SKILL + '/scripts/browser-server.js',
      '(Scripts fall back to per-script browsers if it fails to start — non-fatal.)',
      '',
      'Build all manifests yourself from ' + TEMP + '/component-map.json (Step 0 of the skill).',
      'Capture all screenshottable components and all discovered routes.',
      '',
      'Write precapture-all.json and precapture-screens.json to ' + TEMP + '/',
      'Do NOT modify state.json.',
      '',
      'Return: success, componentsCaptured, screensCaptured, skipped, failed, screens (array of { screenName, route, pageSourceFile, keyComponents }).',
    ].join('\n'),
    { label: 'precapture', phase: 'Pre-capture', model: 'sonnet', schema: PRECAPTURE_SCHEMA }
  )

  if (!precapture || !precapture.success) {
    log('ERROR: Pre-capture failed')
    return { error: 'Phase 2.5 (pre-capture) failed', details: precapture }
  }

  screens = precapture.screens || []
  log('Pre-captured ' + (precapture.componentsCaptured || 0) + ' components, ' + (precapture.screensCaptured || 0) + ' screens')

  await withRetry('update-state-precapture', 2, r => r && r.success, () =>
    agent(mergeStatePrompt({ phases: { phase2_5: 'complete' } }), {
      label: 'update-state-precapture', phase: 'Pre-capture', model: 'haiku', schema: STATE_UPDATE_SCHEMA
    })
  )
}

// === WAVE 4: Icon Preamble + Tier Builds (tiers sequential, one subagent per tier) ===

if (shouldRunWave('wave4', startPhase, endPhase)) {

  // --- Icon Preamble ---
  phase('Build Icons')
  log('Wave 4: Building icon and asset components')

  // builtComponents.json is the on-disk pass mechanism for all Phase 3/4 agents.
  await withRetry('materialize-built', 2, r => r && r.success, () =>
    agent(materializeRegistryPrompt('before icon preamble'), {
      label: 'materialize-built', phase: 'Build Icons', model: 'haiku', schema: STATE_UPDATE_SCHEMA
    })
  )

  const preamble = await agent(
    [
      'Build all Figma icon and asset components from SVG data before tier processing.',
      '',
      'Read and follow the skill instructions at: ' + SKILL + '/6-build-tier/icon-preamble/SKILL.md',
      '',
      'Inputs:',
      '  fileKey: ' + fileKey,
      '  iconsFrameId: ' + (figmaNodes.iconsFrameId || ''),
      '',
      'Read icons.json and builtComponents.json from ' + TEMP + '/',
      'Skip icons/assets already in builtComponents.json.',
      'Write icon-preamble-results.json to ' + TEMP + '/',
      'Do NOT modify state.json.',
      '',
      'Return: success, created (map of name to nodeId), totalCreated, totalSkipped, totalFailed.',
    ].join('\n'),
    { label: 'icon-preamble', phase: 'Build Icons', model: 'sonnet', schema: PREAMBLE_SCHEMA }
  )

  if (!preamble || !preamble.success) {
    log('ERROR: Icon preamble failed — tier agents refuse to run without it')
    return { error: 'Phase 3 icon preamble failed', details: preamble }
  }

  builtComponents = { ...builtComponents, ...preamble.created }
  log('Icons: ' + (preamble.totalCreated || 0) + ' created, ' + (preamble.totalSkipped || 0) + ' skipped, ' + (preamble.totalFailed || 0) + ' failed')

  // Persist the merged registry so Tier 1 sees the icons even if the preamble
  // agent did not update builtComponents.json itself.
  await withRetry('materialize-built-post-icons', 2, r => r && r.success, () =>
    agent(materializeRegistryPrompt('after icon preamble'), {
      label: 'materialize-built-post-icons', phase: 'Build Icons', model: 'haiku', schema: STATE_UPDATE_SCHEMA
    })
  )
  await withRetry('update-state-icons', 2, r => r && r.success, () =>
    agent(mergeStatePrompt({ builtComponents: builtComponents }), {
      label: 'update-state-icons', phase: 'Build Icons', model: 'haiku', schema: STATE_UPDATE_SCHEMA
    })
  )

  // --- Tier builds: one subagent per COMPONENT for fresh context each time.
  //     Tiers run sequentially because tier N+1 instances tier N components.
  //     Within a tier, components build sequentially (Figma API rate limits). ---
  for (let i = 0; i < tiers.length; i++) {
    const tierDef = tiers[i]
    phase('Build Tiers')

    if (tierProgress['tier' + tierDef.tier] === 'complete') {
      log('Tier ' + tierDef.tier + ' (' + tierDef.label + '): already complete — skipping')
      continue
    }

    const toBuild = tierDef.components.filter(name => !builtComponents[name])
    log('Tier ' + tierDef.tier + ' (' + tierDef.label + '): ' + toBuild.length + ' to build, ' + (tierDef.components.length - toBuild.length) + ' already built')

    if (toBuild.length === 0) {
      log('Tier ' + tierDef.tier + ': nothing to build — skipping')
      continue
    }

    // --- Create tier frame (lightweight setup agent) ---
    const tierSetup = await agent(
      [
        'Create the tier container frame on the Components page for Tier ' + tierDef.tier + ' ("' + tierDef.label + '").',
        '',
        'Use the Figma MCP to create a frame named "Tier ' + tierDef.tier + ' — ' + tierDef.label + '" on the Components page.',
        '  parentId: ' + (figmaNodes.componentsPageId || ''),
        '  layoutMode: VERTICAL, itemSpacing: 80, padding: 40',
        '  primaryAxisSizingMode: AUTO, counterAxisSizingMode: AUTO',
        '',
        'Return: success, tierFrameId (the created frame node ID).',
      ].join('\n'),
      { label: 'tier-setup-' + tierDef.tier, phase: 'Build Tiers', model: 'sonnet', schema: TIER_SETUP_SCHEMA }
    )

    if (!tierSetup || !tierSetup.success || !tierSetup.tierFrameId) {
      skippedTiers.push(tierDef.tier)
      log('ERROR: Tier ' + tierDef.tier + ' frame creation failed — stopping')
      return {
        error: 'Tier ' + tierDef.tier + ' frame setup failed',
        details: tierSetup,
        fileKey: fileKey,
        builtComponents: Object.keys(builtComponents).length,
        skippedTiers: skippedTiers,
        resumeHint: 'Re-run with startPhase: "phase3" to resume.',
      }
    }

    const tierFrameId = tierSetup.tierFrameId
    figmaNodes['tier' + tierDef.tier + 'FrameId'] = tierFrameId

    // --- Build each component with its own fresh-context subagent ---
    const tierCompleted = {}
    const tierFailed = []

    for (let j = 0; j < toBuild.length; j++) {
      const componentName = toBuild[j]
      log('  [' + (j + 1) + '/' + toBuild.length + '] Building: ' + componentName)

      const compResult = await agent(
        [
          'Build and validate one Figma component: ' + componentName,
          '',
          'Read the build skill at: ' + SKILL + '/7-build-component/7a/SKILL.md',
          'Then read the review/fix skill at: ' + SKILL + '/7-build-component/7b-review-fix-component/SKILL.md',
          'Execute both phases for this single component (analyze → build → screenshot → compare → fix loop → rebind → track → return).',
          '',
          'Inputs:',
          '  fileKey: ' + fileKey,
          '  componentName: ' + componentName,
          '  tier: ' + tierDef.tier,
          '  tierFrameId: ' + tierFrameId,
          '  componentsPageId: ' + (figmaNodes.componentsPageId || ''),
          '  devServerUrl: ' + config.devServerUrl,
          '  componentsRoot: ' + JSON.stringify(config.componentsRoot),
          '',
          'Read builtComponents.json from ' + TEMP + '/ for instance lookup.',
          'Read component-map.json from ' + TEMP + '/ for this component\'s metadata (sourcePath, tier, children, screenshotUrl, selector).',
          '',
          'Write the result to ' + TEMP + '/build-results/' + componentName + '.json',
          'Do NOT modify state.json or builtComponents.json.',
          '',
          'Return: name, success, status (success/partial_match/failed/rejected/needs_authorization), nodeId (component or component-set node ID if built), matchPct, reason (if failed/rejected).',
        ].join('\n'),
        { label: 'build-' + componentName, phase: 'Build Tiers', schema: COMPONENT_BUILD_SCHEMA }
      )

      if (compResult && compResult.success && compResult.nodeId) {
        tierCompleted[componentName] = compResult.nodeId
        builtComponents[componentName] = compResult.nodeId
      } else {
        const failure = {
          name: componentName,
          status: (compResult && compResult.status) || 'failed',
          reason: (compResult && compResult.reason) || 'agent returned no result',
          tier: tierDef.tier
        }
        tierFailed.push(failure)
        failedComponents.push(failure)
      }

      // Update on-disk registry after each component so the next component
      // in this tier can resolve it as an instance if needed.
      await withRetry('registry-update-' + componentName, 2, r => r && r.success, () =>
        agent(materializeRegistryPrompt('after building ' + componentName), {
          label: 'registry-' + componentName, phase: 'Build Tiers', model: 'haiku', schema: STATE_UPDATE_SCHEMA
        })
      )
    }

    log('Tier ' + tierDef.tier + ' complete: ' + Object.keys(tierCompleted).length + ' built, ' + tierFailed.length + ' failed')

    // If nothing was built at all AND there were failures, stop — the tier
    // is broken and later tiers will orphan.
    if (Object.keys(tierCompleted).length === 0 && tierFailed.length > 0) {
      skippedTiers.push(tierDef.tier)
      log('ERROR: Tier ' + tierDef.tier + ' — all components failed, stopping')
      return {
        error: 'Tier ' + tierDef.tier + ' build failed (all components failed)',
        fileKey: fileKey,
        builtComponents: Object.keys(builtComponents).length,
        skippedTiers: skippedTiers,
        failedComponents: tierFailed,
        resumeHint: 'Re-run with startPhase: "phase3" to resume (built components are skipped).',
      }
    }

    // collect-tier-results.js writes build-tier{N}.json, merges completed node IDs
    // into state.builtComponents + builtComponents.json, and sets tierProgress —
    // from the per-component result files (ground truth), not the agent's return.
    await withRetry('collect-tier-' + tierDef.tier, 2, r => r && r.success, () =>
      agent(
        [
          'Finalize Tier ' + tierDef.tier + ' results.',
          '',
          'Run: node ' + SKILL + '/scripts/collect-tier-results.js --tier ' + tierDef.tier + ' --components "' + tierDef.components.join(',') + '" --tier-frame-id "' + tierFrameId + '"',
          'Read its one-line JSON stdout for the counts.',
          '',
          'Then read ' + TEMP + '/state.json, merge this into it, and write it back:',
          JSON.stringify({ figmaNodes: { ['tier' + tierDef.tier + 'FrameId']: tierFrameId } }),
          '',
          'Return: success, completed (count), failed (count).',
        ].join('\n'),
        { label: 'collect-tier-' + tierDef.tier, phase: 'Build Tiers', model: 'haiku', schema: COLLECT_SCHEMA }
      )
    )
  }

  await withRetry('update-state-phase3', 2, r => r && r.success, () =>
    agent(mergeStatePrompt({
      phases: { phase3: failedComponents.length === 0 ? 'complete' : 'complete_with_failures' },
      phase3Failures: failedComponents.map(f => f.name),
    }), { label: 'update-state-phase3', phase: 'Build Tiers', model: 'haiku', schema: STATE_UPDATE_SCHEMA })
  )

  log('Phase 3 complete: ' + Object.keys(builtComponents).length + ' total built components, ' + failedComponents.length + ' failed')
}

// === WAVE 5: Screen Builds (parallel) ===

if (shouldRunWave('wave5', startPhase, endPhase)) {
  phase('Build Screens')

  if (screens.length === 0) {
    log('No screens to build — skipping Wave 5 (no precapture-screens.json screen list)')
  } else {
    log('Wave 5: Building ' + screens.length + ' screens in parallel')

    const rawScreenResults = await parallel(
      screens.map(screen => () =>
        agent(
          [
            'Build a Figma screen frame by composing built component instances, then validate visually.',
            '',
            'Read and follow the skill instructions at: ' + SKILL + '/8-build-screens/SKILL.md',
            '',
            'Inputs:',
            '  fileKey: ' + fileKey,
            '  screenName: ' + screen.screenName,
            '  route: ' + screen.route,
            '  pageSourceFile: ' + (screen.pageSourceFile || ''),
            '  screensFrameId: ' + (figmaNodes.screensFrameId || ''),
            '  appScreenshot: ' + TEMP + '/screenshots/screens/' + screen.screenName + '/app.png',
            '  textContent: ' + TEMP + '/screenshots/screens/' + screen.screenName + '/text.json',
            '  screenshotDir: ' + TEMP + '/screenshots/screens/' + screen.screenName + '/',
            '  keyComponents: ' + (screen.keyComponents || []).join(', '),
            '  devServerUrl: ' + config.devServerUrl,
            '  pagesRoot: ' + config.pagesRoot,
            '',
            'Read builtComponents.json from ' + TEMP + '/ for component instance lookup.',
            'preExistingScreens (DO NOT MODIFY without authorization): ' + JSON.stringify(preExistingScreens),
            '',
            'Write your result to ' + TEMP + '/build-results/screens/' + screen.screenName + '.json',
            'Do NOT modify state.json.',
            '',
            'Return: screenName, status (success/rejected/needs_authorization/failed), nodeId, verdict, matchPct, missingComponents.',
          ].join('\n'),
          { label: 'screen-' + screen.screenName, phase: 'Build Screens', schema: SCREEN_SCHEMA }
        )
      )
    )

    // A null result means the screen's thunk threw or was skipped — record it as
    // a failure rather than dropping it silently via .filter(Boolean).
    const builtScreens = {}
    rawScreenResults.forEach((r, idx) => {
      if (!r) {
        failedScreens.push({ screenName: screens[idx].screenName, status: 'no_result' })
      } else if (r.status === 'success' && r.nodeId) {
        builtScreens[r.screenName] = r.nodeId
      } else {
        failedScreens.push({ screenName: r.screenName, status: r.status, verdict: r.verdict })
      }
    })

    log('Screens: ' + Object.keys(builtScreens).length + ' built, ' + failedScreens.length + ' failed/rejected')
    if (failedScreens.length > 0) {
      log('Failed screens: ' + failedScreens.map(s => s.screenName + ' (' + s.status + ')').join(', '))
    }

    await withRetry('collect-screens', 2, r => r && r.success, () =>
      agent(
        [
          'Finalize Phase 4 screen results.',
          '',
          'Run: mkdir -p ' + TEMP + '/build-results/screens',
          'Run: node ' + SKILL + '/scripts/collect-screen-results.js --screens "' + screens.map(s => s.screenName).join(',') + '"',
          'This writes ' + TEMP + '/build-screens.json. Read its one-line JSON stdout for the counts.',
          '',
          'Then read ' + TEMP + '/state.json, merge this into it, and write it back:',
          JSON.stringify({
            phases: { phase4: failedScreens.length === 0 ? 'complete' : 'complete_with_failures' },
            phase4Failures: failedScreens.map(s => s.screenName),
            builtScreens: builtScreens,
          }),
          '',
          'Return: success, completed (count), failed (count).',
        ].join('\n'),
        { label: 'collect-screens', phase: 'Build Screens', model: 'haiku', schema: COLLECT_SCHEMA }
      )
    )
  }
}

// === WAVE 6: Validation ===

if (shouldRunWave('wave6', startPhase, endPhase)) {
  phase('Validate')
  log('Wave 6: Validating screen frames against app screenshots')

  const validation = await agent(
    [
      'Validate assembled screen frames against full-page app screenshots. Fix mismatched screens (up to 2 iterations). Clean up the Components page layout.',
      '',
      'Read and follow the skill instructions at: ' + SKILL + '/9-validate/SKILL.md',
      '',
      'Inputs:',
      '  fileKey: ' + fileKey,
      '  devServerUrl: ' + config.devServerUrl,
      '  figmaNodes: ' + JSON.stringify(figmaNodes),
      '  preExistingScreens (compare read-only, no fix loop): ' + JSON.stringify(preExistingScreens),
      '  buildOrder tierCount: ' + tiers.length,
      '',
      'Write validation-summary.json to ' + TEMP + '/ and the full report to .temp/figma-validation/report.md.',
      'Stop the Playwright server if running (per the skill).',
      'Do NOT modify state.json.',
      '',
      'Return: success, componentsCompared, match, minorDiff, mismatch, noAppReference, fixedDuringValidation, averageMatchPct, overallVerdict, preExistingFlaggedCount, reportPath.',
    ].join('\n'),
    { label: 'validate', phase: 'Validate', schema: VALIDATION_SCHEMA }
  )

  if (validation) {
    validationVerdict = validation.overallVerdict || null
    log('Validation: ' + validation.overallVerdict)
    log('  Compared: ' + (validation.componentsCompared || 0) + ', Match: ' + (validation.match || 0) + ', Minor: ' + (validation.minorDiff || 0) + ', Mismatch: ' + (validation.mismatch || 0))
    if (validation.fixedDuringValidation > 0) {
      log('  Fixed during validation: ' + validation.fixedDuringValidation)
    }
    if (validation.preExistingFlaggedCount > 0) {
      log('  Pre-existing components flagged for review: ' + validation.preExistingFlaggedCount)
    }
  }

  await withRetry('update-state-phase5', 2, r => r && r.success, () =>
    agent(mergeStatePrompt({ phases: { phase5: 'complete' } }), {
      label: 'update-state-phase5', phase: 'Validate', model: 'haiku', schema: STATE_UPDATE_SCHEMA
    })
  )
}

// === CLEANUP: stop the browser/Playwright server regardless of which phases ran ===
// The validate wave stops it on success, but a run ended early via endPhase (or
// one where validation didn't reach the teardown step) would otherwise orphan the
// server and hold its port. Idempotent — a no-op if nothing is running.

await agent(
  [
    'Stop the figma-from-code Playwright server if it is still running so its port is freed. This is a best-effort, idempotent cleanup — if nothing is running, do nothing and still return success.',
    '',
    'Run: kill $(cat ' + TEMP + '/pw-server.pid 2>/dev/null) 2>/dev/null; rm -f ' + TEMP + '/pw-server.pid ' + TEMP + '/pw-endpoint.txt',
    'Ignore any "no such process" / kill failure (the server was already stopped).',
    '',
    'Return: success.',
  ].join('\n'),
  { label: 'cleanup-browser-server', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
)

// === FINAL SUMMARY ===

const validationOk = validationVerdict === null || !/mismatch|fail/i.test(String(validationVerdict))
const overallSuccess =
  failedComponents.length === 0 &&
  skippedTiers.length === 0 &&
  failedScreens.length === 0 &&
  validationOk

const summary = {
  fileKey: fileKey,
  overallSuccess: overallSuccess,
  totalComponents: Object.keys(builtComponents).length,
  totalTiers: tiers.length,
  totalScreens: screens.length,
  failedComponentCount: failedComponents.length,
  failedComponents: failedComponents,
  skippedTiers: skippedTiers,
  failedScreens: failedScreens,
  validationVerdict: validationVerdict,
  figmaNodes: figmaNodes,
  phasesRun: {
    startPhase: startPhase || 'phase0a',
    endPhase: endPhase || 'phase5',
  },
}

log(
  'Workflow complete: ' + summary.totalComponents + ' components, ' + summary.totalScreens + ' screens, ' +
  failedComponents.length + ' failed components' +
  (skippedTiers.length ? ', ' + skippedTiers.length + ' skipped tier(s)' : '') +
  (failedScreens.length ? ', ' + failedScreens.length + ' failed screen(s)' : '')
)
if (!overallSuccess) {
  log('⚠ Completed with issues — see failedComponents / skippedTiers / failedScreens / validationVerdict in the result.')
}

return summary
