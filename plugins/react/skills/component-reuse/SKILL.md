---
name: component-reuse
description: Ensure existing UI components are reused before creating new ones. Must run BEFORE any UI implementation. Audits the codebase for matching components and reports whether to REUSE, WRAP, or CREATE.
---

# Skill: Component Reuse Audit

A gate skill that enforces checking for existing components before creating new ones.

## When to Use

**BEFORE** any UI implementation task. This skill must run before:
- Creating a new component
- Building a new page or feature
- Implementing a Figma design

## Purpose

Prevent duplicate components by auditing what already exists.

## Workflow

### Step 1: Extract Component Names

From the design or requirements, list every UI element needed:
- Buttons, inputs, selects, checkboxes
- Cards, tables, lists, badges
- Dialogs, modals, popovers
- Layout containers, navigation elements

### Step 2: Search for Exact Names

```bash
# Search for each component by name
find src/components -name "*.tsx" | head -50
grep -rn "export.*Button\|export.*Card\|export.*Dialog" src/components/ --include="*.tsx"
```

### Step 3: Search for Variations

Look for alternate names and similar components:
```bash
# Search for button variants
grep -rn "Button\|Btn\|ActionButton\|SubmitButton" src/components/ --include="*.tsx"

# Search for card variants
grep -rn "Card\|Panel\|Tile\|Container" src/components/ --include="*.tsx"
```

### Step 4: Output Audit Table

Create a decision table:

| Needed Component | Found Match | Location | Decision |
|-----------------|-------------|----------|----------|
| Button | ✅ Button | src/components/ui/Button | REUSE |
| StatusBadge | ⚠️ Badge (partial) | src/components/ui/Badge | WRAP — extend with status colors |
| Timeline | ❌ None | — | CREATE |

### Step 5: Take Action

For each decision:

- **REUSE**: Import and use the existing component directly
- **WRAP**: Create a thin wrapper around an existing component that adds the missing functionality
- **CREATE**: Only create a new component if nothing similar exists

## Common Mistakes

- ❌ Creating a new `StatusBadge` when `Badge` exists and can accept a `variant` prop
- ❌ Building a custom dialog when the UI library provides one
- ❌ Copying a component instead of importing it
- ❌ Skipping this audit because "it's faster to just build it"

## Quality Checklist

- [ ] Every UI element in the design has been audited
- [ ] All existing components in src/components/ have been checked
- [ ] UI library components (shadcn, MUI, etc.) have been checked
- [ ] Decision table is complete with REUSE/WRAP/CREATE for each element
- [ ] No REUSE or WRAP was incorrectly marked as CREATE
