# Step 6: Create Stories for Each Variant

Before starting: Mark Step 6 as `in-progress` in todo list.

Create `{ComponentName}.stories.tsx` with a story for **every Figma variant**:

## Template

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  component: ComponentName,
  title: 'Common/ComponentName',
  tags: ['autodocs'],
  parameters: {
    design: {
      type: 'figma',
      url: 'https://figma.com/design/...?node-id=...', // From design-context.md
    },
  },
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

// Default state (matches Figma default)
export const Default: Story = {
  args: {
    children: 'Button Label',
  },
};

// Size variants
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Medium Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

// Type variants
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

// Boolean properties
export const WithIcon: Story = {
  args: {
    icon: <span>★</span>,
    children: 'With Icon',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

// Responsive stories (if Figma has responsive designs)
export const Mobile: Story = {
  args: {
    children: 'Mobile View',
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
```

After completion: Mark Step 6 as `completed` in todo list.
