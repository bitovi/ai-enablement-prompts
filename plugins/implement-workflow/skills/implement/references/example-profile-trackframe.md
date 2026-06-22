# Example profile: a fully-tuned `implement` workflow

This is a **worked example** of how the generic `implement` plugin was tuned for one real project — an internal multi-track workflow platform referred to here as *TrackFrame*. Use it as a template: see what "follow your project's conventions" looks like when made concrete, then swap in your own stack's specifics.

Nothing here is required. It documents the assumptions that the generic skills deliberately leave open.

## The stack it was tuned for

- **Monorepo:** Turborepo, pnpm, Node 22.
- **Backend:** Fastify run via `tsx` (no build step), four-layer architecture.
- **Frontend:** Vite + React 19 + Tailwind.
- **Database:** PostgreSQL + pgvector via Drizzle.
- **Auth:** Microsoft Entra ID SSO with DB-backed RBAC.
- **Tracks:** two live verticals — *hiring* (`hr_*` tables, Oracle HCM) and *IAG* (`iag_*` tables, Snowflake) — plus `shared_*`.
- **AI:** AWS Bedrock.
- **Convention docs:** `CLAUDE.md`, `docs/backend-styleguide.md`, `docs/TESTING.md`, `docs/ONBOARDING.md`.

## How each step was made concrete

### `implement` skill

- **Understand:** identify the track (`hiring` / `iag` / shared) and the layers involved (Route → Controller → Service → Repository); note RBAC permissions, external-system boundaries (Oracle / Snowflake / Bedrock), and schema/migration impact.
- **Design:** new Zod (`zod/v4`) schemas, DB schema + migrations, API surface, frontend pieces. Reuse `components/ui`.
- **Implement:** respect the four-layer import direction (each layer imports only from the one below). Backend env vars go through `@repo/backend-settings` (add to `.env.example` too); frontend reads config from `@lib/constants`, uses path aliases, prefers reusable `global.css` classes over inline Tailwind. No `any`.
- **Migrations:** `pnpm db:generate --name <descriptive>`, hand-edit to be idempotent (per `CLAUDE.md`), then `pnpm db:migrate`.
- **Test:** per `docs/TESTING.md`. **Never** write to Oracle, Snowflake, or any AWS-hosted DB. Keep external writes off (`AI_PROVIDER=test`, `ORACLE_SYNC_ENABLED=false`) and mock at the SDK boundary. Synthetic data only — no PII.
- **Docs:** update `CLAUDE.md`, `docs/` (`TESTING.md`, `backend-styleguide.md`), `docs/ONBOARDING.md`, or package READMEs.
- **PR:** conventional commits, **no co-authors**, **never** auto-comment on a PR.

### `ready-to-push` skill

Exact command sequence, each rerun until clean before the next:

1. `pnpm test:unit`
2. `pnpm lint`
3. `pnpm exec biome check --write .` — matches the pre-commit hook's Biome lint (which `pnpm lint` skips on the web app). Use `// biome-ignore lint/<rule>: <reason>` for intentional exceptions, not `// eslint-disable`.
4. `pnpm build`

Pre-authorize via frontmatter so the commands don't prompt:

```yaml
allowed-tools: Bash(pnpm test:unit*) Bash(pnpm lint*) Bash(pnpm exec biome check*) Bash(pnpm build*)
```

### `code-reviewer` agent / `review-pr` skill

Project-specific checks layered on top of the generic categories:

- **Architecture:** Route → Controller → Service → Repository, each importing only from the layer below; no skipped layers. Routes carry a Zod (`zod/v4`) schema + an auth `preHandler` guard (`requirePermission` / `requireAllPermissions` / `requireAdmin`).
- **Config:** no direct `process.env` outside `@repo/backend-settings`; new env vars added to `.env.example` **and** `packages/backend-settings/src/index.ts` (lazy getter if secret).
- **Schemas:** Zod schemas are the single source of truth for request validation, service types, and `@repo/api-client` response types.
- **Frontend:** path aliases (`@lib`, `@components`, `@hooks`, `@pages`); config from `@lib/constants`, never `import.meta.env` in components; typed `apiClient`; queries gated with `enabled:` on permission checks; reusable `global.css` over inline Tailwind; no `any` (ESLint-enforced).
- **DB:** migrations generated with `--name`, hand-edited idempotent (`CREATE TABLE IF NOT EXISTS`, DO-block-wrapped `ADD CONSTRAINT`, `DROP … IF EXISTS`); track-prefixed tables (`hr_*`, `iag_*`, `shared_*`); repositories return raw rows or `null`.
- **Tests:** never write to Oracle/Snowflake/AWS DB; `trackframe_test` DB only; never weaken the global-setup localhost/`*_test` guard. Behavior tests over implementation tests; synthetic data only.
- **Hygiene:** conventional commits, **no co-authors**; never post comments on the PR. Skip style nits already auto-fixed by Biome (api + packages) or ESLint (web).

### `suggest-pr` skill

Conventional-commit scopes matched the track/area: `feat(hr):`, `fix(iag):`, `refactor(db):`. Example title: `feat(hr): store candidate and requisition data locally`. **No co-author lines.**

## Porting this to your project — checklist

1. Replace the **stack** facts (framework, package manager, DB/ORM, auth) in the `code-reviewer` agent's intro and checks.
2. Replace the **architecture** description (here, four layers) with your module/layering rules.
3. Point config rules at **your settings layer** (here `@repo/backend-settings`) and example env file.
4. Set **`ready-to-push`** to your real test/lint/format/build commands, and list them in that skill's `allowed-tools`.
5. Adjust **migration** rules (idempotency, naming/prefixing) or drop them if you don't use migrations.
6. Set the **test guardrails** to your production/shared systems and test database.
7. Set **commit/PR conventions** (scopes, co-author policy, auto-comment policy) in `suggest-pr` and the `implement` skill's Step 8.
