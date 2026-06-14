import { randomUUID } from 'crypto'
import type { Firestore } from 'firebase-admin/firestore'
import type {
  Agent,
  AgentRun,
  AgentVersion,
  AgentWithStats,
  Conversation,
  ConversationMessage,
  DashboardStats,
  Evaluation,
  KnowledgeSource,
  RunWithEvaluation,
  TeamInvite,
  TeamMember,
  ToolIntegration
} from '@/lib/types'

type CollectionMap = {
  agents: Agent
  agent_runs: AgentRun
  agent_versions: AgentVersion
  evaluations: Evaluation
  knowledge_sources: KnowledgeSource
  conversations: Conversation
  conversation_messages: ConversationMessage
  team_members: TeamMember
  team_invites: TeamInvite
  tool_integrations: ToolIntegration
}

type CollectionName = keyof CollectionMap
type QueryResult<T> = { data: T | null; error: { message: string } | null }
type ManyQueryResult<T> = { data: T; error: { message: string } | null }
type Filter = { field: string; value: unknown }
type Sort = { field: string; ascending: boolean }

let cachedFirestore: Firestore | null = null

export async function getFirebaseAdminDb(): Promise<Firestore | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)

  if (!projectId || !clientEmail || !privateKey) {
    return null
  }

  const [{ cert, getApps, initializeApp }, { getFirestore }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/firestore')
  ])

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey })
    })
  }

  if (!cachedFirestore) {
    cachedFirestore = getFirestore()
  }

  return cachedFirestore
}

export async function getFirebaseStore(): Promise<FirebaseStore | null> {
  const db = await getFirebaseAdminDb()
  return db ? new FirebaseStore(db) : null
}

export async function requireFirebaseStore(): Promise<FirebaseStore> {
  const store = await getFirebaseStore()

  if (!store) {
    throw new Error('Firebase is not configured.')
  }

  return store
}

export class FirebaseStore {
  constructor(private readonly db: Firestore) {}

  from<K extends CollectionName>(collectionName: K): FirestoreQuery<K> {
    return new FirestoreQuery<K>(this.db, collectionName)
  }
}

class FirestoreQuery<K extends CollectionName> implements PromiseLike<ManyQueryResult<Array<CollectionMap[K]>>> {
  private readonly filters: Filter[] = []
  private sort: Sort | null = null
  private operation: 'select' | 'insert' | 'update' = 'select'
  private insertValues: Array<Partial<CollectionMap[K]>> = []
  private updateValue: Partial<CollectionMap[K]> = {}
  private wantsSingle = false

  constructor(
    private readonly db: Firestore,
    private readonly collectionName: K
  ) {}

  select(columns = '*'): this {
    void columns
    return this
  }

  eq(field: keyof CollectionMap[K] | string, value: unknown): this {
    this.filters.push({ field: String(field), value })
    return this
  }

  order(field: keyof CollectionMap[K] | string, options?: { ascending?: boolean }): this {
    this.sort = { field: String(field), ascending: options?.ascending ?? true }
    return this
  }

  insert(value: Partial<CollectionMap[K]> | Array<Partial<CollectionMap[K]>>): this {
    this.operation = 'insert'
    this.insertValues = Array.isArray(value) ? value : [value]
    return this
  }

  update(value: Partial<CollectionMap[K]>): this {
    this.operation = 'update'
    this.updateValue = value
    return this
  }

  single(): Promise<QueryResult<CollectionMap[K]>> {
    this.wantsSingle = true
    return this.executeSingle()
  }

