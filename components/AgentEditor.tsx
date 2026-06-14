'use client'

import { useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/auth-client'
import type { Agent, ApiError } from '@/lib/types'

type AgentDraft = {
  name: string
  domain: string
  description: string
  constraints: string
  tone: string
  output_format: string
  system_prompt: string
}

type UpdateResponse = { agent: Agent } | ApiError

export function AgentEditor({ agent, onSaved, onDraftChange }: { agent: Agent; onSaved: (agent: Agent) => void; onDraftChange?: (draft: AgentDraft) => void }) {
  const [draft, setDraft] = useState<AgentDraft>({
    name: agent.name,
    domain: agent.domain,
    description: agent.description,
    constraints: agent.constraints.join('\n'),
    tone: agent.tone,
    output_format: agent.output_format,
    system_prompt: agent.system_prompt
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    onDraftChange?.(draft)
  }, [draft, onDraftChange])

  async function saveAgent() {
    setSaving(true)
    setError(null)
    setMessage(null)

    const response = await fetch(`/api/agent/${agent.id}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        ...draft,
        constraints: draft.constraints.split('\n').map((item) => item.trim()).filter(Boolean)
      })
    })
    const result = (await response.json()) as UpdateResponse

    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to save agent.')
    } else {
      onSaved(result.agent)
      setMessage('Agent updated.')
    }

    setSaving(false)
  }

  return (
    <details className="rounded-xl border border-forge-border bg-black/30 p-4">
      <summary className="cursor-pointer font-semibold text-white transition-all duration-200 hover:text-purple-200">Prompt editor</summary>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <Field label="Domain" value={draft.domain} onChange={(value) => setDraft({ ...draft, domain: value })} />
        <Field label="Tone" value={draft.tone} onChange={(value) => setDraft({ ...draft, tone: value })} />
        <Field label="Output format" value={draft.output_format} onChange={(value) => setDraft({ ...draft, output_format: value })} />
      </div>
      <Area label="Description" value={draft.description} onChange={(value) => setDraft({ ...draft, description: value })} rows={3} />
      <Area label="Constraints, one per line" value={draft.constraints} onChange={(value) => setDraft({ ...draft, constraints: value })} rows={5} />
      <Area label="System prompt" value={draft.system_prompt} onChange={(value) => setDraft({ ...draft, system_prompt: value })} rows={9} code />
      {error ? <p className="mt-4 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
      {message ? <p className="mt-4 rounded-lg border border-forge-green/40 bg-forge-green/10 p-3 text-sm text-green-100">{message}</p> : null}
      <button onClick={saveAgent} disabled={saving} className="mt-5 rounded-xl bg-forge-purple px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:opacity-60">
        {saving ? 'Saving...' : 'Save agent'}
      </button>
    </details>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-forge-text">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-forge-border bg-black/40 px-4 py-3 text-forge-text transition-all duration-200 focus:border-forge-purple" />
    </label>
  )
}

function Area({ label, value, onChange, rows, code = false }: { label: string; value: string; onChange: (value: string) => void; rows: number; code?: boolean }) {
  return (
    <label className="mt-4 block text-sm font-semibold text-forge-text">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className={`mt-2 w-full resize-y rounded-lg border border-forge-border bg-black/40 p-4 text-forge-text transition-all duration-200 focus:border-forge-purple ${code ? 'font-mono text-sm leading-6 text-forge-muted' : ''}`}
      />
    </label>
  )
}
