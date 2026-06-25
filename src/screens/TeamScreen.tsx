import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchWashers } from '../lib/washers'
import { fetchTodayBookings } from '../lib/bookings'
import { computeWorkload, initials, elapsedMin } from '../lib/operations'

type Filter = 'all' | 'available' | 'busy'

export function TeamScreen() {
  const navigate = useNavigate()

  const { data: washersData, isLoading } = useQuery({
    queryKey: ['washers'],
    queryFn: fetchWashers,
  })
  const washers = washersData?.washers ?? []

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: fetchTodayBookings,
    refetchInterval: 30_000,
  })

  const workload = computeWorkload(washers, bookings)
  const availableCount = workload.filter((w) => !w.busy).length
  const busyCount = workload.filter((w) => w.busy).length

  const [filter, setFilter] = useState<Filter>('all')
  const filtered =
    filter === 'available' ? workload.filter((w) => !w.busy) :
    filter === 'busy' ? workload.filter((w) => w.busy) :
    workload

  // Sort: busiest first within each filter, so the operator's eye lands
  // on who's working before who's idle.
  const sorted = [...filtered].sort((a, b) => Number(b.busy) - Number(a.busy) || b.jobsToday - a.jobsToday)

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold text-text">Team</h2>
          <button
            onClick={() => navigate('/app/team/roster')}
            className="rounded-lg border border-border bg-s2 px-3 py-1.5 text-[11px] font-bold text-text"
          >
            Manage roster
          </button>
        </div>
        <div className="flex gap-2">
          {([
            { key: 'all', label: `All (${workload.length})` },
            { key: 'available', label: `Available (${availableCount})` },
            { key: 'busy', label: `Busy (${busyCount})` },
          ] as { key: Filter; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                'rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors',
                filter === f.key ? 'bg-primary text-white' : 'bg-s2 text-muted',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          </div>
        ) : washersData?.useLocal ? (
          <div className="rounded-xl border border-warn/25 bg-warn/10 px-3.5 py-3 text-[12px] text-warn">
            Your account isn't linked to a wash point yet — ask admin to link it before adding staff.
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-border bg-s1 py-10 text-center">
            <div className="text-[13px] text-faint">No washers match this filter</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sorted.map((w) => (
              <div key={w.washer.id} className="flex items-center gap-3 rounded-xl border border-border bg-s1 p-3.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 font-display text-[13px] font-bold text-primary2">
                  {initials(w.washer.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-text">{w.washer.name}</div>
                  <div className="text-[11px] text-faint">
                    {w.busy && w.currentBooking
                      ? `Washing ${w.currentBooking.car_plate || w.currentBooking.user_name || ''}`.trim()
                      : w.washer.role || 'Washer'}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2.5">
                  <div className="text-right">
                    <div className="text-[12px] font-bold text-text">{w.jobsToday}</div>
                    <div className="text-[9px] uppercase tracking-wide text-faint">jobs today</div>
                  </div>
                  {w.busy && w.currentBooking?.wash_started_at && (
                    <div className="rounded-md bg-primary/10 px-1.5 py-1 font-mono text-[11px] font-bold text-primary2">
                      {elapsedMin(w.currentBooking.wash_started_at)}m
                    </div>
                  )}
                  <span
                    className={[
                      'rounded-full px-2 py-1 text-[10px] font-bold',
                      w.busy ? 'bg-primary/15 text-primary2' : 'bg-success/15 text-success',
                    ].join(' ')}
                  >
                    {w.busy ? 'Busy' : 'Available'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
