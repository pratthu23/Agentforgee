import { estimateTokens, modelProviders } from '@/lib/model-providers'

export type PromptLensAnalysis = {
  clarityScore: number
  redundancyScore: number
  tokenEfficiencyScore: number
  safetyScore: number
  overallScore: number
  tokenCount: number
  issues: string[]
  suggestions: string[]
}

export type PromptOptimization = {
  optimizedPrompt: string
  before: PromptLensAnalysis
  after: PromptLensAnalysis
  tokenReductionPercent: number
  estimatedMonthlySavingsInr: number
}

export function analyzePrompt(prompt: string): PromptLensAnalysis {
  const normalized = prompt.trim()
  const tokenCount = estimateTokens(normalized)
  const sentences = normalized.split(/[.!?\n]+/).map((item) => item.trim()).filter(Boolean)
  const words = normalized.toLowerCase().match(/[a-z0-9]+/g) ?? []
  const uniqueWords = new Set(words)
  const hasRole = /you are|act as|role:/i.test(normalized)
  const hasConstraints = /constraint|must|must not|do not|avoid|never|only/i.test(normalized)
  const hasOutput = /format|return|respond|output|json|table|bullet/i.test(normalized)
  const hasValidation = /assumption|evidence|verify|check|cite|source/i.test(normalized)
  const repeatedRatio = words.length > 0 ? 1 - uniqueWords.size / words.length : 0

  const clarityScore = clampScore(45 + scoreFlag(hasRole, 18) + scoreFlag(hasOutput, 16) + scoreFlag(hasValidation, 10) + Math.min(sentences.length, 8) * 2)
  const redundancyScore = clampScore(100 - Math.round(repeatedRatio * 180) - Math.max(0, tokenCount - 900) / 18)
  const tokenEfficiencyScore = clampScore(100 - Math.max(0, tokenCount - 450) / 9 + scoreFlag(tokenCount >= 120, 8))
  const safetyScore = clampScore(50 + scoreFlag(hasConstraints, 22) + scoreFlag(/privacy|secret|sensitive|safety/i.test(normalized), 12) + scoreFlag(/medical|legal|financial/i.test(normalized) ? /not legal advice|not medical advice|professional/i.test(normalized) : true, 10))
  const overallScore = Math.round((clarityScore * 0.32) + (redundancyScore * 0.2) + (tokenEfficiencyScore * 0.22) + (safetyScore * 0.26))

  return {
    clarityScore,
    redundancyScore,
    tokenEfficiencyScore,
    safetyScore,
    overallScore,
    tokenCount,
    issues: buildIssues({ hasRole, hasConstraints, hasOutput, hasValidation, repeatedRatio, tokenCount }),
    suggestions: buildSuggestions({ hasRole, hasConstraints, hasOutput, hasValidation, tokenCount })
  }
}

export function optimizePrompt(prompt: string, agentName: string, domain: string, constraints: string[], outputFormat: string): PromptOptimization {
  const before = analyzePrompt(prompt)
  const uniqueConstraints = Array.from(new Set(constraints.map((item) => item.trim()).filter(Boolean)))
  const focusNotes = summarizePromptFocus(prompt)
  const operatingRules = [
    ...uniqueConstraints,
    'Use only the information provided by the user or clearly mark assumptions',
    'Ask one clarifying question when missing context blocks a reliable answer',
    'Separate facts, reasoning, recommendations, and next actions',
    'Do not invent data, credentials, policies, citations, or outcomes',
    'Flag legal, medical, financial, safety, privacy, or security risk when relevant'
  ]
  const uniqueRules = Array.from(new Set(operatingRules.map((item) => item.replace(/\s+/g, ' ').replace(/\.$/, '').trim()).filter(Boolean)))
  const optimizedPrompt = [
    `Role: ${agentName}, a ${domain} specialist agent.`,
    "Primary objective: deliver accurate, safe, actionable help for the user's task.",
    focusNotes.length ? `Preserve this intent from the original prompt: ${focusNotes.join(' ')}` : null,
    'Operating rules:',
    ...uniqueRules.slice(0, 8).map((rule) => `- ${rule}.`),
    `Output format: ${outputFormat || 'concise sections with bullets, risks, next actions, and a validation checklist'}.`,
    'Before finalizing: verify assumptions, note uncertainty, and remove unsupported claims.'
  ].filter((line): line is string => Boolean(line)).join('\n')
  const changedPrompt = optimizedPrompt.trim() === prompt.trim()
    ? `${optimizedPrompt}\nOptimization note: compressed duplicate wording and clarified role, rules, output, and validation.`
    : optimizedPrompt
  const after = analyzePrompt(changedPrompt)
  const tokenReductionPercent = Math.max(0, Math.round(((before.tokenCount - after.tokenCount) / Math.max(before.tokenCount, 1)) * 100))
  const paidReference = modelProviders.find((provider) => provider.id === 'openai') ?? modelProviders[0]
  const savingsUsdPerRun = Math.max(0, ((before.tokenCount - after.tokenCount) / 1000) * paidReference.costPer1kInput)
  const estimatedMonthlySavingsInr = Number((savingsUsdPerRun * 1000 * 83).toFixed(2))

  return { optimizedPrompt: changedPrompt, before, after, tokenReductionPercent, estimatedMonthlySavingsInr }
}

function summarizePromptFocus(prompt: string): string[] {
  const lines = prompt
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 24 && line.length <= 180)

  const uniqueLines = Array.from(new Set(lines))
  return uniqueLines
    .filter((line) => !/^(you are|role:|operating rules:|response format:|output format:)/i.test(line))
    .slice(0, 2)
}

function buildIssues(input: { hasRole: boolean; hasConstraints: boolean; hasOutput: boolean; hasValidation: boolean; repeatedRatio: number; tokenCount: number }): string[] {
  return [
    !input.hasRole ? 'Missing explicit agent role.' : null,
    !input.hasConstraints ? 'Safety and operating constraints are not explicit.' : null,
    !input.hasOutput ? 'Output format is not clearly specified.' : null,
    !input.hasValidation ? 'No validation, evidence, or assumption-handling instruction.' : null,
    input.repeatedRatio > 0.35 ? 'Prompt has high repeated wording.' : null,
    input.tokenCount > 900 ? 'Prompt is long enough to raise cost and drift risk.' : null
  ].filter((item): item is string => Boolean(item))
}

function buildSuggestions(input: { hasRole: boolean; hasConstraints: boolean; hasOutput: boolean; hasValidation: boolean; tokenCount: number }): string[] {
  return [
    !input.hasRole ? 'Start with a direct “You are...” role sentence.' : null,
    !input.hasConstraints ? 'Add compact must/avoid rules for safety and scope.' : null,
    !input.hasOutput ? 'Declare the exact answer shape expected from the agent.' : null,
    !input.hasValidation ? 'Require assumptions, evidence checks, and final validation.' : null,
    input.tokenCount > 450 ? 'Compress repeated instructions into one operating-rules block.' : null
  ].filter((item): item is string => Boolean(item))
}

function scoreFlag(value: boolean, points: number): number {
  return value ? points : 0
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}
