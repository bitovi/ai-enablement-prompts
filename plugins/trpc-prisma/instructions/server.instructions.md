---
applyTo: '**/packages/server/**'
---

# Server Package Instructions

## Architecture
- tRPC routers handle API endpoints
- Prisma client for database access (import from shared/server)
- Zod validation on all inputs (import schemas from shared)
- Use `TRPCError` for error handling with appropriate codes

## Patterns
- One router per domain entity
- Protected procedures for authenticated routes
- Input validation with Zod schemas from shared package
- Never expose Prisma client directly — wrap in tRPC procedures

## Import Rules
- ✅ `import { prisma } from '@myapp/shared/server'`
- ✅ `import { CreateUserSchema } from '@myapp/shared'`
- ❌ Never import from `@myapp/client`
