# SmartAI Assistant

An AI-powered personal assistant web app with chat, learning, career guidance, document analysis, bookmarks, and multi-language support.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/smart-ai run dev` — run the React frontend (port 19028, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `OLLAMA_URL` — Ollama base URL (default: `http://localhost:11434`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Backend: Express 5, pino logging
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit Auth (OIDC)
- AI: Ollama (local LLM at localhost:11434)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/smartai.ts` — database schema (conversations, messages, documents, bookmarks, userProfiles)
- `lib/db/src/schema/auth.ts` — sessions + users (Replit Auth)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (do not edit manually)
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (do not edit manually)
- `lib/replit-auth-web/src/` — `useAuth()` hook for frontend auth state
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/smart-ai/src/pages/` — React page components

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → React Query hooks + Zod schemas. Never write API fetch code manually.
- Document upload uses raw `fetch + FormData` (not a generated hook) because multipart/form-data upload bodies in OpenAPI cause Blob/File TS errors in Node — multer handles it directly in `documents.ts`.
- Mobile auth endpoints (`/api/mobile-auth/*`) exist in the spec to satisfy Orval codegen for the auth route's Zod imports. Not used by the web app.
- `lib/replit-auth-web` is a composite lib; its tsconfig must NOT include `vite/client` types — use `(import.meta as any).env?.BASE_URL` to avoid TS errors.
- All API routes require authentication (`req.isAuthenticated()` returns 401 otherwise).

## Product

- **AI Chat** — multi-mode chat (General, Learning, Career, Document, Voice) with conversation history and per-conversation persistence
- **Learning Tutor** — explain concepts, quiz me, solve problems; multi-language (EN/HI/MR)
- **Career Coach** — resume review, interview prep, cover letters, skill gap analysis
- **Document Analysis** — upload PDF/TXT, get AI summary, key points, Q&A, or quiz
- **Bookmarks** — save and categorize important responses
- **Settings** — language, theme (light/dark/system), preferred Ollama model, voice toggle

## Gotchas

- Ollama must be running locally at port 11434 for AI responses to work. The app gracefully handles Ollama being unavailable (returns 503 for `/api/models`, chat returns an error message).
- Run codegen after any OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/db run push` must be run after schema changes in `lib/db`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
