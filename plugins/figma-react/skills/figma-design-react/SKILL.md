---
name: figma-design-react
description: Design React components from Figma files. Use when given a Figma URL to analyze a design and propose React component architecture, props API, and variant handling. Outputs design analysis and suggested API - does not build components.
---

# Skill: Design React Components from Figma

This skill analyzes Figma designs and proposes React component architecture and props APIs. It helps bridge the gap between design and implementation by providing clear specifications before coding begins.

## When to Use

- User provides a Figma URL and wants to understand how to implement it as React
- Planning component architecture before implementation
- Determining what props a component should have based on Figma variants
- Deciding if a Figma component should be one or multiple React components

## What This Skill Does NOT Do

- Build or implement the actual React components
- Generate production code
- Create Code Connect mappings (use `figma-connect-component` for that)
- Sync existing components with Figma (use `figma-component-sync` for that)

## Required Inputs

1. **Figma URL**: Full URL like `https://figma.com/design/{fileKey}/{fileName}?node-id={nodeId}`

## Design Principle

**Follow FIGMA structure exactly**

When designing component APIs from Figma:

- **DO NOT** use any other component library as a reference
- **DO NOT** impose external component patterns or best practices
- **DO** use the Figma design as the single source of truth for component structure
- **DO** match the exact component hierarchy, variant structure, and prop organization shown in Figma

The component API should mirror how the design is structured in Figma, not how a component library would implement it. If Figma shows variants that change DOM structure, layout, or element ordering, the component API should reflect those structural changes through props.

**Example:**
- If Figma shows a Type="Mobile" variant with vertical button layout and Type="Desktop" with horizontal layout
- Then the component should have a `type` prop that controls both layout structure and alignment
- NOT separate props like `buttonLayout="vertical"` and `textAlign="center"` which would deviate from the Figma structure

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FETCH - Get Figma design context using MCP                  │
├─────────────────────────────────────────────────────────────────┤
│ 2. VALIDATE - Screenshot verification                           │
├─────────────────────────────────────────────────────────────────┤
│ 3. SAVE - Store design context in .temp/design-components/     │
├─────────────────────────────────────────────────────────────────┤
│ 4. ANALYZE - Review variants, properties, and nested components│
├─────────────────────────────────────────────────────────────────┤
│ 5. PROPOSE - Suggest component API(s) with props and types     │
└─────────────────────────────────────────────────────────────────┘
```

## Required Flow

**Follow this sequence exactly:**

1. **Run `get_design_context` first** to fetch the structured representation for the exact node(s).

2. **If the response is too large or truncated**, run `get_metadata` to get the high-level node map and then re-fetch only the required node(s) with `get_design_context`.

3. **Run `get_screenshot`** for a visual reference of the node variant being implemented.

4. **Only after you have both `get_design_context` and `get_screenshot`**, download any assets needed and start implementation.

5. **Translate the output** into this project's conventions, styles and framework. Reuse the project's color tokens, components, and typography wherever possible.

6. **Validate against Figma** for 1:1 look and behavior before marking complete.

## Step-by-Step Instructions

### Step 1: Parse Figma URL and Fetch Design Context

Extract from the URL:
- `fileKey`: The ID after `/design/` (or after `/branch/` if on a branch)
- `nodeId`: From `node-id=` query param (convert `123-456` → `123:456`)

Call `mcp_figma_get_design_context` with:
- `nodeId`: The extracted node ID
- `fileKey`: The extracted file key

### Step 2: Create Output Directory and Save Design Context

Create the output directory:
```
.temp/design-components/{COMPONENT_NAME}/
```

Where `{COMPONENT_NAME}` is derived from the Figma component name (kebab-case).

Save the design context to `.temp/design-components/{COMPONENT_NAME}/design-context.md`:

```markdown
# Design Context: {ComponentName}

## Figma Source
{original URL}

## Component Overview
{Brief description based on Figma data}

