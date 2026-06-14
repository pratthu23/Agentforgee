'use client'

import { useState } from 'react'
import { getAuthHeaders } from '@/lib/auth-client'
import { modelProviders } from '@/lib/model-providers'
import type { ApiError, ConversationMessage } from '@/lib/types'

type ConversationResponse = { conversationId: string; message: ConversationMessage } | ApiError

export function ConversationPanel({ agentId }: { agentId: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; content: string }>>([])
  const [message, setMessage] = useState('')
  const [modelProvider, setModelProvider] = useState('local')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function sendMessage() {
    setError(null)
    setLoading(true)
    const userMessage = message
    setMessages((current) => [...current, { role: 'user', content: userMessage }])
    setMessage('')

    const response = await fetch('/api/conversation', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ agentId, message: userMessage, conversationId, modelProvider })
    })
    const result = (await response.json()) as ConversationResponse
    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to continue conversation.')
    } else {
      setConversationId(result.conversationId)
      setMessages((current) => [...current, { role: 'agent', content: result.message.content }])
    }
    setLoading(false)
  }

  return (
    <section className="rounded-xl border border-forge-border bg-forge-card p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Conversation mode</h2>
          <p className="mt-1 text-sm text-forge-muted">Chat with this agent across multiple turns.</p>
        </div>
        <select value={modelProvider} onChange={(event) => setModelProvider(event.target.value)} className="rounded-xl border border-forge-border bg-black/30 px-3 py-3 text-sm text-forge-text">
          {modelProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </select>
      </div>
      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-forge-border bg-black/20 p-4">
        {messages.length === 0 ? <p className="text-sm text-forge-muted">No messages yet.</p> : null}
        {messages.map((item, index) => (
          <div key={`${item.role}-${index}`} className={item.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block max-w-[85%] rounded-xl p-3 text-sm leading-6 ${item.role === 'user' ? 'bg-forge-purple text-white' : 'bg-white/5 text-forge-text'}`}>
              {item.content}
            </div>
          </div>
        ))}
      </div>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Ask the agent..." className="mt-4 w-full resize-y rounded-xl border border-forge-border bg-black/30 p-3 text-sm text-forge-text" />
      {error ? <p className="mt-3 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
      <button onClick={sendMessage} disabled={loading || !message.trim()} className="mt-3 rounded-lg bg-forge-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Sending...' : 'Send'}</button>
    </section>
  )
}
