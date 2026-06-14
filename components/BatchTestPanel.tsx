'use client'

import { useState } from 'react'
import { getAuthHeaders } from '@/lib/auth-client'
import { benchmarkSuites } from '@/lib/benchmarks'
import { modelProviders } from '@/lib/model-providers'
import { rubricPresets } from '@/lib/rubrics'
import type { ApiError, Evaluation, AgentRun } from '@/lib/types'

type BatchResponse = { results: Array<{ run: AgentRun; evaluation: Evaluation }> } | ApiError

export function BatchTestPanel({ agentId }: { agentId: string }) {
  const [tasks, setTasks] = useState('')
  const [rubricId, setRubricId] = useState('balanced')
  const [modelProvider, setModelProvider] = useState('local')
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function runBatch() {
    setLoading(true)
    setError(null)
    setSummary(null)

    const taskList = tasks.split('\n').map((task) => task.trim()).filter(Boolean)
    const response = await fetch('/api/batch-run', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ agentId, tasks: taskList, rubricId, modelProvider })
    })
    const result = (await response.json()) as BatchResponse

    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to run batch test.')
    } else {
      const passCount = result.results.filter((item) => item.evaluation.passed).length
      const avg = Math.round(result.results.reduce((sum, item) => sum + item.evaluation.overall_score, 0) / result.results.length)
      setSummary(`${result.results.length} tasks tested. ${passCount} passed. Average score ${avg}%.`)
    }

    setLoading(false)
  }

  return (
    <section className="rounded-xl border border-forge-border bg-forge-card p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Batch testing</h2>
          <p className="mt-1 text-sm text-forge-muted">Run 1 to 50 tasks and score them automatically.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={rubricId} onChange={(event) => setRubricId(event.target.value)} className="rounded-xl border border-forge-border bg-black/30 px-3 py-3 text-sm text-forge-text">
            {rubricPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
          </select>
          <select value={modelProvider} onChange={(event) => setModelProvider(event.target.value)} className="rounded-xl border border-forge-border bg-black/30 px-3 py-3 text-sm text-forge-text">
            {modelProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {benchmarkSuites.map((suite) => (
          <button
            key={suite.id}
            type="button"
            onClick={() => setTasks(suite.tasks.join('\n'))}
            className="rounded-lg border border-forge-border px-3 py-2 text-sm text-forge-text transition-all duration-200 hover:border-forge-purple hover:bg-white/5"
          >
            {suite.name}
          </button>
        ))}
      </div>
      <textarea
        value={tasks}
        onChange={(event) => setTasks(event.target.value)}
        rows={7}
        className="mt-4 w-full resize-y rounded-xl border border-forge-border bg-black/30 p-4 text-sm text-forge-text"
        placeholder={'Enter one task per line...\nDraft a customer update for a payment outage.\nReview this refund policy for ambiguity.'}
      />
      {error ? <p className="mt-3 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
      {summary ? <p className="mt-3 rounded-lg border border-forge-green/40 bg-forge-green/10 p-3 text-sm text-green-100">{summary}</p> : null}
      <button onClick={runBatch} disabled={loading} className="mt-4 rounded-xl bg-forge-blue px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-blue-500 disabled:opacity-60">
        {loading ? 'Running batch...' : 'Run Batch Test'}
      </button>
    </section>
  )
}
