# Shared Figma build utilities — loaded by step-2-build, step-5-fix-loop, and 8-build-screens

---

## fixSizing() — canonical definition

> **Reconciliation note:** Two divergent copies existed before this file was created. `step-2-build.md` had `fixSizing(node, depth = 0)` with no `exemptRoot` parameter. `8-build-screens/SKILL.md` had `fixSizing(node, { exemptRoot = false } = {}, depth = 0)` with the exemptRoot guard and forwarded the option through the recursive call. The canonical version below is the screen-pipeline variant (the `exemptRoot` superset). The component pipeline calls it with `exemptRoot` omitted (defaults to `false`), which is behaviourally identical to the old two-parameter form — the body is unchanged for that path.

```javascript
function fixSizing(node, { exemptRoot = false } = {}, depth = 0) {
  if (depth > 10 || !node) return;
  const hasLayout =
    (node.type === 'COMPONENT' || node.type === 'FRAME' || node.type === 'COMPONENT_SET') &&
    node.layoutMode &&
    node.layoutMode !== 'NONE';
  if (hasLayout && !(exemptRoot && depth === 0)) {
    if (node.layoutMode === 'VERTICAL') node.primaryAxisSizingMode = 'AUTO';
    node.counterAxisSizingMode = 'AUTO';
  }
  const children = 'children' in node ? node.children : [];
  for (const child of children) fixSizing(child, { exemptRoot }, depth + 1);
}
```

### Usage

**Component pipeline** (step-2-build, step-5-fix-loop) — call without `exemptRoot`:

```javascript
fixSizing(comp);           // on a single component
fixSizing(v);              // on each variant before appending
for (const v of set.children) fixSizing(v);
fixSizing(set);            // on the component set itself
```

**Screen pipeline** (8-build-screens) — exempt the root frame so it stays at `FIXED` `screenBodySize` (default 1440×900) while descendants are released:

```javascript
fixSizing(screen, { exemptRoot: true });
```

---

## Tailwind-to-Figma mapping table

| Tailwind            | Figma Property                                           | Value                          |
| ------------------- | -------------------------------------------------------- | ------------------------------ |
| `flex-col`          | `layoutMode`                                             | `'VERTICAL'`                   |
| `flex` / `flex-row` | `layoutMode`                                             | `'HORIZONTAL'`                 |
| `items-center`      | `counterAxisAlignItems`                                  | `'CENTER'`                     |
| `justify-between`   | `primaryAxisAlignItems`                                  | `'SPACE_BETWEEN'`              |
| `justify-center`    | `primaryAxisAlignItems`                                  | `'CENTER'`                     |
| `gap-{n}`           | `itemSpacing`                                            | `n * 4` (px)                   |
| `p-{n}`             | all paddings                                             | `n * 4`                        |
| `px-{n}`            | `paddingLeft/Right`                                      | `n * 4`                        |
| `py-{n}`            | `paddingTop/Bottom`                                      | `n * 4`                        |
| `rounded-md`        | `cornerRadius`                                           | `6`                            |
| `rounded-lg`        | `cornerRadius`                                           | `8`                            |
| `rounded-xl`        | `cornerRadius`                                           | `12`                           |
| `rounded-full`      | `cornerRadius`                                           | `9999`                         |
| `border`            | `strokeWeight`                                           | `1`, `strokeAlign: 'OUTSIDE'`  |
| `text-sm`           | `fontSize`                                               | `14`, lineHeight `20`          |
| `text-base`         | `fontSize`                                               | `16`, lineHeight `24`          |
| `text-lg`           | `fontSize`                                               | `18`, lineHeight `28`          |
| `text-xl`           | `fontSize`                                               | `20`, lineHeight `28`          |
| `text-2xl`          | `fontSize`                                               | `24`, lineHeight `32`          |
| `font-medium`       | fontName style                                           | `'Medium'`                     |
| `font-semibold`     | fontName style                                           | `'Semi Bold'`                  |
| `font-bold`         | fontName style                                           | `'Bold'`                       |
| `w-full` / `flex-1` | `layoutSizingHorizontal`                                 | `'FILL'`                       |
| `h-full`            | `layoutSizingVertical`                                   | `'FILL'`                       |
| `w-[Npx]`           | `resize(N, ...)` then `layoutSizingHorizontal = 'FIXED'` | explicit width                 |
| `truncate`          | `textTruncation`                                         | `'ENDING'`, `maxLines: 1`      |
| `overflow-hidden`   | `clipsContent`                                           | `true`                         |
| `shadow-sm`         | `effects`                                                | `[{type: 'DROP_SHADOW', ...}]` |
| `opacity-{n}`       | `opacity`                                                | `n / 100`                      |
