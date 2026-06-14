import { randomBytes } from 'crypto'

export function createToken(prefix: string): string {
  return `${prefix}_${randomBytes(18).toString('hex')}`
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}
