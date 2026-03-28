# Instruction Generation Prompt Chain

This project provides an AI-powered prompt chain designed to generate two complementary output files by analyzing the structure, patterns, and intent of a codebase:

- **`{final_output_file}`** (e.g. `copilot-instructions.md`) — a machine-readable instruction file that helps AI tools like GitHub Copilot generate consistent, convention-following code
- **`OVERVIEW.md`** — a human-readable overview of the codebase covering system architecture, code structure, product features, and actionable insights

The chain guides an AI agent through the codebase from three perspectives: **Software Architect**, **Software Developer**, and **Product Manager** — ensuring the analysis captures design decisions, implementation patterns, and product intent.

<a href="https://youtu.be/X48osWOuaGI" target="_blank">
    <img width="500" alt="thumbnail-teach-code" src="https://github.com/user-attachments/assets/f87f6a84-2e31-49f9-b6af-b72bdcf0e821" />
    
</a>
<br />
<a href="https://youtu.be/X48osWOuaGI" target="_blank">https://youtu.be/X48osWOuaGI</a>
<br /><br />

👉 Bitovi can help you integrate this into your own SDLC workflow: [AI for Software Teams](https://www.bitovi.com/ai-for-software-teams)

## Overview

This prompt chain guides an AI agent through a series of structured steps to extract meaningful insights from a codebase. It is capable of:

- Identifying the technology stack and major frameworks used
- Mapping out file purposes and categorizing project structure
- Inferring architecture and design patterns (with Mermaid diagrams)
- Understanding domain concepts, key features, and user flows
- Generating stylistic and structural guidance for future code contributions

The final outputs serve as both an onboarding document for human collaborators (`OVERVIEW.md`) and a high-level guidance file that aligns AI-generated code with the project's existing conventions (`{final_output_file}`).

## Usage

To use this prompt chain, write something similar to the following in your agent, be sure to modify the parameters at the top accordingly:

```
{output_folder} = .results
{final_output_file} = /.github/copilot-instructions.md

You are assisting with generating a {final_output_file} file using a multi-step prompt chain.

1. Open this repository on GitHub: https://github.com/bitovi/ai-enablement-prompts.
2. Navigate to the `/understanding-code/instruction-generation` folder within the repo.
3. Review all the prompt files in this folder WITHOUT executing them. 
    - This will help you understand the full scope of the prompt chain.
4. Confirm you have a full understanding of the prompt chain sequence.
5. Once you're familiar with the flow, begin executing the prompts in numerical order:
    - 1-determine-techstack.md
    - 2-categorize-files.md
    - 3-identify-architecture.md
    - 4-domain-deep-dive.md
    - 5-styleguide-generation.md
    - 6-build-instructions.md
    - 7-validate.md
6. For each step, output results into a corresponding `{output_folder}/` folder.
    - Mirror the step’s filename e.g., `1-determine-techstack.md` > `{output_folder}/1-determine-techstack.md`.

Stop ONLY when:
    - All `instruction-generation` steps are complete
    - A full `{final_output_file}` has been generated
    - An `OVERVIEW.md` has been generated at the root of the repository
```

## Agent Capabilities

The AI agent executing this prompt chain is expected to support the following capabilities:

- Reading and writing individual files
- Reading and writing entire folders
- Analyzing code structure, file organization, and implementation patterns
- Identifying and understanding technology stacks, frameworks, and libraries
- Generating structured instruction files based on project analysis

## Parameters

This prompt chain is expected to be provided the following:

- {output_folder} - A path to the folder where generated instruction files will be saved (e.g., `.results/`)
- {final_output_file} - A file which combines all the work that's been done into a single place eg., `/.github/copilot-instructions.md`)

### Copilot
- {output_folder} - `.results/`
- {final_output_file} - `/.github/copilot-instructions.md`

## Execution

When given an {output_folder}, the AI agent will perform the following steps, reading each file and following it's instructions in order:

- [./1-determine-techstack.md](./1-determine-techstack.md)
    - Analyzes the codebase to identify the technology stack, frameworks, and libraries being used
- [./2-categorize-files.md](./2-categorize-files.md)
    - Categorizes and organizes files by their purpose and functionality
- [./3-identify-architecture.md](./3-identify-architecture.md)
    - Examines the project structure and identifies architectural patterns and design decisions from a **Software Architect** perspective; produces a Mermaid architecture diagram
- [./4-domain-deep-dive.md](./4-domain-deep-dive.md) 
    - Analyzes each architectural domain from both a **Software Developer** and **Product Manager** perspective, covering implementation patterns and user-facing functionality
- [./5-styleguide-generation.md](./5-styleguide-generation.md)
    - Generates a single style guide documenting per-category conventions and cross-cutting patterns, approached as a **Software Developer**
- [./6-build-instructions.md](./6-build-instructions.md)
    - Synthesizes all prior analysis into two output files: `{final_output_file}` (for AI tools) and `OVERVIEW.md` (for human collaborators)
- [./7-validate.md](./7-validate.md)
    - Reviews the generated instruction file for completeness, flags missing coverage, and lists any skipped domains

Each prompt should be provided with the {output_folder} and {final_output_file} parameters to ensure consistent output location.
