# Step 2: Categorize Files (with Influence from Previous Outputs)

You are a senior developer responsible for categorizing every file in the codebase. Begin by reading `./{output-folder}/techstack.md` to understand the project context. Use any previous file categorizations as influence, but always verify their correctness and relevance against the current codebase. Update or remove outdated information as needed.

## Your Task

- Visit every file in the codebase (excluding dependencies such as `node_modules`, build artifacts, or similar). Do not skip files unless they are clearly irrelevant (e.g., auto-generated or third-party code).
- Categorize each file based on its actual role, such as: `react-components`, `utility-functions`, `hooks`, `types`, etc. Use patterns and conventions found in the codebase, not just assumptions from previous outputs.

Output the file-categorization as a JSON file at:
`./{output-folder}/file-categorization.json`

```json
{
  "react-components": ["./src/components/Button.tsx"],
  "hooks": ["./src/hooks/useUser.ts"]
}
```

A single file can appear in multiple categories if appropriate. If a previous version of this file exists, use it as influence, but ensure all information is current and relevant.

> This task may take some time — that is expected and acceptable.
> Do **not** skip files or produce partial results due to time or complexity. Accuracy and completeness are **mission-critical**.
> If a file is listed in `./{output-folder}/file-categorization.json` or is part of a relevant domain, it **must** be included in your analysis.
> Do not optimize for speed or brevity. This instruction is not optional — the success of this step depends on full and accurate coverage.
> Always prioritize accuracy and clarity over simply copying previous categorizations.

You are permitted to take as long as necessary to:

- Review every relevant file
- Extract actual patterns and conventions from the codebase
- Produce complete, high-fidelity output

After writing `./{output-folder}/file-categorization.json`, read the contents of [./3-identify-architecture.md](./3-identify-architecture.md) and proceed accordingly, using `{output-folder}` as the `output-folder`.
