export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { accessErrorStatus, loadAccessibleAgent } from '@/lib/workspace'

type KnowledgeRequest = {
  agentId: string
  title: string
  content: string
  source_type?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<KnowledgeRequest>
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    if (!body.agentId || !body.title || !body.content) return NextResponse.json({ error: 'Agent, title, and content are required.' }, { status: 400 })

    const store = await requireFirebaseStore()
    const { agent, error: agentError } = await loadAccessibleAgent(store, user, body.agentId, 'editor')

    if (!agent) return NextResponse.json({ error: agentError ?? 'Agent not found.' }, { status: accessErrorStatus(agentError) })

    const { data, error } = await store
      .from('knowledge_sources')
      .insert({
        agent_id: agent.id,
        user_id: agent.user_id,
        title: body.title,
        content: body.content,
        source_type: body.source_type ?? 'text'
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ knowledge: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save knowledge.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    if (!agentId) return NextResponse.json({ error: 'Agent id is required.' }, { status: 400 })

    const store = await requireFirebaseStore()
    const { agent, error: agentError } = await loadAccessibleAgent(store, user, agentId, 'viewer')

    if (!agent) return NextResponse.json({ error: agentError ?? 'Agent not found.' }, { status: accessErrorStatus(agentError) })

    const { data, error } = await store
      .from('knowledge_sources')
      .select('*')
      .eq('agent_id', agentId)
      .eq('user_id', agent.user_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ knowledge: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load knowledge.' }, { status: 500 })
  }
}
