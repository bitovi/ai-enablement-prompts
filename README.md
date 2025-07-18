<img width="128" height="128" alt="superhero-dev" src="https://github.com/user-attachments/assets/c716fb81-27e3-4acf-a873-e6425a39e136" />

# AI-Enablement Prompts

**AI-Enablement Prompts** is a collection of advanced AI prompt chains created by [Bitovi](https://www.bitovi.com), a consultancy on the cutting edge of AI-augmented software development. These prompts are designed to help AI agents like GitHub Copilot move beyond simple autocomplete and become valuable, context-aware teammates.

Each prompt or prompt chain is built to guide the AI through specific engineering workflows — analyzing a codebase, generating documentation, implementing features, and more — using clearly defined, repeatable steps that reflect how real engineers work.

Our goal is to bridge the gap between general-purpose AI models and project-specific knowledge, enabling faster, more accurate, and more scalable development.

## Repository Structure

Prompts in this repo are organized into **high-level categories** based on what they help the AI accomplish:

- **`/understanding-code`** – Prompt chains that help AI understand and document existing codebases
- **`/writing-code`** – Prompt chains that assist with implementing new functionality based on external input (e.g. Jira tickets)

Each subfolder contains one or more prompts or prompt chains, each with its own `README.md` explaining how to use it.


## What's Inside

Here are a few currently available prompt chains:

### 1. Developer Docs Generator  
**Path:** `understanding-code/instruction-generation`

Generates a `copilot-instruction.md` file that helps AI tools operate effectively within your codebase. Ideal for onboarding AI tools (or humans) with deep, structured context.

**Features:**

- Analyzes the tech stack and architecture
- Categorizes files by role
- Extracts coding patterns and naming conventions
- Documents features and domain logic

→ [View prompt chain](./understanding-code/instruction-generation/README.md)

### 2. Jira Ticket Automation  
**Path:** `writing-code/generate-feature`

Takes a Jira ticket number and walks the AI through implementing the described feature — including gathering Figma designs and file attachments — then writing the code.

**Features:**

- Pulls ticket data from Atlassian
- Fetches designs from Figma and files from internal systems
- Organizes context for implementation
- Outputs modular, convention-aligned code

→ [View prompt chain](./writing-code/generate-feature/README.md)

## How to Use

### Requirements

- [GitHub Copilot Chat](https://github.com/features/copilot) or an equivalent AI chat agent with tool access
- MCP (Model Context Protocol) server access if required (for Jira, Figma, attachments, etc.)
- A valid codebase or ticket to operate on

### Getting Started

1. Open the repo: https://github.com/bitovi/ai-enablement-prompts  
2. Navigate to the prompt folder you're interested in.
3. Read the `README.md` for that prompt chain to understand the flow and inputs.
4. Open Copilot Chat and paste the example input provided.
5. Provide the necessary parameters:
   - `{TICKET_NUMBER}` for Jira-based prompts
   - `{OUTPUT_FOLDER}` for saving generated results
6. Execute each step in order. These workflows are designed to build cumulative context.

## Built by Bitovi, Leaders in AI-Enabled Development

Bitovi is actively integrating AI into real-world software engineering — not just internally, but with clients across industries. From custom training to full-scale workflow automation, we're helping teams embed AI across the stack.

This repo reflects our hands-on experience building practical AI tools, backed by years of consulting expertise in scalable, maintainable software development.

Need help enabling your team? [Talk to us](https://www.bitovi.com/contact)

## Contributing

Have ideas for new prompt chains? Want to improve an existing one? Check out [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.
