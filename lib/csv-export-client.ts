'use client'

import { getAuthHeaders } from '@/lib/auth-client'
import type { ApiError } from '@/lib/types'

export async function downloadRunsCsvReport(): Promise<{ error: string | null }> {
  const response = await fetch('/api/export-runs', {
    headers: await getAuthHeaders()
  })

  if (!response.ok) {
    return { error: await readExportError(response) }
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = `agentforge-runs-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)

  return { error: null }
}

async function readExportError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Partial<ApiError>
    return typeof payload.error === 'string' ? payload.error : 'Unable to download CSV report.'
  } catch {
    return 'Unable to download CSV report.'
  }
}
