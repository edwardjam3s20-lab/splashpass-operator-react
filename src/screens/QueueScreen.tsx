import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { fetchWashers } from '../lib/washers'
import {
  fetchTodayBookings,
  fetchUpcomingBookings,
  fetchPendingBookings,
  acceptBooking,
  rejectBooking,
  assignWasher,
  startWash,
  completeBooking,
  freeWasher,
  isWasherBusyError,
} from '../lib/bookings'
import {
  stageOf,
  STAGE_LABEL,
  STAGE_COLOR,
  fmtKes,
  initials,
  elapsedMin,
  type Stage,
} from '../lib/operations'
import type { Booking, Washer } from '../types'

const COLUMNS: Stage[] = ['waiting', 'assigned', 'washing', 'completed']

// ── Pending requests (awaiting accept/reject) ──────
function RequestCard({
  booking,
  onAccept,
  onReject,
  accepting,
  rejecting,
}: {
  booking: Booking
  onAccept: () => void
  onReject: () => void
  accepting: boolean
  rejecting: boolean
}) {
  const busy = accepting || rejecting
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[14px] font-bold text-text">{booking.user_name || 'Guest'}</span>
        <span className="flex-shrink-0 font-mono text-[13px] font-bold text-primary2">{booking.time}</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-border bg-s2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text">
          {booking.car_plate || '— —'}
        </span>
        <span className="text-[11px] text-faint">
          {[booking.car_make, booking.car_model].filter(Boolean).join(' ') || booking.car_type}
        </span>
        <span className="text-[11px] text-faint">· {booking.service_name}</span>
        <span className="ml-auto text-[12px] font-bold text-text">{fmtKes(booking.total_amount || 0)}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onReject}
          disabled={busy}
          className="flex-1 rounded-lg bg-s2 py-2.5 text-[12px] font-bold text-faint disabled:opacity-50"
        >
          {rejecting ? 'Declining…' : 'Decline'}
        </button>
        <button
          onClick={onAccept}
          disabled={busy}
          className="flex-1 rounded-lg bg-primary py-2.5 text-[12px] font-bold text-white disabled:opacity-50"
        >
          {accepting ? 'Accepting…' : 'Accept'}
        </button>
      </div>
    </div>
  )
}

