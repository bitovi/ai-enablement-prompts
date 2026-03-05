---
name: create-skill
description: Create new Agent Skills for this project. Use when asked to create a skill, document a workflow, or teach Copilot a new capability. Skills are stored in .github/skills/ and can include instructions, scripts, examples, and resources.
---

# Skill: Creating Agent Skills

This skill teaches how to create Agent Skills for this project following the VS Code Agent Skills standard.

## What Are Agent Skills?

Agent Skills are folders of instructions, scripts, and resources that AI agents (Copilot, Claude, etc.) can load when relevant to perform specialized tasks. They are:

- **Portable**: Work across VS Code, Copilot CLI, and GitHub Copilot coding agent
- **On-demand**: Only loaded when relevant to the current task
- **Composable**: Multiple skills can work together
- **Resource-rich**: Can include scripts, examples, templates, and documentation

## When to Create a Skill

Create a skill when you need to:
- Document a repeatable workflow or process
- Teach domain-specific knowledge that applies to multiple tasks
- Provide scripts, templates, or examples for common operations
- Define specialized capabilities that go beyond coding standards

**Don't create a skill** when you just need:
- Coding standards or style guidelines → Use custom instructions instead
- One-time documentation → Use regular markdown files
- File-specific rules → Use glob-based instructions

## Skill Directory Structure

```
.github/skills/
└── your-skill-name/
    ├── SKILL.md           # Required: Skill definition
    ├── script.sh          # Optional: Helper scripts
    ├── template.ts        # Optional: Code templates
    └── examples/          # Optional: Example files
        └── example-1.md
```

## SKILL.md Format

Every skill must have a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: skill-name
description: Clear description of what the skill does and when to use it
---

# Skill Title

Detailed instructions, guidelines, and examples...
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier, lowercase with hyphens (max 64 chars) |
| `description` | Yes | What it does and when to use it (max 1024 chars) |

### Writing Effective Descriptions

The description determines when Copilot loads your skill. Be specific about:
- **What** the skill accomplishes
- **When** it should be used (triggers)
- **What kind of tasks** it helps with

**Good description:**
```yaml
description: Create and configure tRPC routers with proper type inference, input validation using Zod schemas, and error handling. Use when adding new API endpoints, creating CRUD operations, or setting up tRPC procedures.
```

**Bad description:**
```yaml
description: Helps with tRPC stuff.
```

### Body Content Guidelines

The body should include:

1. **Overview**: What the skill accomplishes
2. **When to Use**: Clear triggers for activation
3. **Step-by-Step Instructions**: Detailed procedures
4. **Examples**: Input/output examples with code
5. **Common Mistakes**: What to avoid
6. **Resource References**: Links to included files

### Referencing Resources

Reference files in the skill directory using relative paths:

```markdown
Use the [test template](./test-template.ts) as a starting point.

See [examples](./examples/) for common patterns.

Run the [setup script](./setup.sh) to initialize the environment.
```

## Skill Loading Process

Skills use progressive disclosure for efficiency:

1. **Discovery**: Agent reads `name` and `description` from frontmatter
2. **Loading**: When relevant, agent loads the full `SKILL.md` body
3. **Resources**: Additional files load only when explicitly referenced

This means you can have many skills without bloating context.

## Example Skills

### Simple Instruction Skill

```markdown
---
name: component-testing
description: Test React components using Vitest and Testing Library. Use when writing component tests, setting up test utilities, or debugging test failures.
---

# Component Testing

## Testing Stack
- Vitest for test runner
- @testing-library/react for component rendering
- @testing-library/user-event for interactions
- MSW for API mocking

## Test File Location
Place tests next to components: `ComponentName.test.tsx`

## Basic Test Structure
\`\`\`typescript
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
\`\`\`
```

### Skill with Scripts and Templates

```
.github/skills/database-migration/
├── SKILL.md
├── migration-template.sql
└── validate-migration.sh
```

```markdown
---
name: database-migration
description: Create and apply Prisma database migrations safely. Use when changing the schema, adding new models, or modifying existing tables.
---

# Database Migration

## Before Making Changes
1. Check current migration status: `npm run db:status`
2. Create a backup if needed

## Creating a Migration
Use the [migration template](./migration-template.sql) for complex changes.

## Validation
Run [validate-migration.sh](./validate-migration.sh) to check for:
- Breaking changes
- Data loss risks
- Index recommendations
```

## Skills in This Project

Current skills are located in `.github/skills/`:

| Skill | Purpose |
|-------|---------|
| `cross-package-types` | Type flow between shared, server, and client packages |
| `create-skill` | This skill - how to create new skills |

## Best Practices

### Do
- Write clear, specific descriptions that trigger on relevant prompts
- Include concrete examples with code
- Reference external files for large templates or scripts
- Document common mistakes and how to avoid them
- Keep instructions actionable and step-by-step

### Don't
- Make descriptions too vague or too broad
- Duplicate content already in custom instructions
- Include huge code blocks (use external files instead)
- Forget to document when NOT to use the skill
- Create skills for one-off tasks

## Adding a New Skill to This Project

1. Create directory: `.github/skills/your-skill-name/`
2. Create `SKILL.md` with frontmatter and instructions
3. Add any supporting files (scripts, templates, examples)
4. Test by asking Copilot a question the skill should handle
5. Verify the skill was loaded (check if instructions were followed)

## Related Resources

- [VS Code Agent Skills Documentation](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Agent Skills Standard](https://agentskills.io/)
- [Reference Skills Repository](https://github.com/anthropics/skills)
- [Awesome Copilot Collection](https://github.com/github/awesome-copilot)
