import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { fetchWashers } from '../lib/washers'
import {
  fetchTodayBookings,
  assignWasher,
  startWash,
  completeBooking,
  patchStatus,
  isWasherBusyError,
} from '../lib/bookings'
import type { Booking, Washer } from '../types'

// Local-only fallback settings (bay count, average wash duration). These
// aren't backed by any table yet — confirmed there's no inflow_settings
// equivalent in the schema we've seen. Worth revisiting if/when there's a
// real backend field for this.
function localGet<T>(wpKey: string, k: string, def: T): T {
  try {
    const v = localStorage.getItem(`splashpass_${wpKey}_${k}`)
    return v ? JSON.parse(v) : def
  } catch { return def }
}

interface InflowSettings { totalBays: number; avgDuration: number }

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
}
function fmtKes(n: number) {
  return 'KES ' + Number(n).toLocaleString()
}
function elapsedMin(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

// ── StatusToggle ──────────────────────────────────
function StatusToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={[
          'h-2.5 w-2.5 flex-shrink-0 rounded-full transition-all duration-300',
          isOpen ? 'bg-success shadow-[0_0_0_3px_rgba(34,197,94,0.2)]' : 'bg-danger shadow-[0_0_0_3px_rgba(239,68,68,0.2)]',
        ].join(' ')} />
        <div>
          <div className="font-display text-[13px] font-bold text-text">{isOpen ? 'OPEN' : 'CLOSED'}</div>
          <div className="text-[11px] text-muted">{isOpen ? 'Accepting bookings' : 'New bookings stopped'}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={[
          'relative h-[26px] w-[50px] flex-shrink-0 rounded-full border transition-all duration-300',
          isOpen ? 'border-success/35 bg-success/25' : 'border-danger/30 bg-danger/20',
        ].join(' ')}
      >
        <span className={[
          'absolute top-[3px] h-[18px] w-[18px] rounded-full shadow-md transition-all duration-300',
          isOpen ? 'left-[26px] bg-success' : 'left-[3px] bg-danger',
        ].join(' ')} />
      </button>
    </div>
  )
}

// ── InflowCard ────────────────────────────────────
function InflowCard({ num, label, sub, variant }: {
  num: number; label: string; sub: string
  variant: 'free' | 'busy' | 'queued' | 'washers'
}) {
  const c = {
    free:    { num: 'text-success', border: 'border-success/20', bg: 'bg-success/[0.08]' },
    busy:    { num: 'text-danger',  border: 'border-danger/20',  bg: 'bg-danger/[0.08]'  },
    queued:  { num: 'text-gold',    border: 'border-gold/20',    bg: 'bg-gold/[0.08]'    },
    washers: { num: 'text-info',    border: 'border-info/20',    bg: 'bg-info/[0.08]'    },
  }[variant]
  return (
    <div className={`flex flex-col gap-1 rounded-[18px] border p-3.5 ${c.border} ${c.bg}`}>
      <div className={`font-display text-3xl font-extrabold leading-none ${c.num}`}>{num}</div>
      <div className={`text-[10px] font-bold uppercase tracking-wide ${c.num}`}>{label}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  )
}

