# Contributing to AI Enablement Prompts

Thanks for your interest in contributing to **AI Enablement Prompts**! This repository is a growing library of AI prompt chains designed to help AI agents automate and augment real-world software development workflows.

We welcome contributions of all kinds — from new prompt chains to improvements, bug reports, feedback, and documentation updates.

---

## Getting Started

1. **Fork the repository** and clone your fork locally.
2. Create a new branch:
   ```bash
   git checkout -b feature/my-new-prompt
   ```
3. Make your changes or additions.
4. Commit and push:
   ```bash
   git commit -m "Add [your change description]"
   git push origin feature/my-new-prompt
   ```
5. Submit a pull request with a clear description of what you’ve added or changed.

---

## Types of Contributions

Here are a few ways you can contribute:

### Prompt Chains
- Add a new AI prompt chain for automating a specific developer task
- Improve clarity, coverage, or accuracy of existing prompts
- Update markdown instructions for readability and precision

### Examples & Usage
- Add sample input/output flows for existing chains
- Contribute Copilot Chat usage snippets
- Add test repos or example scenarios if appropriate

### Issues & Feedback
- Report bugs or inaccuracies
- Suggest new workflows or prompt ideas
- Propose improvements to formatting, structure, or documentation

---

## Prompt Chain Format

All prompt chains should be placed in a dedicated subfolder under the repo root. Each chain should include:

- A `README.md` with:
  - A summary of what the prompt chain does
  - A usage section showing how to invoke it with Copilot or another agent
  - Any required parameters or setup instructions
- One or more `.md` files (e.g. `1-step-name.md`, `2-step-name.md`) each representing a distinct, actionable phase in the workflow

Please use numbered filenames to indicate execution order.

---

## Style Guidelines

- Keep instructions concise and readable
- Use consistent naming patterns across folders and files
- Assume users are familiar with GitHub Copilot or AI agents but not necessarily with your specific workflow

---

## Questions?

Feel free to open an issue if you’re unsure about how to contribute or want to float an idea before submitting a PR.

We’re excited to build this alongside the community and make AI-driven software development more accessible, scalable, and powerful.

— The Bitovi Team
