export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { evaluateLocalRun, runLocalAgent } from '@/lib/free-ai'
import { generateWithProvider } from '@/lib/model-providers'
import { getRubricPreset } from '@/lib/rubrics'
import { accessErrorStatus, loadAccessibleAgent } from '@/lib/workspace'

type BatchRunRequest = {
  agentId: string
  tasks: string[]
  rubricId?: string
  modelProvider?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<BatchRunRequest>

    if (!body.agentId || !body.tasks || body.tasks.length < 1 || body.tasks.length > 50) {
      return NextResponse.json({ error: 'Provide 1 to 50 batch tasks.' }, { status: 400 })
    }

    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const store = await requireFirebaseStore()
    const { agent, error: agentError } = await loadAccessibleAgent(store, user, body.agentId, 'editor')

    if (!agent) {
      return NextResponse.json({ error: agentError ?? 'Agent not found.' }, { status: accessErrorStatus(agentError) })
    }

    const preset = getRubricPreset(body.rubricId)
    const results = []

    for (const task of body.tasks.map((item) => item.trim()).filter(Boolean)) {
      const modelResult = await generateWithProvider({
        providerId: body.modelProvider,
        system: agent.system_prompt,
        prompt: task,
        localOutput: () => runLocalAgent(agent, task)
      })
      const { data: run, error: runError } = await store
        .from('agent_runs')
        .insert({
          agent_id: agent.id,
          user_id: agent.user_id,
          task,
          output: modelResult.output,
          model_provider: modelResult.provider.id,
          model_name: modelResult.provider.model,
          input_tokens: modelResult.inputTokens,
          output_tokens: modelResult.outputTokens,
          estimated_cost_usd: modelResult.estimatedCostUsd
        })
        .select()
        .single()

      if (runError || !run) {
        throw new Error(runError?.message ?? 'Failed to create batch run.')
      }

      const score = evaluateLocalRun(task, modelResult.output, preset.rubric, preset.name)
      const { data: evaluation, error: evalError } = await store
        .from('evaluations')
        .insert({
          agent_id: agent.id,
          user_id: agent.user_id,
          run_id: run.id,
          rubric_name: score.rubric_name,
          rubric: score.rubric,
          accuracy_score: score.accuracy_score,
          safety_score: score.safety_score,
          helpfulness_score: score.helpfulness_score,
          overall_score: score.overall_score,
          passed: score.passed,
          feedback: score.feedback,
          failure_analysis: score.failure_analysis,
          improvement_suggestion: score.improvement_suggestion,
          human_review_notes: null
        })
        .select()
        .single()

      if (evalError || !evaluation) {
        throw new Error(evalError?.message ?? 'Failed to evaluate batch run.')
      }

      results.push({ run, evaluation })
    }

    return NextResponse.json({ results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run batch test.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
