'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getAuthHeaders, getSessionOrRedirect } from '@/lib/auth-client'
import { fetchJson } from '@/lib/client-api'
import { agentTemplates } from '@/lib/templates'
import type { Agent, ApiError } from '@/lib/types'

type GenerateResponse = { agent: Agent } | ApiError

export function CreateAgentForm() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (prompt.trim().length < 10) {
      setError('Describe the agent in at least 10 characters or choose a template.')
      return
    }

    setLoading(true)

    try {
      const session = await getSessionOrRedirect()

      if (!session) {
        setError('Sign in to generate and save an agent.')
        setLoading(false)
        router.push('/login')
        return
      }

      const { response, data: result } = await fetchJson<GenerateResponse>('/api/generate-agent', {
        method: 'POST',
        headers: await getAuthHeaders(session),
        body: JSON.stringify({ prompt })
      })

      if (!response.ok || 'error' in result) {
        setError('error' in result ? result.error : 'Unable to generate agent.')
        return
      }

      router.push(`/agent/${result.agent.id}`)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong while crafting your agent.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl rounded-xl border border-forge-border bg-forge-card p-5 shadow-glow sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-forge-text">Start from a template</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {agentTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setPrompt(template.prompt)}
              className="rounded-xl border border-forge-border bg-black/20 p-3 text-left transition-all duration-200 hover:border-forge-purple hover:bg-white/5"
            >
              <span className="block font-semibold text-white">{template.name}</span>
              <span className="mt-1 block text-xs text-forge-muted">{template.domain}</span>
            </button>
          ))}
        </div>
      </div>
      <label htmlFor="agent-prompt" className="text-sm font-semibold text-forge-text">
        Describe the agent you want to build...
      </label>
      <textarea
        id="agent-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Build me an HR onboarding agent that helps new employees understand company policies"
        className="mt-3 min-h-52 w-full resize-y rounded-xl border border-forge-border bg-black/30 p-4 text-forge-text placeholder:text-forge-muted transition-all duration-200 focus:border-forge-purple"
      />
      {error ? <p className="mt-3 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-forge-purple to-forge-blue px-5 py-3 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
        {loading ? 'Crafting your agent...' : 'Generate Agent'}
      </button>
    </form>
  )
}
