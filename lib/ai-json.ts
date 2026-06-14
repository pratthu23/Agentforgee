export async function requestAiJson<T>(
  system: string,
  user: string,
  isValid: (value: unknown) => value is T
): Promise<T> {
  const first = await requestOnce(system, user)
  const firstParsed = parseJson(first)

  if (isValid(firstParsed)) {
    return firstParsed
  }

  const retry = await requestOnce(
    system,
    `${user}\n\nReturn only valid JSON matching the requested schema. Do not include markdown.`
  )
  const retryParsed = parseJson(retry)

  if (isValid(retryParsed)) {
    return retryParsed
  }

  throw new Error('The AI provider returned malformed JSON. Please try again.')
}

async function requestOnce(system: string, user: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Add OPENAI_API_KEY or set AI_PROVIDER=local.')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`)
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = payload.choices?.[0]?.message?.content?.trim()

  if (!text) {
    throw new Error('OpenAI returned an empty response.')
  }

  return text
}

function parseJson(text: string): unknown {
  const trimmed = text.trim()
  const match = trimmed.match(/\{[\s\S]*\}/)

  if (!match) {
    return null
  }

  try {
    return JSON.parse(match[0]) as unknown
  } catch {
    return null
  }
}
