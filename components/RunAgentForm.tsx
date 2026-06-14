'use client'

import { useState } from 'react'
import { getAuthHeaders } from '@/lib/auth-client'
import { modelProviders } from '@/lib/model-providers'
import type { Agent, AgentRun, ApiError } from '@/lib/types'

type RunResponse = { run: AgentRun; agent: Agent } | ApiError

export function RunAgentForm({
  agent,
  onRunComplete
}: {
  agent: Agent
  onRunComplete: (run: AgentRun) => void
}) {
  const [task, setTask] = useState('')
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [modelProvider, setModelProvider] = useState('local')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    setOutput(null)

    try {
      const response = await fetch('/api/run-agent', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ agentId: agent.id, task, modelProvider })
      })
      const result = (await response.json()) as RunResponse

      if (!response.ok || 'error' in result) {
        setError('error' in result ? result.error : 'Unable to run agent.')
        return
      }

      setOutput(result.run.output)
      onRunComplete(result.run)
    } catch {
      setError('Something went wrong while running this agent.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-forge-border bg-forge-card p-5">
      <h2 className="text-xl font-bold text-white">Run Agent</h2>
      <form onSubmit={handleSubmit} className="mt-4">
        <label className="mb-3 block text-sm font-semibold text-forge-text">
          Model
          <select
            value={modelProvider}
            onChange={(event) => setModelProvider(event.target.value)}
            className="mt-2 w-full rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-sm text-forge-text md:max-w-sm"
          >
            {modelProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.name} - {provider.model}</option>
            ))}
          </select>
        </label>
        <textarea
          value={task}
          onChange={(event) => setTask(event.target.value)}
          placeholder="Enter a task for this agent..."
          className="min-h-36 w-full resize-y rounded-xl border border-forge-border bg-black/30 p-4 text-forge-text placeholder:text-forge-muted transition-all duration-200 focus:border-forge-purple"
        />
        {error ? <p className="mt-3 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 inline-flex items-center gap-3 rounded-xl bg-forge-purple px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
          {loading ? 'Running agent...' : 'Run Agent'}
        </button>
      </form>

      {output ? (
        <div className="mt-5 rounded-xl border border-forge-border bg-black/30 p-5">
          <p className="mb-3 text-sm font-semibold text-purple-200">{agent.name}</p>
          <div className="whitespace-pre-wrap leading-7 text-forge-text">{output}</div>
        </div>
      ) : null}
    </section>
  )
}
