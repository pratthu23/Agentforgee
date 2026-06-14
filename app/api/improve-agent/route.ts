export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { improveLocalPrompt } from '@/lib/free-ai'
import { accessErrorStatus, loadAccessibleAgent } from '@/lib/workspace'

type ImproveRequest = {
  agentId: string
  evaluationId: string
  apply?: boolean
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ImproveRequest>

    if (!body.agentId || !body.evaluationId) {
      return NextResponse.json({ error: 'Agent id and evaluation id are required.' }, { status: 400 })
    }

    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const store = await requireFirebaseStore()
    const [{ agent, error: agentError }, evaluationResult] = await Promise.all([
      loadAccessibleAgent(store, user, body.agentId, 'editor'),
      store.from('evaluations').select('*').eq('id', body.evaluationId).single()
    ])

    if (!agent) {
      return NextResponse.json({ error: agentError ?? 'Agent not found.' }, { status: accessErrorStatus(agentError) })
    }

    if (evaluationResult.error || !evaluationResult.data || evaluationResult.data.user_id !== agent.user_id || evaluationResult.data.agent_id !== agent.id) {
      return NextResponse.json({ error: evaluationResult.error?.message ?? 'Evaluation not found.' }, { status: 404 })
    }

    const improvedPrompt = improveLocalPrompt(agent, evaluationResult.data.failure_analysis)

    if (body.apply) {
      const { data, error } = await store
        .from('agents')
        .update({ system_prompt: improvedPrompt, updated_at: new Date().toISOString() })
        .eq('id', agent.id)
        .eq('user_id', agent.user_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ improved_prompt: improvedPrompt, agent: data })
    }

    return NextResponse.json({ improved_prompt: improvedPrompt })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to improve agent.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
