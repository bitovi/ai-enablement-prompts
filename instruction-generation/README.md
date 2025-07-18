## Instruction Generation Prompt

This is an AI prompt chain.

This AI prompt chain generates a comprehensive `copilot-instruction.md` file by analyzing a codebase and understanding its technology stack, architecture, features, and styling guidelines.

## Use

To use this prompt chain, write something similar to the following in copilot:

```
You are assisting with generating a `copilot-instruction.md` file using a multi-step prompt chain.

The relevant files are in this GitHub repo: https://github.com/bitovi/ai-enablement-prompts. Specifically, the `/instruction-generation` folder.

Do not execute anything yet. First, read through all of the prompt files in `instruction-generation/`, in order, to understand the entire process and how the steps relate.

Once you’ve confirmed full understanding of the complete sequence, start executing the chain beginning with `1-determine-techstack.md`, then proceed step by step until all are complete.

For each step, output results into a corresponding `.results/` folder (mirroring the step’s filename, e.g., `1-determine-techstack.md` > `.results/1-determine-techstack.md`).

Only stop when all `instruction-generation` steps are complete and a full `copilot-instruction.md` can be generated.
```

## Agent Capabilities

The AI agent is expected to have the following capabilities:

- Read and write files
- Read and write folders
- Analyze code structure and patterns
- Understand technology stacks and frameworks
- Generate instruction files

## Parameters

This prompt chain is expected to be provided the following:

- {OUTPUT_FOLDER} - A path to the folder where generated instruction files will be saved (e.g., `.results/`)

## Execution

When given an {OUTPUT_FOLDER}, perform the following steps by reading these files and following their instructions in order:

- [./1-determine-techstack.md](./1-determine-techstack.md) - Analyze the codebase to identify the technology stack, frameworks, and libraries being used
- [./2-categorize-files.md](./2-categorize-files.md) - Categorize and organize files by their purpose and functionality
- [./3-identify-architecture.md](./3-identify-architecture.md) - Examine the project structure and identify architectural patterns and design decisions
- [./4-domain-deep-dive.md](./4-domain-deep-dive.md) - Analyze the business domain and understand the application's core functionality
- [./5-styleguide-generation.md](./5-styleguide-generation.md) - Generate style guidelines and coding standards based on existing code patterns
- [./6-build-instructions.md](./6-build-instructions.md) - Identify key features and capabilities of the application and create the application's instruction file

Each prompt should be provided with the {OUTPUT_FOLDER} parameter to ensure consistent output location.