// ── BookingCard ───────────────────────────────────
function BookingCard({ booking, washer, onAssign, onStart, onComplete }: {
  booking: Booking; washer?: Washer
  onAssign: () => void; onStart: () => void; onComplete: () => void
}) {
  const isDone = booking.status === 'completed'
  const isWashing = !!booking.wash_started_at
  const isAssigned = !!booking.assigned_washer_id && !booking.wash_started_at

  return (
    <div className={[
      'rounded-[18px] border p-4 transition-opacity',
      isDone ? 'border-white/[0.05] bg-white/[0.02] opacity-50'
        : isWashing ? 'border-info/25 bg-info/[0.05]'
        : 'border-gold/20 bg-gold/[0.04]',
    ].join(' ')}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[15px] font-semibold text-text">{booking.user_name || 'Guest'}</div>
        <div className="font-display text-[13px] font-extrabold text-gold">{booking.time}</div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-[7px] border border-gold/25 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold">
          {booking.car_plate || '— —'}
        </span>
        <span className={[
          'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
          isDone ? 'bg-success/15 text-success' : isWashing ? 'bg-info/15 text-info' : 'bg-gold/15 text-gold',
        ].join(' ')}>
          {isDone ? '✓ Done' : isWashing ? '🫧 Washing' : 'Confirmed'}
        </span>
        <span className="text-[11px] text-muted">{booking.service_name || '—'}</span>
      </div>
      {washer && !isDone && (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-info/15 bg-info/[0.07] px-3 py-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-info/20 font-display text-xs font-bold text-info">
            {washer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-[13px] font-semibold text-text">{washer.name}</div>
            <div className="text-[11px] text-muted">{isWashing ? 'Washing now' : 'Assigned'}</div>
          </div>
          {isWashing && booking.wash_started_at && (
            <div className="text-[11px] font-semibold text-gold">⏱ {elapsedMin(booking.wash_started_at)} min</div>
          )}
        </div>
      )}
      {!isDone && (
        <div className="flex gap-2">
          {!booking.assigned_washer_id && <>
            <button onClick={onAssign} className="flex-1 rounded-xl border border-info/20 bg-info/10 py-2.5 text-[12px] font-bold text-info">👷 Assign</button>
            <button onClick={onComplete} className="flex-1 rounded-xl border border-success/20 bg-success/10 py-2.5 text-[12px] font-bold text-success">✓ Done</button>
          </>}
          {isAssigned && <>
            <button onClick={onStart} className="flex-1 rounded-xl border border-gold/20 bg-gold/10 py-2.5 text-[12px] font-bold text-gold">▶ Start Wash</button>
            <button onClick={onComplete} className="flex-1 rounded-xl border border-success/20 bg-success/10 py-2.5 text-[12px] font-bold text-success">✓ Done</button>
          </>}
          {isWashing && (
            <button onClick={onComplete} className="w-full rounded-xl border border-success/20 bg-success/10 py-2.5 text-[12px] font-bold text-success">✓ Mark Complete</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── AssignModal ───────────────────────────────────
function AssignModal({ bookingName, washers, busyWasherIds, onAssign, onClose }: {
  bookingName: string; washers: Washer[]; busyWasherIds: Set<string>
  onAssign: (washerId: string) => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-[28px] bg-s1 px-5 pt-6"
        style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/10" />
        <div className="mb-1 font-display text-xl font-extrabold text-text">Assign Washer</div>
        <div className="mb-4 text-[13px] text-muted">Car: {bookingName}</div>
        {washers.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">No washers added yet. Go to the Washers tab to add staff.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {washers.map(w => {
              const busy = busyWasherIds.has(String(w.id))
              return (
                <button key={w.id} disabled={busy} onClick={() => !busy && onAssign(w.id)}
                  className={[
                    'flex items-center gap-3 rounded-[14px] border px-4 py-3.5 text-left transition-all',
                    busy ? 'cursor-not-allowed border-white/[0.05] bg-white/[0.02] opacity-40'
                         : 'border-white/[0.06] bg-white/[0.03] active:border-info/20 active:bg-info/[0.08]',
                  ].join(' ')}>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-info/15 font-display text-sm font-bold text-info">
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-text">{w.name}</div>
                    <div className="text-[11px] text-muted">{busy ? '🔵 Currently washing' : '✅ Available'}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-[13px] font-semibold text-text">Cancel</button>
      </div>
    </div>
  )
}

// ── HomeScreen ────────────────────────────────────
export function HomeScreen() {
  const operator = useAppStore((s) => s.operator)
  const setOperator = useAppStore((s) => s.setOperator)
  const showToast = useAppStore((s) => s.showToast)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const wpKey = operator?.wash_point || 'op'

  const [isOpen, setIsOpen] = useState(operator?.status !== 'paused')
  const [assignModal, setAssignModal] = useState<{ bookingId: string; name: string } | null>(null)
  const [inflowSettings] = useState<InflowSettings>(() => localGet<InflowSettings>(wpKey, 'inflow', { totalBays: 4, avgDuration: 20 }))

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: fetchTodayBookings,
    refetchInterval: 30_000,
  })

  // Real roster from the server. useLocal:true (no wash_point_id, or the
  // table doesn't exist) falls back to an empty list rather than silently
  // pretending data exists — surfaced via the warning toast below.
  const { data: washersData } = useQuery({
    queryKey: ['washers'],
    queryFn: fetchWashers,
    staleTime: 60_000,
  })
  const washers = washersData?.washers ?? []

  function invalidateBookings() {
    queryClient.invalidateQueries({ queryKey: ['bookings', 'today'] })
  }

  const assignMutation = useMutation({
    mutationFn: ({ bookingId, washerId }: { bookingId: string; washerId: string }) =>
      assignWasher(bookingId, washerId),
    onSuccess: () => {
      invalidateBookings()
      showToast('✓ Washer assigned')
    },
    onError: (e: Error) => {
      showToast(isWasherBusyError(e) ? 'That washer is already on another job.' : e.message, true)
    },
  })

  const startMutation = useMutation({
    mutationFn: startWash,
    onSuccess: () => {
      invalidateBookings()
      showToast('Wash started')
      navigate('/app/washers')
    },
    onError: (e: Error) => showToast(e.message, true),
  })

  const completeMutation = useMutation({
    mutationFn: completeBooking,
    onSuccess: () => {
      invalidateBookings()
      showToast('✓ Wash complete! Points added.')
    },
    onError: (e: Error) => showToast(e.message, true),
  })

  const statusMutation = useMutation({
    mutationFn: patchStatus,
    onSuccess: (_, status) => {
      if (operator) setOperator({ ...operator, status })
      showToast(status === 'open' ? '🟢 Wash point is now Open' : '🔴 Wash point Paused')
    },
    onError: (e: Error) => showToast('Could not sync status: ' + e.message, true),
  })

  function handleToggle() {
    const next = isOpen ? 'paused' : 'open'
    setIsOpen(!isOpen)
    statusMutation.mutate(next)
  }

  function handleAssign(washerId: string) {
    if (!assignModal) return
    assignMutation.mutate({ bookingId: assignModal.bookingId, washerId })
    setAssignModal(null)
  }

  const done = bookings.filter(b => b.status === 'completed')
  const pending = bookings.filter(b => b.status !== 'completed')
  const todayRev = done.reduce((t, b) => t + (b.operator_amount || 0), 0)
  // Derived directly from booking assignment fields — no separate local
  // washer-state object to keep in sync with the server anymore.
  const busyWasherIds = new Set(
    pending.filter(b => b.assigned_washer_id).map(b => String(b.assigned_washer_id))
  )
  const inProgress = pending.filter(b => b.wash_started_at).length
  const freeBays = Math.max(0, inflowSettings.totalBays - inProgress)
  const upNext = pending[0] ?? null

  const dateLabel = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-extrabold leading-tight text-text">{operator?.wash_point || 'SplashPass'}</h1>
            <p className="mt-0.5 text-[13px] font-semibold text-gold">{operator?.name}</p>
            <p className="mt-0.5 text-[11px] text-muted">{dateLabel}</p>
          </div>
          <button onClick={() => navigate('/app/more')}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] font-display text-sm font-bold text-text">
            {operator ? initials(operator.wash_point || operator.name) : '?'}
          </button>
        </div>
        <StatusToggle isOpen={isOpen} onToggle={handleToggle} />
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
        {washersData?.useLocal && (
          <div className="rounded-xl border border-warn/20 bg-warn/10 px-3.5 py-2.5 text-[12px] text-warn">
            Staff roster isn't linked to your account yet — ask admin to link your wash point.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: String(bookings.length), label: 'Cars Today' },
            { num: todayRev.toLocaleString(), label: 'Revenue' },
            { num: inflowSettings.avgDuration + ' min', label: 'Avg Wash' },
          ].map(s => (
            <div key={s.label} className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] py-3.5 text-center">
              <div className="font-display text-[22px] font-extrabold leading-none text-gold">{s.num}</div>
              <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Inflow */}
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">Bay Inflow</div>
          <div className="grid grid-cols-2 gap-2.5">
            <InflowCard num={freeBays} label="Bays Free" sub={freeBays === 0 ? 'All bays occupied' : `${freeBays} bay${freeBays === 1 ? '' : 's'} available`} variant="free" />
            <InflowCard num={inProgress} label="In Progress" sub={`${inProgress} active wash${inProgress === 1 ? '' : 'es'}`} variant="busy" />
            <InflowCard num={Math.max(0, pending.length - inProgress)} label="Queued" sub={`${pending.length} car${pending.length === 1 ? '' : 's'} waiting`} variant="queued" />
            <InflowCard num={busyWasherIds.size} label="Washers On" sub={`${busyWasherIds.size} on duty`} variant="washers" />
          </div>
        </div>

        {/* Up Next */}
        {upNext && (
          <div className="rounded-[20px] border border-gold/20 bg-gold/[0.04] p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-wide text-muted">Up Next</div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 font-display text-sm font-bold text-gold">
                {initials(upNext.user_name || 'G')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold text-text">{upNext.user_name || 'Guest'}</div>
                <div className="text-[12px] text-muted">{upNext.car_plate || '—'} · {upNext.time}</div>
              </div>
              <div className="font-display text-[15px] font-extrabold text-gold">
                {fmtKes(upNext.operator_amount || upNext.total_amount || 0)}
              </div>
            </div>
            <button
              onClick={() => setAssignModal({ bookingId: upNext.id, name: upNext.user_name || 'Guest' })}
              className="w-full rounded-xl bg-gradient-to-b from-gold2 to-gold py-3 font-display text-[13px] font-bold text-bg"
            >
              Check In
            </button>
          </div>
        )}

        {/* Queue */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Today's Queue</span>
            <span className="text-[11px] font-bold text-gold">{pending.length}</span>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gold/20 border-t-gold" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] py-10 text-center">
              <div className="mb-2 text-3xl">📋</div>
              <div className="text-[13px] text-muted">No bookings today</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {bookings.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  washer={washers.find(w => String(w.id) === String(b.assigned_washer_id))}
                  onAssign={() => setAssignModal({ bookingId: b.id, name: b.user_name || 'Guest' })}
                  onStart={() => startMutation.mutate(b.id)}
                  onComplete={() => completeMutation.mutate(b.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {assignModal && (
        <AssignModal
          bookingName={assignModal.name}
          washers={washers}
          busyWasherIds={busyWasherIds}
          onAssign={handleAssign}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  )
}
