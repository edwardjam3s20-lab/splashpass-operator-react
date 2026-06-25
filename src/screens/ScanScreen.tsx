import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { fetchWashers } from '../lib/washers'
import { assignWasher, isWasherBusyError } from '../lib/bookings'
import { fmtKes, initials } from '../lib/operations'
import type { Booking, Washer } from '../types'

// Ambient typing for the two browser-only QR detection paths this screen
// supports: the native BarcodeDetector API (where available) and the
// jsQR fallback loaded via <script> in index.html for browsers without it.
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
    }
    jsQR?: (
      data: Uint8ClampedArray,
      width: number,
      height: number
    ) => { data: string } | null
  }
}

// ── Types ─────────────────────────────────────────
interface LookupResult {
  user: { name: string; plate?: string } | null
  booking: Booking | null
}

// ── API calls ─────────────────────────────────────
async function lookupByPlate(plate: string): Promise<LookupResult> {
  return apiFetch<LookupResult>(`/api/operator/lookup?plate=${encodeURIComponent(plate.trim())}`)
}

async function fetchBookingById(id: string): Promise<{ booking: Booking }> {
  return apiFetch<{ booking: Booking }>(`/api/operator/bookings/${id}`)
}

async function completeBookingById(id: string): Promise<void> {
  await apiFetch(`/api/operator/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'complete' }),
  })
}

// ── AssignInline — opens directly inside the verified sheet, no dead end ──
function AssignInline({
  washers,
  busyWasherIds,
  onAssign,
  assigning,
}: {
  washers: Washer[]
  busyWasherIds: Set<string>
  onAssign: (washerId: string) => void
  assigning: boolean
}) {
  if (washers.length === 0) {
    return <p className="py-4 text-center text-[12px] text-faint">No washers on roster yet. Add staff from the Team tab.</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {washers.map((w) => {
        const busy = busyWasherIds.has(String(w.id))
        return (
          <button
            key={w.id}
            disabled={busy || assigning}
            onClick={() => onAssign(w.id)}
            className={[
              'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left',
              busy ? 'border-border bg-s2 opacity-40' : 'border-border bg-s2 active:bg-s3',
            ].join(' ')}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 font-display text-[11px] font-bold text-primary2">
              {initials(w.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-text">{w.name}</div>
              <div className="text-[10px] text-faint">{w.role || 'Washer'}</div>
            </div>
            <span className={['text-[11px] font-semibold', busy ? 'text-faint' : 'text-success'].join(' ')}>
              {busy ? 'Busy' : 'Available'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Verified sheet ────────────────────────────────
function VerifiedSheet({
  booking,
  userName,
  washers,
  busyWasherIds,
  onAssign,
  assigning,
  onMarkDone,
  onClose,
  completing,
}: {
  booking: Booking
  userName: string
  washers: Washer[]
  busyWasherIds: Set<string>
  onAssign: (washerId: string) => void
  assigning: boolean
  onMarkDone: () => void
  onClose: () => void
  completing: boolean
}) {
  const [showAssign, setShowAssign] = useState(false)
  const plate = booking.car_plate || '—'
  const amount = booking.operator_amount || booking.total_amount || 0

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-s1 px-5 pt-6"
        style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-success/15 font-display text-[14px] font-extrabold text-success">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-text">{userName}</div>
            <div className="font-mono text-[12px] text-faint">{plate}</div>
          </div>
          <div className="flex-shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">Verified</div>
        </div>

        {!showAssign && (
          <div className="mb-4 flex flex-col overflow-hidden rounded-xl border border-border">
            {[
              { label: 'Service', value: booking.service_name || '—' },
              { label: 'Time', value: booking.time || '—' },
              { label: 'Total', value: amount ? fmtKes(amount) : 'Paid' },
              { label: 'Status', value: booking.status, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center justify-between border-b border-border bg-s2 px-3.5 py-2.5 last:border-0">
                <span className="text-[12px] text-faint">{label}</span>
                <span className={['text-[12px] font-semibold', highlight ? 'text-success' : 'text-text'].join(' ')}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {showAssign ? (
          <>
            <div className="mb-3 text-[12px] font-semibold text-muted">Assign a washer</div>
            <AssignInline washers={washers} busyWasherIds={busyWasherIds} onAssign={onAssign} assigning={assigning} />
            <button onClick={() => setShowAssign(false)} className="mt-3 w-full rounded-xl border border-border bg-s2 py-2.5 text-[12px] font-semibold text-text">
              Back
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => setShowAssign(true)}
              className="w-full rounded-xl bg-primary py-3.5 font-display text-[13px] font-bold text-white"
            >
              Assign washer & check in
            </button>
            <button
              onClick={onMarkDone}
              disabled={completing}
              className="w-full rounded-xl border border-success/25 bg-success/10 py-3.5 text-[13px] font-bold text-success disabled:opacity-50"
            >
              {completing ? 'Marking done…' : 'Mark done (no assignment)'}
            </button>
            <button onClick={onClose} className="w-full rounded-xl border border-border bg-s2 py-3 text-[13px] font-semibold text-text">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ScanScreen ────────────────────────────────────
export function ScanScreen() {
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Plate lookup state
  const [plate, setPlate] = useState('')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  // Verified booking sheet
  const [verified, setVerified] = useState<{ booking: Booking; userName: string } | null>(null)

  const { data: washersData } = useQuery({
    queryKey: ['washers'],
    queryFn: fetchWashers,
    staleTime: 60_000,
  })
  const washers = washersData?.washers ?? []

  const { data: recentScans = [] } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: async () => {
      const data = await apiFetch<{ bookings: Booking[] }>(`/api/operator/bookings?date=${new Date().toISOString().split('T')[0]}`)
      return data.bookings || []
    },
    staleTime: 30_000,
  })
  const busyWasherIds = new Set(
    recentScans.filter((b) => b.status !== 'completed' && b.assigned_washer_id).map((b) => String(b.assigned_washer_id))
  )

  function invalidateBookings() {
    queryClient.invalidateQueries({ queryKey: ['bookings', 'today'] })
  }

  const completeMutation = useMutation({
    mutationFn: completeBookingById,
    onSuccess: () => {
      invalidateBookings()
      showToast('Wash marked done — points added')
      setVerified(null)
      resetScan()
    },
    onError: (e: Error) => showToast(e.message, true),
  })

  const assignMutation = useMutation({
    mutationFn: ({ bookingId, washerId }: { bookingId: string; washerId: string }) => assignWasher(bookingId, washerId),
    onSuccess: () => {
      invalidateBookings()
      showToast('Washer assigned — checked in')
      setVerified(null)
      resetScan()
    },
    onError: (e: Error) => showToast(isWasherBusyError(e) ? 'That washer is already on another job.' : e.message, true),
  })

  // Clean up camera on unmount
  useEffect(() => {
    return () => stopCamera()
  }, [])

  function stopCamera() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    setCameraActive(false)
  }

  async function startCamera() {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
      intervalRef.current = setInterval(() => captureFrame(), 500)
    } catch {
      setCameraError('Camera access denied. Use plate lookup instead.')
    }
  }

  function captureFrame() {
    const video = videoRef.current
    if (!video || video.readyState !== 4) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    if ('BarcodeDetector' in window && window.BarcodeDetector) {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      detector.detect(canvas).then((codes) => {
        if (codes.length > 0) { stopCamera(); processQR(codes[0].rawValue) }
      }).catch(() => {})
      return
    }

    if (typeof window.jsQR === 'function') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = window.jsQR(imageData.data, imageData.width, imageData.height)
      if (code?.data) { stopCamera(); processQR(code.data) }
    }
  }

  async function processQR(raw: string) {
    try {
      const data = JSON.parse(raw)
      if (!data.id) { showToast('Invalid QR code.', true); return }
      const res = await fetchBookingById(data.id)
      const b = res.booking
      if (b.status === 'completed') { showToast('This booking is already completed.', true); return }
      setVerified({ booking: b, userName: b.user_name || 'Guest' })
    } catch (e: unknown) {
      showToast('Could not read QR: ' + (e instanceof Error ? e.message : ''), true)
    }
  }

  function resetScan() {
    stopCamera()
    setCameraError(null)
    setPlate('')
  }

  async function handleLookup() {
    const p = plate.trim()
    if (!p) { setLookupError('Enter a plate number.'); return }
    setLookupError(null)
    setLookupLoading(true)
    try {
      const result = await lookupByPlate(p)
      if (!result?.user) { setLookupError(`No customer found with plate ${p}.`); return }
      if (!result.booking) { setLookupError(`No booking today for ${p}. Customer: ${result.user.name}`); return }
      if (result.booking.status === 'completed') { setLookupError('This booking is already completed.'); return }
      setVerified({ booking: result.booking, userName: result.user.name })
    } catch (e: unknown) {
      setLookupError(e instanceof Error ? e.message : 'Lookup failed.')
    } finally {
      setLookupLoading(false)
    }
  }

  const recent = recentScans
    .filter((b) => b.assigned_at || b.wash_started_at || b.status === 'completed')
    .slice(0, 5)

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <h2 className="font-display text-lg font-extrabold text-text">Scan vehicle</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Scan QR code</div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full"
              style={{ display: cameraActive ? 'block' : 'none', borderRadius: 16 }}
            />

            {cameraActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-48 w-48">
                  {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <span
                      key={i}
                      className={`absolute h-8 w-8 border-primary2 ${pos} ${
                        i === 0 ? 'border-t-2 border-l-2 rounded-tl-lg' :
                        i === 1 ? 'border-t-2 border-r-2 rounded-tr-lg' :
                        i === 2 ? 'border-b-2 border-l-2 rounded-bl-lg' :
                                  'border-b-2 border-r-2 rounded-br-lg'
                      }`}
                    />
                  ))}
                  <div className="absolute inset-x-0 top-0 h-0.5 animate-[scan_2s_linear_infinite] bg-primary2/80 shadow-[0_0_8px_rgba(91,138,255,0.8)]" />
                </div>
              </div>
            )}

            {!cameraActive && (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary2/40">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-primary2 stroke-2">
                    <path d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 12h16" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <div className="mb-1 text-[14px] font-semibold text-text">Point camera at QR code</div>
                  <div className="text-[12px] text-faint">Scan the customer's wash pass</div>
                </div>
                {cameraError && (
                  <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-2.5 text-[12px] text-danger">
                    {cameraError}
                  </div>
                )}
                <button onClick={startCamera} className="rounded-xl bg-primary px-6 py-3 font-display text-[13px] font-bold text-white">
                  Open camera
                </button>
              </div>
            )}

            {cameraActive && (
              <button
                onClick={resetScan}
                className="absolute right-3 top-3 rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        <div className="my-5 flex items-center gap-3 px-4">
          <div className="flex-1 border-t border-border" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-faint">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <div className="px-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Search by plate</div>

          <input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="KCA 123A"
            className="mb-3 w-full rounded-xl border border-border bg-s2 px-4 py-3.5 font-mono text-[17px] font-semibold tracking-[3px] text-text placeholder:text-faint placeholder:tracking-[2px] outline-none focus:border-primary/60"
          />

          {lookupError && (
            <div className="mb-3 rounded-xl border border-danger/25 bg-danger/10 px-4 py-2.5 text-[12px] text-danger">
              {lookupError}
            </div>
          )}

          <button
            onClick={handleLookup}
            disabled={lookupLoading}
            className="w-full rounded-xl border border-primary/30 bg-primary/10 py-3.5 font-display text-[13px] font-bold text-primary2 disabled:opacity-50"
          >
            {lookupLoading ? 'Searching…' : 'Search plate'}
          </button>
        </div>

        {recent.length > 0 && (
          <div className="mt-6 px-4 pb-8">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Recent scans</div>
            <div className="flex flex-col gap-2">
              {recent.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-s1 px-3.5 py-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-s2 font-mono text-[10px] font-bold text-muted">
                    {(b.car_plate || '—').slice(0, 4)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-text">{b.car_plate || b.user_name}</div>
                    <div className="text-[10px] text-faint">{b.time}</div>
                  </div>
                  <span className="flex-shrink-0 text-[10px] font-bold text-faint capitalize">{b.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {verified && (
        <VerifiedSheet
          booking={verified.booking}
          userName={verified.userName}
          washers={washers}
          busyWasherIds={busyWasherIds}
          assigning={assignMutation.isPending}
          onAssign={(washerId) => assignMutation.mutate({ bookingId: verified.booking.id, washerId })}
          onMarkDone={() => completeMutation.mutate(verified.booking.id)}
          onClose={() => { setVerified(null); resetScan() }}
          completing={completeMutation.isPending}
        />
      )}
    </div>
  )
}
