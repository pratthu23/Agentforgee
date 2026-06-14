export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { accessErrorStatus, loadAccessibleAgent } from '@/lib/workspace'

type ReviewRequest = {
  human_review_notes: string
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const body = (await request.json()) as Partial<ReviewRequest>
    const store = await requireFirebaseStore()
    const { data: evaluation, error: evaluationError } = await store.from('evaluations').select('*').eq('id', id).single()

    if (evaluationError || !evaluation) {
      return NextResponse.json({ error: evaluationError?.message ?? 'Evaluation not found.' }, { status: 404 })
    }

    const { agent, error: agentError } = await loadAccessibleAgent(store, user, evaluation.agent_id, 'editor')

    if (!agent || evaluation.user_id !== agent.user_id) {
      return NextResponse.json({ error: agentError ?? 'Evaluation not found.' }, { status: accessErrorStatus(agentError) })
    }

    const { data, error } = await store
      .from('evaluations')
      .update({ human_review_notes: body.human_review_notes ?? '' })
      .eq('id', id)
      .eq('user_id', agent.user_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ evaluation: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save review notes.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
