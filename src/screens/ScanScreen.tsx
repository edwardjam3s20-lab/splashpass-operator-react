import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import type { Booking } from '../types'

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

function fmtKes(n: number) {
  return 'KES ' + Number(n).toLocaleString()
}

// ── Verified modal ────────────────────────────────
function VerifiedModal({
  booking,
  userName,
  onCheckIn,
  onMarkDone,
  onClose,
  completing,
}: {
  booking: Booking
  userName: string
  onCheckIn: () => void
  onMarkDone: () => void
  onClose: () => void
  completing: boolean
}) {
  const plate = booking.car_plate || '—'
  const amount = booking.operator_amount || booking.total_amount || 0
  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-[28px] bg-s1 px-5 pt-6"
        style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/10" />

        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-success/15 font-display text-base font-extrabold text-success">
            {initials(userName)}
          </div>
          <div>
            <div className="text-[16px] font-bold text-text">{userName}</div>
            <div className="text-[13px] text-muted">{plate}</div>
          </div>
          <div className="ml-auto rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success">
            ✓ Verified
          </div>
        </div>

        {/* Details */}
        <div className="mb-4 flex flex-col gap-0 rounded-[16px] border border-white/[0.06] bg-white/[0.03] overflow-hidden">
          {[
            { label: 'Service', value: booking.service_name || '—' },
            { label: 'Time', value: booking.time || '—' },
            { label: 'Total', value: amount ? fmtKes(amount) : 'Paid' },
            { label: 'Status', value: booking.status, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3 last:border-0">
              <span className="text-[13px] text-muted">{label}</span>
              <span className={['text-[13px] font-semibold', highlight ? 'text-success' : 'text-text'].join(' ')}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onCheckIn}
            className="w-full rounded-xl bg-gradient-to-b from-gold2 to-gold py-3.5 font-display text-[13px] font-bold text-bg"
          >
            👷 Assign Washer & Check In
          </button>
          <button
            onClick={onMarkDone}
            disabled={completing}
            className="w-full rounded-xl border border-success/25 bg-success/10 py-3.5 text-[13px] font-bold text-success disabled:opacity-50"
          >
            {completing ? 'Marking done…' : '✓ Mark Done (no assignment)'}
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-[13px] font-semibold text-text"
          >
            Cancel
          </button>
        </div>
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

  // Verified booking modal
  const [verified, setVerified] = useState<{ booking: Booking; userName: string } | null>(null)

  const completeMutation = useMutation({
    mutationFn: completeBookingById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'today'] })
      showToast('✓ Wash marked done! Points added.')
      setVerified(null)
      resetScan()
    },
    onError: (e: Error) => showToast(e.message, true),
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

    // Prefer native BarcodeDetector if available (Chrome/Android)
    if ('BarcodeDetector' in window) {
      // @ts-ignore
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      detector.detect(canvas).then((codes: { rawValue: string }[]) => {
        if (codes.length > 0) { stopCamera(); processQR(codes[0].rawValue) }
      }).catch(() => {})
      return
    }

    // Fallback: jsQR via CDN (loaded in index.html)
    // @ts-ignore
    if (typeof window.jsQR === 'function') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      // @ts-ignore
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
  }

  async function handleLookup() {
    const p = plate.trim()
    if (!p) { setLookupError('Enter a plate number.'); return }
    setLookupError(null)
    setLookupLoading(true)
    try {
      const result = await lookupByPlate(p)
      if (!result?.user) {
        setLookupError(`No customer found with plate ${p}.`); return
      }
      if (!result.booking) {
        setLookupError(`No booking today for ${p}. Customer: ${result.user.name}`); return
      }
      if (result.booking.status === 'completed') {
        setLookupError('This booking is already completed.'); return
      }
      setVerified({ booking: result.booking, userName: result.user.name })
    } catch (e: unknown) {
      setLookupError(e instanceof Error ? e.message : 'Lookup failed.')
    } finally {
      setLookupLoading(false)
    }
  }

  function handleCheckIn() {
    // Navigate to home where assign modal is — pass booking id via state or just close modal
    // For now: close modal and show toast directing operator to home queue
    setVerified(null)
    showToast('Find the booking in today\'s queue to assign a washer.')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <h2 className="font-display text-xl font-extrabold text-text">Scan</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* QR Camera section */}
        <div className="px-4 pt-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">Scan QR Code</div>

          <div className="relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-black">
            {/* Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full"
              style={{ display: cameraActive ? 'block' : 'none', borderRadius: 20 }}
            />

            {/* Scan overlay corners */}
            {cameraActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-48 w-48">
                  {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <span
                      key={i}
                      className={`absolute h-8 w-8 border-gold ${pos} ${
                        i === 0 ? 'border-t-2 border-l-2 rounded-tl-lg' :
                        i === 1 ? 'border-t-2 border-r-2 rounded-tr-lg' :
                        i === 2 ? 'border-b-2 border-l-2 rounded-bl-lg' :
                                  'border-b-2 border-r-2 rounded-br-lg'
                      }`}
                    />
                  ))}
                  {/* Scan line animation */}
                  <div className="absolute inset-x-0 top-0 h-0.5 animate-[scan_2s_linear_infinite] bg-gold/70 shadow-[0_0_8px_rgba(255,176,32,0.8)]" />
                </div>
              </div>
            )}

            {/* Prompt (camera not active) */}
            {!cameraActive && (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                <div className="text-4xl">📷</div>
                <div>
                  <div className="mb-1 text-[15px] font-semibold text-text">Point camera at QR code</div>
                  <div className="text-[13px] text-muted">Scan the customer's wash pass</div>
                </div>
                {cameraError && (
                  <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-2.5 text-[12px] text-danger">
                    {cameraError}
                  </div>
                )}
                <button
                  onClick={startCamera}
                  className="rounded-xl bg-gradient-to-b from-gold2 to-gold px-6 py-3 font-display text-[13px] font-bold text-bg"
                >
                  Open Camera
                </button>
              </div>
            )}

            {/* Stop camera button */}
            {cameraActive && (
              <button
                onClick={resetScan}
                className="absolute right-3 top-3 rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm"
              >
                ✕ Stop
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 px-4">
          <div className="flex-1 border-t border-white/[0.07]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">or</span>
          <div className="flex-1 border-t border-white/[0.07]" />
        </div>

        {/* Plate lookup */}
        <div className="px-4 pb-8">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">Search by Plate</div>

          <input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="KCA 123A"
            className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-display text-[18px] font-bold tracking-[4px] text-text placeholder:text-muted/40 placeholder:tracking-[2px] placeholder:text-base placeholder:font-normal outline-none focus:border-gold/50"
          />

          {lookupError && (
            <div className="mb-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-2.5 text-[12px] text-danger">
              {lookupError}
            </div>
          )}

          <button
            onClick={handleLookup}
            disabled={lookupLoading}
            className="w-full rounded-xl border border-gold/25 bg-gold/10 py-3.5 font-display text-[13px] font-bold text-gold disabled:opacity-50"
          >
            {lookupLoading ? 'Searching…' : '🔍 Search Plate'}
          </button>
        </div>
      </div>

      {/* Verified modal */}
      {verified && (
        <VerifiedModal
          booking={verified.booking}
          userName={verified.userName}
          onCheckIn={handleCheckIn}
          onMarkDone={() => completeMutation.mutate(verified.booking.id)}
          onClose={() => { setVerified(null); resetScan() }}
          completing={completeMutation.isPending}
        />
      )}
    </div>
  )
}
