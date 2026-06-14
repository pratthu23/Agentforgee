export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { getWorkspaceAccessList, mergeQueryResults } from '@/lib/workspace'

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const store = await requireFirebaseStore()
    const ownerIds = (await getWorkspaceAccessList(store, user)).map((access) => access.ownerUserId)
    const [agentsResult, runsResult, evaluationsResult] = await Promise.all([
      Promise.all(ownerIds.map((ownerId) => store.from('agents').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }))).then(mergeQueryResults),
      Promise.all(ownerIds.map((ownerId) => store.from('agent_runs').select('*').eq('user_id', ownerId))).then(mergeQueryResults),
      Promise.all(ownerIds.map((ownerId) => store.from('evaluations').select('*').eq('user_id', ownerId))).then(mergeQueryResults)
    ])

    if (agentsResult.error) {
      return NextResponse.json({ error: agentsResult.error.message }, { status: 500 })
    }

    if (runsResult.error) {
      return NextResponse.json({ error: runsResult.error.message }, { status: 500 })
    }

    if (evaluationsResult.error) {
      return NextResponse.json({ error: evaluationsResult.error.message }, { status: 500 })
    }

    const runs = runsResult.data
    const evaluations = evaluationsResult.data
    const agents = agentsResult.data.map((agent) => ({
      ...agent,
      last_run_at: runs
        .filter((run) => run.agent_id === agent.id)
        .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0]?.created_at ?? null,
      average_score: calculateAverageScore(evaluations.filter((evaluation) => evaluation.agent_id === agent.id))
    }))
    const averageOverallScore = calculateAverageScore(evaluations) ?? 0
    const passRate = evaluations.length
      ? Math.round((evaluations.filter((evaluation) => evaluation.passed).length / evaluations.length) * 100)
      : 0

    return NextResponse.json({
      agents,
      stats: {
        totalAgents: agents.length,
        totalRuns: runs.length,
        averageOverallScore,
        passRate,
        estimatedCostUsd: Number(runs.reduce((sum, run) => sum + Number(run.estimated_cost_usd), 0).toFixed(6))
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load saved agents.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function calculateAverageScore(evaluations: Array<{ overall_score: number }>): number | null {
  if (!evaluations.length) {
    return null
  }

  return Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.overall_score, 0) / evaluations.length)
}
