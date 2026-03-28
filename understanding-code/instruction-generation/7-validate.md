You are a senior AI engineer performing a final quality check on the two files generated in step 6: `{final_output_file}` and `OVERVIEW.md`.

Read both files and verify them against the source materials produced during this prompt chain.

## Checks to Perform

### Checks for `{final_output_file}`

#### 1. Category Coverage

For every category in `./{output-folder}/2-file-categorization.json`:

- Confirm it is referenced in `{final_output_file}`
- Confirm at least one representative file example is present
- Confirm the conventions described match what is in `./{output-folder}/5-style-guide.md`

Flag any category that is missing or whose conventions were omitted.

### 2. Domain Coverage

For every domain in `./{output-folder}/3-architectural-domains.json`:

- Confirm its required patterns and architectural constraints are reflected in the **Integration Rules** section of `{final_output_file}`

Flag any domain whose constraints are absent or incomplete.

If step 4 produced a `## Skipped Domains` section in any domain file, list those domains explicitly as unanalyzed and note that the instruction file may be incomplete for those areas.

### 3. Example Prompt Validity

Verify that the **Example Prompt Usage** section in `{final_output_file}` only references:

- File categories that exist in `2-file-categorization.json`
- Naming and placement conventions consistent with `5-style-guide.md`

Flag any invented file types or paths not supported by the codebase analysis.

### 4. Invented Content

Scan `{final_output_file}` for any patterns, constraints, or conventions that cannot be traced back to:

- `./{output-folder}/1-techstack.md`
- `./{output-folder}/5-style-guide.md`
- `./{output-folder}/3-architectural-domains.json`

Flag these as potentially invented and recommend removal.

---

### Checks for `OVERVIEW.md`

#### 5. Three-Perspective Coverage

Confirm `OVERVIEW.md` contains a distinct section for each of the three perspectives:

- **System Architecture** (Software Architect)
- **Codebase Structure** (Software Developer)
- **Product & Features** (Product Manager)

Flag any perspective whose section is missing or consists only of generic statements not grounded in the actual codebase analysis.

#### 6. Mermaid Diagram Validity

Confirm that at least one Mermaid diagram is present in `OVERVIEW.md`. Verify:

- The diagram uses valid Mermaid syntax (`graph TD`, `flowchart LR`, `sequenceDiagram`, etc.)
- The components or flows shown match what was found in steps 3 and 4 — flag any invented nodes or relationships

#### 7. Actionable Insights Coverage

Confirm the **Actionable Insights & Open Questions** section in `OVERVIEW.md` is present and contains at least one concrete insight or question per perspective.

Flag if the section is empty or only restates facts already covered in the body sections.

---

## Output

Write your findings to `./{output-folder}/7-validation-report.md` using the following structure:

```markdown
# Validation Report

## Summary
<!-- Overall assessment: PASS / PASS WITH WARNINGS / FAIL -->

## `{final_output_file}` Issues
<!-- Missing or incomplete coverage, invented content, invalid example prompts -->

## `OVERVIEW.md` Issues
<!-- Missing perspectives, invalid Mermaid, thin insights section -->

## Skipped Domains
<!-- List any domains flagged as skipped in step 4, if applicable -->

## Recommended Actions
<!-- Specific, actionable fixes for any issues found above -->
```

If no issues are found, write a brief PASS summary confirming that both output files are complete and traceable.
