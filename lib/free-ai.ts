import type { Agent, AgentConfig, ScoringRubric } from '@/lib/types'

export type LocalEvaluation = {
  rubric_name: string
  rubric: ScoringRubric
  accuracy_score: number
  safety_score: number
  helpfulness_score: number
  overall_score: number
  passed: boolean
  feedback: string
  failure_analysis: string
  improvement_suggestion: string
}

export function isLocalAiProvider(): boolean {
  return (process.env.AI_PROVIDER || 'local').toLowerCase() === 'local'
}

export function generateLocalAgentConfig(prompt: string): AgentConfig {
  const domain = detectDomain(prompt)
  const name = `${toTitleCase(domain)} Agent`
  const constraints = [
    'Ask clarifying questions only when essential',
    'Separate facts, assumptions, risks, and next actions',
    'Do not invent data that was not provided',
    'Avoid exposing sensitive or private information',
    'Provide concise and actionable responses'
  ]

  return {
    name,
    domain,
    description: `A domain-specific assistant for ${domain.toLowerCase()} tasks, designed to turn ambiguous requests into structured, practical outputs.`,
    constraints,
    tone: 'Professional, clear, and practical',
    output_format: 'Structured response with headings and bullet points',
    system_prompt: [
      `You are ${name}, a specialized AI agent for ${domain.toLowerCase()}.`,
      `Mission: ${prompt.trim()}`,
      'Tone: Professional, clear, and practical.',
      'Output format: Structured response with headings and bullet points.',
      'When responding, use clear headings, practical steps, and explicit assumptions.',
      `Constraints: ${constraints.join('; ')}.`
    ].join('\n')
  }
}

export function runLocalAgent(agent: Agent, task: string): string {
  const actions = buildActions(task)

  return [
    `${agent.name} response`,
    '',
    'Summary',
    `I will handle this as a ${agent.domain.toLowerCase()} task and keep the answer grounded in the information provided.`,
    '',
    'Facts',
    `- Task: ${task.trim()}`,
    `- Domain: ${agent.domain}`,
    '',
    'Assumptions',
    '- Some details may be incomplete, so recommendations should be verified before final action.',
    '- Sensitive information should be redacted before sharing externally.',
    '',
    'Recommended Plan',
    ...actions.map((action, index) => `${index + 1}. ${action}`),
    '',
    'Risks',
    '- Acting without missing context could create incorrect or incomplete outcomes.',
    '- Any compliance, legal, medical, or financial decision should receive human review.',
    '',
    'Next Actions',
    '- Confirm the missing context.',
    '- Apply the plan in priority order.',
    '- Review the result against the agent constraints.'
  ].join('\n')
}

export const defaultRubric: ScoringRubric = {
  accuracy_weight: 35,
  safety_weight: 25,
  helpfulness_weight: 40,
  passing_score: 75
}

export function evaluateLocalRun(
  task: string,
  output: string,
  rubric: ScoringRubric = defaultRubric,
  rubricName = 'Balanced'
): LocalEvaluation {
  const outputLength = output.trim().length
  const hasStructure = ['Summary', 'Facts', 'Recommended Plan', 'Risks', 'Next Actions'].filter((term) =>
    output.includes(term)
  ).length
  const mentionsTask = output.toLowerCase().includes(firstKeyword(task).toLowerCase())
  const safetyPenalty = /password|secret|api key|private key/i.test(output) ? 20 : 0

  const accuracy = clamp(mentionsTask ? 82 : 68)
  const helpfulness = clamp(60 + hasStructure * 7 + Math.min(Math.floor(outputLength / 300), 10))
  const safety = clamp(92 - safetyPenalty)
  const totalWeight = rubric.accuracy_weight + rubric.safety_weight + rubric.helpfulness_weight
  const overall = Math.round(
    (accuracy * rubric.accuracy_weight + safety * rubric.safety_weight + helpfulness * rubric.helpfulness_weight) /
      totalWeight
  )
  const passed = overall >= rubric.passing_score && safety >= Math.min(75, rubric.passing_score)

  return {
    rubric_name: rubricName,
    rubric,
    accuracy_score: accuracy,
    safety_score: safety,
    helpfulness_score: helpfulness,
    overall_score: overall,
    passed,
    feedback:
      passed
        ? 'Local evaluator: the response is structured, relevant, and safe enough for a demo workflow.'
        : 'Local evaluator: the response needs more task-specific detail or stronger structure before passing.',
    failure_analysis: buildFailureAnalysis(accuracy, safety, helpfulness, rubric),
    improvement_suggestion: buildImprovementSuggestion(task)
  }
}

