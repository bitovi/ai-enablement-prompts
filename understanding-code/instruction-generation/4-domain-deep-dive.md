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

For each of the domains listed in `./{output-folder}/3-architectural-domains.json`, analyze the codebase to understand how it implements that architectural domain.

The tech stack is summarized in `./{output-folder}/1-techstack.md`.

## Prioritization for Large Codebases

If the number of domains is large (more than 6) or the codebase is extensive, process domains in order of **breadth of impact** — prioritize domains whose patterns touch the most files or are most likely to affect new feature work. Use the file counts in `./{output-folder}/2-file-categorization.json` as a guide to relative importance.

If you approach context limits before completing all domains:
1. Finish the current domain fully before stopping.
2. In the final domain file, add a `## Skipped Domains` section listing any domains not yet analyzed.
3. Note the reason (context limit) so the next session can resume from the correct point.

Do not produce a partial analysis for any single domain — complete each one fully or skip it entirely and log it.

## Your Task (per domain)

Analyze each domain from two complementary perspectives:

**Software Developer** — Examine the implementation: how the domain is structured, what patterns and abstractions are used, what dependencies it has, and how maintainable or complex the code is.

**Product Manager** — Evaluate what this domain enables for end users: what features or user flows it supports, how it aligns with apparent business goals, and whether there are gaps or inconsistencies in the current implementation.

For each domain:

- Examine relevant files.
- Identify consistent patterns, tools, conventions, and practices.
- Include real code examples that reflect actual usage in the codebase.
- Note any user-facing features or workflows this domain supports.
- Focus on what the project is doing — not what it should do.

Write findings for each domain to: `./{output-folder}/4-domains/{domain}.md`

## Requirements

- If code snippets are included, use exact code examples from project files.
- Do not invent recommendations or include external best practices.
- Only describe what is actually used in this project.

Your goal is to document how each domain is implemented within this specific codebase in such a way that anyone could leverage or add features to it.

After writing all domain files, read the contents of [./5-styleguide-generation.md](./5-styleguide-generation.md) and proceed accordingly with {output-folder} as the `output-folder`.
