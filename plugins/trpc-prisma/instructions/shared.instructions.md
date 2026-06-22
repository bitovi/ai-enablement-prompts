---
applyTo: '**/packages/shared/**'
---

# Shared Package Instructions

## Architecture
- Two entry points: root (browser-safe) and `/server` (server-only)
- Zod schemas are the source of truth for validation and types
- TypeScript types derive from Zod schemas via `z.infer<>`

## Patterns
- One schema file per domain entity
- Base schemas match Prisma model fields
- Derive input/update/form schemas with `.pick()`, `.omit()`, `.extend()`, `.partial()`
- Export types alongside schemas

## Import Rules
- Root exports (`@myapp/shared`): Zod schemas, types, enums, constants — must be browser-safe
- Server exports (`@myapp/shared/server`): Prisma client, DB utilities — server-only
- ❌ Never import Node.js APIs or Prisma in root exports
