## 1. Determine Techstack

Determine the type of project and summarize the tech stack. Your summary should include:

Core Technology Analysis:

Programming language(s)
Primary framework
Any secondary or tertiary frameworks
State management approach
Any other relevant technologies or patterns
Domain Specificity Analysis:

What specific problem domain does this application target? (e.g., "chaos game theory visualization", "e-commerce platform", "blog CMS", "data visualization dashboard")
What are the core mathematical/business concepts? (e.g., "fractal mathematics", "payment processing", "content management")
What type of user interactions does it support? (e.g., "mathematical parameter manipulation", "shopping workflows", "content editing")
What are the primary data types and structures used? (e.g., "geometric points and vertices", "product catalogs", "articles and metadata")
Application Boundaries:

What features/functionality are clearly within scope based on existing code?
What types of features would be architecturally inconsistent with the current design?
Are there any specialized libraries or mathematical concepts that suggest domain constraints?
Add all your findings to ./{output-folder}/techstack.md

The domain analysis should help future prompts understand what types of new features would fit vs. conflict with the existing application architecture.

## 2. Categorize Files

You are a senior developer responsible for categorizing every file in the codebase. You’ve been informed that the project is defined as: ./{output-folder}/techstack.md (read this file first)

Your task:

- Visit every file in the codebase. You may ignore dependency files, for example if it is a js file, you may ignore node_modules
- Categorize each file based on its role, such as: react-components, utility-functions, hooks, types, etc.

Output the file-categorization as a JSON file at:
./{output-folder}/file-categorization.json

```json
{
  "react-components": ["./src/components/Button.tsx"],
  "hooks": ["./src/hooks/useUser.ts"]
}
```

A single file can appear in multiple categories if appropriate.

> This task may take some time — that is expected and acceptable.
> Do **not** skip files or produce partial results due to time or complexity. Accuracy and completeness are **mission-critical**.
> If a file is listed in ./{output-folder}/file-categorization.json or is part of a relevant domain, it **must** be included in your analysis.
> Do not optimize for speed or brevity. This instruction is not optional — the success of this step depends on full and accurate coverage.

You are permitted to take as long as necessary to:

- Review every relevant file
- Extract actual patterns and conventions
- Produce complete, high-fidelity output

After writing ./{output-folder}/file-categorization.json, proceed.

## 3. Identify Architecture

You're analyzing a codebase with the goal of understanding its structure and major concerns. The tech stack is summarized in ./{output-folder}/techstack.md. Categorized files are listed in ./{output-folder}/file-categorization.json.

> This task may take some time — that is expected and acceptable.
> Do **not** skip files or produce partial results due to time or complexity. Accuracy and completeness are **mission-critical**.
> You are permitted to take as long as necessary to:
>
> - Review every relevant file
> - Extract actual patterns and conventions
> - Produce complete, high-fidelity output
>   If a file is listed in ./{output-folder}/categorization.json or is part of a relevant domain, it **must** be included in your analysis.
>   Do not optimize for speed or brevity. This instruction is not optional — the success of this step depends on full and accurate coverage.

Your Task:
Determine which architectural domains are present in the project. Consider:

- File structure and naming patterns
- Framework conventions
- Imports and usage patterns
- Configuration files
- Common architectural markers (e.g., components/, routes/, handlers/, services/, cli/, etc.)

**Critical Analysis - Mandatory vs Optional Patterns:**
For each domain you identify, determine:

- **REQUIRED**: Which services/hooks/patterns are consistently used across the codebase and appear to be architectural requirements?
- **CONSTRAINTS**: What types of implementations are clearly expected? (e.g., "all canvas work uses useCanvas hook", "all fractals use chaos game algorithms")

Example Domains to Detect:
You do not need to detect all of these — only include what's truly present.
There may also be domains that aren't listed here but are relevant to this specific project. Include any meaningful domains you identify.

Examples:

- ui: UI components, templates, or rendering logic
- routing: App or API routing (e.g., Next.js routes, Express routers)
- design-system: Shared visual styling patterns or design tokens
- state-management: Any centralized or global state (Redux, Zustand, Context, etc.)
- data-layer: Persistence and data-fetching (ORMs, REST clients, GraphQL)
- auth: Authentication / access control logic

