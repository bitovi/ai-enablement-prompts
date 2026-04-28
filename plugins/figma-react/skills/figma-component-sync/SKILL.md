---
name: figma-component-sync
description: Check a React component against its Figma design source and identify differences. Use when reviewing component implementations, syncing designs, auditing visual accuracy, or updating components to match new Figma designs.
---

# Skill: Figma Component Sync

This skill checks a component's implementation against its Figma design source and helps you decide which differences to accept, ignore, or implement.

## When to Use

- Reviewing if a component matches its Figma design
- Auditing visual accuracy of existing components
- Updating components after Figma design changes
- Documenting known/accepted design deviations

## Prerequisites

- Component must have a `README.md` with a Figma link in the format:
  ```markdown
  ## Figma Source
  https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}&m=dev
  ```
- Figma MCP must be configured and authenticated

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FETCH - Get Figma design context and current component code  │
├─────────────────────────────────────────────────────────────────┤
│ 2. TRACE DEPENDENCIES - Identify internal components used       │
├─────────────────────────────────────────────────────────────────┤
│ 3. ANALYZE - Compare design vs implementation (all files)       │
├─────────────────────────────────────────────────────────────────┤
│ 4. REVIEW - User decides: implement, ignore, or accept each     │
├─────────────────────────────────────────────────────────────────┤
│ 5. APPLY - Implement approved changes                           │
├─────────────────────────────────────────────────────────────────┤
│ 6. TEST - Verify implementation matches Figma                   │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Instructions

### Step 1: Initialize Check

Given a component path (e.g., `packages/client/src/components/inline-edit/EditableText`):

1. **Create output directory**:
   ```
   .temp/component-updates/{component-name}/
   ```

2. **Find and read the component's README.md** to extract Figma link

3. **Check parent folder** for additional README.md with relevant Figma context

4. **Fetch Figma design context** using `mcp_figma_get_design_context`:
   - Extract `fileKey` and `nodeId` from the Figma URL
   - Call the MCP tool with those parameters
   - Save output to `.temp/component-updates/{component-name}/figma-context.md`

5. **Read current component implementation**:
   - Main component file (`.tsx`)
   - Styles if separate
   - Save analysis to `.temp/component-updates/{component-name}/current-implementation.md`

### Step 2: Trace Dependencies

Identify internal components that may implement Figma-specified styles:

1. **Parse imports** from the main component file:
   - Look for imports from relative paths (e.g., `../BaseEditable`, `../EditControls`)
   - Ignore external packages (`react`, `lucide-react`, `@/components/ui/*`)

2. **For each internal dependency**:
   - Read the component's source code
   - Check if it has its own README.md with Figma source
   - If yes, fetch that Figma context too

3. **Map Figma properties to responsible files**:
   - For each Figma property (spacing, colors, shadows, etc.)
   - Determine which file's code actually implements it
   - Create a property-to-file mapping

4. **Save dependency analysis** to `.temp/component-updates/{component-name}/dependencies.md`:
   ```markdown
   # Dependency Analysis: {ComponentName}
   
   ## Internal Dependencies
   | Component | Path | Has Figma Source? |
   |-----------|------|-------------------|
   | BaseEditable | ../BaseEditable | Yes (node 1252-9022) |
   | EditControls | ../EditControls | No |
   
   ## Property Ownership Map
   | Figma Property | Responsible File | Current Value |
   |----------------|------------------|---------------|
   | Label-Content Gap | BaseEditable.tsx | gap-1 (4px) |
   | Content Padding | BaseEditable.tsx | py-0.5 (2px) |
   | Button Shadow | EditControls.tsx | shadow-sm |
   | Input Border | EditableText.tsx | border-input |
   ```

### Step 3: Generate Comparison

Create `.temp/component-updates/{component-name}/comparison.md`:

**IMPORTANT:** Only include differences and decisions. Do NOT include:
- Figma Design Summary sections
- Current Implementation Summary sections  
- "Previously Matching" or "No Changes Needed" sections

```markdown
# Component Comparison: {ComponentName}

> Figma: https://www.figma.com/design/...?node-id=...

## Differences

### 📁 {ComponentName}.tsx

#### 1. Border color
- **Figma:** `border-gray-300`
- **Code:** `border-input`
- **Impact:** Low

**Decision:**
- [ ] 🔧 IMPLEMENT
- [ ] ✅ ACCEPT - Reason: 
- [ ] ⏭️ SKIP

---

### 📁 BaseEditable.tsx (dependency)

#### 1. Label-Content Gap
- **Figma:** `0px` (no gap)
- **Code:** `gap-1` (4px)
- **Impact:** Medium

**Decision:**
- [ ] 🔧 IMPLEMENT
- [ ] ✅ ACCEPT - Reason: 
- [ ] ⏭️ SKIP

#### 2. Content Padding
- **Figma:** `py-2` (8px)
- **Code:** `py-0.5` (2px)
- **Impact:** Medium

**Decision:**
- [ ] 🔧 IMPLEMENT
- [ ] ✅ ACCEPT - Reason: 
- [ ] ⏭️ SKIP

---

## Previously Accepted

| Category | Figma | Code | File | Reason |
|----------|-------|------|------|--------|
| Width | fixed | `w-full` | {ComponentName}.tsx | Container flexibility |
```

