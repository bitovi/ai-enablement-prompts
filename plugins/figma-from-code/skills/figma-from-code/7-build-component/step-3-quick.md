# Step 3 Quick: Screenshot the Figma Result

## Skip Guard

If `{screenshotDir}/figma.png` already exists → skip, use existing path. (Does NOT apply during fix loop.)

## Capture

1. **Resolve screenshot target:**
   - Single component → screenshot the node directly
   - Component set → resolve to the default variant child node

```javascript
// use_figma — resolve variant for component sets
const node = figma.getNodeById('{nodeId}');
if (node.type === 'COMPONENT_SET') {
  const targetProps = { Variant: 'primary', State: 'Default' }; // from figmaVariant
  let match = node.children.find(child =>
    Object.entries(targetProps).every(([k, v]) =>
      child.variantProperties?.[k]?.toLowerCase() === v.toLowerCase()
    )
  );
  match = match ?? node.children[0];
  return JSON.stringify({ screenshotNodeId: match.id });
} else {
  return JSON.stringify({ screenshotNodeId: node.id });
}
```

2. **Capture:** `get_screenshot(fileKey, screenshotNodeId)`

3. **Save:** Download to `{screenshotDir}/figma.png`
