---
name: instruction-generation
description: Onboard an AI agent to an unknown codebase by generating a comprehensive instructions file. Use when asked to analyze a codebase, generate copilot instructions, create an onboarding document, or teach an AI about a project. Runs a 6-step prompt chain covering tech stack, file categorization, architecture, domain analysis, style guides, and instruction building.
---

# Skill: Instruction Generation

This skill guides you through a multi-step analysis chain to generate a comprehensive instructions file (e.g., `copilot-instructions.md`) by analyzing the structure, patterns, and intent of a codebase. The resulting file helps AI tools operate more effectively within the project by providing clear architectural context, domain understanding, and stylistic guidelines.

## Overview

This prompt chain walks through structured steps to extract meaningful insights from a codebase:

- Identifying the technology stack and major frameworks
- Mapping out file purposes and categorizing project structure
- Inferring architecture and design patterns
- Understanding domain concepts and key features
- Generating stylistic and structural guidance for future code contributions

The final output serves as a high-level onboarding and guidance document that aligns AI-generated code with the project's existing conventions and design.

## Parameters

Before starting, define these parameters:

- **{output-folder}** — Path where intermediate analysis files are saved (e.g., `.results/`)
- **{final_output_file}** — Final combined output file (e.g., `/.github/copilot-instructions.md`)

### Recommended Defaults

| Tool | output-folder | final_output_file |
|------|--------------|-------------------|
| Copilot | `.results/` | `/.github/copilot-instructions.md` |
| Windsurf | `.windsurf/` | `/.windsurf/instructions.md` |
| Claude | `.results/` | `CLAUDE.md` |

## Execution

Run the following steps in order. Each step reads the output of previous steps.

For each step:
1. Read the corresponding sub-prompt file from this skill's folder
2. Launch a subagent with the sub-prompt contents, substituting `{output-folder}` and `{final_output_file}` with the resolved parameter values
3. Wait for the subagent to complete before moving to the next step (unless steps can run in parallel — see below)

The sub-prompt files are located alongside this SKILL.md file.

### Execution Order

Steps 3 and 5 have no dependency on each other and **should be run in parallel** to save time:

```
Step 1 (Tech Stack)
  ↓
Step 2 (Categorize Files)
  ↓
Step 3 (Architecture)  ←──── run in parallel ────→  Step 5 (Style Guides)
  ↓
Step 4 (Domain Deep Dive)
  ↓
Step 6 (Build Instructions)
```

---

### Step 1: Determine Tech Stack

Read [./1-determine-techstack.md](./1-determine-techstack.md) and launch a subagent with its contents.

The subagent should analyze the codebase and write its findings to `./{output-folder}/1-techstack.md`.

---

### Step 2: Categorize Files

**Depends on:** Step 1

Read [./2-categorize-files.md](./2-categorize-files.md) and launch a subagent with its contents.

The subagent should read `./{output-folder}/1-techstack.md` first, then categorize every file in the codebase and write the result to `./{output-folder}/2-file-categorization.json`.

---

### Step 3: Identify Architecture ⇄ Step 5: Style Guide Generation (parallel)

After Step 2 completes, launch Steps 3 and 5 as **parallel subagents** — they have no dependency on each other.

#### Step 3: Identify Architecture

**Depends on:** Steps 1, 2

Read [./3-identify-architecture.md](./3-identify-architecture.md) and launch a subagent with its contents.

The subagent should read `./{output-folder}/1-techstack.md` and `./{output-folder}/2-file-categorization.json`, then identify architectural domains and write the result to `./{output-folder}/3-architectural-domains.json`.

#### Step 5: Style Guide Generation

**Depends on:** Step 2

Read [./5-styleguide-generation.md](./5-styleguide-generation.md) and launch a subagent with its contents.

The subagent should read `./{output-folder}/2-file-categorization.json`, then for each category write a style guide to `./{output-folder}/5-style-guides/{category}.md`.

---

### Step 4: Domain Deep Dive

**Depends on:** Step 3

Wait for Step 3 to complete. Read [./4-domain-deep-dive.md](./4-domain-deep-dive.md) and launch a subagent with its contents.

The subagent should read `./{output-folder}/3-architectural-domains.json` and `./{output-folder}/1-techstack.md`, then for each domain write findings to `./{output-folder}/4-domains/{domain}.md`.

---

### Step 6: Build Instructions

**Depends on:** Steps 3, 4, 5 (all must be complete)

Read [./6-build-instructions.md](./6-build-instructions.md) and launch a subagent with its contents.

The subagent should synthesize all previous outputs (including `./{output-folder}/4-domains/{domain}.md` files) and generate the final instruction file at `{final_output_file}`.

---

## Alternative: All-in-One Usage

You can run this entire chain by providing the agent with these parameters and instructing it to execute all 6 steps in sequence:

```
{output-folder} = .results
{final_output_file} = /.github/copilot-instructions.md

Execute the instruction-generation skill steps 1 through 6 in order.
For each step, read the sub-prompt file and launch a subagent to perform the work.
Stop only when all steps are complete and {final_output_file} is generated.
```
