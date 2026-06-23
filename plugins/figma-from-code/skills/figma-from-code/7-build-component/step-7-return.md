# Step 7: Return Result

Write the final result file and return a structured result to the caller.

**Result file schema:** see the canonical definition in `SKILL.md` § "Result File Schema". Write every field defined there. Key points for this step:

- `status` — set based on the outcome: `success`, `partial_match`, `no_app_reference`, `needs_authorization`, `rejected`, or `failed`
- `matchPct` — copy from `comparison.matchPct`; set to `null` when comparison was skipped (`no_app_reference`, `needs_authorization`, `rejected`, `failed`)
- `figmaScreenshot` and `screenshotNodeId` — use the values from the build phase (Step 3), or from the last fix-loop screenshot capture if it was updated during the fix loop
- `error` — required when `status` is `failed`; omit otherwise
- `trackingFile` — set `{ "written": true }` after Step 6 (track) has completed successfully

Write the result to `.temp/figma-from-code/build-results/{componentName}.json` before returning.