function RejectReasonSheet({ onConfirm, onClose }: { onConfirm: (reason?: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-s1 px-5 pt-6"
        style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
        <div className="mb-1 font-display text-lg font-extrabold text-text">Decline request</div>
        <div className="mb-4 text-[13px] text-muted">Let the customer know why (optional) — they'll see this in their SMS.</div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Fully booked until 3pm"
          rows={3}
          className="mb-4 w-full rounded-xl border border-border bg-s2 p-3 text-[14px] text-text outline-none focus:border-primary/50"
        />
        <button
          onClick={() => onConfirm(reason.trim() || undefined)}
          className="mb-2 w-full rounded-xl bg-danger py-3.5 text-[14px] font-bold text-white"
        >
          Decline Booking
        </button>
        <button onClick={onClose} className="w-full rounded-xl border border-border bg-s2 py-3 text-[13px] font-semibold text-text">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── AssignSheet ───────────────────────────────────
function AssignSheet({
  bookingName,
  washers,
  busyWasherIds,
  onAssign,
  onClose,
}: {
  bookingName: string
  washers: Washer[]
  busyWasherIds: Set<string>
  onAssign: (washerId: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-s1 px-5 pt-6"
        style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
        <div className="mb-1 font-display text-lg font-extrabold text-text">Assign washer</div>
        <div className="mb-4 text-[13px] text-muted">{bookingName}</div>
        {washers.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">No washers added yet. Add staff from the Team tab.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {washers.map((w) => {
              const busy = busyWasherIds.has(String(w.id))
              return (
                <button
                  key={w.id}
                  disabled={busy}
                  onClick={() => onAssign(w.id)}
                  className={[
                    'flex items-center gap-3 rounded-xl border px-4 py-3 text-left',
                    busy ? 'border-border bg-s2 opacity-40' : 'border-border bg-s2 active:bg-s3',
                  ].join(' ')}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 font-display text-[12px] font-bold text-primary2">
                    {initials(w.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-text">{w.name}</div>
                    <div className="text-[11px] text-faint">{w.role || 'Washer'}</div>
                  </div>
                  <span className={['text-[11px] font-semibold', busy ? 'text-faint' : 'text-success'].join(' ')}>
                    {busy ? 'Busy' : 'Available'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full rounded-xl border border-border bg-s2 py-3 text-[13px] font-semibold text-text">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── QueueCard ─────────────────────────────────────
function QueueCard({
  booking,
  washer,
  stage,
  onAssign,
  onStart,
  onComplete,
  onFree,
}: {
  booking: Booking
  washer?: Washer
  stage: Stage
  onAssign: () => void
  onStart: () => void
  onComplete: () => void
  onFree: () => void
}) {
  const color = STAGE_COLOR[stage]
  const [now, setNow] = useState(() => Date.now())

  // Live ticker — re-renders every 30s so the "X min" elapsed badge (for
  // washing cards) and the "LATE" flag (for waiting cards) both stay
  // current without a full data refetch. `Date.now()` is only ever read
  // inside this effect, never directly during render.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const waitingTooLong = stage === 'waiting' && booking.time && (() => {
    const [h, m] = booking.time.split(':').map(Number)
    if (Number.isNaN(h)) return false
    const scheduled = new Date()
    scheduled.setHours(h, m || 0, 0, 0)
    return now - scheduled.getTime() > 20 * 60_000
  })()

  return (
    <div className={['rounded-xl border p-3 transition-opacity', color.border, color.bg].join(' ')}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-text">{booking.user_name || 'Guest'}</span>
        {waitingTooLong && (
          <span className="flex-shrink-0 rounded-full bg-danger/15 px-1.5 py-0.5 text-[9px] font-bold text-danger">LATE</span>
        )}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-border bg-s2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text">
          {booking.car_plate || '— —'}
        </span>
        <span className="text-[11px] text-faint">{booking.service_name || '—'}</span>
      </div>

      {washer && stage !== 'completed' && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-black/15 px-2.5 py-1.5">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-primary/20 font-display text-[10px] font-bold text-primary2">
            {washer.name.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-[12px] font-medium text-text">{washer.name}</span>
          {stage === 'washing' && booking.wash_started_at && (
            <span className="ml-auto font-mono text-[12px] font-bold text-primary2">{elapsedMin(booking.wash_started_at)}m</span>
          )}
        </div>
      )}

      {stage === 'completed' ? (
        <div className="flex items-center justify-between text-[11px] text-faint">
          <span>{fmtKes(booking.operator_amount || booking.total_amount || 0)}</span>
          <span>{booking.wash_completed_at ? new Date(booking.wash_completed_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        </div>
      ) : (
        <div className="flex gap-1.5">
          {stage === 'waiting' && (
            <button onClick={onAssign} className="flex-1 rounded-lg bg-info/15 py-2 text-[11px] font-bold text-info">
              Assign
            </button>
          )}
          {stage === 'assigned' && (
            <>
              <button onClick={onStart} className="flex-1 rounded-lg bg-warn/15 py-2 text-[11px] font-bold text-warn">
                Start
              </button>
              <button onClick={onFree} className="rounded-lg bg-s2 px-2.5 py-2 text-[11px] font-bold text-faint">
                Unassign
              </button>
            </>
          )}
          {stage === 'washing' && (
            <button onClick={onComplete} className="flex-1 rounded-lg bg-success/15 py-2 text-[11px] font-bold text-success">
              Mark complete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Upcoming (read-only, future-dated bookings) ────
function fmtUpcomingDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function UpcomingCard({ booking }: { booking: Booking }) {
  return (
    <div className="rounded-xl border border-border bg-s2 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-text">{booking.user_name || 'Guest'}</span>
        <span className="flex-shrink-0 font-mono text-[12px] font-bold text-primary2">{booking.time}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-border bg-s1 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text">
          {booking.car_plate || '— —'}
        </span>
        <span className="text-[11px] text-faint">{booking.service_name || '—'}</span>
        <span className="ml-auto text-[11px] font-semibold text-faint">{fmtKes(booking.total_amount || 0)}</span>
      </div>
    </div>
  )
}

function UpcomingList({ bookings, isLoading }: { bookings: Booking[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <div className="text-[13px] text-faint">No upcoming bookings yet. New ones will show up here as customers book ahead.</div>
      </div>
    )
  }

  // Group by date, preserving the order the API already returned (time asc within day)
  const groups: { date: string; items: Booking[] }[] = []
  for (const b of bookings) {
    const last = groups[groups.length - 1]
    if (last && last.date === b.date) last.items.push(b)
    else groups.push({ date: b.date, items: [b] })
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-3">
      <div className="flex flex-col gap-5 pb-6">
        {groups.map((g) => (
          <div key={g.date}>
            <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-faint">
              {fmtUpcomingDate(g.date)} · {g.items.length}
            </div>
            <div className="flex flex-col gap-2">
              {g.items.map((b) => <UpcomingCard key={b.id} booking={b} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── QueueScreen ───────────────────────────────────
export function QueueScreen() {
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const [assignModal, setAssignModal] = useState<{ bookingId: string; name: string } | null>(null)
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [view, setView] = useState<'today' | 'upcoming'>('today')

  const { data: pendingBookings = [] } = useQuery({
    queryKey: ['bookings', 'pending'],
    queryFn: fetchPendingBookings,
    refetchInterval: 30_000,
  })

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: fetchTodayBookings,
    refetchInterval: 30_000,
  })

  const { data: upcomingBookings = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: fetchUpcomingBookings,
    enabled: view === 'upcoming',
    staleTime: 60_000,
  })

  const { data: washersData } = useQuery({
    queryKey: ['washers'],
    queryFn: fetchWashers,
    staleTime: 60_000,
  })
  const washers = washersData?.washers ?? []

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['bookings', 'today'] })
    queryClient.invalidateQueries({ queryKey: ['bookings', 'pending'] })
  }

  const acceptMutation = useMutation({
    mutationFn: acceptBooking,
    onSuccess: () => { invalidate(); showToast('Request accepted — customer can now pay') },
    onError: (e: Error) => showToast(e.message, true),
  })
  const rejectMutation = useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) => rejectBooking(bookingId, reason),
    onSuccess: () => { invalidate(); showToast('Request declined') },
    onError: (e: Error) => showToast(e.message, true),
  })

  const assignMutation = useMutation({
    mutationFn: ({ bookingId, washerId }: { bookingId: string; washerId: string }) => assignWasher(bookingId, washerId),
    onSuccess: () => { invalidate(); showToast('Washer assigned') },
    onError: (e: Error) => showToast(isWasherBusyError(e) ? 'That washer is already on another job.' : e.message, true),
  })
  const startMutation = useMutation({
    mutationFn: startWash,
    onSuccess: () => { invalidate(); showToast('Wash started') },
    onError: (e: Error) => showToast(e.message, true),
  })
  const completeMutation = useMutation({
    mutationFn: completeBooking,
    onSuccess: () => { invalidate(); showToast('Wash complete — points added') },
    onError: (e: Error) => showToast(e.message, true),
  })
  const freeMutation = useMutation({
    mutationFn: freeWasher,
    onSuccess: () => { invalidate(); showToast('Washer unassigned') },
    onError: (e: Error) => showToast(e.message, true),
  })

  function handleAssign(washerId: string) {
    if (!assignModal) return
    assignMutation.mutate({ bookingId: assignModal.bookingId, washerId })
    setAssignModal(null)
  }

  const byStage: Record<Stage, Booking[]> = { waiting: [], assigned: [], washing: [], completed: [] }
  for (const b of bookings) {
    const stage = stageOf(b)
    if (stage) byStage[stage].push(b)
  }
  // Most-recently-completed first; everything else oldest-first (FIFO).
  byStage.completed.sort((a, b) => (b.wash_completed_at || '').localeCompare(a.wash_completed_at || ''))

  const busyWasherIds = new Set(
    bookings.filter((b) => b.status !== 'completed' && b.assigned_washer_id).map((b) => String(b.assigned_washer_id))
  )

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold text-text">Queue</h2>
          <span className="text-[12px] text-faint">
            {view === 'today' ? `${bookings.length} today` : `${upcomingBookings.length} upcoming`}
          </span>
        </div>
        <div className="flex rounded-lg bg-s2 p-1">
          {(['today', 'upcoming'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                'flex-1 rounded-md py-1.5 text-[12px] font-bold capitalize transition-colors duration-150',
                view === v ? 'bg-s1 text-text shadow-sm' : 'text-faint',
              ].join(' ')}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'today' && pendingBookings.length > 0 && (
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-[12px] font-bold uppercase tracking-wide text-primary2">
              {pendingBookings.length} new request{pendingBookings.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {pendingBookings.map((b) => (
              <RequestCard
                key={b.id}
                booking={b}
                accepting={acceptMutation.isPending && acceptMutation.variables === b.id}
                rejecting={rejectMutation.isPending && rejectMutation.variables?.bookingId === b.id}
                onAccept={() => acceptMutation.mutate(b.id)}
                onReject={() => setRejectModal(b.id)}
              />
            ))}
          </div>
        </div>
      )}

      {view === 'upcoming' ? (
        <UpcomingList bookings={upcomingBookings} isLoading={upcomingLoading} />
      ) : isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-3 px-3 pt-3" style={{ width: 'max-content' }}>
            {COLUMNS.map((stage) => {
              const items = byStage[stage]
              const color = STAGE_COLOR[stage]
              return (
                <div key={stage} className="flex h-full w-[260px] flex-shrink-0 flex-col">
                  <div className="mb-2 flex items-center gap-2 px-0.5">
                    <span className={['h-2 w-2 rounded-full', color.dot].join(' ')} />
                    <span className="text-[12px] font-bold uppercase tracking-wide text-text">{STAGE_LABEL[stage]}</span>
                    <span className={['ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold', color.bg, color.text].join(' ')}>
                      {items.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto rounded-xl bg-s1/40 p-2">
                    <div className="flex flex-col gap-2 pb-4">
                      {items.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border py-8 text-center text-[11px] text-faint">
                          Nothing here
                        </div>
                      ) : (
                        items.map((b) => (
                          <QueueCard
                            key={b.id}
                            booking={b}
                            stage={stage}
                            washer={washers.find((w) => String(w.id) === String(b.assigned_washer_id))}
                            onAssign={() => setAssignModal({ bookingId: b.id, name: b.user_name || 'Guest' })}
                            onStart={() => startMutation.mutate(b.id)}
                            onComplete={() => completeMutation.mutate(b.id)}
                            onFree={() => freeMutation.mutate(b.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {assignModal && (
        <AssignSheet
          bookingName={assignModal.name}
          washers={washers}
          busyWasherIds={busyWasherIds}
          onAssign={handleAssign}
          onClose={() => setAssignModal(null)}
        />
      )}

      {rejectModal && (
        <RejectReasonSheet
          onConfirm={(reason) => {
            rejectMutation.mutate({ bookingId: rejectModal, reason })
            setRejectModal(null)
          }}
          onClose={() => setRejectModal(null)}
        />
      )}
    </div>
  )
}
