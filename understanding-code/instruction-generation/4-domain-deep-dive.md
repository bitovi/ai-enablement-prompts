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

# Step 4: Domain Deep Dive (with Influence from Previous Outputs)

For each of the domains listed in `./{output-folder}/architecture-domains.json`, you're analyzing the codebase to understand how it implements the architectural domain: "{domain}". Use any previous domain analyses as influence, but always verify their correctness and relevance against the current codebase. Update or remove outdated information as needed.

The tech stack is summarized in `./{output-folder}/techstack.md`.

## Your Task

- Examine relevant files for this domain.
- Identify consistent patterns, tools, conventions, and practices.
- Include real code examples that reflect actual usage in the codebase.
- Focus on what the project is doing — not what it should do.
- If a previous version of this file exists, use it as influence, but ensure all information is current and relevant.

Write your findings to: `./{output-folder}/domains/{domain}.md`. Always prioritize accuracy and clarity over simply copying previous domain summaries.

Requirements:

- If code snippets are included, use exact code examples from project files.
- Do not invent recommendations or include external best practices.
- Only describe what is actually used in this project.

Your goal is to document how the "{domain}" domain is implemented within this specific codebase in such a way that anyone could leverage or add features to it.

After writing each of the domain files, read the contents of [./5-styleguide-generation.md](./5-styleguide-generation.md) and proceed accordingly, using `{output-folder}` as the `output-folder`.
