export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { accessErrorStatus, loadAccessibleAgent } from '@/lib/workspace'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    }

    const store = await requireFirebaseStore()
    const { agent, error: accessError } = await loadAccessibleAgent(store, user, id, 'editor')

    if (!agent) {
      return NextResponse.json({ error: accessError ?? 'Agent not found.' }, { status: accessErrorStatus(accessError) })
    }

    const deploymentKey = `af_${randomBytes(24).toString('hex')}`
    const { data, error } = await store
      .from('agents')
      .update({ deployment_api_key: deploymentKey, updated_at: new Date().toISOString() })
      .eq('id', agent.id)
      .eq('user_id', agent.user_id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Failed to generate deployment key.' }, { status: 500 })
    }

    return NextResponse.json({ agent: data, deployment_api_key: deploymentKey })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate deployment key.' }, { status: 500 })
  }
}
