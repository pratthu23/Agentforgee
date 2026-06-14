export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { isValidTeamRole, normalizeEmail } from '@/lib/workspace'

type TeamRequest = {
  email: string
  role?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<TeamRequest>
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    const email = normalizeEmail(body.email)
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    if (email === normalizeEmail(user.email)) return NextResponse.json({ error: 'You are already the workspace owner.' }, { status: 400 })

    const role = isValidTeamRole(body.role) ? body.role : 'viewer'
    const token = randomBytes(24).toString('hex')
    const origin = new URL(request.url).origin
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

    const store = await requireFirebaseStore()
    const existing = await store.from('team_members').select('*').eq('owner_user_id', user.id).eq('email', email).single()

    if (existing.data) {
      return NextResponse.json({ error: `${email} is already a workspace member.` }, { status: 409 })
    }

    const { data, error } = await store
      .from('team_invites')
      .insert({
        owner_user_id: user.id,
        email,
        role,
        token,
        status: 'pending',
        accepted_user_id: null,
        accepted_at: null,
        expires_at: expiresAt
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ invite: data, inviteUrl: `${origin}/invite/${token}` })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create invite.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })

    const store = await requireFirebaseStore()
    const [membersResult, invitesResult] = await Promise.all([
      store.from('team_members').select('*').eq('owner_user_id', user.id).order('created_at', { ascending: false }),
      store.from('team_invites').select('*').eq('owner_user_id', user.id).order('created_at', { ascending: false })
    ])

    if (membersResult.error) return NextResponse.json({ error: membersResult.error.message }, { status: 500 })
    if (invitesResult.error) return NextResponse.json({ error: invitesResult.error.message }, { status: 500 })
    return NextResponse.json({ members: membersResult.data, invites: invitesResult.data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load team.' }, { status: 500 })
  }
}
