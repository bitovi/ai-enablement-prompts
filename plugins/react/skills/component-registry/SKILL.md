---
name: component-registry
description: Track reusable UI components and unextracted patterns. Maintains a REGISTRY.md inventory of extracted components and patterns that need extraction. Use when auditing components, planning extractions, or checking what components exist.
---

# Skill: Component Registry

Maintain a living inventory of UI components and patterns in the project.

## Purpose

The component registry tracks:
- **✅ Extracted components** — reusable components that exist in the shared components directory
- **⚠️ Needs extraction** — patterns used in multiple places that should be extracted
- **Usage counts** — how many times each component/pattern is used

## Registry Location

Store the registry at `.github/skills/component-registry/REGISTRY.md` or a project-appropriate location.

## Registry Format

```markdown
# Component Registry

## ✅ Extracted Components

| Component | Location | Usage Count | Description |
|-----------|----------|-------------|-------------|
| Button | src/components/ui/Button | 24 | Primary action button with variants |
| Card | src/components/ui/Card | 12 | Content card container |

## ⚠️ Needs Extraction

| Pattern | Found In | Count | Priority |
|---------|----------|-------|----------|
| Status badge | JobList, UserList, Dashboard | 8 | High |
| Search input | JobsPage, UsersPage | 4 | Medium |
```

## Maintenance Workflow

### Scanning for Patterns

Run these commands to find common patterns:

```bash
# Find repeated button patterns
grep -rn "className.*btn\|<button" src/ --include="*.tsx" | wc -l

# Find repeated card patterns  
grep -rn "className.*card\|className.*rounded.*shadow" src/ --include="*.tsx" | wc -l

# Find repeated form input patterns
grep -rn "className.*input\|<input" src/ --include="*.tsx" | wc -l

# Find repeated badge/tag patterns
grep -rn "className.*badge\|className.*tag\|className.*pill" src/ --include="*.tsx" | wc -l
```

### Updating the Registry

1. Run the scan commands above
2. Update usage counts for existing entries
3. Add new patterns discovered
4. Remove patterns that have been extracted
5. Prioritize extraction candidates (High = 5+ uses, Medium = 3-4 uses)

## Integration with Other Skills

- **extract-ui-component**: Use to extract patterns marked ⚠️
- **implement-feature**: Check registry before building new UI
- **component-reuse**: Enforce reuse of ✅ components
