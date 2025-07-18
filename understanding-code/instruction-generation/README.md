# Instruction Generation Prompt Chain

This project provides an AI-powered prompt chain designed to generate a comprehensive `copilot-instruction.md` file by analyzing the structure, patterns, and intent of a codebase.

The resulting file is designed to help AI tools like GitHub Copilot operate more effectively within the project by providing them with clear architectural context, domain understanding, and stylistic guidelines.

## Overview

This prompt chain guides an AI agent through a series of structured steps to extract meaningful insights from a codebase. It is capable of:

- Identifying the technology stack and major frameworks used
- Mapping out file purposes and categorizing project structure
- Inferring architecture and design patterns
- Understanding domain concepts and key features
- Generating stylistic and structural guidance for future code contributions

The final output, `copilot-instruction.md`, serves as a high-level onboarding and guidance document that aligns AI-generated code with your project's existing conventions and design.

## Usage

To use this prompt chain, write something similar to the following in copilot:

```
You are assisting with generating a `copilot-instruction.md` file using a multi-step prompt chain.

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
6. For each step, output results into a corresponding `.results/` folder.
    - Mirror the step’s filename e.g., `1-determine-techstack.md` > `.results/1-determine-techstack.md`.

Stop ONLY when:
    - All `instruction-generation` steps are complete
    - A full `copilot-instruction.md` can be generated.
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

- {OUTPUT_FOLDER} - A path to the folder where generated instruction files will be saved (e.g., `.results/`)

## Execution

When given an {OUTPUT_FOLDER}, the AI agent will perform the following steps, reading each file and following it's instructions in order:

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

Each prompt should be provided with the {OUTPUT_FOLDER} parameter to ensure consistent output location.
