---
name: api-zod barrel export conflict
description: Orval generates same-named Zod schema and TS interface for new schemas, causing TS2308 when both are re-exported from lib/api-zod/src/index.ts
---

When a new schema is added to `lib/api-spec/openapi.yaml`, Orval's `zod` client generates:
- A `const FooBody = zod.object(...)` in `lib/api-zod/src/generated/api.ts`
- An `interface FooBody { ... }` in `lib/api-zod/src/generated/types/fooBody.ts`

The original `index.ts` did `export * from "./generated/api"` AND `export * from "./generated/types"`. This causes TS2308 (ambiguous re-export) as soon as any schema name collides between the two outputs.

**Why:** The `generated/types/` folder only contains TypeScript interfaces (no runtime values). All actual runtime usage imports Zod schemas. The TypeScript interfaces are redundant because Zod infers types.

**How to apply:** Keep `lib/api-zod/src/index.ts` as:
```typescript
export * from "./generated/api";
```
Drop `export * from "./generated/types"` entirely. Anyone needing TypeScript interfaces for API types can import from `@workspace/api-client-react` (which also exports them in `api.schemas.ts`).
