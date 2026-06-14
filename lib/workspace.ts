import type { Agent, TeamRole } from '@/lib/types'
import type { AuthenticatedUser } from '@/lib/auth'
import type { FirebaseStore } from '@/lib/firebase'

export type WorkspaceAgent = Agent & { user_id: string }
export type WorkspaceRole = 'owner' | TeamRole
export type WorkspaceAccess = {
  ownerUserId: string
  role: WorkspaceRole
}

const roleRank: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4
}

export function canWriteWorkspace(role: WorkspaceRole): boolean {
  return roleRank[role] >= roleRank.editor
}

export function mergeQueryResults<T>(results: Array<{ data: T[]; error: { message: string } | null }>): { data: T[]; error: { message: string } | null } {
  const error = results.find((result) => result.error)?.error ?? null
  return { data: results.flatMap((result) => result.data), error }
}

export function accessErrorStatus(error: string | null): number {
  return error?.includes('permission') ? 403 : 404
}

export async function getWorkspaceAccessList(store: FirebaseStore, user: AuthenticatedUser): Promise<WorkspaceAccess[]> {
  const email = normalizeEmail(user.email)
  const access = new Map<string, WorkspaceRole>([[user.id, 'owner']])

  if (email) {
    const { data } = await store.from('team_members').select('*').eq('email', email).eq('status', 'active')
    for (const member of data) {
      access.set(member.owner_user_id, strongestRole(access.get(member.owner_user_id), member.role))
    }
  }

  const { data } = await store.from('team_members').select('*').eq('member_user_id', user.id).eq('status', 'active')
  for (const member of data) {
    access.set(member.owner_user_id, strongestRole(access.get(member.owner_user_id), member.role))
  }

  return Array.from(access.entries()).map(([ownerUserId, role]) => ({ ownerUserId, role }))
}

export async function getWritableOwnerIds(store: FirebaseStore, user: AuthenticatedUser): Promise<string[]> {
  const access = await getWorkspaceAccessList(store, user)
  return access.filter((item) => canWriteWorkspace(item.role)).map((item) => item.ownerUserId)
}

export async function loadAccessibleAgent(
  store: FirebaseStore,
  user: AuthenticatedUser,
  agentId: string,
  minimumRole: WorkspaceRole = 'viewer'
): Promise<{ agent: WorkspaceAgent | null; access: WorkspaceAccess | null; error: string | null }> {
  const { data: agent, error } = await store.from('agents').select('*').eq('id', agentId).single()

  if (error || !agent || !agent.user_id) {
    return { agent: null, access: null, error: error?.message ?? 'Agent not found.' }
  }

  const access = (await getWorkspaceAccessList(store, user)).find((item) => item.ownerUserId === agent.user_id) ?? null

  if (!access || roleRank[access.role] < roleRank[minimumRole]) {
    return { agent: null, access: null, error: 'You do not have permission to access this agent.' }
  }

  return { agent: agent as WorkspaceAgent, access, error: null }
}

export function isValidTeamRole(value: unknown): value is TeamRole {
  return value === 'viewer' || value === 'editor' || value === 'admin'
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase()
  return email ? email : null
}

function strongestRole(current: WorkspaceRole | undefined, next: WorkspaceRole): WorkspaceRole {
  if (!current) {
    return next
  }

  return roleRank[next] > roleRank[current] ? next : current
}