## Raw Design Data
{Full output from mcp_figma_get_design_context}
```

### Step 3: Analyze Figma Design

Extract and analyze:

1. **Variants and Variant Options**
   - List all variant properties (e.g., Size, State, Type)
   - List all options for each variant (e.g., Size: Small, Medium, Large)
   - Note how variants affect component structure, not just styling
     - Does the variant change element ordering?
     - Does it change flex direction or layout?
     - Does it add/remove elements?
     - Does it change text alignment or button positioning?

2. **Component Properties**
   - Boolean properties (e.g., "Has Icon", "Show Label")
   - String properties (e.g., "Label Text")
   - Instance swap properties (e.g., "Icon")

3. **Nested Components**
   - Child component instances
   - Repeated elements

4. **Text Layers**
   - Configurable text content
   - Alignment changes across variants

5. **Structural Differences**
   - Document how the DOM structure changes between variants

6. **Child Component Configurability Assessment**
   
   When the parent component contains nested child component instances (e.g., a Dialog containing Buttons), critically evaluate whether those child components should be configurable by the user.
   
   **Common Design Pattern Gap:**
   Designers may focus on the parent component's variants without considering that child component instances might need different configurations based on the use case. For example:
   - An `AlertDialog` might always show the same "Cancel" and "Delete" buttons in Figma
   - But in actual usage, different dialogs need different button variants (destructive vs. primary), labels, and actions
   
   **When to Recommend Configurable Child Props:**
   
   Consider making child components configurable if:
   - The child has multiple variants in its own component set (e.g., Button has primary/destructive/outline variants)
   - Different use cases would require different child configurations
   - The child component's content or behavior naturally varies (button labels, icons, actions)
   - The design shows only one variant but others exist and are relevant
   
   **How to Handle in API Design:**
   
   Instead of hardcoding child components, provide render prop or component prop patterns:
   
   ```typescript
   interface AlertDialogProps {
     title: string;
     description: string;
     
     // Allow users to pass configured child instances
     actionButton?: React.ReactNode;
     cancelButton?: React.ReactNode;
     
     // OR use render props for full control
     renderActions?: (props: { onClose: () => void }) => React.ReactNode;
   }
   ```
   
   **Example Usage:**
   ```tsx
   <AlertDialog
     title="Delete item?"
     description="This action cannot be undone."
     actionButton={
       <Button variant="destructive" size="default">
         Delete
       </Button>
     }
     cancelButton={
       <Button variant="outline" size="default">
         Cancel
       </Button>
     }
   />
   ```
   
   **Document in Proposed API:**
   
   When recommending configurable child components, explain:
   - Why the child should be configurable (use case flexibility)
   - What the Figma design shows vs. what's needed in practice
   - Whether to use component props, render props, or both
   - Default behavior if props are not provided
   
   **Example Documentation:**
   ```markdown
   ### Design Consideration: Configurable Buttons
   
   **Figma shows:** Fixed "Cancel" and "Delete" buttons with specific variants
   
   **Recommended approach:** Make buttons configurable via props
   
   **Rationale:** Different alert dialogs need different button configurations:
   - Destructive actions (delete, remove) need `variant="destructive"`
   - Confirmations need `variant="primary"`
   - Button labels vary by context ("Delete", "Remove", "Confirm", etc.)
   
   The Figma design represents one use case, but the component should support flexible button configurations to handle all dialog scenarios.
   ```

### Step 4: Propose Component API

Based on the analysis, create `.temp/design-components/{COMPONENT_NAME}/proposed-api.md`:

```markdown
# Proposed API: {ComponentName}

## Figma Source
{original URL}

## Summary
{One paragraph describing what this component does}

## Recommended Component Structure

{Explain if this should be one component or multiple, and why}

---

## Component: {ComponentName}

### Props Interface

