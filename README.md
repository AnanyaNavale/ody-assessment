# Ody Technical Assessment

Restaurant operations dashboard and API, organized as a pnpm + Turborepo monorepo.

## Setup instructions

### Prerequisites

- **Node.js** `>=24.0.0` (see `.nvmrc`)
- **pnpm** `11.21.0` (see `packageManager` in the root `package.json`)
- **PostgreSQL** via a [Neon](https://neon.tech) project (or any Postgres URL the HTTP driver can reach)

```bash
nvm use
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

### Install

```bash
git clone <repo-url>
cd ody-assessment
pnpm install
```

Internal packages (`@ody/shared`, `@ody/types`, `@ody/api-client`) are consumed from TypeScript source via workspace path aliases, not from a built `dist/` folder.

### Database (Neon)

1. Create a Neon project and copy the connection string.
2. Add it to `services/backend/.dev.vars` (Wrangler and Drizzle both load this file):

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

3. Push the schema, then seed demo data:

```bash
cd services/backend
pnpm db:push
pnpm db:seed
```

`pnpm db:studio` opens Drizzle Studio against the same database.

### Run locally

From the repository root, start the API and dashboard in separate terminals:

```bash
pnpm dev:backend
```

The Hono worker runs on **http://localhost:8787**.

```bash
pnpm dev:dashboard
```

The Expo web dashboard runs on **http://localhost:8081**. It calls the API at `http://localhost:8787` unless you set `EXPO_PUBLIC_API_URL`.

Optional: regenerate the typed client after backend contract changes:

```bash
pnpm --filter @ody/backend generate:openapi
pnpm gen:contract
```

## Architecture decisions

The API contract is the bridge between the database and the UI, so types stay aligned without hand-written DTOs on the client.

1. **Drizzle schema** in `services/backend/src/db/schema.ts` defines Postgres tables and TypeScript models.
2. **Hono + Zod** routes validate request bodies, params, and responses (`@hono/zod-openapi`).
3. An **OpenAPI spec** is generated from those routes (`pnpm --filter @ody/backend generate:openapi` → `packages/api-client/openapi.json`).
4. **Orval** turns that spec into Axios + **React Query** hooks (`pnpm gen:contract`).
5. The dashboard imports those hooks (`useGetOrders`, `useUpdateOrderStatus`, and so on) for typed fetches and mutations.

Result: a change in the schema or route types can flow through OpenAPI into the UI, so the stack stays type-safe from the database to React.

Order status is not a free-form client field. The backend enforces a state machine (`pending → preparing|cancelled`, `preparing → ready|cancelled`, `ready → completed|cancelled`, terminal states have no next step). Totals are calculated server-side from menu prices.

## Tech stack

| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Backend | Hono on Cloudflare Workers (Wrangler) |
| Frontend | Expo + React Native Web |
| Database | Neon PostgreSQL + Drizzle ORM |
| API client | OpenAPI → Orval → React Query |
| Fonts | DM Sans + DM Serif Display |

| Path | Package | Role |
| --- | --- | --- |
| `apps/dashboard` | `@ody/dashboard` | Operator dashboard (Home, Orders, Menu, Customers, Settings, `/design-system`) |
| `services/backend` | `@ody/backend` | REST API, validation, order rules |
| `packages/shared` | `@ody/shared` | Design tokens and a few shared primitives |
| `packages/types` | `@ody/types` | Shared TypeScript types |
| `packages/api-client` | `@ody/api-client` | Generated OpenAPI client |

## Tradeoffs and incomplete areas

- OpenAPI request/response schemas are defined on Hono routes rather than generated from drizzle-zod. In production, `createInsertSchema` / `createSelectSchema` would keep a single source of truth between the database and the HTTP contract.
- Settings persist the fields the API supports (name, prep time, auto-accept, service availability, hours). Address, phone, and storefront photo are local form defaults and are not stored on the server.
- Test coverage focuses on critical order flows (unavailable items, totals, valid and invalid status transitions). Broader API and UI tests would be needed in production.
- Design tokens live in `packages/shared`, but many screens still use local palettes so the live UI can match Figma. A full token migration would reduce duplication.

## Available scripts

Run from the repository root unless noted.

| Command | What it does |
| --- | --- |
| `pnpm install` | Install workspace dependencies |
| `pnpm dev:dashboard` | Start the Expo dashboard (web, `:8081`) |
| `pnpm dev:backend` | Start the Hono worker (Wrangler, `:8787`) |
| `pnpm gen:contract` | Generate React Query hooks from OpenAPI (`pnpm gen:api` is an alias) |
| `pnpm lint` | ESLint across the workspace |
| `pnpm typecheck` | TypeScript checks via Turborepo |
| `pnpm test` | Backend Vitest + dashboard Jest suites |
| `pnpm --filter @ody/backend db:push` | Push Drizzle schema to Neon |
| `pnpm --filter @ody/backend db:seed` | Seed restaurant, menu, customers, and orders |
| `pnpm --filter @ody/backend db:studio` | Open Drizzle Studio |

Package-level equivalents:

```bash
pnpm --filter @ody/dashboard dev
pnpm --filter @ody/backend dev
cd services/backend && pnpm db:push && pnpm db:seed
```
