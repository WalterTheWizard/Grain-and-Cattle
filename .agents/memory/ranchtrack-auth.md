---
name: RanchTrack auth pattern
description: Dual-auth model (Clerk owners + custom employee sessions) and the custom-fetch credential patch required for cookie-based auth.
---

RanchTrack runs **two coexisting auth systems**:

- **Farm owners** → Replit-managed Clerk (Google + email/password). First sign-in JIT-provisions a farm (`resolveOwnerSession` in `artifacts/api-server/src/lib/owner.ts`), linking via `farms.clerkUserId`. `farms.passwordHash` is nullable. There are NO owner password endpoints — they were removed from the OpenAPI spec; owner auth changes go through Clerk, never the API.
- **Employees** → custom username/password (SHA-256 + fixed salt `ranchtrack_salt_2024`) with an in-memory `Map` session in `artifacts/api-server/src/lib/sessions.ts`, HTTP-only cookie.
- `requireAuth` (middlewares/session.ts) tries the employee cookie session first, then falls back to Clerk `getAuth(req)` → owner.

**JIT linking is security-sensitive:** only adopt an existing farm by email when it is unlinked (`clerkUserId IS NULL`) AND the Clerk email is verified; otherwise refuse. Reordering account deletion matters too — delete the Clerk user FIRST, then the farm, so a failed Clerk delete can't orphan a farm whose owner can still sign in and re-provision.

`lib/api-client-react/src/custom-fetch.ts` has `credentials: "include"` added so the browser sends the employee cookie.
**Why:** The Orval scaffold ships `custom-fetch.ts` without it; without the patch, authenticated calls return 401 in the browser.
**How to apply:** If Orval regenerates `custom-fetch.ts`, re-add `credentials: "include"` to the `fetch` call in `customFetch`.