export function improveLocalPrompt(agent: Agent, failureAnalysis: string): string {
  return [
    agent.system_prompt,
    '',
    'Performance improvement addendum:',
    '- Before answering, identify the user goal, missing context, and measurable success criteria.',
    '- Include evidence-backed reasoning and avoid unsupported certainty.',
    '- Add a short validation checklist at the end of every response.',
    `- Recent failure analysis to address: ${failureAnalysis}`
  ].join('\n')
}

function detectDomain(prompt: string): string {
  const lower = prompt.toLowerCase()
  const matches: Array<[string, string[]]> = [
    ['Incident Response', ['incident', 'outage', 'rollback', 'production', 'severity']],
    ['Human Resources', ['hr', 'employee', 'onboarding', 'benefits', 'leave']],
    ['Customer Support', ['support', 'customer', 'ticket', 'refund', 'billing']],
    ['Legal Review', ['legal', 'contract', 'clause', 'compliance', 'obligation']],
    ['Healthcare', ['health', 'medical', 'patient', 'clinical']],
    ['Finance', ['finance', 'payment', 'invoice', 'risk', 'fintech']]
  ]
  const match = matches.find(([, words]) => words.some((word) => lower.includes(word)))
  return match?.[0] ?? 'Operations'
}

function buildActions(task: string): string[] {
  const lower = task.toLowerCase()

  if (lower.includes('incident') || lower.includes('outage') || lower.includes('502')) {
    return [
      'Declare severity based on customer impact, scope, and duration.',
      'Stabilize the system by pausing risky changes and checking recent deployments.',
      'Compare logs, metrics, queue depth, and dependency health to isolate likely causes.',
      'Prepare a customer-safe update that states impact, mitigation, and next update time.',
      'Preserve timelines, deployment hashes, logs, decisions, and approvals for audit.'
    ]
  }

  if (lower.includes('customer') || lower.includes('refund') || lower.includes('billing')) {
    return [
      'Acknowledge the customer concern clearly.',
      'Collect account, invoice, and transaction details through secure channels.',
      'Check recent billing events and duplicate charge indicators.',
      'Offer a clear resolution path and expected timeline.',
      'Close with a concise confirmation of next steps.'
    ]
  }

  return [
    'Restate the request and intended outcome.',
    'Identify the key constraints and missing details.',
    'Give a prioritized action plan.',
    'Call out risks and validation checks.',
    'Provide a short final recommendation.'
  ]
}

function firstKeyword(text: string): string {
  return text
    .split(/\W+/)
    .find((word) => word.length > 4) ?? text.slice(0, 10)
}

function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function buildFailureAnalysis(accuracy: number, safety: number, helpfulness: number, rubric: ScoringRubric): string {
  const issues = []

  if (accuracy < rubric.passing_score) {
    issues.push('accuracy needs stronger task-specific evidence')
  }

  if (safety < rubric.passing_score) {
    issues.push('safety controls need clearer redaction and caution')
  }

  if (helpfulness < rubric.passing_score) {
    issues.push('helpfulness needs more actionable structure')
  }

  return issues.length > 0
    ? `Primary gaps: ${issues.join(', ')}.`
    : 'No major failure pattern detected; keep monitoring for consistency across harder tasks.'
}

function buildImprovementSuggestion(task: string): string {
  return `Revise the prompt to require explicit assumptions, evidence, prioritized actions, and a final validation checklist for tasks like: "${task.slice(0, 140)}".`
}
