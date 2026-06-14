export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { buildAgentSystemPrompt } from '@/lib/agent-context'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { runLocalAgent } from '@/lib/free-ai'
import { generateWithProvider } from '@/lib/model-providers'
import { accessErrorStatus, loadAccessibleAgent } from '@/lib/workspace'

type ConversationRequest = {
  agentId: string
  message: string
  conversationId?: string
  modelProvider?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ConversationRequest>
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    if (!body.agentId || !body.message) return NextResponse.json({ error: 'Agent and message are required.' }, { status: 400 })

    const store = await requireFirebaseStore()
    const { agent, error: agentError } = await loadAccessibleAgent(store, user, body.agentId, 'editor')
    if (!agent) return NextResponse.json({ error: agentError ?? 'Agent not found.' }, { status: accessErrorStatus(agentError) })

    let conversationId = body.conversationId
    if (!conversationId) {
      const { data: conversation, error } = await store
        .from('conversations')
        .insert({ agent_id: agent.id, user_id: agent.user_id, title: body.message.slice(0, 60) })
        .select()
        .single()
      if (error || !conversation) throw new Error(error?.message ?? 'Failed to create conversation.')
      conversationId = conversation.id
    } else {
      const { data: conversation, error } = await store
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('agent_id', agent.id)
        .eq('user_id', agent.user_id)
        .single()
      if (error || !conversation) return NextResponse.json({ error: error?.message ?? 'Conversation not found.' }, { status: 404 })
    }

    await store.from('conversation_messages').insert({ conversation_id: conversationId, role: 'user', content: body.message })
    const [knowledgeResult, toolsResult] = await Promise.all([
      store.from('knowledge_sources').select('*').eq('agent_id', agent.id).eq('user_id', agent.user_id),
      store.from('tool_integrations').select('*').eq('agent_id', agent.id).eq('user_id', agent.user_id)
    ])
    const system = buildAgentSystemPrompt({ agent, knowledge: knowledgeResult.data ?? [], tools: toolsResult.data ?? [] })
    const result = await generateWithProvider({
      providerId: body.modelProvider,
      system,
      prompt: body.message,
      localOutput: () => runLocalAgent(agent, body.message ?? '')
    })
    const { data: agentMessage, error: messageError } = await store
      .from('conversation_messages')
      .insert({ conversation_id: conversationId, role: 'agent', content: result.output })
      .select()
      .single()
    if (messageError) throw new Error(messageError.message)

    return NextResponse.json({ conversationId, message: agentMessage })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to continue conversation.' }, { status: 500 })
  }
}
