# Step 4: Create Types

Before starting: Mark Step 4 as `in-progress` in todo list.

Create `types.ts` based on `proposed-api.md`:

## Template

```typescript
export interface {ComponentName}Props {
  /**
   * Size variant
   * @default 'md'
   * @figma Variant: Size
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Visual variant
   * @default 'primary'
   * @figma Variant: Type
   */
  variant?: 'primary' | 'secondary';
  
  /**
   * Disabled state
   * @default false
   * @figma Boolean: Disabled
   */
  disabled?: boolean;
  
  /**
   * Optional leading icon
   * @figma Instance: Icon (when Has Icon = true)
   */
  icon?: React.ReactNode;
  
  /**
   * Button content
   * @figma Text: Label
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}
```

After completion: Mark Step 4 as `completed` in todo list.
