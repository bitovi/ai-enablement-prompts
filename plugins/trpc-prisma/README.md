# tRPC + Prisma Plugin

Type-safety patterns for monorepos with a tRPC + Prisma architecture.

## Skills

| Skill | Description |
|---|---|
| `cross-package-types` | Type flow patterns for tRPC + Prisma monorepos — AppRouter type inference across shared, server, and client packages |

## Instruction Templates

| Template | Applies To | Description |
|---|---|---|
| `server.instructions.md` | `**/packages/server/**` | tRPC router patterns, Prisma usage, Zod input validation |
| `shared.instructions.md` | `**/packages/shared/**` | Dual entry points, Zod schema derivation, browser-safe exports |
| `client.instructions.md` | `**/packages/client/**` | tRPC hooks, type-only imports, component patterns |

## Prerequisites

- tRPC + Prisma stack
- Monorepo with `server`, `shared`, and `client` packages
- No MCP required

## Installation

### Claude Code

```
claude plugin marketplace add bitovi/ai-enablement-prompts --scope project
claude plugin install trpc-prisma@bitovi-ai-enablement --scope project
```

### VS Code Copilot

Add to `.vscode/settings.json`:

```json
{
  "chat.plugins.marketplaces": ["bitovi/ai-enablement-prompts"]
}
```

Then browse **Extensions → @agentPlugins** and install **trpc-prisma**.

## Usage

Once installed, the instruction templates auto-apply to matching file paths. Invoke the skill with:

```
/trpc-prisma:cross-package-types
```

Or ask about cross-package types, AppRouter inference, or Zod schema derivation and the skill will auto-load.
