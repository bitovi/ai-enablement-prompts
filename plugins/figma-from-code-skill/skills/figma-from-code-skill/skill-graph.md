# figma-from-code Skill Graph

Recursive set of all skills called (directly or transitively) by `figma-from-code`.

## Recursive tree

```
figma-from-code (orchestrator — thin dispatcher, never calls use_figma)
├── 1-discovery-components                     (Phase 0a, subagent)
│   ├── site-component-map                     (provides map-components.js)
│   └── figma-component-dependency-map         (build-order reference)
│       └── figma:figma-generate-library       (plugin skill)
├── 2-discovery-assets                         (Phase 0b, subagent)
├── 3-setup-tokens                             (Phase 1, subagent)
│   ├── figma-setup-variables                  (variable collection creation)
│   │   ├── figma:figma-generate-library       (plugin)
│   │   └── figma:figma-use                    (plugin — for use_figma)
│   └── resolve-colors.js                      (CSS color resolution)
├── 4-setup-structure                          (Phase 2, subagent)
│   ├── figma-setup-file-structure             (pages + foundations)
│   │   ├── figma:figma-generate-library       (plugin)
│   │   └── figma:figma-use                    (plugin)
│   └── use_figma (tier frames, screens frame) (inline in subagent)
├── 5-precapture                               (Phase 2.5, haiku subagents)
│   └── site-component-map                     (script source)
├── 6-build-tier                               (Phase 3, opus subagents)
│   ├── icon preamble subagent                 (sonnet)
│   ├── 7-build-component                      (per component, opus)
│   │   └── 10-validator/compare.js (bundled)              (pixel diff)
│   └── collect-tier-results.js                (result aggregation)
├── 8-build-screens                            (Phase 4, opus subagents)
│   ├── site-component-map                     (route reference)
│   └── collect-screen-results.js              (result aggregation)
└── 9-validate                                 (Phase 5, subagent)
    ├── 10-validator                           (full validation workflow)
    │   ├── 10-validator/compare.js (bundled)
    │   └── site-component-map                 (component app map)
    └── cleanup use_figma                      (inline in subagent)
```

## Flat deduplicated list (17 skills)

### Project-local (15)

1. `1-discovery-components`
2. `2-discovery-assets`
3. `3-setup-tokens`
4. `4-setup-structure`
5. `figma-setup-variables`
6. `figma-setup-file-structure`
7. `5-precapture`
8. `6-build-tier`
9. `7-build-component`
10. `8-build-screens`
11. `9-validate`
12. `10-validator`
13. `figma-component-dependency-map`
14. `10-validator/compare.js (bundled)`
15. `site-component-map`

### Plugin skills (2)

16. `figma:figma-generate-library`
17. `figma:figma-use`

## Convergence points

Shared utility skills with the highest fan-in:

- `site-component-map` — pulled in by 5 skills (discovery-components, precapture, build-tier, build-screens, validator)
- `figma:figma-generate-library` — pulled in by 3 skills (component-dependency-map, setup-variables, setup-file-structure)
- `10-validator/compare.js (bundled)` — pulled in by 2 skills (build-component, validator)
- `figma:figma-use` — pulled in by 2 skills (setup-variables, setup-file-structure)

## Context optimization

The orchestrator never reads files larger than ~3KB. Large files are read only by the subagents that need them:

| File                   | Size  | Read by                                                   |
| ---------------------- | ----- | --------------------------------------------------------- |
| `component-map.json`   | ~48KB | discovery-components, build-tier, build-screens subagents |
| `icons.json`           | ~18KB | discovery-assets, icon preamble subagent                  |
| `variables.json`       | ~17KB | Phase 3 build subagents                                   |
| `resolved-colors.json` | ~63KB | Phase 3 build subagents                                   |

The orchestrator reads only summary files (~500B–3KB each).
