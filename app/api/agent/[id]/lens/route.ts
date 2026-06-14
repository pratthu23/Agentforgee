export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { benchmarkSuites } from '@/lib/benchmarks'
import { getAuthenticatedUser, requireFirebaseStore } from '@/lib/auth'
import { evaluateLocalRun, runLocalAgent } from '@/lib/free-ai'
import { generateWithProvider, modelProviders } from '@/lib/model-providers'
import { getRubricPreset } from '@/lib/rubrics'
import { analyzePrompt, optimizePrompt, type PromptOptimization } from '@/lib/prompt-lens'
import { accessErrorStatus, loadAccessibleAgent } from '@/lib/workspace'

type LensAction = 'analyze' | 'optimize' | 'save-version' | 'apply-version' | 'compare-models' | 'run-eval-pack'
type LensRequest = {
  action: LensAction
  prompt?: string
  label?: string
  versionId?: string
  task?: string
  providers?: string[]
  suiteId?: string
}
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })

    const store = await requireFirebaseStore()
    const { agent, error: agentError } = await loadAccessibleAgent(store, user, id, 'viewer')

    if (!agent) return NextResponse.json({ error: agentError ?? 'Agent not found.' }, { status: accessErrorStatus(agentError) })

    const { data, error } = await store.from('agent_versions').select('*').eq('agent_id', agent.id).eq('user_id', agent.user_id).order('version_number', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ analysis: analyzePrompt(agent.system_prompt), versions: data, suites: benchmarkSuites })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load PromptLens.' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = (await request.json()) as Partial<LensRequest>
    const { user, error: authError } = await getAuthenticatedUser(request)

    if (authError || !user) return NextResponse.json({ error: authError ?? 'Sign in to continue.' }, { status: 401 })
    if (!body.action) return NextResponse.json({ error: 'Lens action is required.' }, { status: 400 })

    const store = await requireFirebaseStore()
    const minimumRole = body.action === 'analyze' || body.action === 'compare-models' ? 'viewer' : 'editor'
    const { agent, error: agentError } = await loadAccessibleAgent(store, user, id, minimumRole)

    if (!agent) return NextResponse.json({ error: agentError ?? 'Agent not found.' }, { status: accessErrorStatus(agentError) })

    if (body.action === 'analyze') {
      return NextResponse.json({ analysis: analyzePrompt(body.prompt ?? agent.system_prompt) })
    }

    if (body.action === 'optimize') {
      const optimization = await optimizeWithSelectedProvider(body.prompt ?? agent.system_prompt, agent.name, agent.domain, agent.constraints, agent.output_format)
      return NextResponse.json({ optimization })
    }

    if (body.action === 'save-version') {
      const prompt = body.prompt?.trim() || agent.system_prompt
      const analysis = analyzePrompt(prompt)
      const version = await createVersion(store, agent.id, agent.user_id, body.label ?? 'Prompt version', prompt, analysis.overallScore, analysis.tokenCount)
      return NextResponse.json({ version })
    }

    if (body.action === 'apply-version') {
      if (!body.versionId) return NextResponse.json({ error: 'Version id is required.' }, { status: 400 })
      const { data: version, error } = await store.from('agent_versions').select('*').eq('id', body.versionId).eq('agent_id', agent.id).eq('user_id', agent.user_id).single()
      if (error || !version) return NextResponse.json({ error: error?.message ?? 'Version not found.' }, { status: 404 })
      const updated = await store.from('agents').update({ system_prompt: version.system_prompt, updated_at: new Date().toISOString() }).eq('id', agent.id).eq('user_id', agent.user_id).select().single()
      if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 })
      return NextResponse.json({ agent: updated.data, version })
    }

    if (body.action === 'compare-models') {
      const task = body.task?.trim()
      if (!task) return NextResponse.json({ error: 'Comparison task is required.' }, { status: 400 })
      const providers = body.providers?.length ? body.providers : ['local', 'gemini', 'openai']
      const comparisons = await Promise.all(providers.map((provider) => compareProvider(provider, agent.system_prompt, task, () => runLocalAgent(agent, task))))
      return NextResponse.json({ comparisons })
    }

    if (body.action === 'run-eval-pack') {
      const suite = benchmarkSuites.find((item) => item.id === body.suiteId) ?? benchmarkSuites[0]
      const preset = getRubricPreset(undefined)
      const results = suite.tasks.map((task) => {
        const output = runLocalAgent(agent, task)
        const evaluation = evaluateLocalRun(task, output, preset.rubric, preset.name)
        return { task, output, evaluation }
      })
      const averageScore = Math.round(results.reduce((sum, item) => sum + item.evaluation.overall_score, 0) / results.length)
      const passRate = Math.round((results.filter((item) => item.evaluation.passed).length / results.length) * 100)
      return NextResponse.json({ suite, results, averageScore, passRate })
    }

    return NextResponse.json({ error: 'Unsupported Lens action.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'PromptLens action failed.' }, { status: 500 })
  }
}

