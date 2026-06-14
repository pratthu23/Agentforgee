'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AgentCard } from '@/components/AgentCard'
import { LoadStatePanel } from '@/components/LoadStatePanel'
import { getAuthHeaders, getSessionOrRedirect } from '@/lib/auth-client'
import { fetchJson } from '@/lib/client-api'
import type { AgentWithStats, ApiError } from '@/lib/types'

type SavedAgentsResponse = { agents: AgentWithStats[] } | ApiError

export function DashboardClient() {
  const router = useRouter()
  const [agents, setAgents] = useState<AgentWithStats[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAgents = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
      setError(null)
    }

    try {
      const session = await getSessionOrRedirect()

      if (!session) {
        setError('Sign in to view your saved agents.')
        setLoading(false)
        router.push('/login')
        return
      }

      const { response, data } = await fetchJson<SavedAgentsResponse>('/api/dashboard', { headers: await getAuthHeaders(session) })

      if (!response.ok || 'error' in data) {
        setError('error' in data ? data.error : 'Unable to load saved agents.')
      } else {
        setAgents(data.agents)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load saved agents.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAgents(false), 0)
    return () => window.clearTimeout(timer)
  }, [loadAgents])

  if (loading) {
    return <div className="rounded-xl border border-forge-border bg-forge-card p-6 text-forge-muted">Loading saved agents...</div>
  }

  return (
    <>
      {error ? <div className="mb-6"><LoadStatePanel title="Failed to load saved agents" message={error} onRetry={() => void loadAgents()} /></div> : null}
      {agents.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-forge-border bg-forge-card p-10 text-center">
          <h2 className="text-xl font-bold text-white">No saved agents yet</h2>
          <p className="mx-auto mt-3 max-w-md text-forge-muted">Create an agent from a template or a plain-English brief, then return here to edit, optimize, and test it.</p>
          <Link href="/agent/new" className="mt-6 inline-flex rounded-xl bg-forge-purple px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-purple-500">
            Create Your First Agent
          </Link>
        </section>
      )}
    </>
  )
}
