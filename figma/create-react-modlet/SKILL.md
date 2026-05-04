---
name: create-react-modlet
description: Create React components, hooks, or utilities following the modlet pattern. Use when creating any component in packages/client/src/components/. Modlets are self-contained folders with index.ts, implementation, tests, stories (for visual), and optional types.
---

# Skill: Creating React Modlets

This skill teaches how to create React components, hooks, and utilities following the **modlet pattern** in this project.

## What Is a Modlet?

A modlet is a self-contained folder that houses everything related to a specific module. Each modlet includes its implementation, tests, stories (for visual components), and types—all in one place.

## When to Use This Skill

Use this skill when:
- Creating any new React component
- Creating a custom hook
- Creating a utility/helper function
- Breaking down a complex component into sub-components

## Modlet Locations

Components are organized in `packages/client/src/components/`:

```
packages/client/src/components/
├── ui/              # Shadcn UI components (DO NOT modify manually)
├── common/          # Shared reusable components
├── inline-edit/     # Inline editing components (grouping folder)
├── Header/          # Feature component
├── CaseList/        # Feature component
├── CaseDetails/     # Feature component
└── MenuList/        # Feature component
```

## Naming Conventions

- **PascalCase** for component folders: `EditableTitle/`, `Header/`, `Button/`
- **kebab-case** for grouping folders: `inline-edit/`, `common/`
- **lowercase** for standard folders: `components/`, `hooks/`, `helpers/`

## Modlet Types

### Visual Modlet (React Component)

```
ComponentName/
├── index.ts                    # Re-export entry point (required)
├── ComponentName.tsx           # Component implementation (required)
├── ComponentName.test.tsx      # Tests (required)
├── ComponentName.stories.tsx   # Storybook story (required)
└── types.ts                    # Custom types (optional)
```

### Non-Visual Modlet (Hook/Utility)

```
useMyHook/
├── index.ts                    # Re-export entry point (required)
├── useMyHook.ts                # Implementation (required)
├── useMyHook.test.ts           # Tests (required)
└── types.ts                    # Custom types (optional)
```

## Core Rules

1. **Folder naming**: Name the modlet folder after its main export (e.g., `/Button` exports `Button`)
2. **index.ts only re-exports**: Never define logic in `index.ts`, only re-export from within the modlet
3. **Tests are mandatory**: Every modlet must have tests in `<modlet-name>.test.tsx`
4. **Stories for visual modlets**: All visual components must have Storybook stories
5. **Sub-organization**: Additional components go in `/components` subfolder, hooks in `/hooks`, helpers in `/helpers` - each as its own modlet

## Creation Process

### Step 1: Plan with Todos

Use `manage_todo_list` to track progress:

```
1. Create modlet folder
2. Add index.ts with re-exports
3. Add main component/hook file
4. Add test file
5. (Visual) Add story file
6. (If needed) Add types.ts
7. Verify tests pass
8. Verify TypeScript compiles
9. (Visual) Verify story renders
```

### Step 2: Create Files

#### index.ts (Required)

```typescript
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './types';
```

#### ComponentName.tsx (Required)

```tsx
import { cn } from '@/lib/utils';
import type { ComponentNameProps } from './types';

export function ComponentName({ className, ...props }: ComponentNameProps) {
  return (
    <div className={cn('component-styles', className)}>
      {/* Implementation */}
    </div>
  );
}
```

#### ComponentName.test.tsx (Required)

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('expected text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<ComponentName onClick={handleClick} />);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

#### ComponentName.stories.tsx (Required for Visual)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  component: ComponentName,
  title: 'Common/ComponentName',  // Use: Common/, InlineEdit/, Feature name, etc.
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

export const Default: Story = {
  args: {
    // Default props
  },
};

export const Variant: Story = {
  args: {
    // Variant props
  },
};
```

#### types.ts (Optional)

```typescript
export interface ComponentNameProps {
  /** Additional CSS classes */
  className?: string;
  // Other props
}

export type ComponentNameVariant = 'primary' | 'secondary';
```

### Step 3: Verify

Run these commands from the project root:

```bash
# Run tests
npm run test

# Type check
npm run typecheck

# Start Storybook (for visual verification)
npm run storybook
```

## Project-Specific Patterns

### Import Aliases

Use the `@/` alias for imports:

```tsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SomeComponent } from '@/components/common/SomeComponent';
```

### Shadcn UI Components

Reuse components from `@/components/ui/`:

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
```

### Tailwind CSS

Use Tailwind classes for styling. Use `cn()` for conditional classes:

```tsx
import { cn } from '@/lib/utils';

<div className={cn('base-classes', isActive && 'active-classes', className)} />
```

### Story Decorators

When components need context providers:

```tsx
import { BrowserRouter } from 'react-router-dom';

const meta: Meta<typeof ComponentName> = {
  component: ComponentName,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
};
```

## Sub-Modlet Organization

For complex components with internal sub-components:

```
ComplexComponent/
├── index.ts
├── ComplexComponent.tsx
├── ComplexComponent.test.tsx
├── ComplexComponent.stories.tsx
├── types.ts
├── components/
│   ├── SubComponentA/
│   │   ├── index.ts
│   │   ├── SubComponentA.tsx
│   │   └── SubComponentA.test.tsx
│   └── SubComponentB/
│       ├── index.ts
│       ├── SubComponentB.tsx
│       └── SubComponentB.test.tsx
└── hooks/
    └── useComponentLogic/
        ├── index.ts
        ├── useComponentLogic.ts
        └── useComponentLogic.test.ts
```

## Quality Checklist

Before completing any modlet:

- [ ] Folder name matches main export
- [ ] `index.ts` exists and only contains re-exports
- [ ] Main module file exists
- [ ] Test file exists and passes (`npm run test`)
- [ ] (Visual only) Story file exists
- [ ] Types file exists if custom types are defined
- [ ] Sub-folders follow modlet structure
- [ ] `npm run typecheck` passes
- [ ] Modlet can be imported from its `index.ts`

## Common Mistakes to Avoid

- ❌ Missing `index.ts` file
- ❌ Defining logic directly in `index.ts` instead of re-exporting
- ❌ Skipping tests
- ❌ Missing Storybook stories for visual components
- ❌ Not verifying tests pass after creation
- ❌ Folder name doesn't match main export name

## Existing Examples

Reference these existing modlets for patterns:

**Full modlet with types:**
- `components/Header/` - Has index.ts, component, test, story, types

**Modlet in grouping folder:**
- `components/inline-edit/EditableText/` - Inline edit component

**Common component:**
- `components/common/ConfirmationDialog/` - Dialog component in common folder

## Testing Notes

This project uses:
- **Vitest** for test runner
- **@testing-library/react** for component testing
- **@testing-library/user-event** for user interaction testing
- **@testing-library/jest-dom** for DOM matchers

Tests are configured via `vitest.config.ts` with jsdom environment.