### Step 4: User Review

Prompt the user to:
1. Open the `comparison.md` file
2. Review each difference (grouped by file)
3. Mark decisions inline
4. Save the file

Use this prompt format:
```
📋 Component sync analysis complete!

Found differences in {N} files:
- {ComponentName}.tsx: {n} differences
- BaseEditable.tsx (dependency): {n} differences
- EditControls.tsx (dependency): {n} differences

Please review and make decisions:
1. Open: `.temp/component-updates/{component-name}/comparison.md`
2. For each difference, choose: IMPLEMENT, ACCEPT, or SKIP
3. Save the file
4. Tell me to apply the decisions
```

### Step 5: Apply Decisions

After user completes review:

1. **Parse the comparison.md** for decisions (grouped by file)
2. **For IMPLEMENT decisions**:
   - Generate a technical plan per file
   - Apply code changes to each file
   - Run tests to verify
3. **For ACCEPT decisions**:
   - Add to the **target component's** README.md under "## Accepted Design Differences"
   - Include which file the deviation is in
4. **For SKIP decisions**:
   - Leave as-is for future review

**Important:** When changing dependency files (like `BaseEditable`), consider:
- These changes affect ALL components using that dependency
- Document the change scope in the implementation plan
- Run broader test coverage if needed

## Output Files Structure

```
.temp/component-updates/{component-name}/
├── figma-context.md          # Raw Figma MCP output
├── dependencies.md           # Internal dependency analysis & property mapping
├── technical-comparison.md   # Side-by-side property comparison
├── decisions.md              # Grouped changes with decision checkboxes
└── implementation-plan.md    # Generated after review (if changes needed)
```

## README.md Format for Accepted Differences

Components should document accepted differences in their README:

```markdown
# ComponentName

Description...

## Figma Source

https://www.figma.com/design/...

## Accepted Design Differences

| Category | Figma | Implementation | File | Reason |
|----------|-------|----------------|------|--------|
| Width | Fixed 200px | `w-full` | EditableText.tsx | Container flexibility |
| Gap | 0px | `gap-1` (4px) | BaseEditable.tsx | Visual breathing room |
| Shadow | `shadow-lg` | `shadow-sm` | EditControls.tsx | Subtler appearance |
```

## Dependency Detection Rules

When tracing dependencies, include a component if:

1. **It's imported from a relative path** within the same component family
   - ✅ `import { BaseEditable } from '../BaseEditable'`
   - ✅ `import { EditControls } from '../EditControls'`
   - ❌ `import { Button } from '@/components/ui/button'` (external UI lib)
   - ❌ `import { cn } from '@/lib/utils'` (utility, not component)

2. **It renders visual elements** (not just hooks or utilities)

3. **It implements styling** that corresponds to Figma properties:
   - Layout (flex, gap, padding, margin)
   - Colors (background, text, border)
   - Typography (font size, weight, line-height)
   - Effects (shadow, border-radius)

## Property-to-File Mapping Guidelines

When determining which file "owns" a Figma property:

| Figma Element | Usually Owned By |
|---------------|------------------|
| Label styling | Base/wrapper component |
| Content area styling | Base/wrapper component |
| Edit mode container | Target component |
| Input field styling | Target component |
| Save/Cancel buttons | Controls component |
| Hover states | Base/wrapper component |
| Focus rings | Usually the focused element's component |

## Example Usage

**Check a single component:**
```
Check the EditableText component against its Figma design
```

**Check all inline-edit components:**
```
Check all components in packages/client/src/components/inline-edit/ against their Figma designs
```

**Apply decisions after review:**
```
Apply the figma sync decisions for EditableText
```

## Prompts for Follow-up Actions

After generating comparison.md, provide these follow-up prompts:

### To apply changes:
```
@workspace Read .temp/component-updates/{component-name}/comparison.md and implement all changes marked as IMPLEMENT
```

### To update README with accepted deviations:
```
@workspace Read .temp/component-updates/{component-name}/comparison.md and add all ACCEPT decisions to the component's README.md
```

## Common Figma Properties to Check

| Category | Figma Property | Code Equivalent |
|----------|---------------|-----------------|
| Colors | Fill colors | `bg-*`, `text-*`, CSS colors |
| Typography | Font size/weight | `text-*`, `font-*` |
| Spacing | Auto layout gaps | `gap-*`, `space-*`, `p-*`, `m-*` |
| Borders | Stroke | `border-*`, `ring-*` |
| Shadows | Effects | `shadow-*` |
| Corners | Corner radius | `rounded-*` |
| Sizing | Width/Height | `w-*`, `h-*`, `min-*`, `max-*` |

## Troubleshooting

### "No Figma link found"
- Ensure README.md exists in the component folder
- Check the link format matches expected pattern

### "MCP authentication failed"
- Verify Figma MCP is configured
- Run `mcp_figma_whoami` to check auth status

### "Component not found at path"
- Verify the component path is correct
- Check for typos in component name
