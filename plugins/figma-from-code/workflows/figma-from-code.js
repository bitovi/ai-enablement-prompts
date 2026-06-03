export const meta = {
  name: 'figma-from-code',
  description: 'Rebuild Figma file from codebase — discover, tokenize, build components, assemble screens, validate',
  whenToUse: 'When the user wants to run the figma-from-code pipeline as a workflow with parallel execution and progress tracking',
  phases: [
    { title: 'Hydrate', detail: 'Load state from prior phases (when starting mid-pipeline)' },
    { title: 'Discovery', detail: 'Browser crawl + icon scan (parallel)' },
    { title: 'Normalize', detail: 'Align component names with Figma conventions' },
    { title: 'Setup', detail: 'Tokens + file structure (parallel)' },
    { title: 'Pre-capture', detail: 'Screenshot all components and screens' },
    { title: 'Build Icons', detail: 'Create icon/asset components from SVG' },
    { title: 'Build Components', detail: 'Per-component builds, tiers sequential, all components within a tier in parallel' },
    { title: 'Build Screens', detail: 'Compose screens from built components (parallel)' },
    { title: 'Validate', detail: 'Compare Figma vs app, fix mismatches' },
  ],
}

// Where the figma-from-code skill tree is installed in the consuming project.
// Override via args.skillDir if you place it elsewhere. The orchestrator points
// subagents at `${SKILL}/<stage>/SKILL.md` and runs `node ${SKILL}/<stage>/<script>.js`,
// so this must resolve (relative to the project root) to the copied skill tree.
const SKILL = (typeof args !== 'undefined' && args && args.skillDir) || '.claude/skills/figma-from-code'
const TEMP = '.temp/figma-from-code'

// Model policy (per-agent `model:` opt; omitting it inherits the session model = opus):
//   opus   — build, fix, screen, validate, discover-components. Vision/codegen/tier-graph
//            reasoning where a weaker model measurably hurts quality.
//   sonnet — analyze, compare, and the mechanical-but-non-trivial setup/discovery agents
//            (setup-*, precapture, discover-assets, icon-preamble, tier-frame).
//   haiku  — pure file I/O / shell wrappers with no judgment (hydrate-state, materialize-*,
//            normalize, collect-tier, update-state-*, cleanup).
// Keep this in sync when adding agents; don't silently leave bookkeeping agents on opus.

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

const HYDRATION_SCHEMA = {
  type: 'object',
  properties: {
    fileKey: { type: 'string' },
    tiers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tier: { type: 'number' },
          label: { type: 'string' },
          components: { type: 'array', items: { type: 'string' } }
        },
        required: ['tier', 'label', 'components']
      }
    },
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
    screens: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          screenName: { type: 'string' },
          route: { type: 'string' },
          pageSourceFile: { type: 'string' },
          keyComponents: { type: 'array', items: { type: 'string' } }
        },
        required: ['screenName', 'route']
      }
    }
  },
  required: ['fileKey', 'tiers', 'builtComponents', 'figmaNodes']
}

const DISCOVERY_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    componentCount: { type: 'number' },
    tierCount: { type: 'number' },
    tiers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tier: { type: 'number' },
          label: { type: 'string' },
          components: { type: 'array', items: { type: 'string' } }
        },
        required: ['tier', 'label', 'components']
      }
    },
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
    }
  },
  required: ['success', 'tierCount', 'tiers']
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
    updatedTiers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tier: { type: 'number' },
          label: { type: 'string' },
          components: { type: 'array', items: { type: 'string' } }
        },
        required: ['tier', 'label', 'components']
      }
    }
  },
  required: ['success']
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
    screens: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          screenName: { type: 'string' },
          route: { type: 'string' },
          pageSourceFile: { type: 'string' },
          keyComponents: { type: 'array', items: { type: 'string' } }
        },
        required: ['screenName', 'route']
      }
    }
  },
  required: ['success']
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

const COMPONENT_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    componentName: { type: 'string' },
    status: { type: 'string', enum: ['built', 'partial_match', 'needs_authorization', 'rejected', 'failed'] },
    nodeId: { type: 'string' },
    verdict: { type: 'string' },
    matchPct: { type: 'number' },
    iterations: { type: 'number' }
  },
  required: ['componentName', 'status']
}

const ANALYZE_SCHEMA = {
  type: 'object',
  properties: {
    componentName: { type: 'string' },
    status: { type: 'string', enum: ['proceed', 'needs_authorization', 'rejected', 'failed'] },
    sourceFile: { type: 'string' },
    sourceDir: { type: 'string' },
    route: { type: 'string' },
    selector: { type: 'string' },
    hasVariants: { type: 'boolean' },
    liveInspection: { type: 'string' },
    missingChildren: { type: 'array', items: { type: 'string' } }
  },
  required: ['componentName', 'status']
}

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    componentName: { type: 'string' },
    status: { type: 'string', enum: ['built', 'failed'] },
    reason: { type: 'string' },
    nodeId: { type: 'string' },
    screenshotNodeId: { type: 'string' },
    type: { type: 'string' },
    variants: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, nodeId: { type: 'string' } },
        required: ['name']
      }
    }
  },
  required: ['componentName', 'status']
}

