# Instruction Generation Prompt Chain

This project provides an AI-powered prompt chain designed to generate a comprehensive instructions file `{final_output_file}.md` (ex. `copilot-instruction.md`) by analyzing the structure, patterns, and intent of a codebase.

The resulting file is designed to help AI tools like GitHub Copilot operate more effectively within the project by providing them with clear architectural context, domain understanding, and stylistic guidelines.

<a href="https://youtu.be/X48osWOuaGI">
    <img width="500" alt="thumbnail-teach-code" src="https://github.com/user-attachments/assets/f87f6a84-2e31-49f9-b6af-b72bdcf0e821" />
    
</a>
<br />
<a href="https://youtu.be/X48osWOuaGI">https://youtu.be/X48osWOuaGI</a>

## Overview

This prompt chain guides an AI agent through a series of structured steps to extract meaningful insights from a codebase. It is capable of:

- Identifying the technology stack and major frameworks used
- Mapping out file purposes and categorizing project structure
- Inferring architecture and design patterns
- Understanding domain concepts and key features
- Generating stylistic and structural guidance for future code contributions

The final output, `{final_output_file}.md` (the name of this file is a parameter that must be passed into the AI Agent), serves as a high-level onboarding and guidance document that aligns AI-generated code with your project's existing conventions and design.

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
6. For each step, output results into a corresponding `{output_folder}/` folder.
    - Mirror the step’s filename e.g., `1-determine-techstack.md` > `{output_folder}/1-determine-techstack.md`.

Stop ONLY when:
    - All `instruction-generation` steps are complete
    - A full `{final_output_file}` can be generated.
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

## Windsurf
- {output_folder} - `.windsurf/`
- {final_output_file} - `/.windsurf/instructions.md`

For Windsurf, you want to move `instructions.md` into the `.windsurf/rules/` directory manually, this is the directory for context files. Cascade is for some reason unable to generate files in there, it doesn't have permission.

## Execution

When given an {output_folder}, the AI agent will perform the following steps, reading each file and following it's instructions in order:

- [./1-determine-techstack.md](./1-determine-techstack.md)
    - Analyzes the codebase to identify the technology stack, frameworks, and libraries being used
- [./2-categorize-files.md](./2-categorize-files.md)
    - Categorizes and organizes files by their purpose and functionality
- [./3-identify-architecture.md](./3-identify-architecture.md)
    - Examines the project structure and identifies architectural patterns and design decisions
- [./4-domain-deep-dive.md](./4-domain-deep-dive.md) 
    - Analyzes the business domain and understands the application's core functionality
- [./5-styleguide-generation.md](./5-styleguide-generation.md)
    - Generates style guidelines and coding standards based on existing code patterns
- [./6-build-instructions.md](./6-build-instructions.md)
    - Identifies key features and capabilities of the application and creates the application's instruction file

Each prompt should be provided with the {output_folder} parameter to ensure consistent output location.
