'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AgentWorkbench } from '@/components/AgentWorkbench'
import { getAuthHeaders, getSessionOrRedirect } from '@/lib/auth-client'
import type { Agent, ApiError, RunWithEvaluation } from '@/lib/types'

type AgentResponse = { agent: Agent; runs: RunWithEvaluation[] } | ApiError

export function AgentDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [runs, setRuns] = useState<RunWithEvaluation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAgent() {
      const session = await getSessionOrRedirect()

      if (!session) {
        setError('Sign in to view this agent.')
        setLoading(false)
        router.push('/login')
        return
      }

      const response = await fetch(`/api/agent/${id}`, { headers: await getAuthHeaders(session) })
      const result = (await response.json()) as AgentResponse

      if (!response.ok || 'error' in result) {
        setError('error' in result ? result.error : 'Unable to load agent.')
      } else {
        setAgent(result.agent)
        setRuns(result.runs)
      }

      setLoading(false)
    }

    void loadAgent()
  }, [id, router])

  if (loading) {
    return <div className="rounded-xl border border-forge-border bg-forge-card p-6 text-forge-muted">Loading agent...</div>
  }

  if (!agent) {
    return <div className="rounded-xl border border-forge-red/40 bg-forge-red/10 p-6 text-red-100">{error ?? 'Agent not found.'}</div>
  }

  return <AgentWorkbench initialAgent={agent} initialRuns={runs} />
}
