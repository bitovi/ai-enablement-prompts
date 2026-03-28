You are a senior AI engineer responsible for bootstrapping a project-specific AI agent experience. The goal is to generate a markdown instruction file at:

`{final_output_file}`

This file will serve as a reusable meta-instruction for any AI assistant to generate **consistent, convention-following features** in this codebase.

You must synthesize the following source materials:

- `./{output-folder}/1-techstack.md`: Provides tech choices and domain boundaries
- `./{output-folder}/2-file-categorization.json`: Lists the file categories and their canonical examples
- `./{output-folder}/5-style-guide.md`: Describes unique conventions per file category and cross-cutting patterns
- `./{output-folder}/3-architectural-domains.json`: Defines how domains like `ui`, `routing`, `data-layer`, etc. are implemented, along with constraints and required patterns

---

## Your Output: `{final_output_file}`

This file must include:

---

### 1. **Overview Section**

Explain the purpose of this file:

- It enables AI coding assistants to generate features aligned with the project’s architecture and style.
- It is based only on actual, observed patterns from the codebase — not invented practices.

---

### 2. **File Category Reference**

For each category in `2-file-categorization.json`:

- Explain what it is
- List 1–2 representative file examples
- Summarize key conventions based on its corresponding section in `5-style-guide.md`

---

### 3. **Feature Scaffold Guide**

Define how to plan and implement a new feature. Include:

- How to determine which categories of files to create
- Where to place those files
- How to follow naming and structure conventions
- Example: what files to create for a new component, a hook, or an API integration

This section should refer to actual conventions in the project (e.g., if Storybook is used, include `*.stories.tsx`; if styles are colocated `.module.css`, mention that).

---

### 4. **Integration Rules**

From `3-architectural-domains.json`, summarize constraints like:

- "All canvas logic must use `useCanvas`"
- "Components must use shared tokens from the design-system"
- "API requests go through `apiClient.ts` pattern"

This prevents LLMs from generating non-compliant or inconsistent files.

---

### 5. **Example Prompt Usage**

Show how a user could prompt Copilot with a request like:

> "Create a searchable dropdown that lets users filter by category"

And have it respond with:

- `src/components/SearchableDropdown.tsx`
- `src/components/SearchableDropdown.module.css`
- `src/hooks/useSearchableDropdown.ts`
- `src/components/__tests__/SearchableDropdown.test.tsx`
- etc…

Only use categories and file types present in this project.

---

## ⚠️ Requirements

- **Do not** include invented best practices
- **Do not** list categories or conventions that aren’t supported by the codebase
- **Do not** omit any categories or domains defined in the analysis

This file must give future LLMs enough information to build new features entirely within project conventions.

To clarify further, if `{final_output_file}` already exists, overwrite it.

---

## Second Output: `OVERVIEW.md` (root of the repository)

After writing `{final_output_file}`, produce a second file at the **root of the repository**: `OVERVIEW.md`.

This is a human-readable overview of the codebase, written for engineers, product managers, and stakeholders. It synthesises findings from the three analytical perspectives applied across this prompt chain.

### Structure

```markdown
# Project Overview

## Table of Contents
...

## System Architecture
<!-- Software Architect perspective: system design, component boundaries, data flows, scalability -->
<!-- Embed the Mermaid diagram from `./{output-folder}/3-architecture-diagram.md` here -->

## Codebase Structure
<!-- Software Developer perspective: implementation patterns, conventions, complexity, technical debt -->

## Product & Features
<!-- Product Manager perspective: user-facing features, user flows, alignment with business goals -->
<!-- Include a Mermaid sequence or flowchart for a key user journey if it aids understanding -->

## Actionable Insights & Open Questions
<!-- Findings and unresolved questions surfaced across all three perspectives -->
<!-- Frame each item as either an insight (something notable) or a question (something unresolved) -->
```

### Requirements

- Written in Markdown
- Include at least one Mermaid diagram (use the architecture diagram from step 3; add a user flow diagram if it adds value)
- Base all content on the analysis from steps 1–5 — do not invent features or assumptions
- Where something is ambiguous, surface it as an open question rather than guessing
- If `OVERVIEW.md` already exists at the root, overwrite it

---

After writing both output files, read the contents of [./7-validate.md](./7-validate.md) and proceed accordingly with {output-folder} and {final_output_file} as parameters.
