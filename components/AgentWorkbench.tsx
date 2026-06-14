'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getAuthHeaders } from '@/lib/auth-client'
import { formatEstimatedInrFromUsd } from '@/lib/currency'
import { downloadRunsCsvReport } from '@/lib/csv-export-client'
import { modelProviders } from '@/lib/model-providers'
import type { Agent, AgentRun, ApiError, Evaluation, RunWithEvaluation } from '@/lib/types'

type Draft = {
  name: string
  domain: string
  description: string
  tone: string
  output_format: string
  constraints: string
  system_prompt: string
}

type UpdateResponse = { agent: Agent } | ApiError
type RunResponse = { run: AgentRun; agent: Agent } | ApiError
type EvalResponse = { evaluation: Evaluation } | ApiError
type ImproveResponse = { improved_prompt: string; agent?: Agent } | ApiError
type DeployResponse = { agent: Agent; deployment_api_key: string } | ApiError

const demoTask = 'A user says they were charged twice and wants a refund. Draft a support response and mention what information is needed.'

export function AgentWorkbench({ initialAgent, initialRuns }: { initialAgent: Agent; initialRuns: RunWithEvaluation[] }) {
  const [agent, setAgent] = useState(initialAgent)
  const [draft, setDraft] = useState<Draft>(() => toDraft(initialAgent))
  const [runs, setRuns] = useState<RunWithEvaluation[]>(initialRuns)
  const [latestRun, setLatestRun] = useState<AgentRun | null>(null)
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(initialRuns.find((run) => run.evaluation)?.evaluation ?? null)
  const [previousScore, setPreviousScore] = useState<number | null>(null)
  const [improvedPrompt, setImprovedPrompt] = useState<string | null>(null)
  const [appliedPrompt, setAppliedPrompt] = useState<string | null>(null)
  const [deploymentKey, setDeploymentKey] = useState(agent.deployment_api_key ?? '')
  const [task, setTask] = useState(demoTask)
  const [modelProvider, setModelProvider] = useState('local')
  const [responseOutput, setResponseOutput] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(toDraft(agent))

  async function saveAgent() {
    setBusy('save')
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
    setBusy(null)

    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to save agent.')
      return
    }

    setAgent(result.agent)
    setDraft(toDraft(result.agent))
    setMessage('Agent instructions saved.')
  }

  async function runAgent() {
    if (task.trim().length < 3) {
      setError('Enter a test task before running the agent.')
      return
    }

    setBusy('run')
    setError(null)
    setMessage(null)
    setResponseOutput('')
    setSelectedEvaluation(null)
    setImprovedPrompt(null)
    setAppliedPrompt(null)

    const response = await fetch('/api/run-agent', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ agentId: agent.id, task, modelProvider })
    })
    const result = (await response.json()) as RunResponse
    setBusy(null)

    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to run agent.')
      return
    }

    setLatestRun(result.run)
    setResponseOutput(result.run.output)
    setRuns((current) => [{ ...result.run, evaluation: null }, ...current])
    setMessage('Test run completed. Evaluate the response next.')
  }

  async function evaluateRun() {
    if (!latestRun) {
      setError('Run a test before evaluating the response.')
      return
    }

    setBusy('evaluate')
    setError(null)
    setMessage(null)

    const response = await fetch('/api/evaluate-agent', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ runId: latestRun.id })
    })
    const result = (await response.json()) as EvalResponse
    setBusy(null)

    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to evaluate response.')
      return
    }

    setSelectedEvaluation(result.evaluation)
    setPreviousScore(result.evaluation.overall_score)
    setRuns((current) => current.map((run) => (run.id === latestRun.id ? { ...run, evaluation: result.evaluation } : run)))
    setMessage('Evaluation complete. Review feedback and improve the prompt.')
  }

  async function improvePrompt(apply: boolean) {
    if (!selectedEvaluation) {
      setError('Evaluate a response before improving the prompt.')
      return
    }

    setBusy(apply ? 'apply' : 'preview')
    setError(null)
    setMessage(null)

    const response = await fetch('/api/improve-agent', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ agentId: agent.id, evaluationId: selectedEvaluation.id, apply })
    })
    const result = (await response.json()) as ImproveResponse
    setBusy(null)

    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to improve prompt.')
      return
    }

    setImprovedPrompt(result.improved_prompt)

    if (apply && result.agent) {
      setAgent(result.agent)
      setDraft(toDraft(result.agent))
      setAppliedPrompt(result.improved_prompt)
      setMessage('Prompt improvement applied.')
      return
    }

    setMessage('Improved prompt preview generated.')
  }

  async function generateDeploymentKey() {
    setBusy('deploy')
    setError(null)
    setMessage(null)

    const response = await fetch(`/api/agent/${agent.id}/deployment`, {
      method: 'POST',
      headers: await getAuthHeaders()
    })
    const result = (await response.json()) as DeployResponse
    setBusy(null)

    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to generate deployment key.')
      return
    }

    setAgent(result.agent)
    setDeploymentKey(result.deployment_api_key)
    setMessage('Deployment key generated. Store it somewhere safe.')
  }

  async function copyDeploymentKey() {
    if (!deploymentKey) return
    await navigator.clipboard.writeText(deploymentKey)
    setMessage('Deployment key copied.')
  }

  async function downloadCsv() {
    setBusy('export')
    setError(null)
    setMessage(null)

    const result = await downloadRunsCsvReport()

    if (result.error) {
      setError(result.error)
    } else {
      setMessage('CSV report downloaded.')
    }

    setBusy(null)
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-forge-border bg-forge-card p-5">
        <Link href="/dashboard" className="text-sm text-forge-muted transition-all duration-200 hover:text-forge-text">Back to Saved Agents</Link>
        <div className="mt-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black text-white">{agent.name}</h1>
              <span className="rounded-full border border-forge-purple/40 bg-forge-purple/15 px-3 py-1 text-sm text-purple-200">{agent.domain}</span>
            </div>
            <p className="mt-2 text-sm text-forge-muted">{hasChanges ? 'Unsaved instruction changes' : 'Saved'}</p>
          </div>
          <Link href="/agent/new" className="rounded-xl border border-forge-border px-4 py-3 text-sm font-semibold text-forge-text transition-all duration-200 hover:bg-white/5">Create another agent</Link>
        </div>
      </header>

      <StatusMessage error={error} message={message} />

      <section className="rounded-xl border border-forge-border bg-forge-card p-5">
        <SectionTitle step="1" title="Agent Instructions" copy="Edit the behavior, scope, and response shape this agent should follow." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
          <Field label="Domain" value={draft.domain} onChange={(value) => setDraft({ ...draft, domain: value })} />
          <Field label="Tone" value={draft.tone} onChange={(value) => setDraft({ ...draft, tone: value })} />
          <Field label="Output format" value={draft.output_format} onChange={(value) => setDraft({ ...draft, output_format: value })} />
        </div>
        <Area label="Description" value={draft.description} onChange={(value) => setDraft({ ...draft, description: value })} rows={3} />
        <Area label="Constraints, one per line" value={draft.constraints} onChange={(value) => setDraft({ ...draft, constraints: value })} rows={5} />
        <Area label="System prompt" value={draft.system_prompt} onChange={(value) => setDraft({ ...draft, system_prompt: value })} rows={10} code />
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={saveAgent} disabled={busy === 'save'} className="rounded-xl bg-forge-purple px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:opacity-60">{busy === 'save' ? 'Saving...' : 'Save Agent'}</button>
          <button onClick={() => setDraft(toDraft(agent))} disabled={!hasChanges} className="rounded-xl border border-forge-border px-5 py-3 font-semibold text-forge-text transition-all duration-200 hover:bg-white/5 disabled:opacity-50">Reset Changes</button>
        </div>
      </section>

      <section className="rounded-xl border border-forge-border bg-forge-card p-5">
        <SectionTitle step="2" title="Run Test" copy="Use the default hackathon task or enter your own real task." />
        <div className="mt-5 grid gap-4 md:grid-cols-[280px_1fr]">
          <label className="block text-sm font-semibold text-forge-text">
            Model
            <select value={modelProvider} onChange={(event) => setModelProvider(event.target.value)} className="mt-2 w-full rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-forge-text">
              {modelProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} - {provider.model}</option>)}
            </select>
          </label>
          <Area label="Test task" value={task} onChange={setTask} rows={5} />
        </div>
        <button onClick={runAgent} disabled={busy === 'run'} className="mt-5 rounded-xl bg-forge-blue px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-blue-500 disabled:opacity-60">{busy === 'run' ? 'Running test...' : 'Run Agent'}</button>
        {responseOutput ? (
          <div className="mt-5 rounded-xl border border-forge-border bg-black/30 p-5">
            <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-semibold text-purple-200">{agent.name}</span>
              {latestRun ? <span className="text-forge-muted">{latestRun.input_tokens + latestRun.output_tokens} tokens | {formatEstimatedInrFromUsd(latestRun.estimated_cost_usd)}</span> : null}
            </div>
            <div className="whitespace-pre-wrap leading-7 text-forge-text">{responseOutput}</div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-forge-border bg-forge-card p-5">
        <SectionTitle step="3" title="Evaluation" copy="Score the latest response and read why it passed or failed." />
        <button onClick={evaluateRun} disabled={!latestRun || busy === 'evaluate'} className="mt-5 rounded-xl bg-forge-purple px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:opacity-50">{busy === 'evaluate' ? 'Evaluating response...' : 'Evaluate Response'}</button>
        {selectedEvaluation ? <EvaluationPanel evaluation={selectedEvaluation} /> : <p className="mt-4 rounded-xl border border-dashed border-forge-border p-4 text-sm text-forge-muted">Run a test, then evaluate the response to see scores and feedback.</p>}
      </section>

      <section className="rounded-xl border border-forge-border bg-forge-card p-5">
        <SectionTitle step="4" title="Improve Prompt" copy="Preview and apply one targeted improvement based on the latest evaluation." />
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => improvePrompt(false)} disabled={!selectedEvaluation || busy === 'preview'} className="rounded-xl border border-forge-border px-5 py-3 font-semibold text-forge-text transition-all duration-200 hover:bg-white/5 disabled:opacity-50">{busy === 'preview' ? 'Generating preview...' : 'Preview Improved Prompt'}</button>
          <button onClick={() => improvePrompt(true)} disabled={!selectedEvaluation || busy === 'apply'} className="rounded-xl bg-forge-green px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-green-500 disabled:opacity-50">{busy === 'apply' ? 'Applying...' : 'Apply Improvement'}</button>
        </div>
        {improvedPrompt ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-forge-border bg-black/25 p-4">
              <h3 className="font-bold text-white">Before / After</h3>
              <dl className="mt-3 space-y-2 text-sm text-forge-muted">
                <div className="flex justify-between gap-4"><dt>Previous score</dt><dd className="font-semibold text-forge-text">{previousScore ?? selectedEvaluation?.overall_score ?? 0}%</dd></div>
                <div className="flex justify-between gap-4"><dt>Estimated improved score</dt><dd className="font-semibold text-forge-text">{Math.min((previousScore ?? selectedEvaluation?.overall_score ?? 0) + 8, 96)}%</dd></div>
                <div className="flex justify-between gap-4"><dt>Status</dt><dd className="font-semibold text-forge-text">{appliedPrompt ? 'Applied' : 'Preview only'}</dd></div>
              </dl>
              <p className="mt-4 text-sm leading-6 text-forge-muted">What changed: the prompt now asks for missing context, measurable success criteria, evidence-backed reasoning, and a validation checklist.</p>
              <p className="mt-2 text-sm leading-6 text-forge-muted">Why it helps: these instructions make responses easier to evaluate and reduce unsupported claims.</p>
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-forge-border bg-black/30 p-4 text-sm leading-6 text-forge-muted">{improvedPrompt}</pre>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-forge-border bg-forge-card p-5">
        <SectionTitle step="5" title="Deploy Agent" copy="Generate a deployment key for API usage. Keep this key private." />
        <div className="mt-5 rounded-xl border border-forge-orange/30 bg-forge-orange/10 p-4 text-sm leading-6 text-orange-100">
          Deployment keys can run your agent through supported server routes. Treat them like passwords and regenerate the key if it is exposed.
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input readOnly value={deploymentKey || 'No deployment key generated yet'} className="min-w-0 flex-1 rounded-xl border border-forge-border bg-black/30 px-4 py-3 font-mono text-sm text-forge-muted" />
          <button onClick={generateDeploymentKey} disabled={busy === 'deploy'} className="rounded-xl bg-forge-purple px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-purple-500 disabled:opacity-60">{busy === 'deploy' ? 'Generating...' : deploymentKey ? 'Regenerate Key' : 'Generate Key'}</button>
          <button onClick={copyDeploymentKey} disabled={!deploymentKey} className="rounded-xl border border-forge-border px-5 py-3 font-semibold text-forge-text transition-all duration-200 hover:bg-white/5 disabled:opacity-50">Copy Key</button>
        </div>
      </section>

      <section className="rounded-xl border border-forge-border bg-forge-card p-5">
        <SectionTitle step="6" title="Recent Runs" copy="Compact history for the agent's latest tests and evaluations." />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-forge-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Task</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Passed</th>
                <th className="px-3 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className={run.evaluation?.passed ? 'bg-forge-green/10' : run.evaluation ? 'bg-forge-red/10' : 'bg-white/[0.03]'}>
                  <td className="max-w-md truncate rounded-l-xl px-3 py-3 text-forge-text">{run.task}</td>
                  <td className="px-3 py-3 text-forge-text">{run.evaluation ? `${run.evaluation.overall_score}%` : 'Pending'}</td>
                  <td className="px-3 py-3 text-forge-text">{run.evaluation ? (run.evaluation.passed ? 'Passed' : 'Failed') : 'Not scored'}</td>
                  <td className="rounded-r-xl px-3 py-3 text-forge-muted">{formatDate(run.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {runs.length === 0 ? <p className="rounded-xl border border-dashed border-forge-border p-6 text-center text-forge-muted">No runs yet. Run the demo task above to create the first result.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-forge-border bg-forge-card p-5">
        <SectionTitle step="7" title="Download Report" copy="Export your run history and evaluation scores as a CSV file." />
        <button onClick={downloadCsv} disabled={busy === 'export'} className="mt-5 rounded-xl bg-forge-blue px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-blue-500 disabled:opacity-60">
          {busy === 'export' ? 'Preparing CSV...' : 'Download CSV'}
        </button>
      </section>
    </div>
  )
}

function EvaluationPanel({ evaluation }: { evaluation: Evaluation }) {
  const scores = [
    ['Overall', evaluation.overall_score],
    ['Accuracy', evaluation.accuracy_score],
    ['Safety', evaluation.safety_score],
    ['Helpfulness', evaluation.helpfulness_score],
    ['Domain fit', evaluation.domain_fit_score]
  ] as const

  return (
    <div className="mt-5 rounded-xl border border-forge-border bg-black/25 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h3 className="text-lg font-bold text-white">Evaluation scorecard</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${evaluation.passed ? 'bg-forge-green/20 text-green-200' : 'bg-forge-red/20 text-red-200'}`}>{evaluation.passed ? 'PASSED' : 'FAILED'}</span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {scores.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-forge-border bg-black/25 p-4">
            <p className="text-xs uppercase tracking-widest text-forge-muted">{label}</p>
            <p className="mt-2 text-2xl font-black text-white">{value}%</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <TextBlock title="Feedback" text={evaluation.feedback} />
        <TextBlock title="Failure analysis" text={evaluation.failure_analysis} />
        <TextBlock title="Suggested prompt improvement" text={evaluation.improvement_suggestion} />
      </div>
    </div>
  )
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return <div><h4 className="font-semibold text-white">{title}</h4><p className="mt-2 text-sm leading-6 text-forge-muted">{text}</p></div>
}

function SectionTitle({ step, title, copy }: { step: string; title: string; copy: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forge-purple text-sm font-bold text-white">{step}</span>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-forge-muted">{copy}</p>
      </div>
    </div>
  )
}

function StatusMessage({ error, message }: { error: string | null; message: string | null }) {
  if (error) return <p className="rounded-xl border border-forge-red/40 bg-forge-red/10 p-4 text-sm text-red-100">{error}</p>
  if (message) return <p className="rounded-xl border border-forge-green/40 bg-forge-green/10 p-4 text-sm text-green-100">{message}</p>
  return null
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-forge-text">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-forge-text transition-all duration-200 focus:border-forge-purple" />
    </label>
  )
}

function Area({ label, value, onChange, rows, code = false }: { label: string; value: string; onChange: (value: string) => void; rows: number; code?: boolean }) {
  return (
    <label className="mt-4 block text-sm font-semibold text-forge-text">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className={`mt-2 w-full resize-y rounded-xl border border-forge-border bg-black/30 p-4 text-forge-text transition-all duration-200 focus:border-forge-purple ${code ? 'font-mono text-sm leading-6 text-forge-muted' : ''}`} />
    </label>
  )
}

function toDraft(agent: Agent): Draft {
  return {
    name: agent.name,
    domain: agent.domain,
    description: agent.description,
    tone: agent.tone,
    output_format: agent.output_format,
    constraints: agent.constraints.join('\n'),
    system_prompt: agent.system_prompt
  }
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date))
}
