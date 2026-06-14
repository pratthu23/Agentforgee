'use client'

import { useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/auth-client'
import type { ApiError, KnowledgeSource } from '@/lib/types'

type KnowledgeResponse = { knowledge: KnowledgeSource[] } | { knowledge: KnowledgeSource } | ApiError

export function KnowledgePanel({ agentId }: { agentId: string }) {
  const [items, setItems] = useState<KnowledgeSource[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/knowledge?agentId=${agentId}`, { headers: await getAuthHeaders() })
      const result = (await response.json()) as KnowledgeResponse
      if (response.ok && 'knowledge' in result && Array.isArray(result.knowledge)) setItems(result.knowledge)
    }
    void load()
  }, [agentId])

  async function addKnowledge() {
    setError(null)
    const response = await fetch('/api/knowledge', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ agentId, title, content, source_type: 'text' })
    })
    const result = (await response.json()) as KnowledgeResponse
    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to save knowledge.')
      return
    }
    const savedKnowledge = result.knowledge
    if (!Array.isArray(savedKnowledge)) setItems((current) => [savedKnowledge, ...current])
    setTitle('')
    setContent('')
  }

  return (
    <section className="rounded-xl border border-forge-border bg-forge-card p-5">
      <h2 className="text-xl font-bold text-white">Knowledge base</h2>
      <p className="mt-1 text-sm text-forge-muted">Attach text, FAQs, URLs, or pasted document excerpts to this agent.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[240px_1fr]">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" className="rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-sm text-forge-text" />
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste knowledge content..." rows={4} className="resize-y rounded-xl border border-forge-border bg-black/30 p-3 text-sm text-forge-text" />
      </div>
      {error ? <p className="mt-3 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
      <button onClick={addKnowledge} className="mt-3 rounded-lg bg-forge-purple px-4 py-2 text-sm font-semibold text-white">Add knowledge</button>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-forge-border bg-black/20 p-3">
            <p className="font-semibold text-white">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-forge-muted">{item.content}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
