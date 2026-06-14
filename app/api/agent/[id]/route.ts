export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { loadAccessibleAgent } from '@/lib/workspace'
import type { Evaluation } from '@/lib/types'

type UpdateAgentRequest = {
  name: string
  domain: string
  description: string
  constraints: string[]
  system_prompt: string
  tone: string
  output_format: string
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const store = await requireFirebaseStore()
    const { agent, error: accessError } = await loadAccessibleAgent(store, user, id, 'viewer')

    if (!agent) {
      return NextResponse.json({ error: accessError ?? 'Agent not found.' }, { status: accessError?.includes('permission') ? 403 : 404 })
    }

    const [runsResult, evalsResult] = await Promise.all([
      store.from('agent_runs').select('*').eq('agent_id', id).eq('user_id', agent.user_id).order('created_at', { ascending: false }),
      store.from('evaluations').select('*').eq('agent_id', id).eq('user_id', agent.user_id).order('created_at', { ascending: false })
    ])

    if (runsResult.error) {
      return NextResponse.json({ error: runsResult.error.message }, { status: 500 })
    }

    if (evalsResult.error) {
      return NextResponse.json({ error: evalsResult.error.message }, { status: 500 })
    }

    const evaluationsByRun = new Map<string, Evaluation>()
    evalsResult.data.forEach((evaluation) => evaluationsByRun.set(evaluation.run_id, evaluation))

    return NextResponse.json({
      agent,
      runs: runsResult.data.map((run) => ({
        ...run,
        evaluation: evaluationsByRun.get(run.id) ?? null
      }))
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load agent.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const body = (await request.json()) as Partial<UpdateAgentRequest>

    if (!body.name || !body.domain || !body.description || !body.system_prompt) {
      return NextResponse.json({ error: 'Name, domain, description, and system prompt are required.' }, { status: 400 })
    }

    const store = await requireFirebaseStore()
    const { agent, error: accessError } = await loadAccessibleAgent(store, user, id, 'editor')

    if (!agent) {
      return NextResponse.json({ error: accessError ?? 'Agent not found.' }, { status: accessError?.includes('permission') ? 403 : 404 })
    }

    const { data, error } = await store
      .from('agents')
      .update({
        name: body.name,
        domain: body.domain,
        description: body.description,
        constraints: body.constraints ?? [],
        system_prompt: body.system_prompt,
        tone: body.tone ?? 'Professional and concise',
        output_format: body.output_format ?? 'Structured response with headings',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', agent.user_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agent: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update agent.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
