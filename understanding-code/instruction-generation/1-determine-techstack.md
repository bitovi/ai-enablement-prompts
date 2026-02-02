# Step 1: Determine the Tech Stack (with Influence from Existing Instructions)

Begin by reviewing any previous tech stack summaries or related documentation. Use these as a reference point, but always verify their correctness and relevance against the current codebase. Update or remove outdated information as needed.

Your summary should include:

## Core Technology Analysis

- Programming language(s) used (verify in code, not just docs)
- Primary framework (e.g., React, Angular, Django)
- Any secondary or tertiary frameworks/libraries
- State management approach (if applicable)
- Other relevant technologies, tools, or architectural patterns

## Domain Specificity Analysis

- What specific problem domain does this application target? (e.g., "chaos game theory visualization", "e-commerce platform", "blog CMS", "data visualization dashboard")
- What are the core mathematical, business, or domain concepts? (e.g., "fractal mathematics", "payment processing", "content management")
- What type of user interactions does it support? (e.g., "mathematical parameter manipulation", "shopping workflows", "content editing")
- What are the primary data types and structures used? (e.g., "geometric points and vertices", "product catalogs", "articles and metadata")

## Application Boundaries

- What features/functionality are clearly within scope based on existing code?
- What types of features would be architecturally inconsistent with the current design?
- Are there any specialized libraries, frameworks, or mathematical concepts that suggest domain constraints?

**Action:**
Add all your findings to `./{output-folder}/techstack.md`. If an older version of this file exists, use it as influence, but ensure all information is current and relevant.

The domain analysis should help future prompts understand what types of new features would fit vs. conflict with the existing application architecture. Always prioritize accuracy and clarity over simply copying previous summaries.

Once completed, read [./2-categorize-files.md](./2-categorize-files.md) and continue on accordingly, using `{output-folder}` as the `output-folder`.
