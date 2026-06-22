---
name: generate-sample-data
description: Generate mock/sample data from Zod schemas for testing, development, and mocks. Use when creating sample data generators, setting up test fixtures, populating mock APIs, or generating realistic fake data for development.
---

# Skill: Generate Sample Data from Zod Schemas

Generate type-safe, realistic sample data for testing, development, and mock APIs using Zod schema definitions.

## When to Use
- Creating sample data generators for domain models
- Populating MSW mock API handlers
- Generating test fixtures
- Creating Storybook stories
- Seeding development databases
- Building realistic demo data

## Technology Stack

| Package | Purpose |
|---------|---------|
| **@anatine/zod-mock** | Generates mock data from Zod schemas via `generateMock()` |
| **@faker-js/faker** | Provides realistic fake data |
| **Zod** | Source of truth for type definitions and validation |

## File Structure

```
model/
├── Job.ts              # Zod schema + type
├── Job.sample.ts       # Sample generator ← THIS FILE
├── User.ts / User.sample.ts
└── index.ts            # Re-export samples
```

## Standard Function Signature

```typescript
createEntitySample(options?: { seed?: number; overrides?: Partial<Entity> }): Entity
```

## Two Generation Patterns

### Pattern 1: Simple Schemas (Primitives Only)

Use `generateMock` directly:

```typescript
import { generateMock } from '@anatine/zod-mock';
import { EntitySchema } from './Entity';

export function createEntitySample(options?: { seed?: number; overrides?: Partial<Entity> }): Entity {
  const mock = generateMock(EntitySchema, { seed: options?.seed });
  return { ...mock, ...options?.overrides };
}
```

### Pattern 2: Composed Schemas (Nested Objects/Arrays)

Compose child samples:

```typescript
export function createJobSample(options?: { seed?: number; overrides?: Partial<Job> }): Job {
  const mock = generateMock(JobBaseSchema, {
    seed: options?.seed,
    stringMap: {
      name: () => faker.company.name(),
      email: () => faker.internet.email(),
    },
  });
  return { ...mock, ...options?.overrides };
}
```

## Enhancing with Faker

Use Faker for realistic names, emails, phones. Create seeded Faker instances for determinism:

```typescript
import { faker } from '@faker-js/faker';

// Seeded for determinism
if (options?.seed !== undefined) {
  faker.seed(options.seed);
}
```

## Using in Mock APIs (MSW)

Generate 15-20+ items with variety:

```typescript
const jobs = Array.from({ length: 20 }, (_, i) =>
  createJobSample({ seed: i, overrides: { status: i % 3 === 0 ? 'COMPLETED' : 'ACTIVE' } })
);
```

## Creating Array Samples

```typescript
export function createJobSamples(count: number, baseSeed: number = 0): Job[] {
  return Array.from({ length: count }, (_, i) =>
    createJobSample({ seed: baseSeed + i })
  );
}
```

## CRITICAL: Deterministic Dates with Seeds

**NEVER use `Date.now()` or `new Date()` when a seed is provided!**

```typescript
const baseTimestamp = seed !== undefined
  ? new Date(2026, 1, 20, 10, 0, 0).getTime() + (seed * 1000)
  : Date.now();
```

## Testing Sample Generators

Every generator should have tests for:
- Validity (validates against schema)
- Determinism (same seed = same output)
- Overrides work correctly

## Key Principles

1. Types derive from Zod schemas
2. JSON serializable only (ISO 8601 strings, not Date objects)
3. Consistent naming: `create[Entity]Sample` / `create[Entity]Samples`
4. Seed for determinism
5. Overrides for flexibility
6. Export from model index
7. 15-20+ items for lists/tables

## Installation

```bash
npm install -D @anatine/zod-mock @faker-js/faker
```
