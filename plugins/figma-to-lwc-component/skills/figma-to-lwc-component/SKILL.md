---
name: figma-to-lwc-component
description: Implement or update Lightning Web Components from Figma designs in an existing LWC, SLDS, or Storybook-style repo. Use when given a Figma component/design URL and asked to build a repo-native LWC component, story, or visual state.
---

# Figma to LWC Component

Use this skill to implement or adjust Lightning Web Components from Figma designs while preserving the target repository's conventions.

## When to Use

- The user provides a Figma URL and asks to implement or update an LWC component.
- The user wants Storybook stories, visual states, or SLDS-like variants based on Figma.
- The target repo uses Lightning Web Components, whether package-style, Salesforce DX, Storybook, or another local layout.

## When NOT to Use

- The target implementation is React, Vue, Angular, or another non-LWC framework.
- The user wants design analysis only and no implementation.
- Figma access is unavailable and the user expects exact visual matching.

## Core Rules

- Treat Figma as the source of truth for layout, spacing, typography, colors, variants, and states.
- Inspect the target repo before editing. Do not assume a specific package layout, registration file, story format, or icon system.
- Use Figma MCP tools for design inspection. Do not inspect Figma by driving the Figma web UI with a browser.
- If Figma access fails because of permissions or authentication, stop and ask for access or an accessible link. Do not guess design values.
- If the Figma URL lacks a concrete `node-id`, use metadata tools to locate likely component nodes when possible; otherwise ask for a node-specific link.
- Preserve local component API, naming, styling, and verification patterns unless the user asks for a new convention.
- Keep generated artifacts concise and local to the implementation task.

## Repo Discovery

Before editing, identify:

- package manager and relevant scripts from `package.json`
- LWC component roots, such as `src/modules/c/*`, `force-app/main/default/lwc/*`, or another local convention
- component naming, folder, file, and export patterns
- registration or barrel files, if any
- story, preview, test, lint, and build setup
- styling approach: SLDS classes, design tokens, shared CSS, component CSS, CSS custom properties, or utility classes
- icon strategy: SLDS sprites, local SVGs, icon components, static assets, or generated markup
- public API patterns: `@api` props, events, boolean normalization, variants, sizes, disabled states, and controlled state props

Read nearby components and stories before creating new structure. Only update registration files when the repo already uses them.

If the repo matches one of these profiles, read the matching reference:

- `references/lwc-storybook.md` for package-style repos with `src/modules/c`, `src/index.js`, `src/register.js`, and Storybook stories.
- `references/salesforce-dx-lwc.md` for Salesforce DX projects with `force-app/main/default/lwc`.
- `references/storybook-lwc.md` when Storybook is present.

## Figma Inspection

1. Extract `fileKey` and `nodeId` from the Figma URL.
2. Prefer `get_design_context` for the target node because it returns screenshot/context/code-like structure.
3. If the supplied node is a broad canvas, page, or frame, use metadata to locate concrete component, variant, or instance nodes.
4. Use screenshots when visual detail is needed, increasing resolution for small typography, icons, borders, and spacing.
5. Use variable or token inspection when mapping design values to implementation tokens.
6. Record relevant variant and state names exactly as they appear in Figma.

If `get_design_context` reports no current selection for a valid broad node, do not immediately treat that as a permission failure. Inspect metadata for concrete child component or instance nodes and retry on the relevant child.

## Design Snapshot

Create a concise local artifact for non-trivial work. Prefer an existing scratch/artifact folder if the repo has one; otherwise use `.playwright-mcp/figma-{component}-snapshot.md`.

Include:

- date
- Figma URL and inspected node ids
- component summary
- variants and states
- exact layout, spacing, color, border, radius, shadow, and typography values
- token mappings, noting whether each implementation token was verified
- screenshot paths when screenshots were captured

## Implementation Guidance

- Add or update the smallest set of files needed by the repo's existing component structure.
- Keep public APIs simple and driven by the design: `label`, `variant`, `size`, `disabled`, `iconName`, `open`, `value`, and similar props only when useful.
- For selectable components, keep machine `value` separate from display `label` and dispatch both when useful.
- Normalize public booleans because HTML attributes, Storybook controls, and direct JavaScript usage may pass different shapes.
- For native boolean attributes such as `disabled`, `readonly`, and `required`, ensure DOM attribute presence is correct, using template branches if the local LWC compiler requires it.
- Use explicit class maps for variants and states.
- If dispatching events, block disabled interactions and use composed bubbling unless the local repo has a different event convention.
- Verify icon names against the repo's actual icon source before substituting icons.
- Use exact Figma values unless a verified local design token maps directly to the same value.

## Verification

Use the repo's narrowest reliable verification path:

- run lint, unit tests, type checks, or LWC builds when available and relevant
- run Storybook only when the repo has Storybook scripts
- reuse an already-running preview server when it clearly matches the target repo
- use browser automation to inspect rendered states when a preview is available
- check console errors and failed network requests during browser verification
- verify disabled and interactive behavior through DOM attributes/events, not only screenshots

If browser verification is blocked, run the best available non-browser checks and report what remains unverified.

## Optional Issue Tracking

Only inspect Jira or another issue tracker when the user, branch name, commit message, or repo context clearly points to an issue. Do not assume any project key, board, or site. Report matching issue key, summary, and status when found. Do not transition issues unless the user explicitly asks.

## Useful LWC Patterns

Boolean normalization:

```js
get isDisabled() {
  return this.disabled === '' || this.disabled === 'true' || this.disabled === true;
}
```

Variant classes:

```js
get componentClass() {
  const variantMap = {
    default: 'example',
    selected: 'example example_selected',
  };

  return variantMap[this.variant] || variantMap.default;
}
```

Composed event:

```js
this.dispatchEvent(new CustomEvent('change', {
  detail: { value: this.value, label: this.label },
  bubbles: true,
  composed: true,
}));
```

## Completion Checklist

- Repo conventions were discovered before editing.
- Figma design context or an explicit access blocker was recorded.
- Relevant variants and states were documented.
- Implementation follows nearby component patterns.
- Stories or previews were added only when appropriate for the repo.
- Registration/export files were updated only when the repo requires them.
- Verification used the repo's existing scripts and preview setup.
- Any unverified visual or interactive behavior is clearly reported.
