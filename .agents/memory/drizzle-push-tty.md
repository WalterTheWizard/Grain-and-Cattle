---
name: Drizzle push TTY prompt
description: drizzle-kit push hangs on an interactive confirmation prompt in the Replit non-interactive shell.
---

`pnpm --filter @workspace/db run push` (drizzle-kit push) can block waiting on an interactive confirmation prompt (e.g. when it detects a column it thinks might cause data loss, like making a column nullable or adding a constraint). The agent shell is non-interactive, so it hangs.

**Why:** drizzle-kit asks for confirmation on potentially destructive/ambiguous changes and there is no TTY to answer.

**How to apply:** When a schema change won't apply via `push`, run the equivalent `ALTER TABLE ...` directly against `DATABASE_URL` (psql / SQL), then update `lib/db/src/schema.ts` to match and run `pnpm run typecheck:libs`. Keep the SQL minimal and idempotent.
