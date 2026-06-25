import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { fetchWashers } from '../lib/washers'
import { fetchTodayBookings, patchStatus } from '../lib/bookings'
import {
  stageOf,
  fmtKes,
  initials,
  elapsedMin,
  getCapacitySettings,
  setCapacitySettings,
  STAGE_COLOR,
} from '../lib/operations'

// ── StatusToggle ──────────────────────────────────
function StatusToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-full border border-border bg-s2 px-3 py-1.5"
    >
      <span
        className={[
          'h-2 w-2 flex-shrink-0 rounded-full',
          isOpen ? 'bg-success shadow-[0_0_0_3px_rgba(0,200,83,0.18)]' : 'bg-danger shadow-[0_0_0_3px_rgba(255,82,82,0.18)]',
        ].join(' ')}
      />
      <span className="text-[12px] font-semibold text-text">{isOpen ? 'Open' : 'Paused'}</span>
    </button>
  )
}

// ── MetricCard ────────────────────────────────────
function MetricCard({ value, label, accent, sub }: { value: string; label: string; accent?: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-s1 p-3.5">
      <div className={`font-display text-2xl font-extrabold leading-none ${accent ?? 'text-text'}`}>{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      {sub && <div className="text-[11px] text-faint">{sub}</div>}
    </div>
  )
}

// ── StationChip ───────────────────────────────────
function StationChip({ index, status }: { index: number; status: 'available' | 'busy' }) {
  const busy = status === 'busy'
  return (
    <div
      className={[
        'flex flex-col items-center gap-1.5 rounded-xl border py-3',
        busy ? 'border-primary/30 bg-primary/[0.08]' : 'border-success/25 bg-success/[0.06]',
      ].join(' ')}
    >
      <span className={busy ? 'text-primary2' : 'text-success'}>
        {busy ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><circle cx="12" cy="12" r="9" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      <div className="text-[11px] font-semibold text-text">Bay {index}</div>
      <div className={['text-[10px] font-medium', busy ? 'text-primary2' : 'text-success'].join(' ')}>
        {busy ? 'Washing' : 'Available'}
      </div>
    </div>
  )
}

export function DashboardScreen() {
  const operator = useAppStore((s) => s.operator)
  const setOperator = useAppStore((s) => s.setOperator)
  const showToast = useAppStore((s) => s.showToast)
  const navigate = useNavigate()
  const wpKey = operator?.wash_point || 'op'

  const [isOpen, setIsOpen] = useState(operator?.status !== 'paused')
  const [capacity] = useState(() => getCapacitySettings(wpKey))

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: fetchTodayBookings,
    refetchInterval: 30_000,
  })

  const { data: washersData } = useQuery({
    queryKey: ['washers'],
    queryFn: fetchWashers,
    staleTime: 60_000,
  })
  const washers = washersData?.washers ?? []

  const statusMutation = useMutation({
    mutationFn: patchStatus,
    onSuccess: (_, status) => {
      if (operator) setOperator({ ...operator, status })
      showToast(status === 'open' ? 'Wash point is now open' : 'Wash point paused')
    },
    onError: (e: Error) => showToast('Could not sync status: ' + e.message, true),
  })

  function handleToggle() {
    const next = isOpen ? 'paused' : 'open'
    setIsOpen(!isOpen)
    statusMutation.mutate(next)
  }

  const stages = bookings.map((b) => ({ b, stage: stageOf(b) }))
  const completed = stages.filter((s) => s.stage === 'completed')
  const washing = stages.filter((s) => s.stage === 'washing')
  const waiting = stages.filter((s) => s.stage === 'waiting')
  const assigned = stages.filter((s) => s.stage === 'assigned')
  const inQueue = waiting.length + assigned.length

  const revenueToday = completed.reduce((t, s) => t + (s.b.operator_amount || 0), 0)
  const busyWasherIds = new Set(
    stages.filter((s) => s.stage !== 'completed' && s.b.assigned_washer_id).map((s) => String(s.b.assigned_washer_id))
  )

  // Station/bay grid is a local capacity estimate, not a tracked backend
  // resource — see UX-AUDIT.md. We light up `washing.length` of the
  // configured station count as "busy", purely to visualize utilization.
  const stations = Array.from({ length: capacity.stations }, (_, i) => ({
    index: i + 1,
    status: i < washing.length ? ('busy' as const) : ('available' as const),
  }))

  function adjustStations(delta: number) {
    const next = Math.max(1, Math.min(12, capacity.stations + delta))
    setCapacitySettings(wpKey, { stations: next })
    // Force a light reload of local state by navigating to self; simplest
    // correct way to reflect the change without lifting capacity into
    // global state for what is explicitly a rarely-changed local setting.
    window.location.reload()
  }

  const dateLabel = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-lg font-extrabold leading-tight text-text">{operator?.wash_point || 'SplashPass'}</h1>
            <p className="mt-0.5 text-[12px] text-muted">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusToggle isOpen={isOpen} onToggle={handleToggle} />
            <button
              onClick={() => navigate('/app/more')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-s2 font-display text-[13px] font-bold text-text"
            >
              {operator ? initials(operator.wash_point || operator.name) : '?'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
        {washersData?.useLocal && (
          <div className="rounded-lg border border-warn/25 bg-warn/10 px-3.5 py-2.5 text-[12px] text-warn">
            Staff roster isn't linked to your account yet — ask admin to link your wash point.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          </div>
        ) : (
          <>
            {/* Core metrics — exactly what the brief asks for: revenue,
                cars completed, cars in queue, active washes */}
            <div className="grid grid-cols-2 gap-2.5">
              <MetricCard value={fmtKes(revenueToday)} label="Revenue today" accent="text-success" />
              <MetricCard value={String(completed.length)} label="Cars completed" />
              <MetricCard value={String(inQueue)} label="In queue" accent={inQueue > 0 ? 'text-warn' : 'text-text'} />
              <MetricCard value={String(washing.length)} label="Active washes" accent="text-primary2" />
            </div>

            {/* Bay utilization */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Bay utilization
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-faint">{washing.length}/{capacity.stations} busy</span>
                  <button onClick={() => adjustStations(-1)} className="ml-2 flex h-5 w-5 items-center justify-center rounded-md bg-s2 text-[12px] text-muted">−</button>
                  <button onClick={() => adjustStations(1)} className="flex h-5 w-5 items-center justify-center rounded-md bg-s2 text-[12px] text-muted">+</button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {stations.map((s) => (
                  <StationChip key={s.index} index={s.index} status={s.status} />
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-faint">Estimated from active washes vs. configured station count — not a tracked backend resource.</p>
            </div>

            {/* Operator status */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Operator status</span>
                <button onClick={() => navigate('/app/team')} className="text-[11px] font-semibold text-primary2">View team →</button>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-s1 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary2" />
                  <span className="text-[12px] text-text">{busyWasherIds.size} busy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-[12px] text-text">{Math.max(0, washers.length - busyWasherIds.size)} available</span>
                </div>
                <div className="ml-auto text-[12px] text-faint">{washers.length} on roster</div>
              </div>
            </div>

            {/* Active wash jobs */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Active wash jobs</span>
                <button onClick={() => navigate('/app/queue')} className="text-[11px] font-semibold text-primary2">Open queue →</button>
              </div>
              {washing.length === 0 ? (
                <div className="rounded-xl border border-border bg-s1 py-8 text-center text-[12px] text-faint">
                  No washes in progress
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {washing.map(({ b }) => (
                    <div key={b.id} className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.05] px-3.5 py-3">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${STAGE_COLOR.washing.bg} font-display text-[11px] font-bold ${STAGE_COLOR.washing.text}`}>
                        {initials(b.user_name || 'G')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-text">{b.car_plate || b.user_name || 'Guest'}</div>
                        <div className="text-[11px] text-faint">{b.service_name || '—'}</div>
                      </div>
                      {b.wash_started_at && (
                        <div className="font-mono text-[12px] font-semibold text-primary2">{elapsedMin(b.wash_started_at)}m</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
