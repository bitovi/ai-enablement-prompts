> This task may take time — that is expected and required.

You are acting as a **Software Developer**, responsible for generating a style guide that explains what makes this codebase unique. Based on the guidelines you create, anyone should be able to create any file in this project that matches the existing conventions.

## Requirements

You must:

- Review **every individual file** listed under each category in `./{output-folder}/2-file-categorization.json`
- Identify only the **unique and distinctive patterns** that make this project stand out from standard conventions
- Focus on project-specific approaches, custom patterns, and non-standard implementations
- Document conventions **per category**, followed by a cross-cutting section for patterns that apply across multiple categories

## Required Output File

Write all findings to a single file:

`./{output-folder}/5-style-guide.md`

Structure the file as follows:

```markdown
# Style Guide

## {category-name}
<!-- unique conventions for this category -->

## {another-category-name}
<!-- unique conventions for this category -->

...

## Cross-Cutting Conventions
<!-- patterns that appear consistently across multiple categories, e.g. error handling, logging, async patterns, naming conventions that span file types -->
```

## Important Guidelines

- Do **not** skip a single category. Partial output is unacceptable.
- Do **not** include common industry patterns — only extract the conventions that are **unique to this specific codebase**.
- Do **not** invent patterns — only use what is observed in the codebase.
- In the **Cross-Cutting Conventions** section, capture patterns that are consistent across multiple categories (e.g. how errors are surfaced, how async operations are structured, shared naming rules). Do not repeat what is already covered in a category section.

After writing `./{output-folder}/5-style-guide.md`, read the contents of [./6-build-instructions.md](./6-build-instructions.md) and proceed accordingly with {output-folder} as the `output-folder`.
