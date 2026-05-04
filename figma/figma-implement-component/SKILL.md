---
name: figma-implement-component
description: Implement React components from Figma designs. Use after figma-design-react has analyzed the design, or directly with a Figma URL to run analysis and implementation in one shot. Delegates to create-react-modlet for folder structure, then adds Figma-specific implementation, stories for each variant, and README with design context. Also triggers on phrases like "build this component from Figma", "implement this design", "create a component from this Figma URL", "turn this Figma into code".
argument-hint: "<figma-url>"
user-invocable: true
---

# Skill: Implement Component from Figma Design

This skill implements React components from analyzed Figma designs. It creates complete modlets with stories matching Figma variants for visual verification.

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
6. Verifies tests pass and Storybook renders

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
│ 7. CREATE TESTS - Unit tests for all variants and behaviors    │
├─────────────────────────────────────────────────────────────────┤
│ 8. UPDATE EXPORTS - Add to index.ts                             │
├─────────────────────────────────────────────────────────────────┤
│ 9. VERIFY - Run tests, check types, confirm Storybook renders  │
├─────────────────────────────────────────────────────────────────┤
│ 10. PLAYWRIGHT - Visual test Storybook against Figma design    │
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
- [Step 7: Create Tests](steps/08-tests.md) - Unit tests for variants and behaviors
- [Step 8: Create index.ts](steps/09-exports.md) - Export component and types
- [Step 9: Verify Tests and Storybook](steps/10-verification.md) - Run tests and check visual rendering
- [Step 10: Playwright Visual Testing](steps/11-playwright.md) - Test Storybook against Figma design

### Reference Materials
- [Output Files Summary](reference/output-files.md) - Expected folder structure after completion
- [Quality Checklist](reference/quality-checklist.md) - Verification checklist before marking complete

## How to Use This Skill

1. Start by reading [Step 0: Create Todo List](steps/00-todo-setup.md)
2. Create a todo list using `manage_todo_list` before implementation
3. Follow steps 1-10 in order, marking each as in-progress → completed
4. Use [Quality Checklist](reference/quality-checklist.md) to verify completion
5. Only provide final summary after all todos are marked completed

This prevents common failures like skipping file creation steps or missing verification steps.

## What NOT to Do

These are the most common implementation failures:

- **Don't implement only the default variant.** Every structural variant in Figma needs a corresponding story and visual test. A Checkbox with 5 state columns × 3 row variants must be verified in all states.
- **Don't approximate Tailwind classes.** "It looks like `text-lg`" is wrong if the Figma value is `18px/24px` and `text-lg` resolves to `18px/28px`. Extract exact values from `design-context.md` and match them precisely.
- **Don't skip the Playwright step.** Step 10 is not optional. It is the only way to confirm the rendered component matches the Figma screenshots from Step 1. A component that passes `npm test` but fails visual comparison is not done.
- **Don't reference the spec files by path in your reasoning.** Inline the prop interface and variant mappings from `proposed-api.md` into your working context. If you're reaching back to re-read files mid-implementation, the context wasn't fully loaded in Step 1.
- **Don't add props for CSS pseudo-states.** `hover`, `focus`, `pressed`, `active` Figma variants become Tailwind `hover:`, `focus-visible:`, `active:` classes — not props. The only state that becomes a prop is `disabled`.
- **Don't treat "tests pass" as "done."** Unit tests confirm behavior; Playwright confirms visual fidelity against Figma. Both are required before the quality checklist can be marked complete.

## Related Skills

- **figma-design-react**: Run first to analyze Figma and generate proposed API
- **create-react-modlet**: Defines the modlet folder structure
- **figma-component-sync**: Use later to check implementation against Figma changes

