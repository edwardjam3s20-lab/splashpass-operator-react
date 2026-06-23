import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { Booking } from '../types'

type RangeKey = 'today' | '7d' | '30d'

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
]

function fmtKes(n: number) {
  return 'KES ' + Number(n).toLocaleString()
}

/**
 * Fetches bookings across a date range by calling the same
 * /api/operator/bookings?date= endpoint once per day and merging results.
 * This is the most defensible approach without a confirmed range-query
 * parameter on that route — it's only ever been confirmed with a single
 * `date` param (see lib/bookings.ts), not a from/to range. Revisit this
 * if/when a dedicated range endpoint exists; today this means up to 30
 * sequential requests for the 30-day view, acceptable for this data size
 * but worth knowing if booking volume grows significantly.
 */
async function fetchBookingsForRange(days: number): Promise<Booking[]> {
  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }

  const results = await Promise.all(
    dates.map((date) =>
      apiFetch<{ bookings: Booking[] }>(`/api/operator/bookings?date=${date}`).catch(() => ({
        bookings: [] as Booking[],
      }))
    )
  )

  return results.flatMap((r) => r.bookings || [])
}

export function EarningsScreen() {
  const [range, setRange] = useState<RangeKey>('today')
  const days = RANGES.find((r) => r.key === range)!.days

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['earnings-bookings', range],
    queryFn: () => fetchBookingsForRange(days),
  })

  const stats = useMemo(() => {
    const completed = bookings.filter((b) => b.status === 'completed')
    const revenue = completed.reduce((t, b) => t + (b.operator_amount || 0), 0)
    const commission = completed.reduce((t, b) => t + (b.splash_commission || 0), 0)
    const points = completed.reduce((t, b) => t + (b.points_earned || 0), 0)
    return { count: completed.length, revenue, commission, points }
  }, [bookings])

  // Group completed bookings by service name for a simple breakdown —
  // useful for an operator to see what's actually driving revenue.
  const byService = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>()
    bookings
      .filter((b) => b.status === 'completed')
      .forEach((b) => {
        const key = b.service_name || 'Unknown'
        const cur = map.get(key) || { count: 0, revenue: 0 }
        cur.count += 1
        cur.revenue += b.operator_amount || 0
        map.set(key, cur)
      })
    return Array.from(map.entries()).sort((a, b) => b[1].revenue - a[1].revenue)
  }, [bookings])

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <h2 className="mb-3 font-display text-xl font-extrabold text-text">Earnings</h2>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={[
                'flex-1 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors',
                range === r.key ? 'border-gold/40 bg-gold/15 text-gold' : 'border-white/10 bg-white/[0.03] text-muted',
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gold/20 border-t-gold" />
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-4 rounded-[20px] border border-gold/20 bg-gold/[0.04] p-5 text-center">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                Your Earnings · {RANGES.find((r) => r.key === range)!.label}
              </div>
              <div className="font-display text-4xl font-extrabold text-gold">{fmtKes(stats.revenue)}</div>
              <div className="mt-1 text-[12px] text-muted">{stats.count} completed wash{stats.count === 1 ? '' : 'es'}</div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3.5 text-center">
                <div className="font-display text-lg font-extrabold text-text">{fmtKes(stats.commission)}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">SplashPass Fee</div>
              </div>
              <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3.5 text-center">
                <div className="font-display text-lg font-extrabold text-text">{stats.points}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Points Earned</div>
              </div>
            </div>

            {/* Breakdown by service */}
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">By Service</div>
            {byService.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] py-8 text-center text-[13px] text-muted">
                No completed washes in this range
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {byService.map(([name, s]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-[14px] border border-white/[0.05] bg-white/[0.02] px-4 py-3"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-text">{name}</div>
                      <div className="text-[11px] text-muted">{s.count} wash{s.count === 1 ? '' : 'es'}</div>
                    </div>
                    <div className="font-display text-[14px] font-bold text-gold">{fmtKes(s.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
