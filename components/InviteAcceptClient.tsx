'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getAuthHeaders, getSessionOrRedirect } from '@/lib/auth-client'
import { fetchJson } from '@/lib/client-api'
import type { ApiError, TeamInvite } from '@/lib/types'

type AcceptInviteResponse = { invite: TeamInvite } | ApiError

export function InviteAcceptClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function acceptInvite() {
    setLoading(true)
    setError(null)
    setMessage(null)

    const session = await getSessionOrRedirect()

    if (!session) {
      setError('Sign in first, then return to this invite link.')
      setLoading(false)
      return
    }

    try {
      const { response, data } = await fetchJson<AcceptInviteResponse>('/api/team/accept', {
        method: 'POST',
        headers: await getAuthHeaders(session),
        body: JSON.stringify({ token })
      })

      if (!response.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Unable to accept invite.')
        return
      }

      setMessage(`Joined workspace as ${data.invite.role}.`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to accept invite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-forge-border bg-forge-card p-6 shadow-glow">
      <h1 className="text-3xl font-black text-white">Accept workspace invite</h1>
      <p className="mt-3 text-forge-muted">Sign in with the invited email address, then accept to join the shared AgentForge workspace.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={acceptInvite}
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-forge-purple to-forge-blue px-5 py-3 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? 'Joining...' : 'Accept Invite'}
        </button>
        <Link href="/login" className="rounded-xl border border-forge-border px-5 py-3 text-center font-semibold text-forge-text transition-all duration-200 hover:border-forge-blue hover:bg-white/5">
          Sign In
        </Link>
      </div>
      {message ? (
        <div className="mt-5 rounded-lg border border-forge-green/40 bg-forge-green/10 p-4 text-sm text-green-100">
          {message} <Link href="/dashboard" className="font-semibold underline">Open dashboard</Link>
        </div>
      ) : null}
      {error ? <p className="mt-5 rounded-lg border border-forge-red/40 bg-forge-red/10 p-4 text-sm text-red-100">{error}</p> : null}
    </section>
  )
}
