---
name: Clerk Auth Setup
description: Patterns used when replacing Replit Auth with Clerk — backend requireAuth with JIT DB provisioning, frontend ClerkProvider wiring, and Vite dedup fix.
---

# Clerk Auth — SmartAI

## Backend (Express)

- `requireAuth` middleware in `artifacts/api-server/src/middlewares/requireAuth.ts` uses `getAuth(req)` to get `userId`, then JIT-provisions the user into the `usersTable` via `createClerkClient`.
- Sets `req.userId` (string) and `req.userRecord` (id/email/firstName/lastName/profileImageUrl) — routes use these instead of old `req.user!.id`.
- `app.ts` mounts `clerkProxyMiddleware` **before** body parsers, then `clerkMiddleware` after cors/json. No more `authMiddleware` or `cookieParser`.
- `/api/auth/user` calls `getAuth` without `requireAuth` — returns `{ user: null }` when signed out.

**Why:** `clerkMiddleware` must run after the proxy but before routes; body parsers must not consume bytes before the proxy streams them.

## Frontend (React/Vite)

- `ClerkProvider` must be inside `<WouterRouter>` (it uses `useLocation` via `routerPush`/`routerReplace`).
- `publishableKeyFromHost` from `@clerk/react/internal` — never use raw env var directly.
- `proxyUrl = import.meta.env.VITE_CLERK_PROXY_URL` — empty in dev, auto-set in prod. Never gate on NODE_ENV.
- Routes must be exactly `/sign-in/*?` and `/sign-up/*?` (the `/*?` is required for OAuth sub-paths).
- `vite.config.ts` needs `tailwindcss({ optimize: false })` and `dedupe: ["react","react-dom","@clerk/react","@clerk/shared"]`.
- `index.css` needs `@layer theme, base, clerk, components, utilities;` before `@import "tailwindcss"`.

**Why:** Multiple React copies cause "Invalid hook call" — dedupe in Vite resolves to single instance.

## GitHub / other providers

Enable additional providers (GitHub, Apple) from the **Auth pane** in the workspace toolbar — no code change needed.
