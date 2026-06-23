import { apiFetch } from './api'
import type { Operator } from '../types'

export async function login(email: string, password: string): Promise<Operator> {
  const data = await apiFetch<{ operator: Operator }>('/api/operator/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return data.operator
}

export async function logout(): Promise<void> {
  await apiFetch('/api/operator/auth/logout', { method: 'POST' })
}

/**
 * Checks whether a session cookie is present and valid. Used on app load
 * and by the route guard — since the session is an httpOnly cookie, the
 * frontend has no way to know it's logged in except by asking the server.
 */
export async function getCurrentOperator(): Promise<Operator | null> {
  try {
    const data = await apiFetch<{ operator: Operator }>('/api/operator/auth/me')
    return data.operator
  } catch {
    return null
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch('/api/operator/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}
