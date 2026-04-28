---
applyTo: '**/packages/client/**'
---

# Client Package Instructions

## Architecture
- React components with tRPC hooks for data fetching
- Type-safe API calls via `AppRouter` type inference
- UI components from shared component library (shadcn, etc.)

## Patterns
- Modlet pattern for components (folder with impl + test + story + types)
- tRPC hooks for all API calls — never use `fetch()` directly
- Browser-safe imports only from shared package

## Import Rules
- ✅ `import type { AppRouter } from '@myapp/server'` (type-only import)
- ✅ `import { UserSchema } from '@myapp/shared'`
- ❌ Never import runtime code from `@myapp/server`
- ❌ Never import from `@myapp/shared/server`
