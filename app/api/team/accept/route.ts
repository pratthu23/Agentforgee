export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { normalizeEmail } from '@/lib/workspace'

type AcceptInviteRequest = {
  token: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AcceptInviteRequest>
    const token = body.token?.trim()

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required.' }, { status: 400 })
    }

    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError ?? 'Sign in to accept this invite.' }, { status: 401 })
    }

    const store = await requireFirebaseStore()
    const { data: invite, error: inviteError } = await store.from('team_invites').select('*').eq('token', token).single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: inviteError?.message ?? 'Invite not found.' }, { status: 404 })
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'This invite has already been accepted.' }, { status: 409 })
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This invite has expired. Ask the owner to send a new one.' }, { status: 410 })
    }

    const invitedEmail = normalizeEmail(invite.email)
    const signedInEmail = normalizeEmail(user.email)

    if (invitedEmail && signedInEmail && invitedEmail !== signedInEmail) {
      return NextResponse.json({ error: `This invite is for ${invite.email}. Sign in with that email to accept it.` }, { status: 403 })
    }

    const existing = await store
      .from('team_members')
      .select('*')
      .eq('owner_user_id', invite.owner_user_id)
      .eq('member_user_id', user.id)
      .single()

    if (!existing.data) {
      const { error: memberError } = await store
        .from('team_members')
        .insert({
          owner_user_id: invite.owner_user_id,
          email: invite.email,
          role: invite.role,
          member_user_id: user.id,
          status: 'active'
        })
        .select()
        .single()

      if (memberError) {
        return NextResponse.json({ error: memberError.message }, { status: 500 })
      }
    }

    const { data: updatedInvite, error: updateError } = await store
      .from('team_invites')
      .update({
        status: 'accepted',
        accepted_user_id: user.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ invite: updatedInvite })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to accept invite.' }, { status: 500 })
  }
}
