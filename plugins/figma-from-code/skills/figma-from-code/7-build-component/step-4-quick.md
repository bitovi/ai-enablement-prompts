# Step 4 Quick: Compare Against App Screenshot

> Run 4a → 4b → 4c in order. Do NOT attempt fixes here — Step 5 handles fixes.

## 4a. Instance Usage Check (hard gate — run FIRST)

```bash
node {skillRoot}/scripts/check-instances.js <componentName> <sourceDir>
```

- Exit 0 → pass, continue to 4b
- Exit 1 → **STOP**, jump to Step 5 with `missing_instances` discrepancy. Do NOT run 4b/4c.

**What it checks:** every child in `code.json.childComponents` must appear as an INSTANCE in `figma.json.dependencies`. Plain text substitutions for design-system components are always wrong.

## 4b. Sizing Sanity Check

Inspect the built component's dimensions and sizing modes. Compare against `code.json.layout`:

| Intent | Expected | Flag if |
|--------|----------|---------|
| `fill` | FIXED at consumer width, or child is FILL | `AUTO` and much smaller than expected |
| `fixed:NNN` | Dimension = NNN ± 2px | Difference > 2px |
| `hug` | `*SizingMode = 'AUTO'` | Forced FIXED without reason |

If sizing check fails → feed `size_mismatch` into Step 5 alongside pixel diff.

## 4c. Pixel Diff Comparison

```bash
node {skillRoot}/scripts/compare.js \
  "{screenshotDir}/app.png" \
  "{screenshotDir}/figma.png" \
  "{screenshotDir}/"
```

**Thresholds:**
- `matchPct ≥ 90%` → `match` (pass)
- `75% ≤ matchPct < 90%` → `minor_diff` (enter fix loop)
- `matchPct < 75%` → `mismatch` (enter fix loop)
- `borderMatchPct ≥ 85%` → `border_ok`

**Outputs:** `comparison.json`, `diff.png` (red = pixel differences)

**No app.png?** Skip comparison entirely → `verdict: "no_app_reference"`, proceed to Step 5R (rebind sweep only).

## Screenshot Scale Convention

Both app and Figma screenshots must be at 1x scale. App screenshots use `deviceScaleFactor: 1`. Figma screenshots use `scale: 1` in `get_screenshot`.
