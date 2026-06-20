# Step 7: Create Code Connect Mapping

Before starting: Mark Step 7 as `in-progress` in todo list.

Create `{ComponentName}.figma.tsx` following `figma-connect-component` skill:

## Template

```tsx
import figma from '@figma/code-connect';
import { ComponentName } from './ComponentName';

figma.connect(ComponentName, 'https://figma.com/design/...?node-id=...', {
  props: {
    size: figma.enum('Size', {
      Small: 'sm',
      Medium: 'md',
      Large: 'lg',
    }),
    variant: figma.enum('Type', {
      Primary: 'primary',
      Secondary: 'secondary',
    }),
    disabled: figma.boolean('Disabled'),
    children: figma.textContent('Label'),
    icon: figma.boolean('Has Icon', {
      true: figma.instance('Icon'),
      false: undefined,
    }),
  },
  example: ({ size, variant, disabled, children, icon }) => (
    <ComponentName
      size={size}
      variant={variant}
      disabled={disabled}
      icon={icon}
    >
      {children}
    </ComponentName>
  ),
});
```

After completion: Mark Step 7 as `completed` in todo list.