\`\`\`typescript
interface {ComponentName}Props {
  // Mapped from Figma variant "Size"
  size?: 'sm' | 'md' | 'lg';
  
  // Mapped from Figma variant "Variant"
  variant?: 'primary' | 'secondary' | 'outline';
  
  // Mapped from Figma boolean "Disabled"
  disabled?: boolean;
  
  // Mapped from Figma text layer "Label"
  children: React.ReactNode;
  
  // Mapped from Figma instance "Icon"
  icon?: React.ReactNode;
}
\`\`\`

### Prop Details

| Prop | Type | Default | Figma Source | Notes |
|------|------|---------|--------------|-------|
| size | `'sm' \| 'md' \| 'lg'` | `'md'` | Variant: Size | Maps Small→sm, Medium→md, Large→lg |
| variant | `'primary' \| 'secondary'` | `'primary'` | Variant: Type | - |
| disabled | `boolean` | `false` | Boolean: Disabled | - |
| children | `React.ReactNode` | required | Text: Label | - |
| icon | `React.ReactNode` | `undefined` | Instance: Icon | Only shown when Has Icon=true |

### Excluded from Props (Handled by Tailwind/Internal State)

| Figma Property | Reason |
|----------------|--------|
| State: Hover | Tailwind `hover:` modifier |
| State: Pressed | Tailwind `active:` modifier |
| State: Focused | Tailwind `focus-visible:` modifier |

### Example Usage

\`\`\`tsx
<{ComponentName} size="lg" variant="primary">
  Click me
</{ComponentName}>

<{ComponentName} size="sm" icon={<IconPlus />}>
  Add Item
</{ComponentName}>
\`\`\`

---

## Additional Components (if applicable)

{If the Figma component should be split into multiple React components, document each one here with the same structure}
```

## Decision Guidelines

### When to Create Multiple Components

Create separate components when:
- Figma variants represent fundamentally different UI patterns (e.g., "Type: Text Input" vs "Type: Date Picker")
- Variants have completely different props/behavior
- One variant is a specialized version with unique functionality

Keep as one component when:
- Variants only affect styling (colors, sizes)
- All variants share the same props interface
- Behavior is consistent across variants

### Props to Include vs Exclude

**Include as props:**
- Variants that change content, behavior, OR structure
- Boolean toggles for optional elements
- Text content that should be configurable
- Instance swaps for customizable slots

**Exclude from props (handle internally):**
- Pseudo-state variants: `hover`, `pressed`, `focused`, `active`
- Interaction states: `loading` might be a prop, but visual feedback is internal
- Animation states

### Naming Conventions

| Figma | React Prop |
|-------|-----------|
| `Small`, `Medium`, `Large` | `'sm'`, `'md'`, `'lg'` |
| `Primary`, `Secondary` | `'primary'`, `'secondary'` |
| `Has Icon`, `Show Label` | `hasIcon: boolean`, `showLabel: boolean` |
| `Yes`/`No`, `True`/`False` | `boolean` |
| Title Case values | kebab-case or camelCase |

## Output Files

```
.temp/design-components/{component-name}/
├── design-context.md    # Raw Figma data + URL
└── proposed-api.md      # Suggested component API(s)
```

## Example Session

**User:** Design a React component from this Figma: https://figma.com/design/abc123/DesignSystem?node-id=100-200

**Agent:**
1. Fetches design context via MCP
2. Creates `.temp/design-components/button/`
3. Saves `design-context.md` with Figma data
4. Analyzes variants (Size, Type, State) and properties (Has Icon, Label)
5. Creates `proposed-api.md` with:
   - `ButtonProps` interface
   - Mapping table from Figma to props
   - Note that State: Hover/Pressed/Focused are handled by CSS
   - Example usage

**Agent Response:**
```
📋 Design analysis complete for Button!

Created: `.temp/design-components/button/`

## Proposed Structure
Single component: `Button`

## Props Summary
| Prop | Type | From Figma |
|------|------|------------|
| size | 'sm' \| 'md' \| 'lg' | Variant: Size |
| variant | 'primary' \| 'secondary' | Variant: Type |
| disabled | boolean | Boolean: Disabled |
| children | ReactNode | Text: Label |
| icon | ReactNode | Instance: Icon |

Excluded: Hover, Pressed, Focused states (CSS handles these)

See full details: `.temp/design-components/button/proposed-api.md`
```

## Related Skills

- **figma-implement-component**: Use this skill next to build the component from the analysis
- **create-react-modlet**: Defines the modlet folder structure for components
- **figma-connect-component**: Detailed Code Connect mapping guidance
- **figma-component-sync**: Use to check existing implementations against Figma designs
