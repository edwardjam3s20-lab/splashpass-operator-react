import { apiFetch } from './api'
import type { Washer } from '../types'

interface WashersResponse {
  washers: Washer[]
  useLocal: boolean
}

/**
 * Fetches the wash point's staff roster. useLocal:true means the backend
 * couldn't serve real data (no wash_point_id on the operator account, or
 * the wash_point_staff table doesn't exist yet) — confirmed behavior from
 * api/operator/washers/route.js, not a guess.
 */
export async function fetchWashers(): Promise<WashersResponse> {
  return apiFetch<WashersResponse>('/api/operator/washers')
}

export async function addWasher(name: string, role?: string): Promise<Washer> {
  const data = await apiFetch<{ washer: Washer }>('/api/operator/washers', {
    method: 'POST',
    body: JSON.stringify({ name, role }),
  })
  return data.washer
}

export async function updateWasher(id: string, updates: { name?: string; role?: string }): Promise<Washer> {
  const data = await apiFetch<{ washer: Washer }>(`/api/operator/washers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
  return data.washer
}

export async function deleteWasher(id: string): Promise<void> {
  await apiFetch(`/api/operator/washers/${id}`, { method: 'DELETE' })
}
