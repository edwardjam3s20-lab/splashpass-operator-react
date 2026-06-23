import { apiFetch, ApiError } from './api'
import type { Booking } from '../types'

export async function fetchTodayBookings(): Promise<Booking[]> {
  const today = new Date().toISOString().split('T')[0]
  const data = await apiFetch<{ bookings: Booking[] }>(`/api/operator/bookings?date=${today}`)
  return data.bookings || []
}

/**
 * Booking lifecycle actions, confirmed against the real PATCH handler in
 * bookings/[id]/route.js. 'assign' is rejected server-side (409) if the
 * washer already has another active job — surfaced via ApiError so the
 * UI can show a specific message rather than a generic failure.
 */
export async function assignWasher(bookingId: string, washerId: string): Promise<Booking> {
  const data = await apiFetch<{ booking: Booking }>(`/api/operator/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'assign', assigned_washer_id: washerId }),
  })
  return data.booking
}

export async function startWash(bookingId: string): Promise<Booking> {
  const data = await apiFetch<{ booking: Booking }>(`/api/operator/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'start' }),
  })
  return data.booking
}

export async function completeBooking(bookingId: string): Promise<Booking> {
  const data = await apiFetch<{ booking: Booking }>(`/api/operator/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'complete' }),
  })
  return data.booking
}

export async function freeWasher(bookingId: string): Promise<Booking> {
  const data = await apiFetch<{ booking: Booking }>(`/api/operator/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'free' }),
  })
  return data.booking
}

export function isWasherBusyError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 409
}

export async function patchStatus(status: 'open' | 'paused') {
  return apiFetch('/api/operator/status', {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
