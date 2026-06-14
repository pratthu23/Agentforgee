'use client'

import { useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/auth-client'
import type { ApiError, ToolIntegration } from '@/lib/types'

type ToolsResponse = { tools: ToolIntegration[] } | { tool: ToolIntegration } | ApiError

export function ToolIntegrationsPanel({ agentId }: { agentId: string }) {
  const [tools, setTools] = useState<ToolIntegration[]>([])
  const [name, setName] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/tools?agentId=${agentId}`, { headers: await getAuthHeaders() })
      const result = (await response.json()) as ToolsResponse
      if (response.ok && 'tools' in result) setTools(result.tools)
    }
    void load()
  }, [agentId])

  async function addTool() {
    setError(null)
    const response = await fetch('/api/tools', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ agentId, name, endpoint_url: endpointUrl, description })
    })
    const result = (await response.json()) as ToolsResponse
    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to save tool.')
      return
    }
    if ('tool' in result) setTools((current) => [result.tool, ...current])
    setName('')
    setEndpointUrl('')
    setDescription('')
  }

  return (
    <section className="rounded-xl border border-forge-border bg-forge-card p-5">
      <h2 className="text-xl font-bold text-white">Tool integrations</h2>
      <p className="mt-1 text-sm text-forge-muted">Register webhook/API tools the agent can reference in plans and deployed instructions.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tool name" className="rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-sm text-forge-text" />
        <input value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} placeholder="https://api.example.com/webhook" className="rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-sm text-forge-text" />
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this tool does" className="rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-sm text-forge-text" />
      </div>
      {error ? <p className="mt-3 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
      <button onClick={addTool} className="mt-3 rounded-lg bg-forge-blue px-4 py-2 text-sm font-semibold text-white">Add tool</button>
      <div className="mt-4 grid gap-2">
        {tools.map((tool) => (
          <div key={tool.id} className="rounded-lg border border-forge-border bg-black/20 p-3">
            <p className="font-semibold text-white">{tool.name}</p>
            <p className="mt-1 text-sm text-forge-muted">{tool.description || tool.endpoint_url}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
