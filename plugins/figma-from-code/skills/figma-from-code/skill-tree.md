# figma-from-code — Full Skill Tree

```
figma-from-code (Orchestrator — thin dispatcher, never calls use_figma)
│
├── Phase 0a — Component Discovery ───────────────────────────────────
│   └── Subagent (sonnet): 1-discovery-components
│       ├── 1. mkdir -p .temp/figma-from-code/
│       ├── 2. curl → verify dev server
│       ├── 3. node map-components.js --crawl --max-crawl 30
│       ├── 4. node normalize-component-map.js (align names w/ Figma conventions)
│       ├── 5. node discover-code-components.js (static import scan)
│       ├── 6. get_metadata → match Figma components by name
│       │   └── use_figma → read-only inspection (pages, variable collections)
│       ├── 7. Seed .figma/figma.json per matched component
│       ├── 8. Write updated component-map.json (with figmaNodeId per component)
│       ├── 9. Write discovery-summary.json (~3KB) ← ORCHESTRATOR READS THIS
│       └── 10. Report (tiers, existing vs missing components)
│       → Orchestrator reads discovery-summary.json, merges into state.json
│
├── Phase 0b — Icon & Asset Discovery ────────────────────────────────
│   └── Subagent (sonnet): 2-discovery-assets
│       ├── 1. mkdir -p .temp/figma-from-code/
│       ├── 2. node extract-icons.js --scan {sourceDir}
│       ├── 3. Read icons.json summary fields
│       ├── 4. Write icons-summary.json (~500B) ← ORCHESTRATOR READS THIS
│       └── 5. Report
│       → Orchestrator reads icons-summary.json, merges iconDiscovery into state
│       → Orchestrator runs normalize-component-map.js (re-reads discovery-summary)
│
├── Phase 1 — Tokens (Variables) ─────────────────────────────────────
│   └── Subagent (sonnet): 3-setup-tokens
│       ├── Skill: figma-setup-variables
│       │   ├── Read CSS → parse custom properties from :root
│       │   ├── Read tailwind.config.js (color mappings, radius, spacing)
│       │   ├── use_figma → create Palette collection
│       │   ├── use_figma → create Semantic collection
│       │   └── use_figma → create Spacing collection
│       ├── use_figma → extract CSS var → Figma variable ID map → variables.json
│       ├── node resolve-colors.js → resolved-colors.json
│       ├── Write tokens-summary.json (~500B) ← ORCHESTRATOR READS THIS
│       └── Report
│       → Orchestrator reads tokens-summary.json, updates variableMapPath in state
│
├── Phase 2 — File Structure ─────────────────────────────────────────
│   └── Subagent (sonnet): 4-setup-structure
│       ├── Skill: figma-setup-file-structure
│       │   ├── use_figma → rename/create pages (Foundations, Components, Screens)
│       │   ├── use_figma → Color Palette frame
│       │   ├── use_figma → Semantic Colors frame
│       │   └── use_figma → Spacing Scale frame
│       ├── use_figma → create Icons frame + tier frames on Components page
│       ├── use_figma → create Screens container on Screens page
│       ├── get_screenshot → verify Foundations page
│       ├── Write structure-summary.json (~500B) ← ORCHESTRATOR READS THIS
│       └── Report
│       → Orchestrator reads structure-summary.json, merges figmaNodes into state
│
├── Phase 2.5 — Pre-capture Reference Material ───────────────────────
│   └── Skill: 5-precapture
│       ├── curl → verify dev server
│       ├── node browser-server.js & → shared Playwright WebSocket server
│       ├── Build manifest files per route group
│       ├── Dispatch parallel HAIKU subagents (one per route group):
│       │   └── Each subagent:
│       │       ├── node screenshot.js --batch {group}-screenshots.json
│       │       ├── node extract-text.js --batch {group}-text.json
│       │       └── Write precapture-{group}.json
│       ├── Dispatch precapture-screens agent (full-page screenshots)
│       └── → Orchestrator reads small precapture results, updates state
│
├── Phase 3 — Build Components (tier by tier) ────────────────────────
│   └── Skill: 6-build-tier
│       │
│       ├── PREAMBLE: Icon & Asset Components
│       │   └── Subagent (sonnet): icon preamble ← NEW dispatch
│       │       ├── Read icons.json (SVG data — stays in subagent context only)
│       │       ├── Read builtComponents.json (skip already-built)
│       │       ├── use_figma → createNodeFromSvg per icon (~7/batch)
│       │       ├── use_figma → createNodeFromSvg per SVG asset
│       │       └── Write icon-preamble-results.json
│       │       → Orchestrator reads results, merges into builtComponents
│       │
│       └── PER TIER (sequential — each tier depends on lower tiers):
│           ├── Filter already-built components
│           ├── Dispatch parallel OPUS subagents (one per component):
│           │   └── Skill: 7-build-component (full 7-step workflow)
│           │       ├── Step 1: Analyze (sonnet subagent → code.json)
│           │       ├── Step 2: Build (opus inline → use_figma)
│           │       ├── Step 3: Screenshot (get_screenshot → figma.png)
│           │       ├── Step 4: Compare (haiku subagent → verdict)
│           │       ├── Step 5: Fix Loop (opus subagent, fresh context, up to 3 iterations)
│           │       ├── Step 6: Finalize tracking files
│           │       └── Step 7: Write build-results/{ComponentName}.json
│           │
│           ├── node collect-tier-results.js ← NEW (replaces per-file reads)
│           │   └── Reads all build-results, writes build-tier{N}.json, updates state
│           └── CHECKPOINT with user before next tier
│
├── Phase 4 — Build Screens ──────────────────────────────────────────
│   └── Skill: 8-build-screens (subagent-only mode)
│       ├── Dispatch parallel OPUS subagents (one per screen):
│       │   └── Each subagent:
│       │       ├── Step 0: PREREQ GATE — verify all components exist
│       │       ├── Step 1: Analyze screen (page source, computed styles)
│       │       ├── Step 2: use_figma → build 1440×900 screen frame
│       │       ├── Step 3: get_screenshot → figma.png
│       │       ├── Step 4: Compare (sizing check + pixel diff)
│       │       ├── Step 5: Fix loop (up to 3 iterations)
│       │       ├── Step 6: Write figma-screen.json
│       │       └── Step 7: Write build-results/screens/{screenName}.json
│       │
│       ├── node collect-screen-results.js ← NEW (replaces per-file reads)
│       │   └── Reads all screen results, writes build-screens.json
│       └── CHECKPOINT with user
│
└── Phase 5 — Validate + Fix ─────────────────────────────────────────
    └── Subagent (opus): 9-validate
        ├── Skill: 10-validator
        │   ├── Phase 1: Inventory (use_figma → query components)
        │   ├── Phase 1e: Variant resolution (use_figma)
        │   ├── Phase 2: Screenshots (parallel SONNET subagents per tier)
        │   │   └── Each: app screenshot + Figma screenshot + compare.js
        │   ├── Phase 3: Structural checks (variables, pages, screens)
        │   ├── Phase 4: Write report.md
        │   └── Phase 5: Fix loop (up to 3 iterations, built-during-run only)
        ├── use_figma → cleanup Components page layout (move strays, re-stack)
        ├── kill browser-server.js
        ├── Write validation-summary.json (~500B) ← ORCHESTRATOR READS THIS
        └── Report
        → Orchestrator reads validation-summary.json, presents final verdict
```

