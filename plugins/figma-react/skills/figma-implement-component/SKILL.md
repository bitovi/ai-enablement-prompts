---
name: figma-implement-component
description: Implement React components from Figma designs. Use after figma-design-react has analyzed the design. Delegates to create-react-modlet for folder structure, then adds Figma-specific implementation, stories for each variant, Code Connect mapping, and README with design context.
---

# Skill: Implement Component from Figma Design

This skill implements React components from analyzed Figma designs. It creates complete modlets with stories matching Figma variants and establishes the foundation for Code Connect and future design syncing.

## When to Use

- After `figma-design-react` skill has analyzed a Figma design
- User wants to build a component from a Figma URL
- Creating a new component that should stay in sync with Figma

## What This Skill Does

1. Verifies design analysis exists (or triggers it)
2. Creates component modlet following project standards
3. Writes README with Figma source and mapping context
4. Implements the component matching Figma design precisely
5. Creates Storybook stories for each Figma variant/state
6. Creates Code Connect mapping for Figma integration
7. Verifies tests pass and Storybook renders

## Prerequisites

- Figma design URL (required if design analysis doesn't exist)
- OR existing design analysis files:
  - Design context file at `.temp/design-components/{component-name}/design-context.md`
  - Proposed API file at `.temp/design-components/{component-name}/proposed-api.md`

If design analysis files don't exist, this skill will automatically invoke `figma-design-react` to generate them.

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ 0. CREATE TODO LIST - Track all steps systematically           │
├─────────────────────────────────────────────────────────────────┤
│ 1. VERIFY AND GENERATE - Check for design analysis files       │
│    → If missing: Invoke figma-design-react skill                │
│    → Creates .temp/design-components/{name}/design-context.md   │
│    → Creates .temp/design-components/{name}/proposed-api.md     │
├─────────────────────────────────────────────────────────────────┤
│ 2. CREATE MODLET - Build folder structure using modlet pattern │
├─────────────────────────────────────────────────────────────────┤
│ 3. WRITE README - Document Figma source and mapping rationale  │
├─────────────────────────────────────────────────────────────────┤
│ 4. CREATE TYPES - Define TypeScript props interface            │
├─────────────────────────────────────────────────────────────────┤
│ 5. IMPLEMENT - Build component matching Figma precisely        │
├─────────────────────────────────────────────────────────────────┤
│ 6. CREATE STORIES - Story for each Figma variant/state         │
├─────────────────────────────────────────────────────────────────┤
│ 7. CODE CONNECT - Create .figma.tsx mapping file               │
├─────────────────────────────────────────────────────────────────┤
│ 8. CREATE TESTS - Unit tests for all variants and behaviors    │
├─────────────────────────────────────────────────────────────────┤
│ 9. UPDATE EXPORTS - Add to index.ts                             │
├─────────────────────────────────────────────────────────────────┤
│ 10. VERIFY - Run tests, check types, confirm Storybook renders │
├─────────────────────────────────────────────────────────────────┤
│ 11. PLAYWRIGHT - Visual test Storybook against Figma design    │
└─────────────────────────────────────────────────────────────────┘
```

## Table of Contents

### Implementation Steps
Each step contains detailed instructions and templates:

- [Step 0: Create Todo List](steps/00-todo-setup.md) - Set up systematic tracking with `manage_todo_list`
- [Step 1: Verify and Generate Design Analysis](steps/01-design-analysis.md) - Check for or create design files
- [Step 2: Create Modlet Structure](steps/02-modlet-structure.md) - Build component folder via `create-react-modlet` skill
- [Step 3: Write README with Design Context](steps/03-readme.md) - Document Figma source and mappings
- [Step 4: Create Types](steps/04-types.md) - Define TypeScript props interface
- [Step 5: Implement Component](steps/05-implementation.md) - Build component matching Figma exactly
- [Step 6: Create Stories for Each Variant](steps/06-stories.md) - Storybook stories for all Figma variants
- [Step 7: Create Code Connect Mapping](steps/07-code-connect.md) - Link component to Figma
- [Step 8: Create Tests](steps/08-tests.md) - Unit tests for variants and behaviors
- [Step 9: Create index.ts](steps/09-exports.md) - Export component and types
- [Step 10: Verify Tests and Storybook](steps/10-verification.md) - Run tests and check visual rendering
- [Step 11: Playwright Visual Testing](steps/11-playwright.md) - Test Storybook against Figma design

### Reference Materials
- [Output Files Summary](reference/output-files.md) - Expected folder structure after completion
- [Quality Checklist](reference/quality-checklist.md) - Verification checklist before marking complete

## How to Use This Skill

1. Start by reading [Step 0: Create Todo List](steps/00-todo-setup.md)
2. Create a todo list using `manage_todo_list` before implementation
3. Follow steps 1-11 in order, marking each as in-progress → completed
4. Use [Quality Checklist](reference/quality-checklist.md) to verify completion
5. Only provide final summary after all todos are marked completed

This prevents common failures like skipping file creation steps, forgetting Code Connect mapping, or missing verification steps.

## Related Skills

- **figma-design-react**: Run first to analyze Figma and generate proposed API
- **create-react-modlet**: Defines the modlet folder structure
- **figma-connect-component**: Detailed Code Connect mapping guidance
- **figma-component-sync**: Use later to check implementation against Figma changes

