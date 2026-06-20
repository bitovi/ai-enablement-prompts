---
name: extract-ui-component
description: Extract reusable UI components from inline patterns. Covers component design, TypeScript props, Storybook stories, refactoring strategy, and best practices for creating shared UI primitives.
---

# Skill: Extract UI Component

Extract reusable React components from inline patterns found in the codebase.

## When to Use

- You notice a UI pattern repeated 2+ times across different files
- A component has grown too large and contains extractable sub-patterns
- The component registry flags patterns as "needs extraction"

## When NOT to Use

- The pattern appears only once (no reuse benefit)
- The pattern is already a component in the registry

## 8-Step Workflow

### Step 1: Analyze Existing Patterns

Before extracting, find 3-5 instances of the pattern in the codebase:

```bash
# Search for common button patterns
grep -rn "className.*btn\|className.*button" src/ --include="*.tsx" | head -20

# Search for card-like patterns
grep -rn "className.*card\|className.*rounded.*shadow" src/ --include="*.tsx" | head -20
```

Document:
- Where each instance appears (file + line)
- What props/data each instance uses
- How instances differ from each other
- Common vs unique aspects

### Step 2: Design Component API

Based on the pattern analysis:

1. **Identify the common interface** — what props are shared across all instances
2. **Identify variants** — how instances differ (use discriminated unions for structural differences)
3. **Design the props interface** — extend `React.HTMLAttributes<HTMLElement>` for native HTML compatibility

```typescript
// Good: discriminated union for structural variants
type CardProps = 
  | { variant: 'simple'; title: string; children: React.ReactNode }
  | { variant: 'media'; title: string; image: string; children: React.ReactNode };

// Good: extend HTML attributes
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
```

### Step 3: Implement Component

Create the component following the modlet pattern:

```
ComponentName/
├── index.ts
├── ComponentName.tsx
├── ComponentName.test.tsx
├── ComponentName.stories.tsx
└── types.ts (optional)
```

Guidelines:
- Accept `className` prop and merge with internal classes using `cn()`
- Use semantic HTML elements
- Include ARIA attributes for accessibility
- Handle all variants from Step 2

### Step 4: Create Storybook Story

Create stories covering:
- Default state
- Each variant
- Each size (if applicable)
- Interactive states (hover, focus, disabled)
- With and without optional props

### Step 5: Test in Storybook

Visually verify each story renders correctly.

### Step 6: Create Barrel Export

Add re-exports in `index.ts`:

```typescript
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './types';
```

### Step 7: Refactor Existing Code

Replace inline patterns one file at a time:

1. Import the new component
2. Replace the inline pattern with the component
3. Verify the page still works
4. Commit after each file

**Do not refactor all files at once.** One file at a time reduces risk.

### Step 8: Update Component Registry

Add the new component to the component registry (if one exists).

## Accessibility Guidelines

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, not `<div>` with click handlers)
- Include `aria-label` for icon-only buttons
- Ensure keyboard navigation works (tab, enter, escape)
- Use `role` attributes when semantic HTML isn't sufficient
- Test with screen reader in Storybook

## Common Pitfalls

- ❌ Don't create overly generic components (a component that does everything does nothing well)
- ❌ Don't forget to handle the `className` prop for customization
- ❌ Don't skip the pattern analysis step — extracting from one instance leads to a bad API
- ❌ Don't refactor all files at once
- ✅ Do analyze 3-5 instances before designing the API
- ✅ Do use discriminated unions for structural variants
- ✅ Do extend HTML attributes for native compatibility
- ✅ Do refactor one file at a time

## Checklist

- [ ] 3-5 existing pattern instances analyzed
- [ ] Props interface designed with variants
- [ ] Component implemented with modlet structure
- [ ] Storybook stories cover all variants
- [ ] Stories visually verified
- [ ] Barrel export created
- [ ] Existing code refactored (one file at a time)
- [ ] Component registry updated
- [ ] Accessibility verified
