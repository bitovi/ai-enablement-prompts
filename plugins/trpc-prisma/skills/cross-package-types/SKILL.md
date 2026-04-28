---
name: cross-package-types
description: Type flow patterns for tRPC + Prisma monorepos. Covers AppRouter type inference across shared, server, and client packages. Use when setting up types, fixing type errors across packages, or understanding the type chain.
---

# Skill: Cross-Package Types (tRPC + Prisma)

Defines how TypeScript types flow through a monorepo with tRPC and Prisma.

## Type Flow

```
Prisma Schema → Prisma Client Types → Zod Schemas → tRPC Routers → Client Type Inference
```

### Package Responsibilities

| Package | Owns | Exports |
|---------|------|---------|
| **shared** | Zod schemas, enums, constants | Schemas for both server and client |
| **server** | tRPC routers, Prisma client | `AppRouter` type |
| **client** | React components, tRPC hooks | Consumes `AppRouter` type |

## Key Principles

1. **Prisma is the single source of truth** — all types derive from the Prisma schema
2. **Zod schemas derive from Prisma types** — use `.pick()`, `.omit()`, `.extend()` on base schemas
3. **AppRouter types flow from server to client** — never import server code in client
4. **No circular dependencies** — shared → server → client (one direction only)

## Shared Package

The shared package has two entry points:

```typescript
// package.json
{
  "exports": {
    "./server": "./src/server/index.ts",  // Server-only: Prisma, DB utils
    ".": "./src/index.ts"                  // Browser-safe: Zod schemas, types, constants
  }
}
```

### Schema Derivation

```typescript
// shared/src/schemas/user.ts
import { z } from 'zod';

// Base schema matching Prisma model
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'USER', 'VIEWER']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Auto-managed fields
const PRISMA_AUTO_FIELDS = ['id', 'createdAt', 'updatedAt'] as const;

// Input schema (for create)
export const CreateUserSchema = UserSchema.omit(
  Object.fromEntries(PRISMA_AUTO_FIELDS.map(f => [f, true])) as Record<string, true>
);

// Update schema (partial, without auto fields)
export const UpdateUserSchema = CreateUserSchema.partial();

// Form schema (client-friendly, no server-only fields)
export const UserFormSchema = UserSchema.pick({
  email: true,
  name: true,
  role: true,
});

export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
```

## Server Package

### tRPC Router Pattern

```typescript
// server/src/routers/user.ts
import { router, protectedProcedure } from '../trpc';
import { CreateUserSchema, UpdateUserSchema } from '@myapp/shared';
import { prisma } from '@myapp/shared/server';

export const userRouter = router({
  list: protectedProcedure.query(async () => {
    return prisma.user.findMany();
  }),

  create: protectedProcedure
    .input(CreateUserSchema)
    .mutation(async ({ input }) => {
      return prisma.user.create({ data: input });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateUserSchema }))
    .mutation(async ({ input }) => {
      return prisma.user.update({ where: { id: input.id }, data: input.data });
    }),
});
```

### AppRouter Export

```typescript
// server/src/routers/index.ts
import { router } from '../trpc';
import { userRouter } from './user';

export const appRouter = router({
  user: userRouter,
});

export type AppRouter = typeof appRouter;
```

## Client Package

### Type-Safe tRPC Client

```typescript
// client/src/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@myapp/server';

export const trpc = createTRPCReact<AppRouter>();
```

### Usage in Components

```typescript
// client/src/components/UserList.tsx
import { trpc } from '../utils/trpc';

export function UserList() {
  const { data: users } = trpc.user.list.useQuery();
  // `users` is fully typed as User[] automatically
}
```

## Common Mistakes

- ❌ Importing server code in client (breaks browser bundle)
- ❌ Defining types manually instead of deriving from Prisma/Zod
- ❌ Circular imports between packages
- ❌ Using `any` to silence cross-package type errors
- ✅ Use `type` imports: `import type { AppRouter } from '@myapp/server'`
- ✅ Derive all schemas from Prisma base types
- ✅ Use shared package for browser-safe code