  then<TResult1 = ManyQueryResult<Array<CollectionMap[K]>>, TResult2 = never>(
    onfulfilled?: ((value: ManyQueryResult<Array<CollectionMap[K]>>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeMany().then(onfulfilled, onrejected)
  }

  private async executeSingle(): Promise<QueryResult<CollectionMap[K]>> {
    const result = await this.executeMany()

    if (result.error) {
      return { data: null, error: result.error }
    }

    const first = result.data?.[0] ?? null

    if (!first) {
      return { data: null, error: { message: `${this.collectionName} document not found.` } }
    }

    return { data: first, error: null }
  }

  private async executeMany(): Promise<ManyQueryResult<Array<CollectionMap[K]>>> {
    try {
      if (this.operation === 'insert') {
        const rows = await this.insertDocuments()
        return { data: rows, error: null }
      }

      if (this.operation === 'update') {
        const rows = await this.updateDocuments()
        return { data: rows, error: null }
      }

      const rows = await this.readDocuments()
      return { data: rows, error: null }
    } catch (error) {
      return { data: [], error: { message: error instanceof Error ? error.message : 'Firestore operation failed.' } }
    }
  }

  private async insertDocuments(): Promise<Array<CollectionMap[K]>> {
    const collection = this.db.collection(this.collectionName)
    const now = new Date().toISOString()
    const rows: Array<CollectionMap[K]> = []

    for (const value of this.insertValues) {
      const id = typeof value.id === 'string' ? value.id : randomUUID()
      const row = {
        ...defaultValues(this.collectionName),
        ...value,
        id,
        created_at: typeof value.created_at === 'string' ? value.created_at : now
      } as CollectionMap[K]
      await collection.doc(id).set(row)
      rows.push(row)
    }

    return rows
  }

  private async updateDocuments(): Promise<Array<CollectionMap[K]>> {
    const rows = await this.readDocuments()
    const now = new Date().toISOString()
    const collection = this.db.collection(this.collectionName)
    const updatedRows: Array<CollectionMap[K]> = []

    for (const row of rows) {
      const patch = { ...this.updateValue, updated_at: now } as Partial<CollectionMap[K]>
      await collection.doc(row.id).set(patch, { merge: true })
      updatedRows.push({ ...row, ...patch } as CollectionMap[K])
    }

    return updatedRows
  }

  private async readDocuments(): Promise<Array<CollectionMap[K]>> {
    let query: FirebaseFirestore.Query = this.db.collection(this.collectionName)

    for (const filter of this.filters) {
      query = query.where(filter.field, '==', filter.value)
    }

    const snapshot = await query.get()
    const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CollectionMap[K])
    const sort = this.sort
    if (sort) {
      rows.sort((left, right) => compareValues(left, right, sort))
    }
    return this.wantsSingle ? rows.slice(0, 1) : rows
  }
}

export async function fetchDashboardData(): Promise<{
  agents: AgentWithStats[]
  stats: DashboardStats
  error: string | null
}> {
  const store = await getFirebaseStore()

  if (!store) {
    return {
      agents: [],
      stats: { totalAgents: 0, totalRuns: 0, averageOverallScore: 0, passRate: 0, estimatedCostUsd: 0 },
      error: 'Firebase is not configured yet.'
    }
  }

  const [agentsResult, runsResult, evalsResult] = await Promise.all([
    store.from('agents').select('*').order('created_at', { ascending: false }),
    store.from('agent_runs').select('*'),
    store.from('evaluations').select('*')
  ])

  if (agentsResult.error) return emptyDashboard(agentsResult.error.message)
  if (runsResult.error) return emptyDashboard(runsResult.error.message)
  if (evalsResult.error) return emptyDashboard(evalsResult.error.message)

  const runs = runsResult.data ?? []
  const evaluations = evalsResult.data ?? []
  const agents = (agentsResult.data ?? []).map((agent) => {
    const agentRuns = runs.filter((run) => run.agent_id === agent.id)
    const agentEvals = evaluations.filter((evaluation) => evaluation.agent_id === agent.id)
    const average =
      agentEvals.length > 0
        ? Math.round(agentEvals.reduce((sum, evaluation) => sum + evaluation.overall_score, 0) / agentEvals.length)
        : null

    return {
      ...agent,
      last_run_at: agentRuns[0]?.created_at ?? null,
      average_score: average
    }
  })

  const averageOverallScore =
    evaluations.length > 0
      ? Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.overall_score, 0) / evaluations.length)
      : 0
  const passRate =
    evaluations.length > 0
      ? Math.round((evaluations.filter((evaluation) => evaluation.passed).length / evaluations.length) * 100)
      : 0

  return {
    agents,
    stats: {
      totalAgents: agents.length,
      totalRuns: runs.length,
      averageOverallScore,
      passRate,
      estimatedCostUsd: Number(runs.reduce((sum, run) => sum + Number(run.estimated_cost_usd), 0).toFixed(6))
    },
    error: null
  }
}

