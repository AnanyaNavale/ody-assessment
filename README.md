# Ody

Fullstack restaurant operations app, organized as a pnpm + Turborepo monorepo.

## Version requirements

- **Node.js:** `>=24.0.0` (see `.nvmrc`)
- **pnpm:** `11.21.0` (see `packageManager` in the root `package.json`)

```bash
nvm use
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

## Setup

```bash
pnpm install
```

Internal packages (`@ody/shared`, `@ody/types`, `@ody/api-client`) are consumed from **TypeScript source** via path aliases, not from a built `dist/` folder.

**Database: PostgreSQL via HTTP driver for Drizzle ORM**

## Workspace

| Path | Package | Description |
| --- | --- | --- |
| `apps/dashboard` | `@ody/dashboard` | Expo + React Native Web dashboard |
| `services/backend` | `@ody/backend` | Hono API on Cloudflare Workers |
| `packages/shared` | `@ody/shared` | Shared UI components and design tokens |
| `packages/types` | `@ody/types` | Shared TypeScript types |
| `packages/api-client` | `@ody/api-client` | Generated API client (Orval; not configured yet) |

## Scripts

Run these from the repository root:

| Script | Command | What it does |
| --- | --- | --- |
| Dashboard dev | `pnpm dev:dashboard` | Starts the Expo dashboard (web) |
| Backend dev | `pnpm dev:backend` | Starts Wrangler for the Hono worker |
| Generate API client | `pnpm gen:contract` | Orval generation (no-op until configured) |
| Lint | `pnpm lint` | Runs ESLint with the shared flat config |
| Typecheck | `pnpm typecheck` | Runs TypeScript checks across the workspace |
| Test | `pnpm test` | Tests (no-op until configured) |

Package-level scripts (`dev`, `lint`, `typecheck`, `build`, `test`) are also available via Turborepo, for example:

```bash
pnpm --filter @ody/dashboard dev
pnpm --filter @ody/backend dev
```
