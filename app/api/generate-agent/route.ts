export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requestAiJson } from '@/lib/ai-json'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { generateLocalAgentConfig, isLocalAiProvider } from '@/lib/free-ai'
import type { AgentConfig } from '@/lib/types'

type GenerateAgentRequest = {
  prompt: string
}

export async function POST(request: Request) {
  try {
    // Validate request body before making model or database calls.
    const body = (await request.json()) as Partial<GenerateAgentRequest>

    if (!body.prompt || body.prompt.trim().length < 10) {
      return NextResponse.json({ error: 'Describe the agent in at least 10 characters.' }, { status: 400 })
    }

    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const store = await requireFirebaseStore()

    // Create the agent config using the selected provider.
    const config = isLocalAiProvider()
      ? generateLocalAgentConfig(body.prompt.trim())
      : await requestAiJson<AgentConfig>(
          'You generate concise, production-grade AI agent configurations as JSON.',
          `Create an AI agent config from this request: "${body.prompt.trim()}".
Return JSON with exactly:
{
  "name": "short agent name",
  "domain": "one domain label",
  "description": "1-2 sentence description",
  "constraints": ["3-6 practical operating constraints"],
  "system_prompt": "complete system prompt for the agent"
}`,
          isAgentConfig
        )

    // Persist the generated config so the UI can redirect to the new agent.
    const { data, error } = await store
      .from('agents')
      .insert({
        name: config.name,
        user_id: user.id,
        domain: config.domain,
        description: config.description,
        constraints: config.constraints,
        system_prompt: config.system_prompt,
        tone: config.tone ?? 'Professional and concise',
        output_format: config.output_format ?? 'Structured response with headings'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agent: data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate agent.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function isAgentConfig(value: unknown): value is AgentConfig {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.name === 'string' &&
    typeof value.domain === 'string' &&
    typeof value.description === 'string' &&
    Array.isArray(value.constraints) &&
    value.constraints.every((constraint) => typeof constraint === 'string') &&
    typeof value.system_prompt === 'string' &&
    (value.tone === undefined || typeof value.tone === 'string') &&
    (value.output_format === undefined || typeof value.output_format === 'string')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
