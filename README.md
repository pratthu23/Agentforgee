# AgentForge

AgentForge is a focused AI agent prompt workbench for creating domain agents, running real test tasks, evaluating responses, improving prompts, and exporting a deployment key.

Core workflow:

```text
Create Agent -> Agent Instructions -> Run Test -> Evaluate Response -> Improve Prompt -> Export / Deploy Agent
```

## Features

- Firebase sign up, sign in, Google sign in, and saved agents.
- Saved Agents page with simple agent cards.
- Create Agent page with three polished templates:
  - SaaS Customer Support Agent
  - College Helpdesk Agent
  - Local Business WhatsApp Support Agent
- Agent Instructions editor for name, domain, description, tone, output format, constraints, and system prompt.
- Run Test section with model selector, task textarea, readable response panel, token count, and cost estimate.
- Evaluation section with overall, accuracy, safety, helpfulness, and domain fit scores.
- Human-readable evaluation feedback, failure analysis, and suggested prompt improvement.
- Improve Prompt section with preview, apply improvement, and before/after summary.
- Export / Deploy Agent section with generated deployment API key and copy action.
- Recent Runs table with task, score, pass/fail, and date.
- Server-side Local, Gemini, and OpenAI model providers.

Removed from this focused version:

- Old prompt analysis suite.
- Marketplace and clone-agent flow.
- Leaderboard.
- Public publishing/profile pages.
- Complex version history.
- Knowledge base panels.
- Tool integration panels.
- Conversation mode.
- Batch testing.
- Fake demo analytics or sample marketplace data.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Admin SDK
- Local free mode
- Gemini API optional free-tier mode
- OpenAI API optional paid mode
- Vercel deployment

## Environment Variables

Create `.env.local` from `.env.local.example` for local development.

Required Firebase browser config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Required Firebase server config:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

AI provider:

```env
AI_PROVIDER=local
```

Gemini mode:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

OpenAI mode:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Never expose `FIREBASE_PRIVATE_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY` in frontend code.

## Firebase Setup

1. Create/select a Firebase project.
2. Enable Authentication.
3. Enable Email/Password.
4. Optional: enable Google sign-in.
5. Add your Vercel domain in Authentication -> Settings -> Authorized domains.
6. Create a Firestore database.
7. Generate a service account key from Project settings -> Service accounts.
8. Copy `project_id`, `client_email`, and `private_key` to Vercel.

Use this private key format in Vercel:

```text
-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## Vercel Setup

Use these project settings:

```text
Framework Preset: Next.js
Build Command: npm run build
Output Directory: empty
Install Command: npm install
Root Directory: ./
```

After changing environment variables, redeploy without build cache.

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Checks:

```bash
npm run lint
npm run build
```

## Demo Flow

Use this under 90 seconds:

1. Sign in.
2. Create Agent.
3. Choose SaaS Customer Support Agent.
4. Generate agent.
5. Run this test task:

```text
A user says they were charged twice and wants a refund. Draft a support response and mention what information is needed.
```

6. Evaluate Response.
7. Preview Improved Prompt.
8. Apply Improvement.
9. Generate deployment key.

## Main Routes

- `/` - Home
- `/agent/new` - Create Agent
- `/agent/[id]` - Guided agent workbench
- `/dashboard` - Saved Agents
- `/login` - Sign in
- `/signup` - Create account
- `/marketplace` - Redirects to Saved Agents
- `/leaderboard` - Redirects to Saved Agents

## API Routes

- `/api/dashboard`
- `/api/generate-agent`
- `/api/agent/[id]`
- `/api/agent/[id]/deployment`
- `/api/run-agent`
- `/api/evaluate-agent`
- `/api/improve-agent`
- `/api/export-runs`
- `/api/evaluation/[id]`
- `/api/team`
- `/api/team/accept`

All API routes return JSON errors for missing auth, invalid input, missing environment configuration, and server failures.