async function createVersion(store: Awaited<ReturnType<typeof requireFirebaseStore>>, agentId: string, userId: string, label: string, prompt: string, qualityScore: number, tokenCount: number) {
  const existing = await store.from('agent_versions').select('*').eq('agent_id', agentId).eq('user_id', userId)
  const versionNumber = (existing.data.reduce((max, version) => Math.max(max, version.version_number), 0) || 0) + 1
  const { data, error } = await store.from('agent_versions').insert({
    agent_id: agentId,
    user_id: userId,
    version_number: versionNumber,
    label,
    system_prompt: prompt,
    token_count: tokenCount,
    quality_score: qualityScore,
    average_score: null,
    pass_rate: null,
    estimated_cost_usd: 0
  }).select().single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save version.')
  return data
}

async function optimizeWithSelectedProvider(prompt: string, agentName: string, domain: string, constraints: string[], outputFormat: string): Promise<PromptOptimization> {
  const localOptimization = optimizePrompt(prompt, agentName, domain, constraints, outputFormat)
  const result = await generateWithProvider({
    system: 'You are an expert prompt optimization engineer. Rewrite system prompts for lower token cost, clearer constraints, safer behavior, and stronger evaluation performance. Return only the optimized system prompt, no markdown.',
    prompt: `Agent name: ${agentName}\nDomain: ${domain}\nOutput format: ${outputFormat}\nConstraints:\n${constraints.map((constraint) => `- ${constraint}`).join('\n')}\n\nOriginal system prompt:\n${prompt}`,
    localOutput: () => localOptimization.optimizedPrompt
  })
  const optimizedPrompt = cleanOptimizedPrompt(result.output)
  const before = analyzePrompt(prompt)
  const after = analyzePrompt(optimizedPrompt)
  const tokenReductionPercent = Math.max(0, Math.round(((before.tokenCount - after.tokenCount) / Math.max(before.tokenCount, 1)) * 100))
  const estimatedMonthlySavingsInr = Number((Math.max(0, before.tokenCount - after.tokenCount) / 1000 * 0.00015 * 1000 * 83).toFixed(2))
  return { optimizedPrompt, before, after, tokenReductionPercent, estimatedMonthlySavingsInr }
}

async function compareProvider(providerId: string, system: string, task: string, localOutput: () => string) {
  const provider = modelProviders.find((item) => item.id === providerId) ?? modelProviders[0]

  try {
    const result = await generateWithProvider({ providerId, system, prompt: task, localOutput })
    const evaluation = evaluateLocalRun(task, result.output, getRubricPreset(undefined).rubric, 'Model comparison')
    return { provider: result.provider, output: result.output, evaluation, inputTokens: result.inputTokens, outputTokens: result.outputTokens, estimatedCostUsd: result.estimatedCostUsd, available: true }
  } catch (error) {
    return {
      provider,
      output: '',
      evaluation: null,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      available: false,
      error: error instanceof Error ? `${error.message} Use Local Free if you do not want to use an external API key.` : 'Provider unavailable. Use Local Free.'
    }
  }
}

function cleanOptimizedPrompt(value: string): string {
  return value.trim().replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim()
}