const COMPARE_SCHEMA = {
  type: 'object',
  properties: {
    componentName: { type: 'string' },
    nodeId: { type: 'string' },
    verdict: { type: 'string' },
    matchPct: { type: 'number' },
    borderMatchPct: { type: 'number' },
    needsFix: { type: 'boolean' },
    missingInstances: { type: 'array', items: { type: 'string' } }
  },
  required: ['componentName', 'verdict', 'needsFix']
}

const TIER_FRAME_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    tier: { type: 'number' },
    tierFrameId: { type: 'string' }
  },
  required: ['success', 'tierFrameId']
}

const SCREEN_SCHEMA = {
  type: 'object',
  properties: {
    screenName: { type: 'string' },
    status: { type: 'string', enum: ['built', 'rejected', 'needs_authorization', 'failed'] },
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
    fileKey: { type: 'string' },
    componentsCompared: { type: 'number' },
    comparable: { type: 'number' },
    match: { type: 'number' },
    minorDiff: { type: 'number' },
    mismatch: { type: 'number' },
    noAppReference: { type: 'number' },
    matchRate: { type: 'number' },
    fixedDuringValidation: { type: 'number' },
    averageMatchPct: { type: 'number' },
    overallVerdict: { type: 'string' },
    reportPath: { type: 'string' }
  },
  required: ['success', 'overallVerdict']
}

const STATE_UPDATE_SCHEMA = {
  type: 'object',
  properties: { success: { type: 'boolean' } },
  required: ['success']
}

// --- Args ---

const {
  fileKey,                                   // REQUIRED — the target Figma file key (no default)
  sourceDir = 'src/',                        // component/source root, relative to project root
  devServerUrl = 'http://localhost:5173',    // running dev server (Vite default; override per project)
  startPhase = 'phase3',
  endPhase = null
} = args || {}

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

// --- Mutable orchestration state ---

let tiers = []
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
// Used ONLY for idempotent infrastructure agents (frame creation, registry writes,
// result collection) whose transient failure has outsized downstream blast radius.
async function withRetry(label, attempts, isOk, fn) {
  let result = null
  for (let i = 1; i <= attempts; i++) {
    result = await fn()
    if (isOk(result)) return result
    if (i < attempts) log('  retry ' + i + '/' + (attempts - 1) + ' — ' + label)
  }
  return result
}

const STAGE_DIR = SKILL + '/7-build-component/prompts/stages'

function analyzePrompt(componentName) {
  return [
    'Stage 1 (analyze) for the Figma component "' + componentName + '".',
    '',
    'Read and follow ONLY: ' + STAGE_DIR + '/analyze.md',
    '',
    'Inputs:',
    '  {componentName} = ' + componentName,
    '  {fileKey}       = ' + fileKey,
    '  {devServerUrl}  = ' + devServerUrl,
    '',
    'Resolve {sourceFile}/{sourceDir} from ' + TEMP + '/component-map.json. Read ' + TEMP + '/builtComponents.json and state.json -> preExistingComponents for the gates.',
    'Write code.json to {sourceDir}/.figma/code.json. Do NOT call use_figma.',
    'Return: componentName, status, sourceFile, sourceDir, route, selector, hasVariants, liveInspection, missingChildren.',
  ].join('\n')
}

function buildStagePrompt(componentName, tierDef, parentFrameId, sourceDir) {
  return [
    'Stage 2 (build) for the Figma component "' + componentName + '".',
    '',
    'Read and follow ONLY: ' + STAGE_DIR + '/build.md',
    '',
    'Inputs:',
    '  {componentName} = ' + componentName,
    '  {fileKey}       = ' + fileKey,
    '  {parentFrameId} = ' + parentFrameId + '   (the Tier ' + tierDef.tier + ' frame — build INTO this node)',
    '  {sourceDir}     = ' + sourceDir + '   (holds .figma/code.json from stage 1)',
    '  {screenshotDir} = ' + TEMP + '/screenshots/' + componentName + '/',
    '',
    'Build fresh into {parentFrameId}; never reuse an off-page master. Write .figma/figma.json and capture figma.png.',
    'Return: componentName, status, reason, nodeId, screenshotNodeId, type, variants.',
  ].join('\n')
}

function comparePrompt(componentName, sourceDir, nodeId, screenshotNodeId) {
  return [
    'Stage 3 (compare) for the Figma component "' + componentName + '".',
    '',
    'Read and follow ONLY: ' + STAGE_DIR + '/compare.md',
    '',
    'Inputs:',
    '  {componentName}     = ' + componentName,
    '  {fileKey}           = ' + fileKey,
    '  {sourceDir}         = ' + sourceDir,
    '  {nodeId}            = ' + nodeId,
    '  {screenshotNodeId}  = ' + screenshotNodeId,
    '  {screenshotDir}     = ' + TEMP + '/screenshots/' + componentName + '/',
    '',
    'Run 4a/4b/4c, finalize tracking, and write ' + TEMP + '/build-results/' + componentName + '.json. Do NOT fix.',
    'Return: componentName, nodeId, verdict, matchPct, borderMatchPct, needsFix, missingInstances.',
  ].join('\n')
}

