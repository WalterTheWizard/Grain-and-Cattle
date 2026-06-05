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

- **Dual auth — owners via Clerk, employees via custom sessions**: Two auth systems coexist.
  - **Farm owners** authenticate via Replit-managed Clerk (Google + email/password). On first sign-in their farm is JIT-provisioned in `api-server/src/lib/owner.ts` (`resolveOwnerSession`). `farms.clerkUserId` links the farm to the Clerk identity; `farms.passwordHash` is nullable (owners have no local password). Legacy farms are adopted by email **only** when unlinked (`clerkUserId IS NULL`) and the Clerk email is verified; otherwise linking is refused to prevent account takeover. Provisioning is concurrency-safe (re-reads on unique-constraint collision).
  - **Employees** keep custom username/password (SHA-256 + fixed salt) and an in-memory session `Map` in `api-server/src/lib/sessions.ts`. Session token passed via HTTP-only cookie.
  - **Unified guard**: `requireAuth` (middlewares/session.ts) resolves the employee cookie session first, else falls back to Clerk `getAuth(req)` → owner. Both paths populate `res.locals.session` with a `role` ("owner" | "employer" | "employee").
- **Cookie-based auth**: `custom-fetch.ts` has `credentials: "include"` patched in so the browser always sends the employee session cookie.
- **Contract-first API**: OpenAPI spec defines all endpoints; Orval generates type-safe hooks and schemas. Never write API types by hand. There are NO owner password endpoints (register/login/change-password were removed — Clerk handles those).
- **Auth guard at root**: `App.tsx` wraps the app in `ClerkProvider`; `useGetMe` is gated on Clerk `useAuth().isLoaded` with `retry: false`. A 401 shows LoginPage, success shows Layout. `/sign-in/*?` and `/sign-up/*?` render Clerk's `<SignIn>`/`<SignUp>`. Owner logout = Clerk `signOut`; employee logout = custom `/auth/logout`. Account deletion is owner-only, deletes the Clerk user first (then the farm) and signs out.
- **Leaflet loaded lazily**: `react-leaflet` and `leaflet/dist/leaflet.css` are dynamically imported in FieldsPage to avoid SSR issues and keep bundle lean.

## Product

- **Login / Register**: Branded landing with two tabs — Farm Owner (Sign In / Register a New Farm CTAs that route to Clerk's hosted `/sign-in` and `/sign-up`, with Google + email) and Employee (custom farm-email + username + password form)
- **Dashboard**: Live stats (total herd, active head, calves, active tasks) + recent registrations + quick actions
- **Cattle Records**: Searchable list of active, sold, and deceased cattle. Register modal, detail page with weights + health record tabs, lineage tracking (mother/calves)
- **Farm Tasks**: Pending/completed task tabs, assign to employees, due dates, time estimates
- **Field Management**: Leaflet map showing field pins, field CRUD with acreage + status tracking
- **Employees**: Staff directory with role badges (employer/employee), add/remove staff
- **Settings**: Farm profile editing, system info, and account deletion (danger zone, owner-only — no password prompt; deletes the Clerk identity then the farm and signs out)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db/src/schema.ts`, run `pnpm --filter @workspace/db run push` to migrate the dev DB, then `pnpm run typecheck:libs` to rebuild declarations.
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before typechecking any package that imports `@workspace/api-client-react` or `@workspace/api-zod`.
- The API server must be rebuilt before it picks up route changes (`pnpm --filter @workspace/api-server run dev` handles this automatically).
- Leaflet default marker icons break with Vite bundling — FieldsPage sets custom icon URLs pointing to unpkg CDN.
- **Clerk + Tailwind v4**: `index.css` declares `@layer theme, base, clerk, components, utilities;` BEFORE `@import "tailwindcss";` and imports `@clerk/themes/shadcn.css`; `vite.config.ts` uses `tailwindcss({ optimize: false })`. Removing these breaks Clerk component styling.
- **Clerk env**: needs `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` (server) and `VITE_CLERK_PUBLISHABLE_KEY` (client). Owner Google login requires Google to be enabled in the Clerk Auth pane (workspace toolbar) — it is enabled by default on the Replit-managed instance.
- Owner password endpoints no longer exist. If you need to change owner auth, do it through Clerk, not the API.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
