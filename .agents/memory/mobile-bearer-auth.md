---
name: Mobile Bearer token auth
description: How the Expo mobile app authenticates — token from loginEmployee body, AsyncStorage persistence, setAuthTokenGetter.
---

# Mobile Bearer Token Authentication

## The Rule
The Expo mobile app authenticates employees via a Bearer token returned in the `loginEmployee` response body (`data.token`). The token is persisted in AsyncStorage and injected into every API request via `setAuthTokenGetter` from `@workspace/api-client-react`.

**Why:** Cookies (HTTP-only session cookies used by the web app) are unreliable in React Native / Expo. The API server was modified to return `token` in the login response body alongside setting the cookie, so both web and mobile work simultaneously.

**How to apply:**
- `contexts/AuthContext.tsx` stores the token in `_token` module variable and `AsyncStorage` under key `farmerpro_session_token`
- `setAuthTokenGetter(() => _token)` is called at module level so it's always registered
- On app boot, `AuthContext` restores the stored token and calls `getMe()` to validate it
- The server middleware (`middlewares/session.ts`) already reads `Authorization: Bearer <token>` for employees

## Orval zod config fix
Removing `schemas: { path: "generated/types", type: "typescript" }` from the `zod` output in `lib/api-spec/orval.config.ts` prevents orval from generating a duplicate types directory. Without this fix, every `codegen` run regenerates `lib/api-zod/src/index.ts` with both exports causing a build failure.

After each `codegen` run, verify `lib/api-zod/src/index.ts` only has `export * from "./generated/api"`.
