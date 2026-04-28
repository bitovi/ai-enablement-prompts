---
name: implement-feature
description: End-to-end workflow for implementing a new UI feature in a mock app. Ensures data model alignment, sample data, UI/UX consistency, component reuse, and automated verification. Load for ANY UI change.
---

# Implement Feature Skill

## Purpose

Guide complete implementation of a new UI feature. Ensures data model, sample data, component reuse, and verification are all handled.

## When to Use

**Load for ANY of the following:**
- Adding a new page or route
- Adding or editing navigation
- Adding any new UI element that appears 2+ times
- Editing a page's content/layout
- Building a new UI-driven feature or workflow

## Workflow (9 steps)

### 1. Clarify Feature Requirements
Reference the spec or use `document-feature` skill to document requirements first.

### 2. Data Model Alignment
Use `update-data-model` for Zod schemas. Use `generate-sample-data` for mock data.

### 3. Check Component Registry and Extract Components FIRST
- Read the component registry
- Extract patterns marked ⚠️ NEEDS EXTRACTION before implementing
- Rule: If you use the same element 2+ times, extract it
- Do this BEFORE building new pages

### 4. Select UI/UX Pattern
Choose appropriate layout pattern for the feature.

### 5. Implement UI & Logic
Build pages using ONLY extracted reusable components. NO inline buttons/forms/cards.

### 6. Mock Data & API
Update mock API handlers. Generate 15-20+ items for scrollbar testing.

### 7. Automated Verification (Playwright MCP)
Verify feature, stories, responsiveness. Generate E2E tests if Playwright MCP is available.

### 8. Testing & Storybook
Validate reusable components have stories and tests.

### 9. Update Component Registry
Add new components to ✅, document patterns for ⚠️, update usage counts.

## Checklist

- [ ] Component Registry reviewed
- [ ] Patterns marked ⚠️ extracted FIRST
- [ ] New reusable components extracted
- [ ] Storybook story created for EACH component
- [ ] Sample data generated (minimum 15-20 items)
- [ ] Pages built using ONLY reusable components
- [ ] Component Registry updated
- [ ] Responsive design verified
- [ ] Scrollbar behavior tested
- [ ] E2E tests generated for all new flows

## Related Skills

- `document-feature` — document requirements first
- `update-data-model` — Zod schema management
- `generate-sample-data` — mock data generation
- `component-registry` — component inventory
- `extract-ui-component` — extract reusable patterns
