# SmartAI Assistant

A full-stack AI-powered personal assistant web application with multi-mode chat, document analysis, learning tools, career coaching, bookmarks, and multi-language support. Runs on a local Ollama LLM — fully private, no external AI API costs.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Core Features](#core-features)
4. [Architecture & Working Flow](#architecture--working-flow)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Authentication (Clerk)](#authentication-clerk)
8. [AI Integration (Ollama)](#ai-integration-ollama)
9. [Frontend Pages & Logic](#frontend-pages--logic)
10. [Local Setup & Run](#local-setup--run)
11. [Environment Variables](#environment-variables)
12. [API Keys — What, Where & How to Get Them](#api-keys--what-where--how-to-get-them)
13. [How Everything Connects](#how-everything-connects)

---

## Tech Stack

### Frontend
| Technology | Why Used |
|---|---|
| **React 19** | Component-based UI, fast rendering with hooks |
| **TypeScript** | Type safety across entire codebase |
| **Vite** | Lightning-fast dev server and HMR |
| **Tailwind CSS v4** | Utility-first styling, dark mode, responsive design |
| **shadcn/ui** | Pre-built accessible components (buttons, cards, dialogs) |
| **Wouter** | Lightweight client-side routing (replaces React Router) |
| **TanStack Query** | Server state management, caching, and API hooks |
| **@clerk/react** | Authentication UI — Google, GitHub, email+OTP |

### Backend
| Technology | Why Used |
|---|---|
| **Node.js 24** | Fast async I/O for AI streaming and file processing |
| **TypeScript** | Same language as frontend for shared types |
| **Express 5** | HTTP server, routing, middleware pipeline |
| **Drizzle ORM** | Type-safe SQL queries with schema-as-code |
| **PostgreSQL** | Relational DB for users, conversations, documents |
| **@clerk/express** | Server-side session validation via JWT cookies |
| **Multer** | Multipart file upload handling for documents |
| **pdf-parse** | Extract text from uploaded PDF files |
| **pino / pino-http** | Structured JSON logging |

### AI
| Technology | Why Used |
|---|---|
| **Ollama** | Run open-source LLMs (Llama 3.2) locally — fully private |
| **llama3.2** | Default model — fast, capable, runs on consumer hardware |

### Monorepo & Tooling
| Technology | Why Used |
|---|---|
| **pnpm workspaces** | Shared dependencies, fast installs, monorepo management |
| **esbuild** | Bundles the Express server into a single `.mjs` file |
| **Orval** | Generates React Query hooks and Zod schemas from OpenAPI spec |
| **Zod** | Runtime validation of API request/response bodies |
| **OpenAPI 3.1** | Single source of truth for all API contracts |

---

## Project Structure

```
smartai/
├── artifacts/
│   ├── api-server/          # Express backend
│   │   ├── src/
│   │   │   ├── app.ts       # Express app setup (middleware pipeline)
│   │   │   ├── index.ts     # Entry point (binds to PORT)
│   │   │   ├── middlewares/
│   │   │   │   ├── clerkProxyMiddleware.ts   # Proxies Clerk auth requests
│   │   │   │   └── requireAuth.ts            # Auth guard + JIT user provisioning
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts          # GET /api/auth/user
│   │   │   │   ├── chat.ts          # Conversations + chat with Ollama
│   │   │   │   ├── documents.ts     # File upload + AI analysis
│   │   │   │   ├── bookmarks.ts     # Save/delete bookmarks
│   │   │   │   ├── user.ts          # User profile CRUD
│   │   │   │   ├── stats.ts         # Dashboard stats + Ollama models
│   │   │   │   └── health.ts        # Health check endpoint
│   │   │   └── lib/
│   │   │       └── logger.ts        # Pino logger singleton
│   │   └── build.mjs                # esbuild bundle script
│   │
│   └── smart-ai/            # React frontend
│       ├── src/
│       │   ├── App.tsx              # Root: ClerkProvider + Router
│       │   ├── index.css            # Tailwind v4 + Clerk layer config
│       │   ├── pages/
│       │   │   ├── landing.tsx      # Public landing page
│       │   │   ├── dashboard.tsx    # Stats overview
│       │   │   ├── chat.tsx         # AI chat interface
│       │   │   ├── learn.tsx        # Learning tutor mode
│       │   │   ├── career.tsx       # Career coach mode
│       │   │   ├── documents.tsx    # Document upload + analysis
│       │   │   ├── bookmarks.tsx    # Saved responses
│       │   │   ├── profile.tsx      # User profile editor
│       │   │   └── settings.tsx     # App preferences
│       │   └── components/
│       │       ├── layout.tsx       # Sidebar nav + mobile header
│       │       └── ui/              # shadcn/ui components
│       └── public/
│           └── logo.svg             # App logo used in Clerk sign-in
│
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml     # OpenAPI 3.1 spec (source of truth)
│   ├── api-client-react/
│   │   └── src/generated/api.ts   # Auto-generated React Query hooks
│   ├── api-zod/
│   │   └── src/generated/api.ts   # Auto-generated Zod schemas
│   └── db/
│       └── src/schema/
│           ├── auth.ts      # users table (Clerk user records)
│           └── smartai.ts   # conversations, messages, documents, bookmarks, userProfiles
│
└── scripts/                 # Shared utility scripts
```

---

## Core Features

| Feature | Description |
|---|---|
| **Multi-mode AI Chat** | General, Learning, Career, Document, Voice — each with a different system prompt |
| **Conversation History** | All chats stored in PostgreSQL, resumable at any time |
| **Document Analysis** | Upload PDF/TXT → AI generates summary, key points, Q&A, or quiz |
| **Learning Tutor** | Explains concepts, quizzes you, supports Hindi and Marathi |
| **Career Coach** | Resume review, interview prep, skill gap analysis |
| **Bookmarks** | Save any AI response for later reference |
| **User Profile** | Display name, bio, preferred language, AI model, theme |
| **Dark/Light Theme** | System-aware theme with manual override |
| **Multi-language** | English, Hindi (हिंदी), Marathi (मराठी) |

---

## Architecture & Working Flow

```
Browser (React + Vite)
        │
        │  HTTP requests (cookies for auth)
        ▼
Reverse Proxy (Replit / nginx)
        │
        ├──▶  /          → Frontend Vite dev server (port 19028)
        │
        └──▶  /api       → Express API server (port 8080)
                 │
                 ├── clerkProxyMiddleware  → proxies /api/__clerk → Clerk FAPI
                 ├── clerkMiddleware       → validates Clerk session cookies
                 ├── requireAuth           → checks auth, JIT-provisions user in DB
                 │
                 ├── /api/auth/user        → returns current user
                 ├── /api/conversations    → CRUD for chat conversations
                 ├── /api/chat             → sends message to Ollama, saves reply
                 ├── /api/documents        → upload + PDF extraction + AI analysis
                 ├── /api/bookmarks        → save/list/delete bookmarks
                 ├── /api/user/profile     → get/update user profile
                 ├── /api/stats            → dashboard statistics
                 └── /api/models           → lists available Ollama models
                          │
                          ▼
                   Ollama HTTP API (localhost:11434)
                          │
                          ▼
                   Llama 3.2 (local LLM)
```

### Request Lifecycle

1. **User opens app** → React loads, `ClerkProvider` initialises, checks session cookie
2. **Unauthenticated** → Landing page shown with "Sign In" / "Get Started" buttons
3. **Sign in** → Clerk UI handles Google OAuth / email+OTP, sets `__session` cookie
4. **API request** → Browser sends cookie → `clerkMiddleware` validates JWT → `requireAuth` extracts `userId` → JIT creates user record in DB if first visit
5. **Chat message** → Frontend POSTs to `/api/chat` → Express saves user message → calls Ollama → saves AI reply → returns response with suggested follow-up questions
6. **Document upload** → Frontend POSTs `multipart/form-data` → Multer saves file → text extracted (PDF or TXT) → stored in DB; analysis triggered separately via `/api/documents/:id/analyze`

---

## Database Schema

### `users` table
| Column | Type | Description |
|---|---|---|
| `id` | text (PK) | Clerk user ID (`user_xxx`) |
| `email` | text | Primary email from Clerk |
| `firstName` | text | From Clerk profile |
| `lastName` | text | From Clerk profile |
| `profileImageUrl` | text | From Clerk profile |
| `createdAt` | timestamp | Record creation time |
| `updatedAt` | timestamp | Last update time |

### `userProfiles` table
| Column | Type | Description |
|---|---|---|
| `userId` | text (FK → users) | Links to users table |
| `displayName` | text | Custom display name |
| `bio` | text | Short bio |
| `preferredLanguage` | text | `en`, `hi`, or `mr` |
| `theme` | text | `light`, `dark`, or `system` |
| `preferredModel` | text | Ollama model name |
| `voiceEnabled` | boolean | Voice mode toggle |

### `conversations` table
| Column | Type | Description |
|---|---|---|
| `id` | serial (PK) | Auto-increment |
| `userId` | text (FK) | Owner |
| `title` | text | Auto-generated from first message |
| `mode` | text | `general`, `learning`, `career`, `document`, `voice` |
| `bookmarked` | boolean | Starred by user |
| `createdAt` / `updatedAt` | timestamp | |

### `messages` table
| Column | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `conversationId` | integer (FK) | Parent conversation |
| `role` | text | `user` or `assistant` |
| `content` | text | Message text |
| `createdAt` | timestamp | |

### `documents` table
| Column | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `userId` | text (FK) | Owner |
| `name` | text | Original filename |
| `fileType` | text | `pdf`, `txt`, `md` |
| `fileSize` | integer | Bytes |
| `content` | text | Extracted full text |
| `summary` | text | AI-generated summary |
| `analyzed` | boolean | Whether AI has processed it |

### `bookmarks` table
| Column | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `userId` | text (FK) | Owner |
| `title` | text | Bookmark label |
| `content` | text | Saved AI response text |
| `category` | text | Optional tag |

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require a valid Clerk session cookie (`__session`).

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auth/user` | No | Returns `{ user }` or `{ user: null }` |

### Conversations
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/conversations` | Yes | List all user conversations |
| POST | `/conversations` | Yes | Create new conversation |
| GET | `/conversations/:id` | Yes | Get conversation with messages |
| PATCH | `/conversations/:id` | Yes | Update title or bookmark status |
| DELETE | `/conversations/:id` | Yes | Delete conversation |

### Chat
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/chat` | Yes | Send message, get AI reply |

**POST /chat body:**
```json
{
  "content": "Explain photosynthesis",
  "conversationId": 42,
  "mode": "learning",
  "model": "llama3.2",
  "language": "en"
}
```

**Response:**
```json
{
  "content": "Photosynthesis is...",
  "conversationId": 42,
  "messageId": 101,
  "suggestedQuestions": ["Can you give an example?", "..."],
  "model": "llama3.2"
}
```

### Documents
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/documents` | Yes | List user documents |
| POST | `/documents` | Yes | Upload file (`multipart/form-data`, field: `file`) |
| GET | `/documents/:id` | Yes | Get document details |
| DELETE | `/documents/:id` | Yes | Delete document |
| POST | `/documents/:id/analyze` | Yes | Run AI analysis |

**POST /documents/:id/analyze body:**
```json
{ "analysisType": "summary" }
```
`analysisType` options: `summary`, `keyPoints`, `qa`, `quiz`

### Bookmarks
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/bookmarks` | Yes | List bookmarks |
| POST | `/bookmarks` | Yes | Create bookmark |
| DELETE | `/bookmarks/:id` | Yes | Delete bookmark |

### User Profile
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/user/profile` | Yes | Get profile + settings |
| PATCH | `/user/profile` | Yes | Update profile fields |

### Stats & Models
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats` | Yes | Dashboard statistics |
| GET | `/models` | No | List available Ollama models |

---

## Authentication (Clerk)

This app uses **Replit-managed Clerk** for authentication.

### How it works

1. **Frontend** — `ClerkProvider` wraps the app and manages the session cookie automatically. No manual token handling needed for API calls.
2. **Backend** — `clerkMiddleware` validates the `__session` cookie on every request. `requireAuth` middleware then:
   - Extracts `userId` from the validated token
   - Looks up the user in the local `users` table
   - If the user doesn't exist (first login), fetches their profile from the Clerk API and inserts them into the DB
   - Attaches `req.userId` and `req.userRecord` for use in route handlers

### Login Methods
- **Google** — one-click OAuth
- **GitHub** — one-click OAuth (enable in the Auth pane)
- **Email + Password** — with email OTP verification
- **Sign up / Sign in** flow handled by Clerk's built-in UI at `/sign-in` and `/sign-up`

### Session Flow
```
User clicks "Sign In"
   → Navigate to /sign-in
   → Clerk UI shown (Google / Email)
   → User authenticates
   → Clerk sets __session cookie
   → Redirect to /dashboard
   → All API calls automatically include the cookie
   → clerkMiddleware validates on every request
```

---

## AI Integration (Ollama)

Ollama must be running locally. The app calls it at `http://localhost:11434` by default (override with `OLLAMA_URL` env var).

### Install Ollama
```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull the default model
ollama pull llama3.2
```

### How chat works
```
POST /api/chat
  → Load conversation history from DB
  → Build system prompt based on mode (general / learning / career / ...)
  → Prepend language instruction if Hindi or Marathi selected
  → Send full message history to Ollama /api/chat
  → Save AI reply to DB
  → Return reply + suggested follow-up questions
```

### System Prompts by Mode
| Mode | Persona |
|---|---|
| `general` | Friendly all-purpose assistant |
| `learning` | Expert educational tutor — explains, quizzes, summarises |
| `career` | Career counselor — resume, interviews, skill gaps |
| `document` | Document analyst — extracts insights from uploaded text |
| `voice` | Concise voice-optimised assistant |

### Document Analysis Flow
```
Upload file (PDF / TXT / MD)
  → Multer saves to disk (artifacts/api-server/uploads/)
  → Text extracted (pdf-parse for PDFs, fs.readFile for TXT/MD)
  → Full text stored in DB (documents.content)

POST /documents/:id/analyze { analysisType: "summary" }
  → Fetch document text from DB (truncated to 6000 chars)
  → Build prompt based on analysisType
  → Call Ollama /api/generate
  → Save result; return to frontend
```

---

## Frontend Pages & Logic

### Landing (`/`)
- Public page — shows sign-in / get-started buttons
- Redirects signed-in users to `/dashboard` automatically

### Dashboard (`/dashboard`)
- Fetches stats via `GET /api/stats`
- Shows total conversations, messages, documents, bookmarks
- Quick-start cards for each AI mode

### Chat (`/chat`, `/chat/:id`)
- Sidebar list of all conversations
- Select a conversation to load full message history
- Type a message → POST to `/api/chat` → streams reply into UI
- Mode selector (General / Learning / Career / Document / Voice)
- Suggested follow-up questions after each reply

### Learn (`/learn`)
- Preset prompts for learning tasks
- Powered by chat mode `learning` under the hood

### Career (`/career`)
- Preset prompts for career tasks (resume, interview, cover letter)
- Powered by chat mode `career`

### Documents (`/documents`)
- Upload any PDF, TXT, or MD file
- View uploaded documents
- Click "Analyze" → choose analysis type → AI processes and shows result

### Bookmarks (`/bookmarks`)
- List all saved bookmarks
- Delete individual bookmarks

### Profile (`/profile`)
- Edit display name and bio
- Profile photo comes from Clerk (Google / GitHub profile picture)

### Settings (`/settings`)
- Change language (EN / HI / MR)
- Change theme (Light / Dark / System)
- Choose preferred Ollama model
- Toggle voice mode

---

## Local Setup & Run

### Prerequisites
- Node.js 24+
- pnpm 9+
- PostgreSQL 15+
- Ollama (with `llama3.2` model pulled)

### 1. Clone and install
```bash
git clone <your-repo-url>
cd smartai
pnpm install
```

### 2. Set up environment variables
Create a `.env` file in the project root:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/smartai
SESSION_SECRET=any-random-string-at-least-32-chars
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
OLLAMA_URL=http://localhost:11434
```

> **Note:** Clerk keys come from your Clerk dashboard or Replit secrets.

### 3. Set up the database
```bash
pnpm --filter @workspace/db run push
```
This creates all tables in your PostgreSQL database.

### 4. Start Ollama
```bash
ollama serve          # starts the Ollama server
ollama pull llama3.2  # download the model (first time only)
```

### 5. Start the backend
```bash
pnpm --filter @workspace/api-server run dev
# Runs on port 8080
```

### 6. Start the frontend
```bash
pnpm --filter @workspace/smart-ai run dev
# Runs on port 19028
```

### 7. Open the app
Navigate to `http://localhost:19028` in your browser.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | — | Secret for signing sessions |
| `CLERK_SECRET_KEY` | Yes | — | Clerk backend secret key |
| `CLERK_PUBLISHABLE_KEY` | Yes | — | Clerk publishable key (server) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | — | Clerk publishable key (browser) |
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama API base URL |
| `PORT` | No | `8080` | API server port |

---

## How Everything Connects

```
┌─────────────────────────────────────────────┐
│              React Frontend                  │
│                                             │
│  ClerkProvider (auth state + session cookie)│
│       │                                     │
│  TanStack Query (generated hooks from Orval)│
│       │  calls /api/* with cookies          │
└───────┼─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│           Express API Server                │
│                                             │
│  clerkProxyMiddleware → /api/__clerk        │
│  clerkMiddleware → validates __session      │
│  requireAuth → userId + DB user lookup      │
│       │                                     │
│  Route handlers → Drizzle ORM → PostgreSQL  │
│       │                                     │
│  Chat routes → Ollama HTTP API              │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│           PostgreSQL Database               │
│  users / userProfiles / conversations       │
│  messages / documents / bookmarks           │
└─────────────────────────────────────────────┘
        │
┌─────────────────────────────────────────────┐
│           Ollama (local LLM)                │
│  llama3.2 running at localhost:11434        │
│  Fully private — no data leaves your machine│
└─────────────────────────────────────────────┘
```

### Code Generation Pipeline
```
lib/api-spec/openapi.yaml          (you edit this)
        │
        │  pnpm --filter @workspace/api-spec run codegen
        ▼
lib/api-client-react/src/generated/api.ts   (React Query hooks)
lib/api-zod/src/generated/api.ts            (Zod validators)
```
Any time you add a new API endpoint, update `openapi.yaml` first, then run codegen — the frontend hooks and backend validators are auto-generated.

---

## API Keys — What, Where & How to Get Them

This project uses **2 external services** that require API keys. No other paid APIs are needed — the AI runs locally via Ollama.

---

### 1. Clerk (Authentication)

**What it does:** Handles all user login/signup — Google OAuth, email + OTP, session management.

**Website:** [https://clerk.com](https://clerk.com)

**Keys needed:**

| Key Name | Used In | Description |
|---|---|---|
| `CLERK_SECRET_KEY` | Backend (Express) | Validates session tokens server-side. Starts with `sk_test_` (dev) or `sk_live_` (prod) |
| `CLERK_PUBLISHABLE_KEY` | Backend (Express middleware) | Resolves the correct Clerk app per domain |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend (React) | Initialises Clerk in the browser. Starts with `pk_test_` (dev) or `pk_live_` (prod) |

**How to get them:**

> **If using Replit:** Keys are auto-provisioned — you don't need to create a Clerk account. They appear automatically in your Replit Secrets after the app is set up.

> **If running locally (self-hosted):**
> 1. Go to [https://clerk.com](https://clerk.com) and create a free account
> 2. Click **"Create application"** → give it a name (e.g. `SmartAI`)
> 3. Choose login methods: enable **Google**, **GitHub**, **Email**
> 4. Go to **API Keys** in the left sidebar
> 5. Copy **Publishable key** → use as `CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PUBLISHABLE_KEY`
> 6. Copy **Secret key** → use as `CLERK_SECRET_KEY`
> 7. Paste all three into your `.env` file

**Free tier limits:** 10,000 Monthly Active Users — more than enough for personal or small-team use.

---

### 2. PostgreSQL Database

**What it does:** Stores all user data — conversations, messages, documents, bookmarks, profile settings.

**Not a paid API** — you host it yourself. Options:

| Option | Website | Free Tier |
|---|---|---|
| **Neon** (recommended, serverless) | [https://neon.tech](https://neon.tech) | Yes — 0.5 GB free |
| **Supabase** | [https://supabase.com](https://supabase.com) | Yes — 500 MB free |
| **Railway** | [https://railway.app](https://railway.app) | Yes — limited hours |
| **Local PostgreSQL** | [https://postgresql.org](https://postgresql.org) | Free forever |

**Key needed:**

| Key Name | Description |
|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string |

**Format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

**Example (Neon):**
```
postgresql://myuser:mypassword@ep-cool-rain-123456.us-east-2.aws.neon.tech/smartai?sslmode=require
```

**How to get it (Neon — recommended):**
1. Go to [https://neon.tech](https://neon.tech) and sign up free
2. Click **"New Project"** → name it `smartai`
3. After creation, go to **"Connection Details"**
4. Copy the **Connection string** — that is your `DATABASE_URL`
5. Paste it into your `.env` file

> **If using Replit:** The PostgreSQL database is auto-provisioned and `DATABASE_URL` is automatically set in your environment. No manual setup needed.

---

### 3. Ollama (AI / LLM) — No API Key Required

**What it does:** Runs the AI language model (Llama 3.2) entirely on your own machine. No API key, no cost, no data sent to any server.

**Website:** [https://ollama.com](https://ollama.com)

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the default model used by this app
ollama pull llama3.2

# Start the server (runs on localhost:11434)
ollama serve
```

**Optional models you can use:**
| Model | Command | Size | Notes |
|---|---|---|---|
| `llama3.2` | `ollama pull llama3.2` | ~2 GB | Default, fast |
| `llama3.2:1b` | `ollama pull llama3.2:1b` | ~1.3 GB | Smaller, faster |
| `mistral` | `ollama pull mistral` | ~4 GB | Good for documents |
| `gemma2` | `ollama pull gemma2` | ~5 GB | Strong at reasoning |

Change the model in **Settings** inside the app — no code changes needed.

---

### Summary Table

| Service | API Key(s) | Website | Cost |
|---|---|---|---|
| **Clerk** | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` | [clerk.com](https://clerk.com) | Free up to 10k users/month |
| **PostgreSQL** | `DATABASE_URL` | [neon.tech](https://neon.tech) (or self-host) | Free tier available |
| **Ollama / Llama** | None | [ollama.com](https://ollama.com) | Completely free, runs locally |

> **Total external API cost for personal use: $0**

---

## Common Commands

```bash
# Install all dependencies
pnpm install

# Run typecheck across all packages
pnpm run typecheck

# Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Build all packages
pnpm run build

# Start API server (dev)
pnpm --filter @workspace/api-server run dev

# Start frontend (dev)
pnpm --filter @workspace/smart-ai run dev
```

---

## Deployment to Vercel

This project is configured to be easily deployed to Vercel using a single monolithic deployment for both the frontend (Vite) and the backend (Express API as a serverless function).

### Vercel Project Setup

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and create a new Project.
3. Import your GitHub repository.
4. Leave the **Root Directory** as the repository root (`./`).
5. Under **Build and Output Settings**, Vercel should automatically detect the `vercel.json` configuration and the Framework Preset. If not, explicitly set:
   - **Framework Preset**: `Vite`
   - **Build Command**: `pnpm --filter @workspace/smart-ai run build`
   - **Output Directory**: `artifacts/smart-ai/dist`
6. Expand **Environment Variables** and add all variables from your `.env` file (e.g., `DATABASE_URL`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, etc.). Note: `OLLAMA_URL` needs to be publicly accessible (e.g., using a reverse proxy or ngrok) if you want the Vercel hosted version to communicate with your local Ollama instance, otherwise use a remote LLM API.
7. Click **Deploy**.

Vercel will use the provided `vercel.json` and `/api/index.ts` files to correctly route API traffic to your backend while serving the Vite frontend on the root domain.


## Main Logic & Architecture

The Intelligent Assistant (SmartAI) is built using a modern full-stack monorepo architecture:

### 1. Frontend (React + Vite)
- **Framework & Styling**: Built with React, Vite, TailwindCSS, and Radix UI components for a premium user experience.
- **Voice Capabilities**: Leverages the browser's native `SpeechRecognition` API for continuous voice-to-text recording, and `window.speechSynthesis` for text-to-speech AI responses.
- **State Management**: Uses React Query (via Orval-generated hooks) to cache and manage interactions with the backend.

### 2. Backend (Express + Drizzle ORM)
- **API Server**: A Node.js Express server that exposes REST endpoints for chatting, uploading documents, and managing conversation history.
- **Database**: Uses PostgreSQL for persistent storage, managed via Drizzle ORM (schema definitions map conversations, messages, and users).
- **Serverless Support**: Configured to run seamlessly as a Serverless Function (via `serverless-http`) for cloud deployments like Netlify.

### 3. AI Integration Layer
- **Prompt Engineering**: The backend routes (`api-server/src/routes/chat.ts`) define distinct AI personalities (e.g., General, Career Coach, Document Analyzer, English Teacher) using tailored system prompts.
- **Model Orchestration**: Supports multiple LLM providers (Anthropic Claude, Ollama, Gemini) depending on user selection.
- **Feature Modules**:
  - **English Teacher Mode**: Injects dynamic context like the user's education level and chosen practice scenario, and mandates structured grammar/vocabulary feedback from the AI.
  - **Document Analysis**: Processes uploaded files, extracts text (e.g., PDF parsing), and embeds the context directly into the AI's prompt for Retrieval-Augmented Generation (RAG).

### 4. Authentication
- Secured using **Clerk**. The frontend handles user sign-in/sign-up flows, while the backend uses Clerk middleware to verify session tokens and protect routes.

 # #   M a i n   L o g i c   o f   t h e   P r o j e c t 
 T h e   I n t e l l i g e n t   A s s i s t a n t   l e v e r a g e s   a   R e a c t   f r o n t e n d   a n d   a n   E x p r e s s   b a c k e n d ,   d e e p l y   i n t e g r a t e d   w i t h   C l e r k   f o r   a u t h e n t i c a t i o n   a n d   a   l o c a l / r e m o t e   L L M   e n d p o i n t   ( O l l a m a / O p e n A I   c o m p a t i b l e )   f o r   c o n v e r s a t i o n a l   A I . 
 
 1 .     * * F r o n t e n d   S t a t e   &   R o u t i n g : * *   R e a c t   h a n d l e s   r o u t i n g   a n d   i n t e r f a c e   s t a t e   v i a   R e a c t   R o u t e r   a n d   Z u s t a n d .   T h e   u s e r   i n t e r a c t s   t h r o u g h   c h a t   i n t e r f a c e s   t h a t   s u p p o r t   b o t h   t e x t   a n d   v o i c e . 
 2 .     * * V o i c e   &   M e d i a   p r o c e s s i n g : * *   A u d i o   i n p u t s   a r e   p r o c e s s e d   u s i n g   s t a n d a r d   W e b   A P I s ,   c o n v e r t e d   t o   t e x t ,   a n d   f e d   i n t o   t h e   A I   m o d e l s .   M e d i a   f i l e s   c a n   b e   a t t a c h e d   a s   d o c u m e n t s   f o r   c o n t e x t . 
 3 .     * * B a c k e n d   S e r v i c e s : * *   E x p r e s s   p r o v i d e s   e n d p o i n t s   m a p p i n g   t o   d a t a b a s e   o p e r a t i o n s   ( D r i z z l e   O R M   &   P o s t g r e S Q L ) .   A u t h e n t i c a t i o n   i s   i n t e r c e p t e d   s e a m l e s s l y   v i a   C l e r k   M i d d l e w a r e s . 
 4 .     * * A I   O r c h e s t r a t i o n : * *   T h e   b a c k e n d   f o r m s   s y s t e m   p r o m p t s   b a s e d   o n   t h e   m o d e   ( e . g . ,   P e e r U p   A I   T e a c h e r   m o d e   r e q u e s t s   e d u c a t i o n a l   b a c k g r o u n d   a n d   g e n d e r   m a t c h i n g   l o g i c   b e f o r e   c o n f i g u r i n g   s y s t e m   i n s t r u c t i o n s )   a n d   d e l e g a t e s   i n f e r e n c e   t o   t h e   i n t e g r a t e d   L L M   p r o v i d e r . 
  
 