export type Agent = {
  id: string
  user_id: string | null
  name: string
  domain: string
  description: string
  constraints: string[]
  system_prompt: string
  tone: string
  output_format: string
  is_public: boolean
  public_slug: string | null
  deployment_api_key: string | null
  created_at: string
  updated_at: string | null
}

export type AgentRun = {
  id: string
  user_id: string | null
  agent_id: string
  task: string
  output: string
  model_provider: string
  model_name: string
  input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
  created_at: string
}

export type Evaluation = {
  id: string
  user_id: string | null
  agent_id: string
  run_id: string
  rubric_name: string
  rubric: ScoringRubric
  accuracy_score: number
  safety_score: number
  helpfulness_score: number
  domain_fit_score: number
  overall_score: number
  passed: boolean
  feedback: string
  failure_analysis: string
  improvement_suggestion: string
  human_review_notes: string | null
  created_at: string
}

export type ScoringRubric = {
  accuracy_weight: number
  safety_weight: number
  helpfulness_weight: number
  passing_score: number
}

export type AgentWithStats = Agent & {
  last_run_at: string | null
  average_score: number | null
}

export type AgentVersion = {
  id: string
  user_id: string
  agent_id: string
  version_number: number
  label: string
  system_prompt: string
  token_count: number
  quality_score: number
  average_score: number | null
  pass_rate: number | null
  estimated_cost_usd: number
  created_at: string
}

export type DashboardStats = {
  totalAgents: number
  totalRuns: number
  averageOverallScore: number
  passRate: number
  estimatedCostUsd: number
}

export type AgentConfig = {
  name: string
  domain: string
  description: string
  constraints: string[]
  system_prompt: string
  tone?: string
  output_format?: string
}

export type RunWithEvaluation = AgentRun & {
  evaluation: Evaluation | null
}

export type KnowledgeSource = {
  id: string
  user_id: string
  agent_id: string
  title: string
  content: string
  source_type: string
  created_at: string
}

export type Conversation = {
  id: string
  user_id: string
  agent_id: string
  title: string
  created_at: string
}

export type ConversationMessage = {
  id: string
  conversation_id: string
  role: 'user' | 'agent'
  content: string
  created_at: string
}

export type TeamMember = {
  id: string
  owner_user_id: string
  email: string
  role: TeamRole
  member_user_id: string | null
  status: 'active'
  created_at: string
}

export type TeamRole = 'viewer' | 'editor' | 'admin'

export type TeamInvite = {
  id: string
  owner_user_id: string
  email: string
  role: TeamRole
  token: string
  status: 'pending' | 'accepted'
  accepted_user_id: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export type ToolIntegration = {
  id: string
  user_id: string
  agent_id: string
  name: string
  endpoint_url: string
  description: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: Agent
        Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'is_public' | 'public_slug' | 'deployment_api_key'> & {
          id?: string
          created_at?: string
          updated_at?: string | null
          is_public?: boolean
          public_slug?: string | null
          deployment_api_key?: string | null
        }
        Update: Partial<Omit<Agent, 'id' | 'created_at' | 'user_id'>>
        Relationships: []
      }
      agent_runs: {
        Row: AgentRun
        Insert: Omit<AgentRun, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<AgentRun, 'id' | 'created_at'>>
        Relationships: []
      }
      agent_versions: {
        Row: AgentVersion
        Insert: Omit<AgentVersion, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<AgentVersion, 'id' | 'created_at' | 'user_id' | 'agent_id'>>
        Relationships: []
      }
      evaluations: {
        Row: Evaluation
        Insert: Omit<Evaluation, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Evaluation, 'id' | 'created_at'>>
        Relationships: []
      }
      knowledge_sources: {
        Row: KnowledgeSource
        Insert: Omit<KnowledgeSource, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<KnowledgeSource, 'id' | 'created_at' | 'user_id'>>
        Relationships: []
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Conversation, 'id' | 'created_at' | 'user_id'>>
        Relationships: []
      }
      conversation_messages: {
        Row: ConversationMessage
        Insert: Omit<ConversationMessage, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<ConversationMessage, 'id' | 'created_at'>>
        Relationships: []
      }
      team_members: {
        Row: TeamMember
        Insert: Omit<TeamMember, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<TeamMember, 'id' | 'created_at' | 'owner_user_id'>>
        Relationships: []
      }
      team_invites: {
        Row: TeamInvite
        Insert: Omit<TeamInvite, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<TeamInvite, 'id' | 'created_at' | 'owner_user_id'>>
        Relationships: []
      }
      tool_integrations: {
        Row: ToolIntegration
        Insert: Omit<ToolIntegration, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<ToolIntegration, 'id' | 'created_at' | 'user_id'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type ApiError = {
  error: string
}
