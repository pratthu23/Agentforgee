export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { convertEstimatedUsdToInr } from '@/lib/currency'
import { getWorkspaceAccessList, mergeQueryResults } from '@/lib/workspace'

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const store = await requireFirebaseStore()
    const ownerIds = (await getWorkspaceAccessList(store, user)).map((access) => access.ownerUserId)
    const [runsResults, evalsResults] = await Promise.all([
      Promise.all(ownerIds.map((ownerId) => store.from('agent_runs').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }))),
      Promise.all(ownerIds.map((ownerId) => store.from('evaluations').select('*').eq('user_id', ownerId)))
    ])
    const runsResult = mergeQueryResults(runsResults)
    const evalsResult = mergeQueryResults(evalsResults)

    if (runsResult.error) {
      return NextResponse.json({ error: runsResult.error.message }, { status: 500 })
    }

    if (evalsResult.error) {
      return NextResponse.json({ error: evalsResult.error.message }, { status: 500 })
    }

    const runs = runsResult.data
    const evalsByRun = new Map(evalsResult.data.map((evaluation) => [evaluation.run_id, evaluation]))
    const rows = [
      [
        'run_id',
        'agent_id',
        'task',
        'model_provider',
        'model_name',
        'input_tokens',
        'output_tokens',
        'estimated_cost_inr',
        'overall_score',
        'passed',
        'rubric',
        'created_at'
      ],
      ...runs.map((run) => {
        const evaluation = evalsByRun.get(run.id)
        return [
          run.id,
          run.agent_id,
          run.task,
          run.model_provider,
          run.model_name,
          run.input_tokens.toString(),
          run.output_tokens.toString(),
          convertEstimatedUsdToInr(run.estimated_cost_usd).toString(),
          evaluation?.overall_score.toString() ?? '',
          evaluation?.passed ? 'true' : evaluation ? 'false' : '',
          evaluation?.rubric_name ?? '',
          run.created_at
        ]
      })
    ]
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="agentforge-runs.csv"'
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export runs.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}
