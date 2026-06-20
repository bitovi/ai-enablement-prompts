# Step 0: Create Todo List

Use `manage_todo_list` to create a checklist before starting implementation.

## For Single Component

```javascript
manage_todo_list({
  operation: 'write',
  todoList: [
    {
      id: 1,
      title: 'Verify and generate design analysis',
      description: 'Use file_search to check for design-context.md and proposed-api.md. If missing, invoke figma-design-react via runSubagent. Do not proceed without these files.',
      status: 'not-started'
    },
    {
      id: 2,
      title: 'Create modlet structure via subagent',
      description: 'Use runSubagent to invoke create-react-modlet skill for folder structure',
      status: 'not-started'
    },
    {
      id: 3,
      title: 'Write README.md with Figma source',
      description: 'Document Figma URL and design-to-code mapping tables',
      status: 'not-started'
    },
    {
      id: 4,
      title: 'Create types.ts with props interface',
      description: 'Define TypeScript interface from proposed-api.md',
      status: 'not-started'
    },
    {
      id: 5,
      title: 'Implement component matching Figma',
      description: 'Build component with exact dimensions, colors, typography from Figma',
      status: 'not-started'
    },
    {
      id: 6,
      title: 'Create stories for all variants',
      description: 'Story for each Figma variant, size, state, and boolean property',
      status: 'not-started'
    },
    {
      id: 7,
      title: 'Create Code Connect mapping',
      description: 'Write {ComponentName}.figma.tsx with figma.connect()',
      status: 'not-started'
    },
    {
      id: 8,
      title: 'Create/update tests',
      description: 'Add tests for all props, variants, and interactions',
      status: 'not-started'
    },
    {
      id: 9,
      title: 'Update index.ts exports',
      description: 'Export component and types',
      status: 'not-started'
    },
    {
      id: 10,
      title: 'Run verification',
      description: 'Run npm test and verify Storybook renders',
      status: 'not-started'
    },
    {
      id: 11,
      title: 'Playwright visual testing',
      description: 'Use Playwright MCP to test Storybook stories against Figma design and verify interactions',
      status: 'not-started'
    }
  ]
})
```

## For Multiple Components (e.g., Button + LinkButton)

```javascript
manage_todo_list({
  operation: 'write',
  todoList: [
    {
      id: 1,
      title: 'Verify and generate design analysis',
      description: 'Use file_search to check for design-context.md and proposed-api.md. If missing, invoke figma-design-react via runSubagent. Do not proceed without these files.',
      status: 'not-started'
    },
    {
      id: 2,
      title: 'Create parent folder and index.ts',
      description: 'Create packages/client/src/components/common/{parent}/ with barrel export',
      status: 'not-started'
    },
    {
      id: 3,
      title: '[Button] Create modlet via subagent',
      description: 'Create Button/ folder structure',
      status: 'not-started'
    },
    {
      id: 4,
      title: '[Button] Write README with Figma source',
      description: 'Document Button-specific Figma mapping',
      status: 'not-started'
    },
    {
      id: 5,
      title: '[Button] Create types and implementation',
      description: 'Implement Button component',
      status: 'not-started'
    },
    {
      id: 6,
      title: '[Button] Create stories',
      description: 'Stories for Button variants',
      status: 'not-started'
    },
    {
      id: 7,
      title: '[Button] Create Code Connect mapping',
      description: 'Write Button.figma.tsx',
      status: 'not-started'
    },
    {
      id: 8,
      title: '[LinkButton] Create modlet via subagent',
      description: 'Create LinkButton/ folder structure',
      status: 'not-started'
    },
    {
      id: 9,
      title: '[LinkButton] Write README with Figma source',
      description: 'Document LinkButton-specific Figma mapping',
      status: 'not-started'
    },
    {
      id: 10,
      title: '[LinkButton] Create types and implementation',
      description: 'Implement LinkButton component',
      status: 'not-started'
    },
    {
      id: 11,
      title: '[LinkButton] Create stories',
      description: 'Stories for LinkButton variants',
      status: 'not-started'
    },
    {
      id: 12,
      title: '[LinkButton] Create Code Connect mapping',
      description: 'Write LinkButton.figma.tsx',
      status: 'not-started'
    },
    {
      id: 13,
      title: 'Run tests for all components',
      description: 'Verify npm test passes',
      status: 'not-started'
    },
    {
      id: 14,
      title: 'Verify all Storybooks',
      description: 'Check Button and LinkButton stories render correctly',
      status: 'not-started'
    }
    {
      id: 15,
      title: 'Playwright visual testing',
      description: 'Use Playwright MCP to test all stories against Figma design and verify interactions',
      status: 'not-started'
    }
  ]
})
```

## Workflow Pattern

Mark each task as `in-progress` before starting it, complete the work, then mark it `completed` immediately. Do not batch completion updates.
