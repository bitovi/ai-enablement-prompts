# Step 2: Create Modlet Structure

Before starting: Mark Step 2 as `in-progress` in todo list.

Invoke the `create-react-modlet` skill to create the modlet folder structure.

## Use runSubagent to Delegate Modlet Creation

```javascript
runSubagent({
  description: "Create modlet for {ComponentName}",
  prompt: `Read the skill file at .github/skills/create-react-modlet/SKILL.md and follow it to create a visual modlet for {ComponentName} at:
  
  packages/client/src/components/common/{ComponentName}/
  
  Create ALL files required for a visual modlet:
  - index.ts (re-exports)
  - {ComponentName}.tsx (stub component)
  - {ComponentName}.test.tsx (basic test)
  - {ComponentName}.stories.tsx (default story)
  - types.ts (props interface placeholder)
  
  Also create these additional files for Figma integration:
  - {ComponentName}.figma.tsx (Code Connect mapping placeholder)
  - README.md (empty, will be filled with Figma context)
  
  Return the list of files created.`
})
```

After completion: Mark Step 2 as `completed` in todo list.

## Expected Location

The modlet should be created at:
```
packages/client/src/components/common/{ComponentName}/
```

## Expected Folder Structure

```
{ComponentName}/
├── index.ts                      # Re-exports
├── {ComponentName}.tsx           # Component implementation
├── {ComponentName}.test.tsx      # Tests
├── {ComponentName}.stories.tsx   # Storybook stories
├── {ComponentName}.figma.tsx     # Code Connect mapping
├── types.ts                      # TypeScript interfaces
└── README.md                     # Figma source & mapping docs
```
