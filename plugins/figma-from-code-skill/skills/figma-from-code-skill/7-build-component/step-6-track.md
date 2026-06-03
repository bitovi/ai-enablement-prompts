# Step 6: Finalize Tracking Files

By the time Step 6 runs, both `.figma/*.json` tracking files have already been written by earlier steps:

- **`.figma/code.json`** — written incrementally by **Step 1** (sub-steps 0 through 1g). Source-derived. Contains `childComponents` (the contract enforced by Step 4a) and the full Step 1 analysis snapshot (layout, variants, icons, text, computed styles, git commit). Always overwritten fresh on each build.
- **`.figma/figma.json`** — written by **Step 2f** at the end of build, and re-written by **Step 5c** after each fix iteration. Built-derived: `dependencies` is enumerated live from the Figma node tree via `findAll(n => n.type === 'INSTANCE')`, not from Step 1's source analysis. Preserves `createdAt` across runs; refreshes `updatedAt` on every write.

Step 6 is a small finalizer — not a writer:

1. **Verify both files exist** at `<sourceDir>/.figma/`. If either is missing, the earlier step that owns it (Step 1 for `code.json`, 2f for `figma.json`) is broken; surface this in the Step 7 result with `trackingFile: { written: false, missing: "code.json" }` and let the orchestrator/user investigate.
2. **Refresh `updatedAt`** on `figma.json` to the current ISO 8601 UTC timestamp if the last writer didn't already. Preserve `createdAt`. Do not modify any other fields — `dependencies` and `nodeId` are authoritative from Step 2f/5c.
3. **Sanity-check structural invariants** before returning success:
   - `code.json.componentName === figma.json.componentName === <componentName>`
   - `figma.json.fileKey` matches the build's `fileKey`
   - `figma.json.nodeId` matches the built node (the node Step 7 will report)
   - `figma.json.dependencies` is a (possibly empty) array

If any invariant fails, return the discrepancy in the result file. Do not try to silently repair — the violation likely indicates a bug in Step 1 or 2f that needs surfacing.

## Folder resolution (shared by Step 1 and 2f)

Both writers use the same path rules; they are documented here for reference.

- `Button` → `<source-dir>/components/Button/.figma/`
- Nested modlet (e.g. `CustomerInformation` under `CustomerDetails/components/...`) → `<source-dir>/components/CustomerDetails/components/CustomerInformation/.figma/`
- `Icon/{Name}` → `<source-dir>/components/Icon/{Name}/.figma/` (synthesized — Lucide icons have no local source file)
- `Asset/{Name}` → `<source-dir>/components/Asset/{Name}/.figma/` (synthesized)

If a legacy `<sourceDir>/figma.json` (root-level, pre-`.figma/` layout) exists, Step 2f should read it to recover `createdAt`, then ignore it on subsequent runs. Do not delete it from Step 6.
