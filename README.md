# Mise

Restaurant operations dashboard and API, organized as a pnpm + Turborepo monorepo.

## Setup instructions

### Prerequisites

- **Node.js** `>=24.0.0` (verify with `node --version`)
- **pnpm** `11.21.0` (see `packageManager` in the root `package.json`)
- **PostgreSQL** via a [Neon](https://neon.tech) project (or any Postgres URL the HTTP driver can reach)

**If you use nvm:**

```bash
nvm use
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

### Install

```bash
git clone https://github.com/AnanyaNavale/ody-assessment
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

**First, generate the API client:**

```bash
pnpm gen:contract
```

From the repository root, start the API and dashboard in separate terminals:

```bash
pnpm dev:backend
```

The Hono worker listens on **http://localhost:8787**. All HTTP routes are under **`/api`**. Opening `http://localhost:8787/` returns 404 by design.

Useful endpoints:

- Swagger UI: [http://localhost:8787/api/docs](http://localhost:8787/api/docs)
- OpenAPI JSON: [http://localhost:8787/api/openapi.json](http://localhost:8787/api/openapi.json)
- Example resource: [http://localhost:8787/api/orders](http://localhost:8787/api/orders)

```bash
pnpm dev:dashboard
```

The Expo web dashboard runs on **http://localhost:8081**. It calls `http://localhost:8787` unless you set `EXPO_PUBLIC_API_URL`.

Optional: regenerate the typed client after backend contract changes:

```bash
pnpm --filter @ody/backend generate:openapi
pnpm gen:contract
```

```bash
pnpm test
```

Runs backend Vitest (`@ody/backend`) and dashboard Jest (`@ody/dashboard`).

## Architecture decisions

The API contract is the bridge between the database and the UI, so types stay aligned without hand-written DTOs on the client.

1. **Drizzle schema** in `services/backend/src/db/schema.ts` defines Postgres tables and TypeScript models. `drizzle-zod` (`createInsertSchema` / `createSelectSchema`) is generated from that schema.
2. **Order HTTP schemas** in `services/backend/src/order-schemas.ts` extend those drizzle-zod models for create-order and status-update OpenAPI routes (omit server-owned fields, add line items and examples).
3. **Hono + Zod** routes validate request bodies, params, and responses (`@hono/zod-openapi`).
4. An **OpenAPI spec** is generated from those routes (`pnpm --filter @ody/backend generate:openapi` → `packages/api-client/openapi.json`).
5. **Orval** turns that spec into Axios + **React Query** hooks (`pnpm gen:contract`).
6. The dashboard imports those hooks (`useGetOrders`, `useUpdateOrderStatus`, and so on) for typed fetches and mutations.

Result: a change in the schema or route types can flow through OpenAPI into the UI, so the stack stays type-safe from the database to React.

Order status is not a free-form client field. The backend enforces a state machine (`pending → preparing|cancelled`, `preparing → ready|cancelled`, `ready → completed|cancelled`; completed and cancelled are terminal). Totals are calculated server-side from menu prices. Creating an order while the kitchen is closed (`serviceAvailable: false`) returns **400** with `"Kitchen is currently closed"`.

## What's implemented

- Operator dashboard: Home, Orders, Menu, Customers (CRM), Settings, plus order and customer detail screens.
- Order lifecycle: list and detail actions only allow the next valid status (or cancel while the order is open).
- Kitchen closed: Settings `serviceAvailable` toggle. Auto-accept is forced off when closed; Create Order is disabled; `POST /api/orders` is rejected.
- Settings Save stays disabled until the form is dirty. Hours are a single open/close pair.
- Design tokens (`palette`, `colorScales`, `statusColors`, type) live in `@ody/shared` and are used across screens instead of local color objects.
- `/design-system` route (accessible from Settings or directly at `http://localhost:8081/design-system`) documents the tokens...
- Tests: backend Vitest for create-order rules (unavailable items, totals, kitchen closed) and status transitions; dashboard Jest for Create Order enablement, status helpers, and settings dirty/validation.

## Tech stack

| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Backend | Hono on Cloudflare Workers (Wrangler) |
| Frontend | Expo + React Native Web |
| Database | Neon PostgreSQL + Drizzle ORM |
| API client | OpenAPI → Orval → React Query |
| Fonts | DM Sans + DM Serif Display |

| Workspace | Package | Role |
| --- | --- | --- |
| `apps/dashboard` | `@ody/dashboard` | Operator dashboard (Home, Orders, Menu, Customers, Settings, `/design-system`) |
| `services/backend` | `@ody/backend` | REST API, validation, order rules |
| `packages/shared` | `@ody/shared` | Design tokens and shared primitives |
| `packages/types` | `@ody/types` | Shared TypeScript types |
| `packages/api-client` | `@ody/api-client` | Generated OpenAPI client |

## Tradeoffs and incomplete areas

- Order create and status-update OpenAPI schemas are derived from drizzle-zod. Other routes still use hand-written Zod objects; a full contract generated from the Drizzle schema would be the next step.
- Settings persist the fields the API supports (name, prep time, auto-accept, service availability, hours). Address, phone, and storefront photo are local form defaults and are not stored on the server. Opening hours are one pair rather than per weekday.
- Tests cover critical order flows (unavailable items, totals, valid and invalid status transitions, kitchen closed) plus a small dashboard suite. Broader API and UI coverage would be needed in production.
- Some screen-specific behavior (filters, layout, modal orchestration) still lives in page components rather than shared hooks.

## Available scripts

Run from the repository root unless noted.

| Command | What it does |
| --- | --- |
| `pnpm install` | Install workspace dependencies |
| `pnpm dev:dashboard` | Start the Expo dashboard (web, `:8081`) |
| `pnpm dev:backend` | Start the Hono worker (Wrangler, `:8787`, routes under `/api`) |
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

## Future Enhancements
Given additional time, the following features would extend the platform's capabilities:

### Customer & Order Management

**Reservations system** - Table booking with time slots, party size, and confirmation flow
**Delivery tracking integration** - Real-time status updates for third-party delivery services (Uber Eats, DoorDash) with driver assignment and ETA
**Customer addresses** - Saved delivery addresses with validation and order history by location
**Review and feedback tracking** - Customer ratings, comments, and sentiment analysis tied to orders
**Communication method** – Allowing the customer to choose whether to give email or phone rather than requiring email

### Menu & Inventory

**Menu category management** - Create, edit, and reorder categories from the dashboard
**Dietary restriction filtering** - Enhanced dietary tag system with customer preference matching and allergen warnings
**Inventory tracking** - Stock levels, low-stock alerts, and automatic 86ing of unavailable items
**Modifiers and customizations** - Item variations (size, add-ons, substitutions) with pricing rules

### Operations & Staff

**Table management** - Floor plan, table assignment, and capacity tracking for dine-in orders
**Staff roles and permissions** - Waitstaff, kitchen, manager access levels with order assignment
**Shift management** - Staff scheduling, clock-in/out, and performance metrics
**Kitchen display system** - Separate view for kitchen staff with prep prioritization
**Gratuity** – Incorporate calculation and order update facilities for tips

### Multi-Location & Franchise

**Location switching** - Support for multi-restaurant operators with location-specific menus, settings, and staff
**Franchise management** - Centralized menu templates with location overrides and cross-location reporting
**Transfer orders** - Route orders to alternate locations based on capacity or delivery radius

### Analytics & Reporting

**Revenue reporting** - Daily/weekly/monthly breakdowns by order type, time, and menu category
**Customer insights** - Repeat customer analysis, average order value, lifetime value, and preference trends
**Peak time optimization** - Staffing and inventory recommendations based on historical patterns
**Menu performance** - Item profitability, popularity trends, and pairing analysis
