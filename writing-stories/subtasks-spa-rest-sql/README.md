# Subtasks: SPA + REST + SQL

**Status: work in progress / draft.** This is a set of in-progress notes for a future prompt chain, not a finished, ready-to-paste one yet.

## What this is for

A planned series of prompts that break a user story into technical subtasks for apps with this architecture:

- A frontend SPA that handles routing and a data layer making REST requests
- A REST service layer supporting CRUD plus pagination/filtering/sorting/relationship-inclusion
- An ORM-based service layer
- A SQL data layer with a migration utility

The intended flow: take a story (in the format produced by [`writing-stories/from-figma`](../from-figma)) plus its Figma images/analysis, and produce subtasks for:

- [`0a-setup-instructions.md`](./0a-setup-instructions.md), [`0b-setup-data-model.md`](./0b-setup-data-model.md), [`0c-setup-api-docs.md`](./0c-setup-api-docs.md) — one-time setup context
- [`1-data-migrations.md`](./1-data-migrations.md) — data migration subtasks
- [`2-api-changes.md`](./2-api-changes.md) — API layer subtasks
- [`3-frontend.md`](./3-frontend.md) — frontend subtasks

## How to run it

Read [`plan.md`](./plan.md) first — it lays out the open questions and design direction. Treat the numbered files as a starting point to finish and adapt for your stack, not a ready-to-paste prompt chain.
