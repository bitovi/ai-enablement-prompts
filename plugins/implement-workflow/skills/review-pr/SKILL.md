---
name: review-pr
description: Review all commits on the current branch against remote main before opening a PR. Surfaces bad code, bad practices, inconsistencies, and files that should not be committed. Use when about to open a PR and wanting a code review first.
disable-model-invocation: true
context: fork
agent: general-purpose
allowed-tools: Bash(git fetch *) Bash(git log *) Bash(git diff *) Bash(git rev-parse *) Bash(git status *) Read Glob Grep
---

# PR Review — Pre-Merge Code Check

You are performing a pre-merge code review of the current branch against **remote** main (`origin/main`). Your job is to find real problems and report them concisely. Do not invent findings.

> This is the standalone, user-invocable form of the review process. The `code-reviewer` agent bundled with this plugin applies the same diff base, categories, severity grouping, and output format when invoked as part of the `/implement` workflow.
>
> _Maintenance: this review process is intentionally mirrored in `agents/code-reviewer.md` so that agent stays self-contained. Keep the two in sync when editing either._

---

## Step 1 — Gather Branch Information

Run these commands to establish the diff base:

```
git fetch origin
git rev-parse --abbrev-ref HEAD
git log --oneline origin/main..HEAD
```

This gives you the current branch name and every commit that is **not yet in `origin/main`** — exactly what would land on main if this PR merged. (If your project's trunk branch isn't `main`, substitute it.)

---

## Step 2 — Read the Full Diff

Get the full picture of what changed:

```
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

Then **read every changed file in full** using the `Read` tool. The diff gives you lines; the full file gives you context. You need both.

---

## Step 3 — Analyse for Issues

Work through the categories below. For each, flag only things you have **actually seen** in the changed files — not speculation.

### A. Files that should not be committed
- `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, any file containing secrets or credentials
- `node_modules/`, `dist/`, `build/`, `.next/` — compiled or installed artifacts that belong in `.gitignore`
- Large binary files with no clear reason to be in version control
- OS/IDE noise: `.DS_Store`, `Thumbs.db`, `.vscode/settings.json` (unless intentionally shared), `.idea/`

### B. Bad code
- `console.log`, `console.error`, `console.warn` left in non-test production code
- `TODO`, `FIXME`, `HACK`, `XXX` comments left in
- Commented-out code blocks
- `any` (or equivalent) type used as an escape hatch — not as a deliberate, justified typing
- Magic numbers or hardcoded strings that should be constants or config
- Functions over ~80 lines; deeply nested conditionals (3+ levels)

### C. Bad practices
- Configuration or secrets read directly from the environment instead of going through the project's settings/config layer
- Missing auth/permission guard on a new API route or other protected boundary
- Swallowed errors: empty `catch` blocks, or catches that only log and silently continue
- Missing input validation at a new API route boundary
- Frontend: reading environment config directly in a component instead of the project's config module
- Frontend: inline styling where a reusable shared class/component already exists
- Frontend: relative imports where the project uses configured path aliases

### D. Inconsistencies
- A new route or service that skips a layer of the project's architecture
- Mixed or inconsistent error-handling style compared to sibling files in the same module
- A new helper function that duplicates something already in a shared utils module
- A type/interface defined inline where it belongs in a shared types location

---

## Step 4 — Output Your Findings

Write directly as rendered markdown in the conversation. Do not create any files.

**The very first thing in your output must be the Executive Summary.** Everything else follows after.

---

### Executive Summary

One short paragraph (3–5 sentences). State:
- Whether this branch is **ready to open a PR** or **needs changes first**
- The total number of findings and the highest severity reached
- The single most important thing to address, if anything

Then the detail sections below, in this exact order:

---

### Files That Should Not Be Committed

If none: `None found.`

One line per file: `path/to/file` — reason it should not be here

---

### Bad Code

If none: `None found.`

Group by severity (**High** / **Medium** / **Low**). One line per finding:
`path/to/file.ts:line` — description

---

### Bad Practices

If none: `None found.`

Group by severity (**High** / **Medium** / **Low**). One line per finding:
`path/to/file.ts:line` — description

---

### Inconsistencies

If none: `None found.`

Group by severity (**High** / **Medium** / **Low**). One line per finding:
`path/to/file.ts:line` — description

---

## Constraints

- Do NOT run `git commit`, `git push`, or open a PR.
- Do NOT fix anything — report only.
- Do NOT report findings that aren't in the diff. If you didn't see it in a changed file, don't mention it.
- One line per finding. The user can read the code.
- Never omit a section — if there's nothing to report, write `None found.`
