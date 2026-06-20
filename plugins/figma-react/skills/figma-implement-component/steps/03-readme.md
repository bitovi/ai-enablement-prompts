# Step 3: Write README with Design Context

Before starting: Mark Step 3 as `in-progress` in todo list.

Create `README.md` documenting the Figma-to-code mapping:

## Template

```markdown
# {ComponentName}

{Brief description of what the component does}

## Figma Source

{Original Figma URL from design-context.md}

## Accepted Design Differences

| Category | Figma | Implementation | File | Reason |
|----------|-------|----------------|------|--------|
| Example | Fixed 36px | Auto height | ComponentName.tsx | Flexible content |

## Design-to-Code Mapping

### Variant Mappings

| Figma Variant | Figma Value | React Prop | React Value | Notes |
|---------------|-------------|------------|-------------|-------|
| Size | Small | `size` | `'sm'` | Height 32px |
| Size | Medium | `size` | `'md'` | Height 40px (default) |

### Property Mappings

| Figma Property | Type | React Prop | Notes |
|----------------|------|------------|-------|
| Has Icon | Boolean | `icon?: ReactNode` | Renders icon when provided |
| Label | Text | `children` | - |

### Excluded Properties (CSS/Internal)

| Figma Property | Handling | Reason |
|----------------|----------|--------|
| State: Hover | Tailwind `hover:` | Pseudo-state |
| State: Focused | Tailwind `focus-visible:` | Pseudo-state |
```

After completion: Mark Step 3 as `completed` in todo list.
