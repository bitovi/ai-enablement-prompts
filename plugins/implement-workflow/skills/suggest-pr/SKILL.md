---
name: suggest-pr
description: Suggest a pull request title and description for the current branch. Use when the user wants to open a PR, wants a PR description, or asks what to write for a pull request.
disable-model-invocation: true
allowed-tools: Bash(git fetch *) Bash(git log *) Bash(git diff *) Bash(git branch *) Bash(git rev-parse *)
---

# Suggest PR Title and Description

## Steps

1. **Identify the current branch and refresh the base** by running:
   ```
   git fetch origin
   git rev-parse --abbrev-ref HEAD
   ```
   The base is `origin/main` (substitute your project's trunk branch if different). Use the remote base so the diff isn't computed against a stale local `main`.

2. **Read all commits on this branch** that diverge from the base:
   ```
   git log --oneline origin/main..HEAD
   ```

3. **Read the full diff summary** against the base:
   ```
   git diff origin/main...HEAD --stat
   ```
   And the full diff for more detail:
   ```
   git diff origin/main...HEAD
   ```

4. **Suggest a PR title and description** following the format below.

## Output format

Output everything as rendered markdown directly in the conversation — do not create any files. Use real markdown syntax: `##` for section headers, backticks around all file names, function names, and technical identifiers.

```
**Title:** <type(scope): concise description all lowercase>

## Description
<two or three sentences in natural language explaining the overall goal of this PR and why the changes were made>

## Changelist
- <bullet: what changed and why, in natural language>
- <bullet: what changed and why, in natural language>
- <add more as needed>
```

## Guidelines

- **Title**: conventional commit format, all lowercase, no period, under 70 characters. Use the appropriate prefix (`feat`, `fix`, `refactor`, `chore`, etc.) and include a scope in parentheses matching the area affected (e.g. `feat(auth):`, `fix(api):`, `refactor(db):`). Example: `feat(auth): store session tokens in the database`.
- **Description**: high-level context for a reviewer — what problem this solves and why now. Natural language, full sentences.
- **Changelist**: one bullet per logical change. Keep each bullet short and punchy — one clause, no padding words like "in order to" or "so that". Use backticks around file names and technical identifiers. Do not explain the motivation or downstream effects; just state what changed.
- Honor your project's PR conventions — e.g. whether to include co-author lines. Keep implementation details that belong in inline comments out of the description.
