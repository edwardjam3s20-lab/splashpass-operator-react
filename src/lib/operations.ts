import type { Booking, Washer } from '../types'

/**
 * The four-stage kanban model the whole app is now built around. This is
 * a direct, 1:1 mapping of fields that already exist on `Booking` — no
 * backend change required:
 *   waiting   → status !== 'completed' && !assigned_washer_id
 *   assigned  → assigned_washer_id set, wash_started_at not set
 *   washing   → wash_started_at set, wash_completed_at not set
 *   completed → status === 'completed'
 * This mirrors the real action lifecycle in lib/bookings.ts exactly
 * (assign / start / complete), so moving a card between columns in the
 * UI is always just calling the matching existing mutation.
 */
/**
 * The four-stage kanban model the whole app is now built around. This is
 * a direct, 1:1 mapping of fields that already exist on `Booking` — no
 * backend change required:
 *   waiting   → status !== 'completed' && !assigned_washer_id
 *   assigned  → assigned_washer_id set, wash_started_at not set
 *   washing   → wash_started_at set, wash_completed_at not set
 *   completed → status === 'completed'
 * This mirrors the real action lifecycle in lib/bookings.ts exactly
 * (assign / start / complete), so moving a card between columns in the
 * UI is always just calling the matching existing mutation.
 *
 * Returns null for 'pending', 'rejected', and 'cancelled' — these aren't
 * operational stages at all. A pending request hasn't been agreed to yet
 * (it belongs in the Requests list, not "Waiting" — those look the same
 * today but mean very different things: one needs a yes/no, the other
 * is already a real job waiting for a washer). Rejected/cancelled never
 * become a wash job. Filter these out before building the kanban rather
 * than inventing a stage for them.
 */
export type Stage = 'waiting' | 'assigned' | 'washing' | 'completed'

export function stageOf(b: Booking): Stage | null {
  if (b.status === 'pending' || b.status === 'rejected' || b.status === 'cancelled') return null
  if (b.status === 'completed') return 'completed'
  if (b.wash_started_at) return 'washing'
  if (b.assigned_washer_id) return 'assigned'
  return 'waiting'
}

export const STAGE_LABEL: Record<Stage, string> = {
  waiting: 'Waiting',
  assigned: 'Assigned',
  washing: 'Washing',
  completed: 'Completed',
}

// Single source of truth for stage color → used for column headers, card
// accents, and the dashboard's "active wash jobs" list so the same status
// always reads the same color everywhere in the app.
export const STAGE_COLOR: Record<Stage, { text: string; bg: string; border: string; dot: string }> = {
  waiting:   { text: 'text-warn',    bg: 'bg-warn/10',    border: 'border-warn/25',    dot: 'bg-warn' },
  assigned:  { text: 'text-info',    bg: 'bg-info/10',    border: 'border-info/25',    dot: 'bg-info' },
  washing:   { text: 'text-primary2', bg: 'bg-primary/10', border: 'border-primary/30', dot: 'bg-primary2' },
  completed: { text: 'text-success', bg: 'bg-success/10', border: 'border-success/25', dot: 'bg-success' },
}

export function elapsedMin(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}

export function fmtKes(n: number): string {
  return 'KES ' + Number(n || 0).toLocaleString()
}

export function initials(name: string): string {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Local-only capacity setting — see UX-AUDIT.md §5. Not backed by any
 * server table; explicitly editable and labeled as an estimate, never
 * used to assign a job to a specific named bay. */
export interface CapacitySettings {
  stations: number
}

export function getCapacitySettings(wpKey: string): CapacitySettings {
  try {
    const v = localStorage.getItem(`splashpass_${wpKey}_capacity`)
    return v ? JSON.parse(v) : { stations: 4 }
  } catch {
    return { stations: 4 }
  }
}

export function setCapacitySettings(wpKey: string, settings: CapacitySettings) {
  try {
    localStorage.setItem(`splashpass_${wpKey}_capacity`, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}

/** Per-washer workload for today — drives the Team screen. Derived
 * entirely from bookings already fetched; no new endpoint needed. */
export interface WasherWorkload {
  washer: Washer
  jobsToday: number
  busy: boolean
  currentBooking: Booking | null
}

export function computeWorkload(washers: Washer[], bookings: Booking[]): WasherWorkload[] {
  return washers.map((w) => {
    const mine = bookings.filter((b) => String(b.assigned_washer_id) === String(w.id))
    const current = mine.find((b) => b.status !== 'completed') ?? null
    return {
      washer: w,
      jobsToday: mine.filter((b) => b.status === 'completed').length,
      busy: !!current,
      currentBooking: current,
    }
  })
}
