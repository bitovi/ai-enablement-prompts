# implement-workflow

An end-to-end feature-implementation workflow for Claude Code. Hand it a spec, plan, or ticket and it drives the change from understanding through a green, review-clean PR — designing, building, testing, self-reviewing with a dedicated `code-reviewer` agent, then prepping the pull request.

## What it does

`/implement` runs an eight-step workflow as a tracked to-do list:

1. **Understand** — read the spec and the relevant code; identify the area, layers, and constraints.
2. **Design** — outline the approach (files, schemas, migrations, API, UI) and align before building.
3. **Implement** — build it respecting the project's architecture and conventions.
4. **Test** — behavior-first tests; never touch production/shared systems; synthetic data only.
5. **Self-review** — spin up the `code-reviewer` agent against the main branch.
6. **Address feedback** — deliberately fix / push back / defer each finding.
7. **Update docs** — convention, testing, and onboarding docs as needed.
8. **Prep the PR** — get the branch green via `ready-to-push`, then produce a `suggest-pr`-format title + description.

## What's in this plugin

| Component | Type | What it does |
|---|---|---|
| `implement` | skill | The eight-step workflow above. The entry point. |
| `ready-to-push` | skill | Runs the project's test → lint → format/type-check → build, fixing and rerunning each until green. |
| `review-pr` | skill | Standalone pre-merge review of the branch vs. remote main. |
| `suggest-pr` | skill | Produces a conventional-commit PR title + Description + Changelist. |
| `code-reviewer` | agent | Self-contained senior reviewer the `implement` workflow spawns at step 5. |

## Installation

```bash
# One-time: add the Bitovi marketplace
claude plugin marketplace add bitovi/ai-enablement-prompts

# Install this plugin
claude plugin install implement-workflow@bitovi-ai-enablement
```

You can also browse and install via the `/plugin` command inside Claude Code.

To test before it merges, point the marketplace at the feature branch:

```bash
claude plugin marketplace remove bitovi-ai-enablement
claude plugin marketplace add https://github.com/bitovi/ai-enablement-prompts.git#<feature-branch>
claude plugin install implement-workflow@bitovi-ai-enablement
```

## Usage

### Invoke it

```
/implement-workflow:implement <spec, plan, or ticket>
```

(The plugin-qualified form is unambiguous; the bare `/implement` works too when no other command shares the name.)

**Input** — `$ARGUMENTS` is your spec, implementation plan, or ticket. Anything that describes the change works:

- a pasted ticket or acceptance criteria: `/implement-workflow:implement Add CSV export to the reports page — columns: name, email, created_at`
- a path to a spec or plan file: `/implement-workflow:implement docs/specs/bulk-invite.md`
- a free-form description of the feature

It's deliberately **manual-invoke only** (`disable-model-invocation: true`) — Claude won't start building on its own; you trigger it.

**What happens** — Claude works the eight steps as a visible to-do list, pausing to ask whenever the design, scope, or review feedback is unclear. At step 5 it launches the `implement-workflow:code-reviewer` agent; at step 8 it runs `ready-to-push` and prints a ready-to-paste PR title and description. It does **not** commit, push, or open the PR — that stays your call.

> **Note:** the bundled `code-reviewer` agent runs with `memory: project`, so it keeps Claude-managed review notes scoped to the repo you run it in (stored under that repo's `.claude/`). If you'd rather it not persist anything in your project, drop the `memory: project` line from `agents/code-reviewer.md`.

### The bundled skills also work standalone

```
/implement-workflow:ready-to-push      # get the branch green
/implement-workflow:review-pr          # pre-merge review vs. remote main
/implement-workflow:suggest-pr         # PR title + description for the current branch
```

## How to modify it

This plugin ships **intentionally generic** — each step defers to your repo's own conventions (read from `CLAUDE.md`, your styleguide, your `TESTING.md`, etc.). It was originally tuned for a specific stack; that full, concrete tuning is preserved as a worked example in [`skills/implement/references/example-profile-trackframe.md`](skills/implement/references/example-profile-trackframe.md). Read it to see what "follow your project's conventions" looks like made concrete, then adapt the pieces below.

**To re-tune it for your stack:**

1. **`code-reviewer` agent** (`agents/code-reviewer.md`) — replace the stack facts (framework, package manager, DB/ORM, auth) in the intro, and the architecture/layering rules in the checks. This is where most project-specific knowledge lives.
2. **`ready-to-push`** (`skills/ready-to-push/SKILL.md`) — set the exact test/lint/format/build commands for your repo, and add them to the skill's `allowed-tools` frontmatter so they don't prompt for permission each run, e.g.:
   ```yaml
   allowed-tools: Bash(npm test*) Bash(npm run lint*) Bash(npm run build*)
   ```
3. **Config & settings rules** — point the "no raw env access; go through the settings layer" guidance (in `implement` step 3, `review-pr`, and the agent) at your project's config module and example env file.
4. **Migrations** — adjust or remove the idempotent-migration rules if your project doesn't use them.
5. **Test guardrails** — name your production/shared external systems and your test database in `implement` step 4 and the agent's Tests section.
6. **Commit/PR conventions** — set your conventional-commit scopes, co-author policy, and auto-comment policy in `suggest-pr` and `implement` step 8.

> **Note:** Don't edit the synced copy in `bitovi/claude-plugins` — it's regenerated from this repo. Make changes here in `ai-enablement-prompts`, or fork the plugin into your own project's `.claude/` to tune it locally.

## License

MIT — see the repository [LICENSE](../../LICENSE).