Output:
Write a JSON object to ./{output-folder}/architectural-domains.json like so:

```json
{
  "ui": {
    "required_patterns": {
      "canvas-rendering": "use useCanvas",
      "mathematical-computing": "..."
    },
    "architectural_constraints": {
      "canvas-rendering": "...",
      "mathematical-computing": "..."
    }
  }
}
```

Only include domains you find concrete evidence for based on the actual codebase.

This analysis will help ensure future additions follow the established architectural patterns rather than introducing inconsistent approaches.

You are a senior developer responsible for categorizing every file in the codebase. You’ve been informed that the project is defined as: ./{output-folder}/techstack.md (read this file first)

After writing ./{output-folder}/file-categorization.json, and proceed.

## 4. Domain Deep Dive

> This task may take some time — that is expected and acceptable.
>
> Do **not** skip files or produce partial results due to time or complexity. Accuracy and completeness are **mission-critical**.
>
> You are permitted to take as long as necessary to:
>
> - Review every relevant file
> - Extract actual patterns and conventions
> - Produce complete, high-fidelity output
>
> Do not optimize for speed or brevity. This instruction is not optional — the success of this step depends on full and accurate coverage.

For each of the domains listed in ./{output-folder}/architecture-domains.json, you're analyzing the codebase to understand how it implements the architectural domain: "{domain}".

The tech stack is summarized in ./temp/techstack.md.

Your Task:

- Examine relevant files for this domain.
- Identify consistent patterns, tools, conventions, and practices.
- Include real code examples that reflect actual usage in the codebase.
- Focus on what the project is doing — not what it should do.

Write your findings to: `./{output-folder}/domains/{domain}.md`

Requirements:

- If code snippets are included, use exact code examples from project files.
- Do not invent recommendations or include external best practices.
- Only describe what is actually used in this project.

Your goal is to document how the "{domain}" domain is implemented within this specific codebase in such a way that anyone could leverage or add features to it.

After writing each of the domain files, proceed.

## 5. Styleguide Generation

> This task may take time — that is expected and required.

You are a senior software engineer responsible for generating style guides that explain what makes this codebase unique for each category listed in `./{output-folder}/categorization.json`. Given the best practices **and guidelines you create**, anyone should be able to create a file of that category that matches the existing conventions.

## Requirements

You must:

- Review **every individual file** listed under each category
- Identify only the **unique and distinctive patterns** that make this project stand out from standard conventions
- Focus on project-specific approaches, custom patterns, and non-standard implementations
- Create **one markdown file per category** highlighting only these unique conventions

⚠️ You must create a separate file for **each category**, with no omissions.

## Required Output Files

For example, if the categories are:

- `react-components`
- `api-clients`
- `hooks`

Then you must create:

- `./{output-folder}/style-guides/react-components.md`
- `./{output-folder}/style-guides/api-clients.md`
- `./{output-folder}/style-guides/hooks.md`

## Important Guidelines

- Do **not** skip a single category. Partial output is unacceptable.
- Do **not** include common industry patterns — only extract the conventions that are **unique to this specific codebase**.
- Do **not** invent patterns — only use what is observed in the codebase.

After writing each of the domain files, proceed.

## 6. Build Instructions

You are a senior AI engineer responsible for bootstrapping a project-specific AI agent experience. The goal is to generate a markdown instruction file at:

`{final_output_file}`

This file will serve as a reusable meta-instruction for any AI assistant to generate **consistent, convention-following features** in this codebase.

You must synthesize the following source materials:

- `./{output-folder}/techstack.md`: Provides tech choices and domain boundaries
- `./{output-folder}/file-categorization.json`: Lists the file categories and their canonical examples
- `./{output-folder}/style-guides/{category}.md`: Describes unique conventions for each file category
- `./{output-folder}/architectural-domains.json`: Defines how domains like `ui`, `routing`, `data-layer`, etc. are implemented, along with constraints and required patterns

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
- **Do** include links to generated style guides along side generated instructions when appropriate  to allow copilot to gain more context if needed. Ensure these links are properly relative to the instructions file so they can be followed.

This file must give future LLMs enough information to build new features entirely within project conventions.

To clarify further, if `{final_output_file}` already exists, overwrite it.

