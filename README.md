<div align="center">

<img width="128" height="128" alt="superhero-dev" src="https://github.com/user-attachments/assets/c716fb81-27e3-4acf-a873-e6425a39e136" />

# AI-Enablement Prompts

</div>

**AI-Enablement Prompts** is a collection of advanced AI prompt chains created by [Bitovi](https://www.bitovi.com), a consultancy on the cutting edge of AI-augmented software development. These prompts are designed to help AI agents like GitHub Copilot move beyond simple autocomplete and become valuable, context-aware teammates.

Each prompt or prompt chain is built to guide the AI through specific engineering workflows — analyzing a codebase, generating documentation, implementing features, and more — using clearly defined, repeatable steps that reflect how real engineers work.

Our goal is to bridge the gap between general-purpose AI models and project-specific knowledge, enabling faster, more accurate, and more scalable development.

## Repository Structure

This repo has two kinds of content:

- **[`/plugins`](./plugins)** – Installable Claude Code / VS Code Copilot **plugins** (skills, agents, hooks). See [PLUGINS.md](./PLUGINS.md) for the full catalog and installation steps.
- **Standalone prompt chains** – Plain markdown prompts you can paste directly into any AI chat agent, no plugin install required. Organized by what they help the AI accomplish:
  - **[`/understanding-code`](./understanding-code)** – Prompts that help AI understand and document existing codebases
  - **[`/writing-code`](./writing-code)** – Prompts that assist with implementing new functionality (specs, Jira ticket automation, React patterns)
  - **[`/writing-stories`](./writing-stories)** – Prompts that turn Figma designs, screenshots, or images into user stories and Jira tickets
  - **[`/figma`](./figma)** – Figma-to-React skills (design, implement, sync, Code Connect)
  - **[`/creating-prompts`](./creating-prompts)** – Meta-skill for authoring new agent skills
  - **[`/crop-image`](./crop-image)** – A single prompt for precisely cropping an image

Some of these also have a packaged plugin version — where that's the case, the folder's `README.md` links to it. Use whichever fits your workflow: paste the prompt directly, or install the plugin for the maintained, auto-loading version. Every subfolder has its own `README.md` explaining what it contains and how to run it.

## What's Inside

A few examples of what's available (see [PLUGINS.md](./PLUGINS.md) for the full, current plugin catalog):

### 1. Developer Docs Generator

**Plugin:** `code` → `instruction-generation` skill

Generates a `copilot-instructions.md` file that helps AI tools operate effectively within your codebase. Ideal for onboarding AI tools (or humans) with deep, structured context.

**Features:**

- Analyzes the tech stack and architecture
- Categorizes files by role
- Extracts coding patterns and naming conventions
- Documents features and domain logic

→ [View the `code` plugin](./plugins/code/README.md)

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

- [Claude Code](https://claude.com/claude-code) or [GitHub Copilot Chat](https://github.com/features/copilot) (or an equivalent AI agent with tool access)
- MCP (Model Context Protocol) server access if required (for Jira, Figma, attachments, etc.)
- A valid codebase or ticket to operate on

### Getting Started — Plugins (recommended)

1. Add the marketplace: `claude plugin marketplace add bitovi/ai-enablement-prompts --scope project`
2. Install the plugin(s) you need, e.g. `claude plugin install code@bitovi-ai-enablement --scope project`
3. Full instructions, the plugin catalog, and VS Code Copilot / Copilot CLI setup are in [PLUGINS.md](./PLUGINS.md).

### Getting Started — Standalone Prompt Chains

1. Open the repo: https://github.com/bitovi/ai-enablement-prompts
2. Navigate to the prompt folder you're interested in.
3. Read the `README.md` for that prompt chain to understand the flow, inputs, and whether a packaged plugin version is also available.
4. Open your AI agent's chat and paste the example input provided.
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
