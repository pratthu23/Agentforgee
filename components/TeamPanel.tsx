'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAuthHeaders, getSessionOrRedirect } from '@/lib/auth-client'
import { fetchJson } from '@/lib/client-api'
import type { ApiError, TeamInvite, TeamMember, TeamRole } from '@/lib/types'

type TeamResponse = { invite: TeamInvite; inviteUrl: string } | ApiError
type TeamListResponse = { members: TeamMember[]; invites: TeamInvite[] } | ApiError

export function TeamPanel() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('viewer')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(false)

  const loadTeam = useCallback(async () => {
    const session = await getSessionOrRedirect()
    if (!session) {
      return
    }

    try {
      const { response, data } = await fetchJson<TeamListResponse>('/api/team', { headers: await getAuthHeaders(session) })
      if (response.ok && !('error' in data)) {
        setMembers(data.members)
        setInvites(data.invites)
      }
    } catch {
      // Team data is secondary to the dashboard; keep the panel usable if it fails.
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTeam(), 0)
    return () => window.clearTimeout(timer)
  }, [loadTeam])

  async function sendInvite() {
    setError(null)
    setMessage(null)
    setInviteUrl(null)

    if (!email.trim()) {
      setError('Enter a teammate email address.')
      return
    }

    const session = await getSessionOrRedirect()
    if (!session) {
      setError('Sign in to send team invites.')
      return
    }

    try {
      setLoading(true)
      const { response, data: result } = await fetchJson<TeamResponse>('/api/team', {
        method: 'POST',
        headers: await getAuthHeaders(session),
        body: JSON.stringify({ email, role })
      })

      if (!response.ok || 'error' in result) {
        setError('error' in result ? result.error : 'Unable to create invite.')
        return
      }
      setMessage(`Invite created for ${result.invite.email} as ${result.invite.role}.`)
      setInviteUrl(result.inviteUrl)
      setEmail('')
      await loadTeam()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to create invite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-forge-border bg-forge-card p-5">
      <h2 className="text-xl font-bold text-white">Team workspace</h2>
      <p className="mt-1 text-sm text-forge-muted">Create invite links, accept teammates into your workspace, and enforce viewer/editor/admin roles.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" className="rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-sm text-forge-text" />
        <select value={role} onChange={(event) => setRole(event.target.value as TeamRole)} className="rounded-xl border border-forge-border bg-black/30 px-3 py-3 text-sm text-forge-text">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={sendInvite} disabled={loading} className="rounded-xl bg-forge-blue px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-500 disabled:opacity-60">
          {loading ? 'Sending...' : 'Send Invite'}
        </button>
      </div>
      {inviteUrl ? (
        <div className="mt-3 rounded-lg border border-forge-blue/40 bg-forge-blue/10 p-3 text-sm text-blue-100">
          <p className="font-semibold">Invite link ready</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={inviteUrl} className="min-w-0 flex-1 rounded-lg border border-forge-border bg-black/30 px-3 py-2 text-xs text-forge-text" />
            <button
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
              className="rounded-lg border border-forge-border px-3 py-2 text-xs font-semibold text-forge-text transition-all duration-200 hover:bg-white/5"
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}
      {message ? <p className="mt-3 rounded-lg border border-forge-green/40 bg-forge-green/10 p-3 text-sm text-green-100">{message}</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <TeamList title="Active members" empty="No active teammates yet." rows={members.map((member) => `${member.email} - ${member.role}`)} />
        <TeamList title="Pending invites" empty="No pending invites." rows={invites.filter((invite) => invite.status === 'pending').map((invite) => `${invite.email} - ${invite.role}`)} />
      </div>
    </section>
  )
}

function TeamList({ title, empty, rows }: { title: string; empty: string; rows: string[] }) {
  return (
    <div className="rounded-lg border border-forge-border bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {rows.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-forge-muted">
          {rows.map((row) => <li key={row}>{row}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-forge-muted">{empty}</p>
      )}
    </div>
  )
}
