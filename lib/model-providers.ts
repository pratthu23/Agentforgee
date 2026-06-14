export type ModelProviderId = 'local' | 'openai'

export type ModelProviderOption = {
  id: ModelProviderId
  name: string
  model: string
  costPer1kInput: number
  costPer1kOutput: number
  enabledByDefault: boolean
}

export const modelProviders: ModelProviderOption[] = [
  { id: 'local', name: 'Local Free', model: 'local-demo-engine', costPer1kInput: 0, costPer1kOutput: 0, enabledByDefault: true },
  { id: 'openai', name: 'OpenAI', model: process.env.OPENAI_MODEL || 'gpt-4o-mini', costPer1kInput: 0.00015, costPer1kOutput: 0.0006, enabledByDefault: false }
]

export type ModelRunResult = {
  output: string
  provider: ModelProviderOption
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
}

export async function generateWithProvider({
  providerId,
  system,
  prompt,
  localOutput
}: {
  providerId?: string
  system: string
  prompt: string
  localOutput: () => string
}): Promise<ModelRunResult> {
  const provider = getModelProvider(providerId)
  const inputTokens = estimateTokens(`${system}\n${prompt}`)

  if (provider.id === 'local') {
    const output = localOutput()
    return withCost(output, provider, inputTokens)
  }

  const output = await generateOpenAi(provider, system, prompt)
  return withCost(output, provider, inputTokens)
}

export function getModelProvider(providerId?: string): ModelProviderOption {
  const configured = (process.env.AI_PROVIDER || 'local').toLowerCase()
  const id = (providerId || configured) as ModelProviderId
  return modelProviders.find((provider) => provider.id === id) ?? modelProviders[0]
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

function withCost(output: string, provider: ModelProviderOption, inputTokens: number): ModelRunResult {
  const outputTokens = estimateTokens(output)
  const estimatedCostUsd = Number(
    ((inputTokens / 1000) * provider.costPer1kInput + (outputTokens / 1000) * provider.costPer1kOutput).toFixed(6)
  )

  return { output, provider, inputTokens, outputTokens, estimatedCostUsd }
}

async function generateOpenAi(provider: ModelProviderOption, system: string, prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Add OPENAI_API_KEY, or use Local Free.')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5
    })
  })

  if (!response.ok) {
    throw new Error(`${provider.name} request failed with status ${response.status}.`)
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = payload.choices?.[0]?.message?.content?.trim()

  if (!text) {
    throw new Error(`${provider.name} returned an empty response.`)
  }

  return text
}

