---
name: update-data-model
description: Add or modify domain entities in the data model using Zod schemas. Use when creating new entities, adding fields, changing relationships, or updating the domain model structure.
---

# Skill: Updating the Data Model

How to work with the domain model using Zod for schema validation and TypeScript for type definitions.

## Model Architecture

One entity per file with Zod schemas:

```
model/
├── index.ts
├── enums.ts
├── User.ts
├── Job.ts
└── Site.ts
```

### Key Principles

1. Zod for validation (base schemas, no relationships)
2. TypeScript interfaces for relationships (extend base types)
3. Foreign keys end with `Id` suffix
4. Navigation properties use full entity names
5. Circular references use `import()` types

## When to Use

- Adding new entities, fields, relationships
- Changing enums or validation rules
- Renaming fields or entities

## Adding a New Entity

1. Create `model/YourEntity.ts` with BaseSchema, Schema, types, and interface with navigation properties
2. Add enum to `model/enums.ts` if needed
3. Update `model/index.ts` with exports
4. Update related entities with inverse navigation properties
5. Update `model/README.md` Mermaid diagram

## Adding a Field to an Existing Entity

1. Update Base Schema
2. TypeScript types auto-update
3. Update mock data in handlers
4. Update Storybook stories

## Field Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Foreign Key | `entityNameId` | `userId`, `siteId` |
| Navigation (1:1/many:1) | `entityName` | `user`, `site` |
| Navigation (1:many) | `entityNames` | `jobs`, `submittedJobs` |
| Enum | PascalCase | `UserRole`, `JobStatus` |
| Enum Values | SCREAMING_SNAKE_CASE | `IN_PROGRESS` |

## Common Validation Patterns

```typescript
z.string().email()
z.string().url()
z.string().min(1).max(255)
z.number().int().positive()
z.enum(['ACTIVE', 'INACTIVE'])
z.string().datetime()
z.array(z.string())
```

## Common Mistakes

- ❌ Don't mix FK and navigation property names
- ❌ Don't add relationships to Zod schemas (use TS interfaces)
- ❌ Don't forget to update index.ts
- ❌ Don't forget to update mock data

## Summary

- One entity per file, Zod for base fields, TS interfaces for relationships
- FK fields end with `Id`, always update index.ts
- Update mock data and stories after changes
