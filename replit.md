# FutureNow

FutureNow supports explainable career exploration with browser-local skills profiles, supplied job records, and separate national labour-market context.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- For a shell workspace build, use `PORT=19297 BASE_PATH=/ pnpm run build`; the existing Vite configurations require these values. Managed workflows provide their own values.
- `node --test artifacts/futurer-now/src/lib/skills-profile.test.ts` — profile model, validation, storage and grounded-insight tests
- `node artifacts/futurer-now/test/skills-profile.browser.mjs` — browser journey tests through the shared artifact proxy (requires Chromium; override `CHROMIUM_PATH` or `TEST_BASE_URL` if needed)
- Frontend: `artifacts/futurer-now/` (intentional spelling), package `@workspace/futureready-my`; start its existing managed workflow for preview.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- Skills profiles remain browser-local by design. No account, backend profile endpoint, database migration, or cross-device synchronisation was approved for this module.
- Keep the supplied job resource and national aggregate datasets separate. The Skills Profile feature does not ingest or replace either dataset.
- Self-assessments are not aptitude tests. Any derived strengths must identify the actual user response supporting the interpretation.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
