# Component Build Skills — Index

This folder contains two sub-skills that together execute the full per-component build-and-review pipeline for `figma-from-code` Phase 3.

| Sub-skill      | Folder                                                                 | Steps | What it does                                                                                    |
| -------------- | ---------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| **Build**      | [`7a/SKILL.md`](7a/SKILL.md)                                           | 1–3   | Analyze source, create Figma node, capture initial screenshot, write `-built.json` handoff      |
| **Review/Fix** | [`7b-review-fix-component/SKILL.md`](7b-review-fix-component/SKILL.md) | 4–7   | Instance check, sizing check, pixel diff, fix loop (up to 3 iterations), tracking, final result |

## Step Files (shared library)

All step instruction files live directly in this folder and are referenced by both sub-skills:

| File                                         | Step     | Phase    |
| -------------------------------------------- | -------- | -------- |
| [step-1-analyze.md](step-1-analyze.md)       | 1        | Analyze  |
| [step-2-build.md](step-2-build.md)           | 2        | Build    |
| [step-3-screenshot.md](step-3-screenshot.md) | 3        | Build    |
| [step-4-compare.md](step-4-compare.md)       | 4a/4b/4c | Compare  |
| [step-5-fix-loop.md](step-5-fix-loop.md)     | 5        | Fix      |
| [step-6-track.md](step-6-track.md)           | 6        | Finalize |
| [step-7-return.md](step-7-return.md)         | 7        | Finalize |

Scripts: [`check-instances.js`](check-instances.js), [`check-prereqs.js`](check-prereqs.js)
Prompt templates: [`prompts/`](prompts/)

## Usage

The tier agent (`6-build-tier`) calls each sub-skill inline in sequence per component:

1. Read and follow `7a/SKILL.md` → produces `.temp/figma-from-code/build-results/{Name}-built.json`
2. If handoff `status` is `built`: read and follow `7b-review-fix-component/SKILL.md` → produces final `.temp/figma-from-code/build-results/{Name}.json`
3. If handoff `status` is not `built` (`needs_authorization`, `rejected`, `failed`): propagate to final result, skip step 2