export async function fetchAgentDetail(agentId: string): Promise<{
  agent: Agent | null
  runs: RunWithEvaluation[]
  error: string | null
}> {
  if (!isUuid(agentId)) {
    return { agent: null, runs: [], error: 'Invalid agent id.' }
  }

  const store = await getFirebaseStore()

  if (!store) {
    return { agent: null, runs: [], error: 'Firebase is not configured yet.' }
  }

  const [agentResult, runsResult, evalsResult] = await Promise.all([
    store.from('agents').select('*').eq('id', agentId).single(),
    store.from('agent_runs').select('*').eq('agent_id', agentId).order('created_at', { ascending: false }),
    store.from('evaluations').select('*').eq('agent_id', agentId).order('created_at', { ascending: false })
  ])

  if (agentResult.error || !agentResult.data) {
    return { agent: null, runs: [], error: agentResult.error?.message ?? 'Agent not found.' }
  }

  if (runsResult.error) {
    return { agent: agentResult.data, runs: [], error: runsResult.error.message }
  }

  if (evalsResult.error) {
    return { agent: agentResult.data, runs: [], error: evalsResult.error.message }
  }

  const evaluationsByRun = new Map<string, Evaluation>()
  ;(evalsResult.data ?? []).forEach((evaluation) => evaluationsByRun.set(evaluation.run_id, evaluation))

  const runs = (runsResult.data ?? []).map((run) => ({
    ...run,
    evaluation: evaluationsByRun.get(run.id) ?? null
  }))

  return { agent: agentResult.data, runs, error: null }
}

function emptyDashboard(error: string): {
  agents: AgentWithStats[]
  stats: DashboardStats
  error: string
} {
  return {
    agents: [],
    stats: { totalAgents: 0, totalRuns: 0, averageOverallScore: 0, passRate: 0, estimatedCostUsd: 0 },
    error
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
}

function compareValues<T extends Record<string, unknown>>(left: T, right: T, sort: Sort): number {
  const leftValue = left[sort.field]
  const rightValue = right[sort.field]

  if (leftValue === rightValue) {
    return 0
  }

  if (leftValue === undefined || leftValue === null) {
    return sort.ascending ? -1 : 1
  }

  if (rightValue === undefined || rightValue === null) {
    return sort.ascending ? 1 : -1
  }

  const direction = sort.ascending ? 1 : -1
  return String(leftValue).localeCompare(String(rightValue)) * direction
}

function normalizePrivateKey(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  return value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
}

function defaultValues<K extends CollectionName>(collectionName: K): Partial<CollectionMap[K]> {
  if (collectionName === 'agents') {
    return {
      tone: 'Professional and concise',
      output_format: 'Structured response with headings',
      is_public: false,
      public_slug: null,
      deployment_api_key: null,
      updated_at: null
    } as unknown as Partial<CollectionMap[K]>
  }

  if (collectionName === 'agent_runs') {
    return {
      model_provider: 'local',
      model_name: 'local-demo-engine',
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_usd: 0
    } as unknown as Partial<CollectionMap[K]>
  }

  if (collectionName === 'evaluations') {
    return {
      rubric_name: 'Balanced',
      rubric: { accuracy_weight: 35, safety_weight: 25, helpfulness_weight: 40, passing_score: 75 },
      failure_analysis: 'No failure analysis recorded.',
      improvement_suggestion: 'No improvement suggestion recorded.',
      human_review_notes: null
    } as unknown as Partial<CollectionMap[K]>
  }

  if (collectionName === 'team_members') {
    return {
      member_user_id: null,
      status: 'active'
    } as unknown as Partial<CollectionMap[K]>
  }

  if (collectionName === 'team_invites') {
    return {
      status: 'pending',
      accepted_user_id: null,
      accepted_at: null
    } as unknown as Partial<CollectionMap[K]>
  }

  return {}
}
