'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/auth-client'
import { fetchJson } from '@/lib/client-api'
import { formatEstimatedInrFromUsd } from '@/lib/currency'
import type { Agent, AgentVersion, ApiError } from '@/lib/types'

type Analysis = { clarityScore: number; redundancyScore: number; tokenEfficiencyScore: number; safetyScore: number; overallScore: number; tokenCount: number; issues: string[]; suggestions: string[] }
type Optimization = { optimizedPrompt: string; before: Analysis; after: Analysis; tokenReductionPercent: number; estimatedMonthlySavingsInr: number }
type Suite = { id: string; name: string; domain: string; tasks: string[] }
type Comparison = { provider: { id: string; name: string; model: string }; available: boolean; output: string; evaluation: { overall_score: number; passed: boolean } | null; estimatedCostUsd: number; error?: string }
type LensData = { analysis: Analysis; versions: AgentVersion[]; suites: Suite[] } | ApiError
type LensActionResponse = { analysis?: Analysis; optimization?: Optimization; version?: AgentVersion; agent?: Agent; comparisons?: Comparison[]; suite?: Suite; averageScore?: number; passRate?: number } | ApiError

export function AgentLensPanel({ agent, promptOverride, onAgentSaved }: { agent: Agent; promptOverride?: string; onAgentSaved: (agent: Agent) => void }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [optimization, setOptimization] = useState<Optimization | null>(null)
  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [suites, setSuites] = useState<Suite[]>([])
  const [task, setTask] = useState('Compare how this agent handles a difficult user request with missing context.')
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [evalSummary, setEvalSummary] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const activePrompt = promptOverride?.trim() ? promptOverride : agent.system_prompt
  const usingUnsavedPrompt = activePrompt !== agent.system_prompt

  const loadLens = useCallback(async () => {
    const { response, data } = await fetchJson<LensData>(`/api/agent/${agent.id}/lens`, { headers: await getAuthHeaders() })
    if (response.ok && !('error' in data)) {
      setAnalysis(data.analysis)
      setVersions(data.versions)
      setSuites(data.suites)
    }
  }, [agent.id])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLens(), 0)
    return () => window.clearTimeout(timer)
  }, [loadLens])

  async function runAction(action: string, payload: Record<string, unknown> = {}) {
    setLoading(true)
    setError(null)
    setMessage(null)
    const { response, data } = await fetchJson<LensActionResponse>(`/api/agent/${agent.id}/lens`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ action, ...payload })
    })
    setLoading(false)
    if (!response.ok || 'error' in data) {
      setError('error' in data ? data.error : 'Action failed.')
      return null
    }
    return data
  }

  async function optimize() {
    const data = await runAction('optimize', { prompt: activePrompt })
    if (data?.optimization) setOptimization(data.optimization)
  }

  async function analyzeCurrentPrompt() {
    const data = await runAction('analyze', { prompt: activePrompt })
    if (data?.analysis) setAnalysis(data.analysis)
  }

  async function saveVersion(prompt: string, label: string) {
    const data = await runAction('save-version', { prompt, label })
    if (data?.version) {
      setVersions((current) => [data.version as AgentVersion, ...current])
      setMessage('Prompt version saved.')
    }
  }

  async function applyVersion(versionId: string) {
    const data = await runAction('apply-version', { versionId })
    if (data?.agent) {
      onAgentSaved(data.agent)
      setMessage('Version applied to agent.')
    }
  }

  async function compareModels() {
    const data = await runAction('compare-models', { task, providers: ['local', 'gemini', 'openai'] })
    if (data?.comparisons) setComparisons(data.comparisons)
  }

  async function runSuite(suiteId: string) {
    const data = await runAction('run-eval-pack', { suiteId })
    if (data?.suite && typeof data.averageScore === 'number' && typeof data.passRate === 'number') setEvalSummary(`${data.suite.name}: ${data.averageScore}% average, ${data.passRate}% pass rate`)
  }

  return (
    <section className="rounded-xl border border-forge-border bg-forge-card p-5">
      <div>
        <h2 className="text-xl font-bold text-white">AgentForge Lens</h2>
        <p className="mt-1 text-sm text-forge-muted">Analyze, optimize, version, compare, and prove prompt quality.</p>
        {usingUnsavedPrompt ? <p className="mt-2 text-xs text-purple-200">Using the unsaved prompt currently open in Prompt editor.</p> : null}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button onClick={analyzeCurrentPrompt} disabled={loading} className="rounded-xl border border-forge-border px-5 py-3 font-semibold text-forge-text transition-all duration-200 hover:bg-white/5 disabled:opacity-60 sm:min-w-44">{loading ? 'Working...' : 'Analyze Prompt'}</button>
        <button onClick={optimize} disabled={loading} className="rounded-xl bg-forge-purple px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:opacity-60 sm:min-w-44">{loading ? 'Working...' : 'Optimize Prompt'}</button>
      </div>
      {analysis ? <ScoreGrid analysis={analysis} /> : null}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-forge-border bg-black/20 p-4">
          <h3 className="font-semibold text-white">Optimization ROI</h3>
          {optimization ? (
            <>
              <p className="mt-2 text-sm text-forge-muted">Token reduction: {optimization.tokenReductionPercent}% | Monthly savings estimate: ₹{optimization.estimatedMonthlySavingsInr}</p>
              <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-forge-muted">{optimization.optimizedPrompt}</pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => saveVersion(activePrompt, usingUnsavedPrompt ? 'Editor prompt' : 'Original prompt')} className="rounded-lg border border-forge-border px-3 py-2 text-xs text-forge-text">Save Current</button>
                <button onClick={() => saveVersion(optimization.optimizedPrompt, 'Lens optimized')} className="rounded-lg bg-forge-blue px-3 py-2 text-xs font-semibold text-white">Save Optimized</button>
              </div>
            </>
          ) : <p className="mt-2 text-sm text-forge-muted">Run optimization to see before/after scores and cost savings.</p>}
        </div>
        <div className="rounded-xl border border-forge-border bg-black/20 p-4">
          <h3 className="font-semibold text-white">Version History</h3>
          <div className="mt-3 max-h-60 space-y-2 overflow-auto">{versions.length ? versions.map((version) => <button key={version.id} onClick={() => applyVersion(version.id)} className="block w-full rounded-lg border border-forge-border p-3 text-left text-sm text-forge-muted hover:bg-white/5">v{version.version_number} {version.label} | score {version.quality_score} | {version.token_count} tokens</button>) : <p className="text-sm text-forge-muted">No versions saved yet.</p>}</div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-forge-border bg-black/20 p-4">
          <h3 className="font-semibold text-white">Side-by-Side Model Comparison</h3>
          <textarea value={task} onChange={(event) => setTask(event.target.value)} className="mt-3 min-h-24 w-full rounded-lg border border-forge-border bg-black/30 p-3 text-sm text-forge-text" />
          <button onClick={compareModels} className="mt-3 rounded-lg bg-forge-blue px-3 py-2 text-sm font-semibold text-white">Compare Models</button>
          <div className="mt-3 space-y-2">{comparisons.map((item) => <p key={item.provider.id} className="rounded-lg border border-forge-border p-3 text-sm text-forge-muted">{item.provider.name}: {item.available ? `${item.evaluation?.overall_score ?? 0}% | ${formatEstimatedInrFromUsd(item.estimatedCostUsd)}` : item.error}</p>)}</div>
        </div>
        <div className="rounded-xl border border-forge-border bg-black/20 p-4">
          <h3 className="font-semibold text-white">Eval Templates</h3>
          <div className="mt-3 flex flex-wrap gap-2">{suites.map((suite) => <button key={suite.id} onClick={() => runSuite(suite.id)} className="rounded-lg border border-forge-border px-3 py-2 text-sm text-forge-text hover:bg-white/5">{suite.name}</button>)}</div>
          {evalSummary ? <p className="mt-3 rounded-lg border border-forge-green/40 bg-forge-green/10 p-3 text-sm text-green-100">{evalSummary}</p> : null}
        </div>
      </div>
      {message ? <p className="mt-4 rounded-lg border border-forge-green/40 bg-forge-green/10 p-3 text-sm text-green-100">{message}</p> : null}
      {error ? <p className="mt-4 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
    </section>
  )
}

function ScoreGrid({ analysis }: { analysis: Analysis }) {
  const items = [['Overall', analysis.overallScore], ['Clarity', analysis.clarityScore], ['Efficiency', analysis.tokenEfficiencyScore], ['Safety', analysis.safetyScore]]
  return <div className="mt-5 grid gap-3 md:grid-cols-4">{items.map(([label, value]) => <div key={label} className="rounded-xl border border-forge-border bg-black/20 p-4"><p className="text-xs uppercase tracking-widest text-forge-muted">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>)}</div>
}
