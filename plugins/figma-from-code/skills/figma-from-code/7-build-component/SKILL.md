# Component Build Skills — Index

This folder contains two sub-skills that together execute the full per-component build-and-review pipeline for `figma-from-code` Phase 3.

| Sub-skill      | Folder                                                                 | Steps | What it does                                                                                    |
| -------------- | ---------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| **Build**      | [`7a/SKILL.md`](7a/SKILL.md)                                           | 1–3   | Analyze source, create Figma node, capture initial screenshot, write `-built.json` handoff      |
| **Review/Fix** | [`7b-review-fix-component/SKILL.md`](7b-review-fix-component/SKILL.md) | 4–7   | Instance check, sizing check, pixel diff, fix loop (up to 3 iterations), tracking, final result |

## Step Files (shared library)

All step instruction files live directly in this folder. Each step has a **quick reference** (condensed, ~100 lines) and a **full reference** (exhaustive, ~600 lines). Sub-skills default to the quick versions and only escalate to full references when dealing with complex components or failed builds.

### Quick references (default — use these first):

| File                                         | Steps    | Lines | Covers                                           |
| -------------------------------------------- | -------- | ----- | ------------------------------------------------ |
| [step-1-quick.md](step-1-quick.md)           | 1        | ~90   | Analysis sequence, sizing rules, output schema   |
| [step-2-quick.md](step-2-quick.md)           | 2        | ~110  | Build pattern, fixSizing, variable binding, 2f   |
| [step-3-quick.md](step-3-quick.md)           | 3        | ~35   | Screenshot capture (all cases)                   |
| [step-4-quick.md](step-4-quick.md)           | 4a/4b/4c | ~60   | Instance gate, sizing check, pixel diff          |
| [step-5-quick.md](step-5-quick.md)           | 5/6/7    | ~95   | Fix loop, rebind sweep, track, return            |

### Full references (escalate when needed):

| File                                         | Step     | When to escalate                                          |
| -------------------------------------------- | -------- | --------------------------------------------------------- |
| [step-1-analyze.md](step-1-analyze.md)       | 1        | Responsive variants, prop-state overlays, promotion rules |
| [step-2-build.md](step-2-build.md)           | 2        | Responsive builds, full Tailwind table, color chain       |
| [step-3-screenshot.md](step-3-screenshot.md) | 3        | Rarely needed                                             |
| [step-4-compare.md](step-4-compare.md)       | 4a/4b/4c | Detailed rejection handling, sizing edge cases            |
| [step-5-fix-loop.md](step-5-fix-loop.md)     | 5        | Full discrepancy table, rebind sweep internals            |
| [step-6-track.md](step-6-track.md)           | 6        | Folder resolution rules, legacy file migration            |
| [step-7-return.md](step-7-return.md)         | 7        | Canonical result schema details                           |

Scripts: [`check-instances.js`](../scripts/check-instances.js), [`check-prereqs.js`](../scripts/check-prereqs.js)

## Usage

The tier agent (`6-build-tier`) calls each sub-skill inline in sequence per component:

1. Read and follow `7a/SKILL.md` → produces `.temp/figma-from-code/build-results/{Name}-built.json`
2. If handoff `status` is `built`: read and follow `7b-review-fix-component/SKILL.md` → produces final `.temp/figma-from-code/build-results/{Name}.json`
3. If handoff `status` is not `built` (`needs_authorization`, `rejected`, `failed`): propagate to final result, skip step 2
