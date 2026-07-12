# Intelligent Assistant

A full-stack, AI-powered personal assistant web application featuring multi-mode chat, document analysis, career coaching, and voice integration. Built with a modern React frontend and an Express backend, deeply integrated with Clerk for authentication and multiple LLM providers (OpenAI, Gemini, HuggingFace, Anthropic, Ollama).

![Intelligent Assistant](https://intelligent-assistant.vercel.app/opengraph.jpg)

## 🚀 Core Features

- **Multi-Mode AI Chat**: Specialized assistants for General Chat, Learning, Career Coaching, and Document Analysis.
- **PeerUp AI Teacher Mode**: An educational assistant that tailors its responses and voice based on the user's educational background and gender.
- **Voice Integration**: Supports voice input and text-to-speech output using ElevenLabs and built-in browser APIs.
- **Document Analysis**: Upload PDFs and text files for the AI to summarize, extract key points, or generate quizzes.
- **Conversation History**: All chats and documents are securely saved to a PostgreSQL database, allowing you to resume conversations anytime.
- **Multi-Language Support**: Seamlessly switch between English, Hindi (हिंदी), and Marathi (मराठी).
- **Responsive Design**: Beautiful, mobile-friendly UI with dark/light mode support using Tailwind CSS v4 and shadcn/ui.

## 🛠️ Technology Stack

**Frontend**
- React 19 & TypeScript
- Vite (Build Tool)
- Tailwind CSS v4 & shadcn/ui
- Wouter (Routing)
- TanStack Query (Data Fetching)
- @clerk/react (Authentication)

**Backend**
- Node.js & Express
- Drizzle ORM (Database ORM)
- PostgreSQL (Database)
- @clerk/express (Auth Middleware)
- Multer & pdf-parse (Document Processing)

**Monorepo Tooling**
- pnpm workspaces
- OpenAPI 3.1 & Orval (API Contract & Codegen)
- Zod (Validation)

## 📂 Project Structure

This project is organized as a monorepo using pnpm workspaces:

```text
intelligent-assistant/
├── artifacts/
│   ├── api-server/          # Express backend API
│   └── smart-ai/            # React frontend application
├── lib/
│   ├── api-spec/            # OpenAPI YAML specification
│   ├── api-zod/             # Auto-generated Zod schemas
│   ├── api-client-react/    # Auto-generated React Query hooks
│   └── db/                  # Drizzle ORM schema and DB connection
├── netlify/
│   └── functions/           # Serverless entry point for Netlify deployment
└── package.json             # Root workspace configuration
```

## 🌐 Deployment (Netlify or Vercel)

This monorepo is fully configured to be deployed to modern serverless platforms like Netlify or Vercel. 

### 1. Database & Authentication Setup
Before deploying, you must provision a production database and set up authentication:
1. **Database**: Create a free PostgreSQL database on [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/) and copy the Connection String.
2. **Authentication**: Create an application on [Clerk](https://clerk.com/) and copy your Publishable Key and Secret Key.

### 2. Environment Variables
In your hosting provider's dashboard (e.g., Netlify Site Settings > Environment Variables), you must add the following keys:

- `DATABASE_URL`: Your production Postgres connection string.
- `SESSION_SECRET`: A long, random string of characters for security.
- `CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key.
- `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key (must be exactly the same).
- `CLERK_SECRET_KEY`: Your Clerk secret key.
- `OPENAI_API_KEY`: (Optional) Your OpenAI API key.
- `GEMINI_API_KEY`: (Optional) Your Gemini API key.
- `ELEVENLABS_API_KEY`: (Optional) For voice synthesis.

### 3. Deploying to Netlify
The repository includes a `netlify.toml` file configured for serverless deployment.
1. Connect your GitHub repository to Netlify.
2. Ensure the build command is set to: `pnpm run build`
3. Ensure the publish directory is set to: `dist`
4. Add your environment variables and click **Deploy**.
*(Note: The root `package.json` automatically copies the frontend build to the root `dist` folder to ensure flawless deployment).*

## 💻 Local Development

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory based on `.env.example` and fill in your local Postgres URL and Clerk keys.

3. **Database Migration**
   Push the schema to your local database:
   ```bash
   pnpm --filter @workspace/db run db:push
   ```

4. **Start Development Servers**
   ```bash
   pnpm run dev
   ```
   - The frontend will be available at `http://localhost:19028` (or the port defined in your `.env`).
   - The backend API will be available at `http://localhost:8080`.

## 🧠 Main Logic & Architecture

The Intelligent Assistant leverages a React frontend and an Express backend, deeply integrated with Clerk for authentication and multiple LLM endpoints for conversational AI.

1. **Frontend State & Routing:** React handles routing and interface state via Wouter and Zustand. The user interacts through chat interfaces that support both text and voice.
2. **Voice & Media Processing:** Audio inputs are processed using standard Web APIs, converted to text, and fed into the AI models. Media files can be attached as documents for context.
3. **Backend Services:** Express provides endpoints mapping to database operations (Drizzle ORM & PostgreSQL). Authentication is intercepted seamlessly via Clerk Middlewares (`@clerk/express`).
4. **AI Orchestration:** The backend dynamically forms system prompts based on the selected mode (e.g., *PeerUp AI Teacher mode* requests educational background and gender matching logic before configuring system instructions) and delegates inference to the integrated LLM provider.