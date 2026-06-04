# RanchTrack

A full-stack cattle management system for ranchers to track livestock, tasks, fields, and employees.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (port 18412, preview path `/`)
- API: Express 5 (port 8080, prefix `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Map: Leaflet + react-leaflet

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth for all API contracts
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks
- `lib/api-zod/src/generated/` — Orval-generated Zod schemas
- `lib/db/src/schema.ts` — Drizzle schema (source-of-truth for DB tables)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/ranch-track/src/pages/` — React page components
- `artifacts/ranch-track/src/components/Layout.tsx` — Sidebar + nav layout

## Architecture decisions

- **In-memory sessions**: Sessions stored in a `Map` in `api-server/src/lib/sessions.ts`. SHA-256 password hashing with a fixed salt. Simple and dependency-free for development; swap to Redis + bcrypt for production.
- **Cookie-based auth**: Session token passed via HTTP-only cookie. `custom-fetch.ts` has `credentials: "include"` patched in to ensure the browser always sends the cookie.
- **Contract-first API**: OpenAPI spec defines all endpoints; Orval generates type-safe hooks and schemas. Never write API types by hand.
- **Auth guard at root**: `App.tsx` uses `useGetMe` with `retry: false` — a 401 shows LoginPage, success shows Layout. No separate route guard needed.
- **Leaflet loaded lazily**: `react-leaflet` and `leaflet/dist/leaflet.css` are dynamically imported in FieldsPage to avoid SSR issues and keep bundle lean.

## Product

- **Login / Register**: Three-tab auth — farm owner login, employee login, new farm registration
- **Dashboard**: Live stats (total herd, active head, calves, active tasks) + recent registrations + quick actions
- **Cattle Records**: Searchable list of active, sold, and deceased cattle. Register modal, detail page with weights + health record tabs, lineage tracking (mother/calves)
- **Farm Tasks**: Pending/completed task tabs, assign to employees, due dates, time estimates
- **Field Management**: Leaflet map showing field pins, field CRUD with acreage + status tracking
- **Employees**: Staff directory with role badges (employer/employee), add/remove staff
- **Settings**: Farm profile editing, system info, and account deletion (danger zone)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db/src/schema.ts`, run `pnpm --filter @workspace/db run push` to migrate the dev DB, then `pnpm run typecheck:libs` to rebuild declarations.
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before typechecking any package that imports `@workspace/api-client-react` or `@workspace/api-zod`.
- The API server must be rebuilt before it picks up route changes (`pnpm --filter @workspace/api-server run dev` handles this automatically).
- Leaflet default marker icons break with Vite bundling — FieldsPage sets custom icon URLs pointing to unpkg CDN.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
