export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { runLocalAgent } from '@/lib/free-ai'
import { generateWithProvider } from '@/lib/model-providers'
import { loadAccessibleAgent } from '@/lib/workspace'

type RunAgentRequest = {
  agentId: string
  task: string
  modelProvider?: string
}

export async function POST(request: Request) {
  try {
    // Validate the task and target agent id from the client.
    const body = (await request.json()) as Partial<RunAgentRequest>

    if (!body.agentId) {
      return NextResponse.json({ error: 'Agent id is required.' }, { status: 400 })
    }

    if (!body.task || body.task.trim().length < 3) {
      return NextResponse.json({ error: 'Enter a task for this agent.' }, { status: 400 })
    }

    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const store = await requireFirebaseStore()

    // Load the agent prompt that the selected provider should follow for this run.
    const { agent, error: agentError } = await loadAccessibleAgent(store, user, body.agentId, 'editor')

    if (!agent) {
      return NextResponse.json({ error: agentError ?? 'Agent not found.' }, { status: agentError?.includes('permission') ? 403 : 404 })
    }

    // Run the selected provider as the domain-specific agent.
    const modelResult = await generateWithProvider({
      providerId: body.modelProvider,
      system: agent.system_prompt,
      prompt: body.task.trim(),
      localOutput: () => runLocalAgent(agent, body.task?.trim() ?? '')
    })

    // Store the run so it can be evaluated and shown in history.
    const { data: run, error: runError } = await store
      .from('agent_runs')
      .insert({
        agent_id: agent.id,
        user_id: agent.user_id,
        task: body.task.trim(),
        output: modelResult.output,
        model_provider: modelResult.provider.id,
        model_name: modelResult.provider.model,
        input_tokens: modelResult.inputTokens,
        output_tokens: modelResult.outputTokens,
        estimated_cost_usd: modelResult.estimatedCostUsd
      })
      .select()
      .single()

    if (runError) {
      return NextResponse.json({ error: runError.message }, { status: 500 })
    }

    return NextResponse.json({ run, agent })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run agent.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
