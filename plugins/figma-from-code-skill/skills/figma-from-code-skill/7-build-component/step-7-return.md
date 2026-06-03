# Step 7: Return Result

Return a structured result for the caller:

```json
{
  "componentName": "Button",
  "nodeId": "123:45",
  "type": "COMPONENT_SET",
  "variants": [
    { "name": "Variant=primary, Size=regular", "nodeId": "123:46" },
    { "name": "Variant=secondary, Size=regular", "nodeId": "123:47" }
  ],
  "comparison": {
    "matchPct": 94.2,
    "borderMatchPct": 91.0,
    "verdict": "match",
    "iterations": 1,
    "fixes": ["border-radius 4px -> 8px"]
  },
  "screenshotNodeId": "123:46",
  "figmaScreenshot": ".temp/figma-from-code/screenshots/Button/figma.png"
}
```

If no app screenshot was available:

```json
{
  "componentName": "Skeleton",
  "nodeId": "200:10",
  "type": "COMPONENT",
  "comparison": {
    "verdict": "no_app_reference",
    "matchPct": null,
    "iterations": 0
  }
}
```
