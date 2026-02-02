> This task may take time — that is expected and required.

# Step 5: Style Guide Generation (with Influence from Previous Outputs)

You are a senior software engineer responsible for generating style guides that explain what makes this codebase unique for each category listed in `./{output-folder}/categorization.json`. Begin by reviewing any previous style guides as influence, but always verify their correctness and relevance against the current codebase. Update or remove outdated information as needed. Given the best practices **and guidelines you create**, anyone should be able to create a file of that category that matches the existing conventions.

## Requirements

## You must:

- Review **every individual file** listed under each category
- Identify only the **unique and distinctive patterns** that make this project stand out from standard conventions
- Focus on project-specific approaches, custom patterns, and non-standard implementations
- Create **one markdown file per category** highlighting only these unique conventions
- If a previous version of this file exists, use it as influence, but ensure all information is current and relevant.

⚠️ You must create a separate file for **each category**, with no omissions.

## Required Output Files

For example, if the categories are: - `react-components` - `api-clients` - `hooks`
Then you must create: - `./{output-folder}/style-guides/react-components.md` - `./{output-folder}/style-guides/api-clients.md` - `./{output-folder}/style-guides/hooks.md`

## Important Guidelines

- Do **not** skip a single category. Partial output is unacceptable.
- Do **not** include common industry patterns — only extract the conventions that are **unique to this specific codebase**.
- Do **not** invent patterns — only use what is observed in the codebase.

After writing each of the style guide files, read the contents of [./6-build-instructions.md](./6-build-instructions.md) and proceed accordingly, using `{output-folder}` as the `output-folder`.