function fixPrompt(componentName, sourceFile, sourceDir, nodeId, screenshotNodeId, verdict, missingInstances) {
  return [
    'Stage 4 (fix) for the Figma component "' + componentName + '". The compare stage flagged a non-passing verdict.',
    '',
    'Read and follow ONLY: ' + STAGE_DIR + '/fix.md',
    '',
    'Inputs:',
    '  {componentName}     = ' + componentName,
    '  {fileKey}           = ' + fileKey,
    '  {sourceFile}        = ' + sourceFile,
    '  {sourceDir}         = ' + sourceDir,
    '  {nodeId}            = ' + nodeId,
    '  {screenshotNodeId}  = ' + screenshotNodeId,
    '  {verdict}           = ' + verdict,
    '  {missingInstances}  = ' + JSON.stringify(missingInstances || []),
    '  {screenshotDir}     = ' + TEMP + '/screenshots/' + componentName + '/',
    '',
    'Run the fix loop (<=3 iterations), re-finalize tracking, and OVERWRITE ' + TEMP + '/build-results/' + componentName + '.json.',
    'Return: componentName, status, nodeId, verdict, matchPct, iterations.',
  ].join('\n')
}

// Runs the 4-stage chain (analyze → build → compare → fix) for one component
// sequentially. Returns a COMPONENT_RESULT_SCHEMA-shaped object. The caller runs
// these chains concurrently across a tier; the runtime's global concurrency cap
// (min(16, cores-2)) bounds how many use_figma build stages run at once.
async function buildOneComponent(componentName, tierDef, parentFrameId) {
  const analysis = await agent(
    analyzePrompt(componentName),
    { label: 'analyze-' + componentName, phase: 'Build Components', model: 'sonnet', schema: ANALYZE_SCHEMA }
  )
  if (!analysis || analysis.status !== 'proceed') {
    return {
      componentName: componentName,
      status: (analysis && analysis.status) || 'failed',
      verdict: 'not_built',
      matchPct: 0,
      iterations: 0
    }
  }

  const built = await agent(
    buildStagePrompt(componentName, tierDef, parentFrameId, analysis.sourceDir),
    { label: 'build-' + componentName, phase: 'Build Components', schema: BUILD_SCHEMA }
  )
  if (!built || built.status !== 'built' || !built.nodeId) {
    return {
      componentName: componentName,
      status: 'failed',
      verdict: (built && built.reason) || 'build_failed',
      matchPct: 0,
      iterations: 0
    }
  }

  const compared = await agent(
    comparePrompt(componentName, analysis.sourceDir, built.nodeId, built.screenshotNodeId || built.nodeId),
    { label: 'compare-' + componentName, phase: 'Build Components', model: 'sonnet', schema: COMPARE_SCHEMA }
  )

  if (!compared || !compared.needsFix) {
    return {
      componentName: componentName,
      status: 'built',
      nodeId: built.nodeId,
      verdict: (compared && compared.verdict) || 'no_app_reference',
      matchPct: (compared && compared.matchPct) ?? 0,
      iterations: 0
    }
  }

  const fixed = await agent(
    fixPrompt(componentName, analysis.sourceFile, analysis.sourceDir, built.nodeId, built.screenshotNodeId || built.nodeId, compared.verdict, compared.missingInstances),
    { label: 'fix-' + componentName, phase: 'Build Components', schema: COMPONENT_RESULT_SCHEMA }
  )
  return {
    componentName: componentName,
    status: (fixed && fixed.status) || 'partial_match',
    nodeId: (fixed && fixed.nodeId) || built.nodeId,
    verdict: (fixed && fixed.verdict) || compared.verdict,
    matchPct: (fixed && fixed.matchPct) ?? compared.matchPct ?? 0,
    iterations: (fixed && fixed.iterations) ?? 0
  }
}

// === STATE HYDRATION (when starting mid-pipeline) ===

