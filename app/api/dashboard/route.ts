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
    const agentsResult = mergeQueryResults(await Promise.all(ownerIds.map((ownerId) => store.from('agents').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }))))

    if (agentsResult.error) {
      return NextResponse.json({ error: agentsResult.error.message }, { status: 500 })
    }

    const agents = agentsResult.data.map((agent) => ({
      ...agent,
      last_run_at: null,
      average_score: null
    }))

    return NextResponse.json({ agents })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load saved agents.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