## Legend

| Symbol             | Meaning                                                  |
| ------------------ | -------------------------------------------------------- |
| `HAIKU subagents`  | Pre-capture agents (fast, no judgment needed)            |
| `OPUS subagents`   | Component + screen builds + validation (creative work)   |
| `SONNET subagents` | Analysis, token setup, structure, icon preamble          |
| `use_figma`        | Figma MCP plugin call (runs in subagents only)           |
| `get_screenshot`   | Figma MCP screenshot (runs in subagents only)            |
| `get_metadata`     | Figma MCP metadata (file-level, read-only)               |
| `node *.js`        | Shell script (Playwright, pixel diff, result collection) |
| `PREREQ GATE`      | Hard reject if child components missing                  |
| `INSTANCE GATE`    | Hard reject if design-system instances missing           |
| `CHECKPOINT`       | Pause for user confirmation                              |
| `← NEW`            | Added in the context optimization refactor               |

## Context budget

| What the orchestrator reads         | Size      |
| ----------------------------------- | --------- |
| SKILL.md (this file)                | ~8KB      |
| state.json                          | ~7KB      |
| discovery-summary.json              | ~3KB      |
| icons-summary.json                  | ~500B     |
| tokens-summary.json                 | ~500B     |
| structure-summary.json              | ~500B     |
| collect-tier-results.js stdout (×6) | ~600B     |
| collect-screen-results.js stdout    | ~100B     |
| validation-summary.json             | ~500B     |
| **Total data context**              | **~21KB** |

Previous architecture loaded ~310KB of data into the orchestrator's context.
