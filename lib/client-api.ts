'use client'

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<{ response: Response; data: T }> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal
    })
    const text = await response.text()

    if (!text) {
      return { response, data: {} as T }
    }

    try {
      return { response, data: JSON.parse(text) as T }
    } catch {
      return {
        response,
        data: { error: `Request failed with HTTP ${response.status}: ${text.slice(0, 180)}` } as T
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out. Please refresh and try again.')
    }

    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}
