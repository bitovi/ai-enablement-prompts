# Step 3: Screenshot the Figma Result

After building, capture the Figma component for comparison.

## Skip guard — existing screenshot

Before capturing, check whether `{screenshotDir}/figma.png` already exists on disk:

```bash
test -f "{screenshotDir}/figma.png"
```

If the file **exists**: skip steps 3a and 3b entirely. Use the existing path as the Figma screenshot and proceed directly to step 4.

If the file **does not exist**: proceed with steps 3a and 3b below.

> **Fix loop exception**: Step 5 (fix loop) must always take a fresh screenshot after each fix to measure improvement — this skip guard applies only to the initial step-3 capture.

## 3a. Determine what to screenshot

- **Single component**: screenshot the component node directly
- **Component set**: resolve the specific variant that matches the app screenshot

```javascript
// use_figma — resolve variant for screenshot
const node = figma.getNodeById('{componentOrSetId}');
if (node.type === 'COMPONENT_SET') {
  const targetProps = { Variant: 'primary', State: 'Default' }; // from figmaVariant input
  let match = node.children.find((child) =>
    Object.entries(targetProps).every(
      ([k, v]) => child.variantProperties?.[k]?.toLowerCase() === v.toLowerCase()
    )
  );
  match = match ?? node.children[0];
  return JSON.stringify({ screenshotNodeId: match.id, variantName: match.name });
} else {
  return JSON.stringify({ screenshotNodeId: node.id, variantName: node.name });
}
```

## 3b. Capture the screenshot

```
get_screenshot(fileKey, screenshotNodeId)
```

Save the result to `{screenshotDir}/figma.png`:

```bash
curl -sL "{image_url}" -o "{screenshotDir}/figma.png"
```
