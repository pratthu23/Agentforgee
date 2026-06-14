# AgentForge

AgentForge is a focused workspace for building, editing, testing, and evaluating domain-specific AI agents. It helps you create an agent from a template or plain-English brief, refine the system prompt, run real test tasks, score the output, and save stronger prompt versions over time.

The current product scope is intentionally lean for prototype and hackathon use. It focuses on private saved agents, prompt quality, test runs, and evaluation instead of marketplace or public discovery features.

## Current Scope

AgentForge includes:

- Firebase Authentication for sign up, sign in, and saved agents.
- Saved Agents dashboard for opening and continuing agent work.
- Agent templates for HR, legal, finance, customer support, coding, sales, and incident response.
- Agent creation from templates or a plain-English description.
- Full prompt editor for name, domain, description, tone, constraints, output format, and system prompt.
- AgentForge Lens for prompt quality analysis, optimization, token estimates, ROI estimates, and version history.
- Live prompt optimization from the current editor draft, even before saving.
- Single-task agent runner.
- Batch test-case runner and benchmark suites.
- Evaluation scorecard with accuracy, safety, helpfulness, overall score, pass/fail, feedback, failure analysis, and improvement suggestions.
- Cost and token estimate tracking for model runs.
- Save, load, edit, and version agents using Cloud Firestore.
- Optional knowledge snippets, tool descriptions, and conversation mode for deeper testing.

Removed from this prototype:

- Marketplace page and clone-agent flow.
- Leaderboard page.
- Public/private publishing controls.
- Public agent profile URLs.
- Public deployment endpoint per agent.
- Heavy dashboard analytics.
- Fake marketplace or leaderboard sample data pretending to be live.
- Groq provider paths.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Admin SDK for server-side database access
- Gemini API for free-tier model mode
- OpenAI API for paid model mode
- Local free mode for no-cost testing
- Vercel-ready deployment

## AI Modes

AgentForge supports three practical modes.

### Local Free Mode

Use this for testing the full app flow without spending API credits.

```env
AI_PROVIDER=local
```

Local mode uses built-in deterministic logic for agent generation, runs, prompt analysis, prompt optimization, and evaluation. It is useful for demos, UI testing, and development, but it is not as intelligent as a real LLM.

### OpenAI Mode

Use this when you want real model output.

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

Recommended prototype model:

```env
OPENAI_MODEL=gpt-4o-mini
```

Keep `OPENAI_API_KEY` server-only. Do not rename it to `NEXT_PUBLIC_OPENAI_API_KEY`, and do not put it in frontend code.

### Gemini Free Mode

Use this when you want a web-ready hosted model without spending OpenAI credits. Google currently offers free tiers for some Gemini Flash models in the Gemini API. The default model in this project is:

```env
GEMINI_MODEL=gemini-3.1-flash-lite
```

Configure:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

Keep `GEMINI_API_KEY` server-only. Do not rename it to `NEXT_PUBLIC_GEMINI_API_KEY`, and do not put it in frontend code.

## Environment Variables

Create `.env.local` from the example file:

```bash
cp .env.local.example .env.local
```

Then fill in:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

AI_PROVIDER=local
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

Notes:

- `NEXT_PUBLIC_FIREBASE_*` values are Firebase web app config values. They are expected to be available to the browser.
- `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` come from a Firebase service account and must stay private.
- `OPENAI_API_KEY` must stay private.
- `GEMINI_API_KEY` must stay private.
- For local testing with no paid API usage, use `AI_PROVIDER=local`.

## Firebase Setup

1. Open the Firebase Console.
2. Create or select your Firebase project.
3. Go to Project settings.
4. Under General, create or select a Web App.
5. Copy the Firebase web config into the `NEXT_PUBLIC_FIREBASE_*` variables.
6. Go to Authentication.
7. Enable Email/Password.
8. Optional: enable Google sign-in.
9. If using Google sign-in on Vercel, add your Vercel production domain to Authentication -> Settings -> Authorized domains.
10. Go to Firestore Database.
11. Create a Firestore database.
12. Go to Project settings -> Service accounts.
13. Generate a new private key.
14. Copy `project_id`, `client_email`, and `private_key` into the server variables:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

For Vercel, paste the private key exactly, including newline escapes if Vercel stores it as one line:

