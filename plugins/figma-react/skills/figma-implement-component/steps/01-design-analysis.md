# Step 1: Verify and Generate Design Analysis

You must create or verify these files exist before proceeding to Step 2:

```
.temp/design-components/{component-name}/
├── design-context.md    # Raw Figma data
└── proposed-api.md      # Suggested component API
```

Calling `mcp_figma_get_design_context` directly is not a substitute for this step. That tool provides raw data but does not create the design analysis files required for implementation.

## Step 1a: Check if Design Analysis Files Exist

Use `file_search` to look for both files:
- `.temp/design-components/*/design-context.md`
- `.temp/design-components/*/proposed-api.md`

## If Either File is Missing

Stop and invoke figma-design-react:

1. Request Figma URL from user if not provided
2. Invoke figma-design-react skill using `runSubagent`:
   ```javascript
   runSubagent({
     description: "Run figma-design-react for {component-name}",
     prompt: `Read the skill file at .github/skills/figma-design-react/SKILL.md and follow it to analyze the Figma design at:
     
     {figma-url}
     
     Create design-context.md and proposed-api.md in .temp/design-components/{component-name}/.
     
     Return the full paths of the created files when complete.`
   })
   ```
3. Wait for subagent to complete - do not proceed until files are confirmed created
4. Use `file_search` again to verify both files now exist
5. If files still don't exist, STOP and report error to user

## After Both Files Exist

1. Read `design-context.md` to get Figma data and URL
2. Read `proposed-api.md` to understand props and variants
3. Check if multiple components are recommended (see Step 1b)
4. Mark Step 1 as completed in todo list

# Step 1b: Handle Multiple Component Recommendations

The `proposed-api.md` may recommend splitting a Figma component into multiple React components (e.g., `Button` and `LinkButton`). This is common when:
- A Figma component has fundamentally different visual patterns
- Different variants serve distinct UX purposes
- Combining would create invalid prop combinations

## If Multiple Components Are Recommended

1. Mark Step 1b as in-progress in todo list

2. Create a parent folder for the component group:
   ```
   packages/client/src/components/common/{parent-name}/
   ├── {ComponentA}/     # First component modlet
   ├── {ComponentB}/     # Second component modlet
   └── index.ts          # Re-exports all components
   ```

3. Update the todo list to iterate through each component (see Step 0 for multi-component template)

4. Create parent index.ts that re-exports all components:
   ```typescript
   // packages/client/src/components/common/button/index.ts
   export { Button } from './Button';
   export type { ButtonProps } from './Button';
   export { LinkButton } from './LinkButton';
   export type { LinkButtonProps } from './LinkButton';
   ```

5. Implement each component following Steps 3-9 for each one

6. Mark Step 1b as completed in todo list

## Example Folder Structure for Button + LinkButton

```
packages/client/src/components/common/button/
├── index.ts                      # Re-exports Button and LinkButton
├── Button/
│   ├── index.ts
│   ├── Button.tsx
│   ├── Button.test.tsx
│   ├── Button.stories.tsx
│   ├── Button.figma.tsx
│   ├── types.ts
│   └── README.md
└── LinkButton/
    ├── index.ts
    ├── LinkButton.tsx
    ├── LinkButton.test.tsx
    ├── LinkButton.stories.tsx
    ├── LinkButton.figma.tsx
    ├── types.ts
    └── README.md
```

If single component: Continue to Step 2 as normal.