if (needsHydration) {
  phase('Hydrate')
  log('Starting mid-pipeline — hydrating state from prior phases')

  const hydrated = await agent(
    [
      'Read the figma-from-code state files and return all orchestration data.',
      '',
      'Read these files from .temp/figma-from-code/:',
      '  - state.json (main state ledger)',
      '  - discovery-summary.json (build order and component counts)',
      '  - precapture-screens.json (screen list, if it exists)',
      '',
      'From state.json, extract and return:',
      '  - fileKey',
      '  - buildOrder.tiers as tiers',
      '  - builtComponents',
      '  - preExistingComponents',
      '  - preExistingScreens',
      '  - existingCollections',
      '  - existingPages',
      '  - figmaNodes',
      '',
      'From precapture-screens.json (if it exists), extract the screen list.',
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

  tiers = hydrated.tiers
  builtComponents = hydrated.builtComponents || {}
  preExistingComponents = hydrated.preExistingComponents || {}
  preExistingScreens = hydrated.preExistingScreens || {}
  existingCollections = hydrated.existingCollections || []
  existingPages = hydrated.existingPages || []
  figmaNodes = hydrated.figmaNodes || {}
  screens = hydrated.screens || []

  log('Hydrated: ' + tiers.length + ' tiers, ' + Object.keys(builtComponents).length + ' built components, ' + Object.keys(figmaNodes).length + ' figma nodes')

  // Wave 5 (screens) reads builtComponents.json FROM DISK. Hydration loads the
  // registry into memory only, so a resume starting at/after Phase 3 would leave a
  // stale/missing on-disk registry and screens would build blind. Materialize it now.
  await agent(
    [
      'Write the hydrated builtComponents registry to disk so downstream build/screen agents read the correct registry.',
      '',
      'Write this JSON to ' + TEMP + '/builtComponents.json:',
      JSON.stringify(builtComponents),
    ].join('\n'),
    { label: 'materialize-built-hydrate', phase: 'Hydrate', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
  )
}

// === WAVE 1: Discovery (parallel) ===

if (shouldRunWave('wave1', startPhase, endPhase)) {
  phase('Discovery')
  log('Wave 1: Discovering components and assets in parallel')

  const [discovery, assets] = await parallel([
    () => agent(
      [
        'Discover the complete component architecture by browser crawling the running dev server and static code scanning. Also inspect the Figma file for existing components, pages, and variable collections.',
        '',
        'Read and follow the skill instructions at: ' + SKILL + '/1-discovery-components/SKILL.md',
        'Figma file key: ' + fileKey,
        'Source directory: ' + sourceDir,
        'Dev server URL: ' + devServerUrl,
        '',
        'Write component-map.json and discovery-summary.json to ' + TEMP + '/',
        'Initialize state.json in ' + TEMP + '/ with the state ledger template from the orchestrator skill.',
        '',
        'Return: success, componentCount, tierCount, tiers (with tier/label/components), builtComponents, preExistingComponents, preExistingScreens, existingCollections, existingPages.',
      ].join('\n'),
      { label: 'discover-components', phase: 'Discovery', schema: DISCOVERY_SCHEMA }
    ),

    () => agent(
      [
        'Discover all Lucide icons and SVG assets imported across the codebase via static code analysis.',
        '',
        'Read and follow the skill instructions at: ' + SKILL + '/2-discovery-assets/SKILL.md',
        'Source directory: ' + sourceDir,
        '',
        'Write icons.json and icons-summary.json to ' + TEMP + '/',
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

  tiers = discovery.tiers || []
  builtComponents = discovery.builtComponents || {}
  preExistingComponents = discovery.preExistingComponents || {}
  preExistingScreens = discovery.preExistingScreens || {}
  existingCollections = discovery.existingCollections || []
  existingPages = discovery.existingPages || []

  log('Discovered ' + (discovery.componentCount || 0) + ' components across ' + discovery.tierCount + ' tiers')
  log('Found ' + assets.iconCount + ' icons, ' + (assets.assetCount || 0) + ' assets')

  // --- Normalization (needs both 0a + 0b) ---
  phase('Normalize')
  log('Running component name normalization')

  const normResult = await agent(
    [
      'Run the component name normalization script to align scanner names with Figma conventions, re-read the updated discovery-summary.json, persist the Phase 0a + 0b results to the state ledger, and return the refreshed build order.',
      '',
      'Run this command:',
      '  node ' + SKILL + '/1-discovery-components/normalize-component-map.js ' + TEMP + '/component-map.json ' + TEMP + '/icons.json --write',
      '',
      'After the script completes, read ' + TEMP + '/discovery-summary.json (it was regenerated by the script) and extract the updated tiers from the buildOrder field.',
      '',
      'Then update ' + TEMP + '/state.json (read it, merge these fields, write it back):',
      '  phases.phase0a: "complete"',
      '  phases.phase0b: "complete"',
      '  buildOrder: { tierCount: <count of updated tiers>, tiers: <updated tiers from discovery-summary.json> }',
      '  builtComponents: ' + JSON.stringify(builtComponents),
      '  preExistingComponents: ' + JSON.stringify(preExistingComponents),
      '  preExistingScreens: ' + JSON.stringify(preExistingScreens),
      '  existingCollections: ' + JSON.stringify(existingCollections),
      '  existingPages: ' + JSON.stringify(existingPages),
      '',
      'Return: success, renameCount (from script stdout), updatedTiers (the refreshed tiers array).',
    ].join('\n'),
    { label: 'normalize', phase: 'Normalize', model: 'haiku', schema: NORMALIZE_SCHEMA }
  )

  if (normResult && normResult.updatedTiers && normResult.updatedTiers.length > 0) {
    tiers = normResult.updatedTiers
  }
  log('Normalization: ' + (normResult ? normResult.renameCount || 0 : 0) + ' components renamed')
}

// === WAVE 2: Tokens + Structure (parallel) ===

if (shouldRunWave('wave2', startPhase, endPhase)) {
  phase('Setup')
  log('Wave 2: Setting up tokens and file structure in parallel')

  const [tokens, structure] = await parallel([
    () => agent(
      [
        'Create Figma variable collections (Palette, Semantic, Spacing) and extract the CSS-to-Figma variable map.',
        '',
        'Read and follow the skill instructions at: ' + SKILL + '/3-setup-tokens/SKILL.md',
        'Figma file key: ' + fileKey,
        'Existing collections (skip if already present): ' + JSON.stringify(existingCollections),
        '',
        'Write tokens-summary.json and variables.json to ' + TEMP + '/',
        'Update state.json: set phases.phase1 to "complete" and variableMapPath.',
        '',
        'Return: success, variableCount, collections (list of collection names), variableMapPath.',
      ].join('\n'),
      { label: 'setup-tokens', phase: 'Setup', model: 'sonnet', schema: TOKENS_SCHEMA }
    ),

    () => agent(
      [
        'Create the Figma file page skeleton (Foundations, Components, Screens pages) and container frames (Icons frame, Screens frame).',
        '',
        'Read and follow the skill instructions at: ' + SKILL + '/4-setup-structure/SKILL.md',
        'Figma file key: ' + fileKey,
        'Existing pages (skip if already present): ' + JSON.stringify(existingPages),
        '',
        'Create ONLY the page skeleton and container frames: the three pages, an empty Foundations container frame, the Icons frame, and the Screens frame. Do NOT build the Foundations documentation content (Color Palette / Semantic Colors / Spacing Scale swatches) — that depends on the Phase 1 variables and is built in a dedicated step after this one.',
        '',
        'Write structure-summary.json to ' + TEMP + '/',
        'Update state.json: set phases.phase2 to "complete" and all figmaNodes page/frame IDs.',
        '',
        'Return: success, foundationsPageId, componentsPageId, screensPageId, foundationsFrameId, iconsFrameId, screensFrameId.',
      ].join('\n'),
      { label: 'setup-structure', phase: 'Setup', model: 'sonnet', schema: STRUCTURE_SCHEMA }
    ),
  ])

  if (!tokens || !tokens.success) {
    log('ERROR: Token setup failed')
    return { error: 'Phase 1 (tokens) failed', details: tokens }
  }
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

  log('Tokens: ' + (tokens.variableCount || 0) + ' variables in ' + (tokens.collections || []).join(', '))
  log('Structure: pages and frames created')

  // Foundations documentation (color swatches, semantic colors, spacing scale)
  // depends on the Phase 1 variables, so it CANNOT live inside the parallel
  // structure agent above — that races tokens and sees no variables yet,
  // leaving an empty placeholder frame that nothing ever fills. Build it here,
  // after the Wave 2 barrier, now that the Palette/Semantic/Spacing collections
  // exist and the Foundations container frame has been created.
  const FOUNDATIONS_DOCS_SCHEMA = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      framesCreated: { type: 'array', items: { type: 'string' } },
      swatchesCreated: { type: 'number' },
    },
    required: ['success'],
  }

  const foundationsDocs = await agent(
    [
      'Build the Foundations documentation frames — Color Palette, Semantic Colors, and Spacing Scale — on the Foundations page, now that the Phase 1 variable collections exist. Bind every swatch fill to its Figma variable; never hardcode hex values.',
      '',
      'First invoke the figma:figma-use skill (mandatory before any use_figma call).',
      'Read and follow the "Foundations Page Content" section of: .claude/skills/figma-setup-file-structure/SKILL.md',
      '',
      'Figma file key: ' + fileKey,
      'Foundations page ID: ' + (figmaNodes.foundationsPageId || ''),
      'Foundations container frame (build the documentation frames inside/below it; do not duplicate it): ' + (figmaNodes.foundationsFrameId || ''),
      'Variable collections available: ' + JSON.stringify(tokens.collections || ['Palette', 'Semantic', 'Spacing']),
      '',
      'Query the Palette/Semantic/Spacing variables via figma.variables.getLocalVariablesAsync() and build the three frames dynamically as the skill specifies.',
      'Be idempotent: if non-empty Color Palette / Semantic Colors / Spacing Scale frames already exist on the page, skip rebuilding them.',
      '',
      'Return: success, framesCreated (frame names), swatchesCreated (count).',
    ].join('\n'),
    { label: 'setup-foundations-docs', phase: 'Setup', model: 'sonnet', schema: FOUNDATIONS_DOCS_SCHEMA }
  )

  if (foundationsDocs && foundationsDocs.success) {
    log('Foundations docs: ' + (foundationsDocs.framesCreated || []).join(', ') + ' (' + (foundationsDocs.swatchesCreated || 0) + ' swatches)')
  } else {
    log('WARNING: Foundations documentation step did not complete — color/spacing docs may be missing')
  }
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
      'Figma file key: ' + fileKey,
      'Dev server URL: ' + devServerUrl,
      '',
      'Build manifests from ' + TEMP + '/component-map.json.',
      'Capture all screenshottable components and all discovered routes.',
      '',
      'Write precapture-all.json and precapture-screens.json to ' + TEMP + '/',
      'Update state.json: set phases.phase2_5 to "complete".',
      '',
      'IMPORTANT: Also return the list of captured screens with their metadata.',
      'For each screen, extract: screenName, route, pageSourceFile (from component-map.json routes/tree), keyComponents.',
      '',
      'Return: success, componentsCaptured, screensCaptured, skipped, failed, screens (array of screen objects).',
    ].join('\n'),
    { label: 'precapture', phase: 'Pre-capture', model: 'sonnet', schema: PRECAPTURE_SCHEMA }
  )

  if (!precapture || !precapture.success) {
    log('ERROR: Pre-capture failed')
    return { error: 'Phase 2.5 (pre-capture) failed', details: precapture }
  }

  screens = precapture.screens || []
  log('Pre-captured ' + (precapture.componentsCaptured || 0) + ' components, ' + (precapture.screensCaptured || 0) + ' screens')
}

// === WAVE 4: Component Builds (tiers sequential; components within a tier in parallel) ===

if (shouldRunWave('wave4', startPhase, endPhase)) {

  // --- Icon Preamble ---
  phase('Build Icons')
  log('Wave 4: Building icon and asset components')

  // Materialize builtComponents.json before preamble
  await withRetry(
    'materialize-built',
    2,
    function(r) { return r && r.success },
    function() {
      return agent(
        [
          'Write the current builtComponents registry to disk so Phase 3 agents can read it.',
          '',
          'Write this JSON to ' + TEMP + '/builtComponents.json:',
          JSON.stringify(builtComponents),
        ].join('\n'),
        { label: 'materialize-built', phase: 'Build Icons', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
      )
    }
  )

  const preamble = await agent(
    [
      'Build all Figma icon and asset components from SVG data before tier processing.',
      '',
      'Read and follow the skill instructions at: ' + SKILL + '/6-build-tier/icon-preamble/SKILL.md',
      'Figma file key: ' + fileKey,
      'Icons frame node ID: ' + (figmaNodes.iconsFrameId || ''),
      '',
      'Read icons.json and builtComponents.json from ' + TEMP + '/',
      'Skip icons/assets already in builtComponents.json.',
      'Write icon-preamble-results.json to ' + TEMP + '/',
      'Update builtComponents.json with newly created icons.',
      '',
      'Return: success, created (map of name to nodeId), totalCreated, totalSkipped, totalFailed.',
    ].join('\n'),
    { label: 'icon-preamble', phase: 'Build Icons', model: 'sonnet', schema: PREAMBLE_SCHEMA }
  )

  if (preamble && preamble.created) {
    builtComponents = { ...builtComponents, ...preamble.created }
  }
  log('Icons: ' + (preamble ? preamble.totalCreated || 0 : 0) + ' created, ' + (preamble ? preamble.totalSkipped || 0 : 0) + ' skipped')

  // Re-materialize from the in-memory registry so Tier 1 build agents are
  // guaranteed to see the icons even if the preamble agent didn't persist the file.
  await withRetry(
    'materialize-built-post-icons',
    2,
    function(r) { return r && r.success },
    function() {
      return agent(
        [
          'Write the current builtComponents registry (now including icons) to disk.',
          '',
          'Write this JSON to ' + TEMP + '/builtComponents.json:',
          JSON.stringify(builtComponents),
        ].join('\n'),
        { label: 'materialize-built-post-icons', phase: 'Build Icons', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
      )
    }
  )

  // --- Per-Component Tier Builds. Tiers run sequentially (tier N+1 instances
  //     tier N). Within a tier, all components run concurrently as independent
  //     analyze→build→compare→fix chains, bounded by the runtime's global
  //     concurrency cap — no manual batching, no per-batch barrier. The registry
  //     is materialized ONCE per tier (single writer) after the tier's barrier. ---
  for (let i = 0; i < tiers.length; i++) {
    const tierDef = tiers[i]
    phase('Build Components')

    // Skip components already built (Phase 0a Figma inspection or a prior run)
    const toBuild = tierDef.components.filter(function(name) { return !builtComponents[name] })
    const alreadyBuilt = tierDef.components.length - toBuild.length

    log('Tier ' + tierDef.tier + ' (' + tierDef.label + '): ' + toBuild.length + ' to build, ' + alreadyBuilt + ' already built')

    // Nothing to build in this tier — skip entirely (do not create an empty frame)
    if (toBuild.length === 0) {
      log('Tier ' + tierDef.tier + ': nothing to build — skipping')
      continue
    }

    // Create the tier frame on the Components page. Idempotent (reuses an existing
    // frame by name) so retrying a transient failure is safe.
    const frameResult = await withRetry(
      'tier-' + tierDef.tier + '-frame',
      3,
      function(r) { return r && r.tierFrameId },
      function() {
        return agent(
          [
            'Create the container frame for Tier ' + tierDef.tier + ' on the Components page in Figma. Do not build any components — only create the frame and return its node ID.',
            '',
            'Figma file key: ' + fileKey,
            'Components page ID: ' + (figmaNodes.componentsPageId || ''),
            'Tier: ' + tierDef.tier,
            'Tier label: ' + tierDef.label,
            '',
            'First invoke the figma:figma-use skill, then via use_figma:',
            '  - setCurrentPageAsync to the Components page',
            '  - compute y = (existingFrames.length ? maxBottom + 80 : 200) where maxBottom = max(f.y + f.height) over the page children',
            '  - create a HORIZONTAL auto-layout frame named "Tier ' + tierDef.tier + ' — ' + tierDef.label + '" with itemSpacing 80, padding 48 on all sides, white fill, x = 0, y = computed, appended to the page',
            '',
            'If a frame named "Tier ' + tierDef.tier + ' — ' + tierDef.label + '" already exists on the page, reuse it instead of creating a duplicate.',
            '',
            'Return: success, tier, tierFrameId (the frame node ID).',
          ].join('\n'),
          { label: 'tier-' + tierDef.tier + '-frame', phase: 'Build Components', model: 'sonnet', schema: TIER_FRAME_SCHEMA }
        )
      }
    )

    if (!frameResult || !frameResult.tierFrameId) {
      // The tier frame gates every component in this tier AND every later tier that
      // instances them. Skipping silently would orphan the rest of the build and
      // still report success. Persist what we have and hard-return so the user can
      // cleanly resume from phase3 (already-built components are skipped on resume).
      skippedTiers.push(tierDef.tier)
      log('ERROR: Tier ' + tierDef.tier + ' frame creation failed after retries — persisting state and stopping')
      await agent(
        [
          'Write the current builtComponents registry to disk so a resume can skip already-built components.',
          '',
          'Write this JSON to ' + TEMP + '/builtComponents.json:',
          JSON.stringify(builtComponents),
        ].join('\n'),
        { label: 'materialize-built-abort', phase: 'Build Components', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
      )
      return {
        error: 'Tier ' + tierDef.tier + ' frame creation failed',
        fileKey: fileKey,
        builtComponents: Object.keys(builtComponents).length,
        skippedTiers: skippedTiers,
        resumeHint: 'Re-run with startPhase: "phase3" to resume (built components are skipped).',
      }
    }

    const tierFrameId = frameResult.tierFrameId
    figmaNodes['tier' + tierDef.tier + 'FrameId'] = tierFrameId

    let tierBuilt = 0
    let tierFailed = 0

    const results = await parallel(
      toBuild.map(function(componentName) {
        return function() {
          return buildOneComponent(componentName, tierDef, tierFrameId)
        }
      })
    )

    results.forEach(function(r, idx) {
      const name = toBuild[idx]
      if (!r) {
        // Thunk threw or was skipped — count it as a failure, never a silent vanish.
        tierFailed++
        failedComponents.push({ componentName: name, status: 'no_result', tier: tierDef.tier })
        log('  ' + name + ': no_result (build chain threw or was skipped)')
        return
      }
      if (r.nodeId && (r.status === 'built' || r.status === 'partial_match')) {
        builtComponents[r.componentName] = r.nodeId
        tierBuilt++
      } else {
        tierFailed++
        failedComponents.push({ componentName: name, status: r.status, verdict: r.verdict, tier: tierDef.tier })
        log('  ' + name + ': ' + r.status + (r.verdict ? ' (' + r.verdict + ')' : ''))
      }
    })

    // Materialize the registry ONCE per tier (single writer, after the barrier —
    // no read/write races) so the next tier can resolve this tier's components.
    await withRetry(
      'materialize-tier-' + tierDef.tier,
      2,
      function(r) { return r && r.success },
      function() {
        return agent(
          [
            'Write the current builtComponents registry to disk so the next tier can resolve children as instances.',
            '',
            'Write this JSON to ' + TEMP + '/builtComponents.json:',
            JSON.stringify(builtComponents),
          ].join('\n'),
          { label: 'materialize-tier-' + tierDef.tier, phase: 'Build Components', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
        )
      }
    )

    // Collect tier results into build-tier{N}.json and mark tierProgress complete.
    // collect-tier-results.js now MERGES completed node IDs into builtComponents.json
    // (it no longer rewrites the registry from the incomplete state.json), so the
    // previous repair-overwrite step is gone.
    await withRetry(
      'collect-tier-' + tierDef.tier,
      2,
      function(r) { return r && r.success },
      function() {
        return agent(
          [
            'Finalize Tier ' + tierDef.tier + ' results.',
            '',
            'Run: node ' + SKILL + '/collect-tier-results.js --tier ' + tierDef.tier + ' --components "' + tierDef.components.join(',') + '"',
            'This writes ' + TEMP + '/build-tier' + tierDef.tier + '.json, sets tierProgress.tier' + tierDef.tier + ' to "complete" (or "complete_with_failures" if any component failed, recording the failed names), and merges completed node IDs into builtComponents.json.',
            '',
            'Return: success.',
          ].join('\n'),
          { label: 'collect-tier-' + tierDef.tier, phase: 'Build Components', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
        )
      }
    )

    log('Tier ' + tierDef.tier + ' complete: ' + tierBuilt + ' built, ' + tierFailed + ' failed')
  }

  // Update state with all Phase 3 results
  await agent(
    [
      'Update ' + TEMP + '/state.json with Phase 3 completion.',
      '',
      'Set these fields:',
      '  phases.phase3: ' + (failedComponents.length === 0 ? '"complete"' : '"complete_with_failures"'),
      '  phase3Failures: ' + JSON.stringify(failedComponents.map(function(f) { return f.componentName || f.name })),
      '  builtComponents: ' + JSON.stringify(builtComponents),
      '  figmaNodes: ' + JSON.stringify(figmaNodes),
      '',
      'Read the current state.json, merge these fields, and write it back.',
    ].join('\n'),
    { label: 'update-state-phase3', phase: 'Build Components', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
  )

  log('Phase 3 complete: ' + Object.keys(builtComponents).length + ' total built components, ' + failedComponents.length + ' failed')
}

// === WAVE 5: Screen Builds (parallel) ===

if (shouldRunWave('wave5', startPhase, endPhase)) {
  phase('Build Screens')

  if (screens.length === 0) {
    log('No screens to build — skipping Wave 5')
  } else {
    log('Wave 5: Building ' + screens.length + ' screens in parallel')

    const rawScreenResults = await parallel(
      screens.map(function(screen) {
        return function() {
          return agent(
            [
              'Build a Figma screen frame by composing built component instances, then validate visually.',
              '',
              'Read and follow the skill instructions at: ' + SKILL + '/8-build-screens/SKILL.md',
              'Figma file key: ' + fileKey,
              '',
              'Screen name: ' + screen.screenName,
              'Route: ' + screen.route,
              'Page source file: ' + (screen.pageSourceFile || ''),
              'Screens frame node ID: ' + (figmaNodes.screensFrameId || ''),
              'App screenshot: ' + TEMP + '/screenshots/screens/' + screen.screenName + '/app.png',
              'Text content: ' + TEMP + '/screenshots/screens/' + screen.screenName + '/text.json',
              'Screenshot dir: ' + TEMP + '/screenshots/screens/' + screen.screenName + '/',
              'Key components: ' + (screen.keyComponents || []).join(', '),
              '',
              'Read builtComponents.json from ' + TEMP + '/ for component instance lookup.',
              'Pre-existing screens (DO NOT MODIFY without authorization): ' + JSON.stringify(preExistingScreens),
              '',
              'Follow all 7 steps: verify components, analyze source + screenshot, build via use_figma,',
              'screenshot, compare, fix loop (up to 3 iterations), write result.',
              '',
              'Write result to ' + TEMP + '/build-results/screens/' + screen.screenName + '.json',
              '',
              'Return: screenName, status (built/rejected/needs_authorization/failed), nodeId, verdict, matchPct, missingComponents.',
            ].join('\n'),
            { label: 'screen-' + screen.screenName, phase: 'Build Screens', schema: SCREEN_SCHEMA }
          )
        }
      })
    )

    // A null result means the screen's thunk threw or was skipped — record it as a
    // failure rather than dropping it silently via .filter(Boolean).
    rawScreenResults.forEach(function(r, idx) {
      if (!r) failedScreens.push({ screenName: screens[idx].screenName, status: 'no_result' })
    })
    const screenResults = rawScreenResults.filter(Boolean)
    const builtScreens = screenResults.filter(function(s) { return s.status === 'built' })
    screenResults
      .filter(function(s) { return s.status !== 'built' })
      .forEach(function(s) { failedScreens.push({ screenName: s.screenName, status: s.status, verdict: s.verdict }) })

    log('Screens: ' + builtScreens.length + ' built, ' + failedScreens.length + ' failed/rejected')

    if (failedScreens.length > 0) {
      log('Failed screens: ' + failedScreens.map(function(s) { return s.screenName + ' (' + s.status + ')' }).join(', '))
    }

    // Update state
    await agent(
      [
        'Update ' + TEMP + '/state.json with Phase 4 completion.',
        '',
        'Set phases.phase4: ' + (failedScreens.length === 0 ? '"complete"' : '"complete_with_failures"') + '.',
        'Set phase4Failures: ' + JSON.stringify(failedScreens.map(function(s) { return s.screenName })) + '.',
        'Read the current state.json, merge these fields, and write it back.',
      ].join('\n'),
      { label: 'update-state-phase4', phase: 'Build Screens', model: 'haiku', schema: STATE_UPDATE_SCHEMA }
    )
  }
}

// === WAVE 6: Validation ===

if (shouldRunWave('wave6', startPhase, endPhase)) {
  phase('Validate')
  log('Wave 6: Validating all built components against app screenshots')

  const validation = await agent(
    [
      'Validate every built Figma component against its app screenshot. Run fix loops on mismatches for components built during this run. Clean up the Components page layout.',
      '',
      'Read and follow the skill instructions at: ' + SKILL + '/9-validate/SKILL.md',
      'Figma file key: ' + fileKey,
      'Dev server URL: ' + devServerUrl,
      '',
      'Inputs:',
      '  builtComponents: ' + JSON.stringify(builtComponents),
      '  preExistingComponents (validate read-only, no fix loop): ' + JSON.stringify(preExistingComponents),
      '  figmaNodes: ' + JSON.stringify(figmaNodes),
      '  buildOrder tierCount: ' + tiers.length,
      '',
      'Write validation-summary.json to ' + TEMP + '/ (include fileKey "' + fileKey + '" so the validated target is auditable; compute overallVerdict from the counts per the SKILL rule).',
      'Write re-measured scores back into each .temp/figma-from-code/build-results/<name>.json under a "validation" block (SKILL step 1b) so build-results and the summary cannot diverge.',
      'Write full report to .temp/figma-validation/report.md',
      'Update state.json: set phases.phase5 to "complete".',
      'Stop the Playwright server if running.',
      '',
      'Return: success, fileKey, componentsCompared, comparable, match, minorDiff, mismatch, noAppReference, matchRate, fixedDuringValidation, averageMatchPct, overallVerdict, reportPath.',
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
  }
}

// === CLEANUP: stop the browser/Playwright server regardless of which phases ran ===
// The validate wave stops it on success, but a run ended early via endPhase (or one
// where validation didn't reach the teardown step) would otherwise orphan the server
// and hold its port. This step is idempotent — a no-op if nothing is running.
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
