# Step 5: Implement Component

Before starting: Mark Step 5 as `in-progress` in todo list.

Create `{ComponentName}.tsx` matching Figma design precisely:

## Implementation Checklist

1. Load design context - Re-read `design-context.md` for exact values
2. Match dimensions - Use exact spacing, sizes from Figma
3. Match colors - Use Tailwind classes or CSS variables
4. Match typography - Font size, weight, line height
5. Implement all variants - Handle all prop combinations
6. Use Tailwind - Apply styles with Tailwind classes and `cn()` utility

## Template

```tsx
import { cn } from '@/lib/utils';
import type { ComponentNameProps } from './types';

const sizeClasses = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
} as const;

const variantClasses = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-transparent text-primary border border-primary hover:bg-primary/10',
} as const;

export function ComponentName({
  size = 'md',
  variant = 'primary',
  disabled = false,
  icon,
  children,
  className,
}: ComponentNameProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={disabled}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
```

After completion: Mark Step 5 as `completed` in todo list.
