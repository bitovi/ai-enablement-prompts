---
name: create-skill-claude
description: Use this skill when the user asks to "create a skill", "add a skill", "make a new skill", "build a skill", or wants to automate a repeated workflow into a reusable prompt. Guides creating a properly structured Claude Code skill.
---

# Create Skill

Help the user create a new Claude Code skill in this project.

## Step 1: Clarify the Skill's Purpose

Ask the user (or infer from context):
- What task should the skill perform?
- Is it **reference content** (conventions, patterns, domain knowledge that applies inline) or **task content** (step-by-step actions like deploy/commit/generate)?
- Should Claude invoke it automatically, or only the user manually?
- Are there specific trigger phrases or situations?

## Step 2: Determine Placement

Project skills live at:
```
.claude/skills/<skill-name>/
├── SKILL.md          # Main instructions (required)
├── references/       # background knowledge, specs, checklists
├── examples/         # example inputs/outputs
└── scripts/          # helper shell scripts
```

## Step 3: Write the SKILL.md

Use this frontmatter template:

```yaml
---
name: skill-name
description: Use this skill when the user asks to "...", mentions "...", or wants to "...". Include specific trigger phrases.
---
```

### Complete Frontmatter Reference

All fields are optional. Only `description` is recommended.

| Field | Description |
|---|---|
| `name` | Display name / slash command. Lowercase letters, numbers, hyphens only (max 64 chars). Defaults to directory name. |
| `description` | What the skill does and when to use it. Claude uses this to decide when to auto-load. If omitted, uses first paragraph of content. |
| `argument-hint` | Hint shown during autocomplete (e.g., `[issue-number]` or `[filename] [format]`). |
| `disable-model-invocation` | `true` prevents Claude from auto-loading. Use for side-effect workflows (`/deploy`, `/send`). Description is **removed** from context. |
| `user-invocable` | `false` hides from `/` menu. Use for background knowledge. Description **stays** in context so Claude can auto-invoke. |
| `allowed-tools` | Tools Claude can use without asking permission when skill is active (e.g., `Read, Grep, Glob`). |
| `model` | Model to use when this skill is active. |
| `context` | Set to `fork` to run in a forked subagent context (isolated, no conversation history). |
| `agent` | Subagent type when `context: fork` is set. Options: `Explore`, `Plan`, `general-purpose`, or custom from `.claude/agents/`. Defaults to `general-purpose`. |
| `hooks` | Hooks scoped to this skill's lifecycle. |

### Invocation & Context Loading Matrix

| Configuration | User can invoke? | Claude can invoke? | Context behavior |
|---|---|---|---|
| *(default)* | Yes | Yes | Description always in context; full skill loads when invoked |
| `disable-model-invocation: true` | Yes | No | Description **not** in context; full skill loads when user invokes |
| `user-invocable: false` | No | Yes | Description always in context; full skill loads when Claude invokes |

### Dynamic Context Injection

The `!`command`` syntax runs shell commands before the skill content is sent to Claude. The output replaces the placeholder — Claude only sees the result, not the command.

```markdown
- Current branch: !`git branch --show-current`
- Staged files: !`git diff --name-only --cached`
```

### Arguments & String Substitutions

| Substitution | Description |
|---|---|
| `$ARGUMENTS` | All arguments passed when invoking. If not present in content, appended as `ARGUMENTS: <value>`. |
| `$ARGUMENTS[N]` | Access a specific argument by 0-based index (e.g., `$ARGUMENTS[0]`). |
| `$N` | Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`, `$2`). |
| `${CLAUDE_SESSION_ID}` | Current session ID. Useful for logging or session-specific files. |
| `${CLAUDE_SKILL_DIR}` | Directory containing this SKILL.md. Use to reference bundled scripts/files regardless of cwd. |

Example with positional arguments:
```markdown
---
name: migrate-component
description: Migrate a component from one framework to another
argument-hint: [component] [from-framework] [to-framework]
---

Migrate the $0 component from $1 to $2.
Preserve all existing behavior and tests.
```

## Step 4: Write Effective Instructions

The body of SKILL.md is the prompt Claude follows. Best practices:
- State the goal clearly at the top
- Use numbered steps for sequential workflows
- Reference supporting files with relative markdown links: `[checklist.md](checklist.md)`
- Keep it focused — one skill per domain
- **Keep SKILL.md under 500 lines.** Move detailed reference material to separate files.
- Include "ultrathink" in skill content to enable extended thinking
- For `context: fork`, the skill content becomes the subagent's prompt — must include an explicit task, not just guidelines

### Add Supporting Files

Supporting files keep SKILL.md focused. Reference them so Claude knows when to load each:

```markdown
## Additional resources

- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)
```

## Step 5: Create the Files

Create `.claude/skills/<skill-name>/SKILL.md` with:
1. Frontmatter with `name` and `description`
2. Clear, step-by-step instructions
3. Any supporting files the skill references

## Step 6: Register in Project Memory

If a `CLAUDE.md` file exists at the project root, append the new skill to reinforce discoverability. Add a bullet with the skill name and short description to the skills list:

```markdown
- **skill-name**: Short description of what the skill does
```

If no `CLAUDE.md` exists, skip this step — skills are still auto-discovered from `.claude/skills/`.

Confirm the skill was created and explain how to test it: the user can invoke it with `/<skill-name>` or describe the situation that should auto-trigger it.

## Troubleshooting

- **Skill not triggering:** Check description includes keywords users would naturally say. Verify with "What skills are available?" or invoke directly with `/skill-name`.
- **Skill triggers too often:** Make description more specific, or add `disable-model-invocation: true`.
- **Claude doesn't see all skills:** Skill descriptions share a context budget (2% of context window, fallback 16K chars). Run `/context` to check for warnings. Override with `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.
- **Permission control:** Use `Skill(name)` for exact match or `Skill(name *)` for prefix match in permission rules. Deny all with `Skill` in deny rules.
