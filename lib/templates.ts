export type AgentTemplate = {
  id: string
  name: string
  domain: string
  prompt: string
  tone: string
  outputFormat: string
}

export const agentTemplates: AgentTemplate[] = [
  {
    id: 'hr',
    name: 'HR Onboarding',
    domain: 'Human Resources',
    prompt: 'Build an HR onboarding agent that helps new employees understand company policies, benefits, leave rules, and first-week tasks.',
    tone: 'Warm, clear, and policy-aware',
    outputFormat: 'Checklist with short explanations'
  },
  {
    id: 'legal',
    name: 'Legal Review',
    domain: 'Legal Review',
    prompt: 'Build a legal document review agent that summarizes contracts, flags risky clauses, and explains obligations in simple language.',
    tone: 'Careful, neutral, and non-authoritative',
    outputFormat: 'Summary, risks, obligations, and questions'
  },
  {
    id: 'finance',
    name: 'Finance Ops',
    domain: 'Finance',
    prompt: 'Build a finance operations agent that reviews payments, invoices, risk indicators, and reconciliation issues.',
    tone: 'Precise, conservative, and audit-ready',
    outputFormat: 'Findings, evidence, risk level, next steps'
  },
  {
    id: 'support',
    name: 'Customer Support',
    domain: 'Customer Support',
    prompt: 'Create a customer support agent for a SaaS product that answers billing, login, refund, and troubleshooting questions.',
    tone: 'Friendly, concise, and solution-focused',
    outputFormat: 'Customer reply plus internal notes'
  },
  {
    id: 'coding',
    name: 'Coding Assistant',
    domain: 'Software Engineering',
    prompt: 'Build a coding assistant that diagnoses bugs, suggests implementation plans, reviews code, and explains tradeoffs.',
    tone: 'Direct, technical, and pragmatic',
    outputFormat: 'Diagnosis, fix plan, code notes, tests'
  },
  {
    id: 'sales',
    name: 'Sales Enablement',
    domain: 'Sales',
    prompt: 'Build a sales enablement agent that researches prospects, drafts outreach, handles objections, and prepares call notes.',
    tone: 'Confident, helpful, and respectful',
    outputFormat: 'Prospect insight, message draft, objections, follow-up'
  },
  {
    id: 'incident',
    name: 'Incident Response',
    domain: 'Incident Response',
    prompt: 'Build a senior incident-response agent that triages outages, classifies severity, recommends mitigation, drafts updates, and preserves auditability.',
    tone: 'Calm, precise, and operational',
    outputFormat: 'Severity, facts, assumptions, mitigation, communications'
  }
]
