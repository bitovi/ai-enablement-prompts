# Step 8: Create Tests

Before starting: Mark Step 8 as `in-progress` in todo list.

Create `{ComponentName}.test.tsx`:

## Template

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders with default props', () => {
    render(<ComponentName>Click me</ComponentName>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders with size="sm"', () => {
    render(<ComponentName size="sm">Small</ComponentName>);
    expect(screen.getByRole('button')).toHaveClass('h-8');
  });

  it('renders with size="lg"', () => {
    render(<ComponentName size="lg">Large</ComponentName>);
    expect(screen.getByRole('button')).toHaveClass('h-12');
  });

  it('renders with variant="secondary"', () => {
    render(<ComponentName variant="secondary">Secondary</ComponentName>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });

  it('renders disabled state', () => {
    render(<ComponentName disabled>Disabled</ComponentName>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders with icon', () => {
    render(
      <ComponentName icon={<span data-testid="icon">★</span>}>
        With Icon
      </ComponentName>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ComponentName className="custom-class">Button</ComponentName>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
```

After completion: Mark Step 8 as `completed` in todo list.