```env
-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful checks:

```bash
npm run lint
npm run build
```

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Add all required environment variables in Vercel Project Settings -> Environment Variables.
4. For free testing, set:

```env
AI_PROVIDER=local
```

5. For OpenAI mode, set:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

6. For Gemini free mode, set:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

7. Redeploy after changing environment variables.

If Firebase Google login says `auth/unauthorized-domain`, add your deployed Vercel domain in Firebase Authentication -> Settings -> Authorized domains.

## How To Use AgentForge

1. Sign up or sign in.
2. Open Create Agent.
3. Pick a starter template or describe the agent you want.
4. Generate the agent.
5. Open the saved agent detail page.
6. Review the generated system prompt.
7. Edit the prompt in Prompt editor.
8. Use AgentForge Lens to analyze the current prompt.
9. Click Optimize Prompt to rewrite the current editor prompt.
10. Save the current or optimized prompt as a version.
11. Run a single task against the agent.
12. Evaluate the run with the scorecard.
13. Use batch testing or benchmark suites to test repeated tasks.
14. Return to Saved Agents to continue editing later.

## Main Screens

- `/` - Landing page.
- `/signup` - Create account.
- `/login` - Sign in.
- `/dashboard` - Saved Agents.
- `/agent/new` - Create a new agent.
- `/agent/[id]` - Agent workspace, prompt editor, Lens, run form, batch testing, conversation, and evaluations.
- `/invite/[token]` - Accept a workspace invite if team invites are enabled.

## API Routes

- `/api/generate-agent` - Generate an agent config from a prompt or template.
- `/api/run-agent` - Run an agent on one task.
- `/api/evaluate-agent` - Evaluate one run.
- `/api/improve-agent` - Generate an improved prompt from evaluation feedback.
- `/api/dashboard` - Load saved agents for the current user/workspace.
- `/api/agent/[id]` - Read or update one agent.
- `/api/agent/[id]/lens` - Analyze, optimize, version, compare, and run eval packs.
- `/api/batch-run` - Run multiple test tasks.
- `/api/benchmarks` - Load benchmark suites.
- `/api/conversation` - Conversation testing.
- `/api/knowledge` - Manage knowledge snippets.
- `/api/tools` - Manage tool descriptions.
- `/api/export-runs` - Export run/evaluation data.
- `/api/team` - Create or manage team invites.
- `/api/team/accept` - Accept a team invite.

## Data Model

The app stores data in Cloud Firestore through a lightweight server-side Firestore adapter.

Main collections:

- `agents`
- `agent_runs`
- `evaluations`
- `agent_versions`
- `knowledge_sources`
- `tool_integrations`
- `workspace_members`
- `workspace_invites`

## Folder Structure

```text
agentforge/
├── app/
│   ├── agent/
│   │   ├── [id]/page.tsx
│   │   └── new/page.tsx
│   ├── api/
│   │   ├── agent/[id]/route.ts
│   │   ├── agent/[id]/lens/route.ts
│   │   ├── batch-run/route.ts
│   │   ├── benchmarks/route.ts
│   │   ├── conversation/route.ts
│   │   ├── dashboard/route.ts
│   │   ├── evaluate-agent/route.ts
│   │   ├── evaluation/[id]/route.ts
│   │   ├── export-runs/route.ts
│   │   ├── generate-agent/route.ts
│   │   ├── improve-agent/route.ts
│   │   ├── knowledge/route.ts
│   │   ├── run-agent/route.ts
│   │   ├── team/route.ts
│   │   ├── team/accept/route.ts
│   │   └── tools/route.ts
│   ├── dashboard/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentCard.tsx
│   ├── AgentDetailClient.tsx
│   ├── AgentEditor.tsx
│   ├── AgentLensPanel.tsx
│   ├── AgentWorkspace.tsx
│   ├── AuthForm.tsx
│   ├── AuthGate.tsx
│   ├── BatchTestPanel.tsx
│   ├── ConversationPanel.tsx
│   ├── CreateAgentForm.tsx
│   ├── DashboardClient.tsx
│   ├── EvalDashboard.tsx
│   ├── InviteAcceptClient.tsx
│   ├── KnowledgePanel.tsx
│   ├── LoadStatePanel.tsx
│   ├── Navbar.tsx
│   ├── RunAgentForm.tsx
│   ├── ScoreCard.tsx
│   ├── TeamPanel.tsx
│   └── ToolIntegrationsPanel.tsx
├── lib/
│   ├── agent-context.ts
│   ├── ai-json.ts
│   ├── auth-client.ts
│   ├── auth.ts
│   ├── benchmarks.ts
│   ├── client-api.ts
│   ├── currency.ts
│   ├── firebase-client.ts
│   ├── firebase.ts
│   ├── free-ai.ts
│   ├── model-providers.ts
│   ├── prompt-lens.ts
│   ├── rubrics.ts
│   ├── secrets.ts
│   ├── templates.ts
│   ├── types.ts
│   └── workspace.ts
├── .env.local.example
├── package.json
└── README.md
```

## Security Notes

- Never commit `.env.local`.
- Never expose `OPENAI_API_KEY`.
- Never expose `GEMINI_API_KEY`.
- Never expose `FIREBASE_PRIVATE_KEY`.
- Firebase browser config keys that start with `NEXT_PUBLIC_FIREBASE_` are not server secrets, but Firebase security still depends on Authentication and Firestore rules/server-side access checks.
- After changing Vercel environment variables, redeploy the project.

## Development Status

This build is optimized for a focused AgentForge prototype:

- Private saved agents.
- Prompt editing and optimization.
- Test runs and evaluations.
- Cost/token estimates.
- Local free testing mode.
- Optional Gemini free-tier mode.
- Optional OpenAI-powered mode.

Marketplace, leaderboard, public profiles, and public publishing are intentionally out of scope for this version.
