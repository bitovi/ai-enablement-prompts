You are a senior AI engineer responsible for bootstrapping a project-specific Copilot experience. The goal is to generate a markdown instruction file at:

`/.github/copilot-instructions.md`

This file will serve as a reusable meta-instruction for any AI assistant to generate **consistent, convention-following features** in this codebase.

You must synthesize the following source materials:

- `./{output-folder}/techstack.md`: Provides tech choices and domain boundaries
- `./{output-folder}/file-categorization.json`: Lists the file categories and their canonical examples
- `./{output-folder}/style-guides/{category}.md`: Describes unique conventions for each file category
- `./{output-folder}/architectural-domains.json`: Defines how domains like `ui`, `routing`, `data-layer`, etc. are implemented, along with constraints and required patterns

---

## Your Output: `/.github/copilot-instructions.md`

This file must include:

---

### 1. **Overview Section**

Explain the purpose of this file:

- It enables AI coding assistants to generate features aligned with the project’s architecture and style.
- It is based only on actual, observed patterns from the codebase — not invented practices.

---

### 2. **File Category Reference**

For each category in `file-categorization.json`:

- Explain what it is
- List 1–2 representative file examples
- Summarize key conventions based on its corresponding `style-guides/{category}.md`

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

From `architectural-domains.json`, summarize constraints like:

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

To clarify further, the `copilot-instructions.md` file must reside inside a folder called `.github` at the root directory of the project. If `/.github/copilot-instructions.md` already exists, overwrite it.
