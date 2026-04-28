# Instruction Generation Prompt Chain

> **⚠️ This prompt chain has moved.** The individual prompt files that used to live here have been consolidated into a plugin skill. Agents should use the skill at [`/plugins/code/skills/instruction-generation/SKILL.md`](../../plugins/code/skills/instruction-generation/SKILL.md) instead.

This project provides an AI-powered prompt chain designed to generate a comprehensive instructions file (e.g., `copilot-instructions.md`) by analyzing the structure, patterns, and intent of a codebase.

The resulting file is designed to help AI tools like GitHub Copilot operate more effectively within the project by providing them with clear architectural context, domain understanding, and stylistic guidelines.

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
- Inferring architecture and design patterns
- Understanding domain concepts and key features
- Generating stylistic and structural guidance for future code contributions

The final output serves as a high-level onboarding and guidance document that aligns AI-generated code with your project's existing conventions and design.

## Usage

The prompt chain is now packaged as a plugin skill. To use it:

1. Install the `bitovi/ai-enablement-prompts` plugin
2. Ask your agent to "generate instruction files" or "analyze this codebase" — the `instruction-generation` skill will be invoked automatically

Or point your agent directly at the skill:

```
Read and follow the instructions in plugins/code/skills/instruction-generation/SKILL.md

{output-folder} = .results
{final_output_file} = /.github/copilot-instructions.md
```

The skill contains 6 sub-prompt files and a SKILL.md that orchestrates them via subagents, with Steps 3 (Architecture) and 5 (Style Guides) running in parallel.

## Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `{output-folder}` | Where intermediate analysis files are saved | `.results/` |
| `{final_output_file}` | Final combined output file | `/.github/copilot-instructions.md` |

### Recommended Defaults

| Tool | output-folder | final_output_file |
|------|--------------|-------------------|
| Copilot | `.results/` | `/.github/copilot-instructions.md` |
| Windsurf | `.windsurf/` | `/.windsurf/instructions.md` |
| Claude | `.results/` | `CLAUDE.md` |

For Windsurf, you want to move `instructions.md` into the `.windsurf/rules/` directory manually, this is the directory for context files. Cascade is for some reason unable to generate files in there, it doesn't have permission.

## Steps

The skill runs these steps (see the [SKILL.md](../../plugins/code/skills/instruction-generation/SKILL.md) for full details):

1. **Determine Tech Stack** — Analyzes the codebase to identify the technology stack, frameworks, and libraries
2. **Categorize Files** — Categorizes and organizes files by their purpose and functionality
3. **Identify Architecture** ⇄ **Style Guide Generation** (parallel) — Examines architectural patterns and generates style guides simultaneously
4. **Domain Deep Dive** — Analyzes how each architectural domain is implemented with real code examples
5. **Build Instructions** — Synthesizes all previous outputs into the final instruction file
