'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AgentEditor } from '@/components/AgentEditor'
import { AgentLensPanel } from '@/components/AgentLensPanel'
import { AgentWorkspace } from '@/components/AgentWorkspace'
import { BatchTestPanel } from '@/components/BatchTestPanel'
import { ConversationPanel } from '@/components/ConversationPanel'
import { KnowledgePanel } from '@/components/KnowledgePanel'
import { ToolIntegrationsPanel } from '@/components/ToolIntegrationsPanel'
import { getAuthHeaders, getSessionOrRedirect } from '@/lib/auth-client'
import type { Agent, ApiError, RunWithEvaluation } from '@/lib/types'

type AgentResponse = { agent: Agent; runs: RunWithEvaluation[] } | ApiError
type AgentDraft = {
  name: string
  domain: string
  description: string
  constraints: string
  tone: string
  output_format: string
  system_prompt: string
}

export function AgentDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [runs, setRuns] = useState<RunWithEvaluation[]>([])
  const [draft, setDraft] = useState<AgentDraft | null>(null)
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

  return (
    <>
      <Link href="/dashboard" className="text-sm text-forge-muted transition-all duration-200 hover:text-forge-text">Back to dashboard</Link>
      <section className="mt-6 rounded-xl border border-forge-border bg-forge-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black text-white">{agent.name}</h1>
          <span className="rounded-full border border-forge-purple/40 bg-forge-purple/15 px-3 py-1 text-sm text-purple-200">{agent.domain}</span>
        </div>
        <p className="mt-3 max-w-3xl leading-7 text-forge-muted">{agent.description}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Meta label="Tone" value={agent.tone} />
          <Meta label="Output format" value={agent.output_format} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {agent.constraints.map((constraint) => (
            <span key={constraint} className="rounded-full border border-forge-border bg-white/5 px-3 py-1 text-sm text-forge-muted">{constraint}</span>
          ))}
        </div>
        <details className="mt-5 rounded-xl border border-forge-border bg-black/30 p-4">
          <summary className="cursor-pointer font-semibold text-white transition-all duration-200 hover:text-purple-200">System prompt</summary>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/40 p-4 text-sm leading-6 text-forge-muted">{agent.system_prompt}</pre>
        </details>
        <div className="mt-4">
          <AgentEditor
            key={`${agent.id}-${agent.updated_at ?? agent.system_prompt}`}
            agent={agent}
            onSaved={(savedAgent) => {
              setAgent(savedAgent)
              setDraft(null)
            }}
            onDraftChange={setDraft}
          />
        </div>
      </section>
      <div className="mt-6">
        <AgentLensPanel agent={agent} promptOverride={draft?.system_prompt} onAgentSaved={setAgent} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <KnowledgePanel agentId={agent.id} />
        <ToolIntegrationsPanel agentId={agent.id} />
      </div>
      <div className="mt-6">
        <ConversationPanel agentId={agent.id} />
      </div>
      <div className="mt-6">
        <BatchTestPanel agentId={agent.id} />
      </div>
      <div className="mt-6">
        <AgentWorkspace
          agent={agent}
          runs={runs}
          onPromptImproved={(prompt) => setAgent((current) => (current ? { ...current, system_prompt: prompt } : current))}
        />
      </div>
    </>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-forge-border bg-black/20 p-4">
      <p className="text-xs uppercase tracking-widest text-forge-muted">{label}</p>
      <p className="mt-2 text-sm text-forge-text">{value}</p>
    </div>
  )
}
