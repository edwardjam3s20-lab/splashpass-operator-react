import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { apiFetch } from '../lib/api'
import type { Service } from '../types'

// ── API ───────────────────────────────────────────
async function fetchServices(): Promise<Service[]> {
  const data = await apiFetch<{ services: Service[] }>('/api/operator/services')
  return data.services || []
}

async function createService(payload: ServicePayload): Promise<Service> {
  const data = await apiFetch<{ service: Service }>('/api/operator/services', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.service
}

async function updateService(id: string, payload: ServicePayload): Promise<Service> {
  const data = await apiFetch<{ service: Service }>(`/api/operator/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.service
}

async function deleteService(id: string): Promise<void> {
  await apiFetch(`/api/operator/services/${id}`, { method: 'DELETE' })
}

// ── Types ─────────────────────────────────────────
const CAR_TYPES = ['saloon', 'suv', 'pickup', 'van', 'hatchback', 'coupe'] as const
type CarType = typeof CAR_TYPES[number]

const CAR_LABELS: Record<CarType, string> = {
  saloon: 'Saloon',
  suv: 'SUV',
  pickup: 'Pickup',
  van: 'Van',
  hatchback: 'Hatchback',
  coupe: 'Coupe',
}

interface ServicePayload {
  name: string
  description: string
  price: number
  duration: number | null
  icon: string
  prices_by_car_type: Record<string, string>
}

interface FormState {
  name: string
  description: string
  price: string
  duration: string
  icon: string
  carPrices: Record<CarType, string>
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  price: '',
  duration: '',
  icon: '🚿',
  carPrices: { saloon: '', suv: '', pickup: '', van: '', hatchback: '', coupe: '' },
}

function serviceToForm(s: Service): FormState {
  return {
    name: s.name,
    description: s.description || '',
    price: String(s.price),
    duration: s.duration != null ? String(s.duration) : '',
    icon: s.icon || '🚿',
    carPrices: {
      saloon: s.price_saloon != null ? String(s.price_saloon) : '',
      suv: s.price_suv != null ? String(s.price_suv) : '',
      pickup: s.price_pickup != null ? String(s.price_pickup) : '',
      van: s.price_van != null ? String(s.price_van) : '',
      hatchback: s.price_hatchback != null ? String(s.price_hatchback) : '',
      coupe: s.price_coupe != null ? String(s.price_coupe) : '',
    },
  }
}

function formToPayload(f: FormState): ServicePayload {
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    price: parseFloat(f.price) || 0,
    duration: parseInt(f.duration) || null,
    icon: f.icon.trim() || '🚿',
    prices_by_car_type: Object.fromEntries(
      CAR_TYPES.map((t) => [t, f.carPrices[t]])
    ),
  }
}

function fmtKes(n: number) {
  return 'KES ' + Number(n).toLocaleString()
}

// ── Form Modal ────────────────────────────────────
function ServiceFormModal({
  initial,
  saving,
  onSave,
  onClose,
}: {
  initial?: Service
  saving: boolean
  onSave: (payload: ServicePayload) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(initial ? serviceToForm(initial) : EMPTY_FORM)
  const [showCarPrices, setShowCarPrices] = useState(
    initial ? CAR_TYPES.some((t) => initial[`price_${t}` as keyof Service] != null) : false
  )

  function set(key: keyof Omit<FormState, 'carPrices'>, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function setCarPrice(type: CarType, val: string) {
    setForm((f) => ({ ...f, carPrices: { ...f.carPrices, [type]: val } }))
  }

  function handleSave() {
    if (!form.name.trim()) return
    if (!form.price || isNaN(parseFloat(form.price))) return
    onSave(formToPayload(form))
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-s1 px-5 pt-6"
        style={{ maxHeight: '90vh', paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/10" />
        <div className="mb-5 font-display text-xl font-extrabold text-text">
          {initial ? 'Edit Service' : 'Add Service'}
        </div>

        {/* Name */}
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Service Name
        </label>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Full Interior & Exterior"
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text outline-none focus:border-gold/50"
        />

        {/* Description */}
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Description
        </label>
        <input
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="e.g. Vacuum, wipe, exterior wash"
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text outline-none focus:border-gold/50"
        />

        {/* Price + Duration row */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Base Price (KES)
            </label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="e.g. 800"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Duration (min)
            </label>
            <input
              type="number"
              value={form.duration}
              onChange={(e) => set('duration', e.target.value)}
              placeholder="e.g. 30"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text outline-none focus:border-gold/50"
            />
          </div>
        </div>

        {/* Icon */}
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Emoji Icon
        </label>
        <input
          value={form.icon}
          onChange={(e) => set('icon', e.target.value)}
          placeholder="🚗"
          maxLength={4}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text outline-none focus:border-gold/50"
        />

        {/* Car-type prices toggle */}
        <button
          type="button"
          onClick={() => setShowCarPrices((v) => !v)}
          className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <span className="text-[13px] font-semibold text-text">Price by Car Type</span>
          <span className="text-[12px] text-muted">{showCarPrices ? '▲ Hide' : '▼ Optional'}</span>
        </button>

        {showCarPrices && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            {CAR_TYPES.map((t) => (
              <div key={t}>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {CAR_LABELS[t]}
                </label>
                <input
                  type="number"
                  value={form.carPrices[t]}
                  onChange={(e) => setCarPrice(t, e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-text outline-none focus:border-gold/50"
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={saving || !form.name.trim() || !form.price}
          onClick={handleSave}
          className="mb-2.5 w-full rounded-xl bg-gold py-3.5 text-sm font-bold text-bg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Service'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-[13px] font-semibold text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── ServicesScreen ────────────────────────────────
export function ServicesScreen() {
  const operator = useAppStore((s) => s.operator)
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['services'] })
  }

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => { invalidate(); showToast('✓ Service saved'); setFormOpen(false) },
    onError: (e: Error) => showToast(e.message, true),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ServicePayload }) => updateService(id, payload),
    onSuccess: () => { invalidate(); showToast('✓ Service updated'); setEditing(null) },
    onError: (e: Error) => showToast(e.message, true),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => { invalidate(); showToast('Service deleted'); setConfirmDeleteId(null) },
    onError: (e: Error) => showToast(e.message, true),
  })

  function handleSave(payload: ServicePayload) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/[0.05] bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <button
          onClick={() => navigate('/app/more')}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-text"
        >
          ←
        </button>
        <h2 className="flex-1 font-display text-xl font-extrabold text-text">Services</h2>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-xl border border-gold/25 bg-gold/10 px-3.5 py-2 text-[12px] font-bold text-gold"
        >
          + Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* No wash point linked */}
        {!operator?.wash_point_id && (
          <div className="mb-4 rounded-xl border border-warn/20 bg-warn/10 px-3.5 py-2.5 text-[12px] text-warn">
            No wash point linked to your account — contact admin to link it before managing services.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gold/20 border-t-gold" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-white/[0.05] bg-white/[0.02] py-12 text-center">
            <div className="mb-2 text-4xl">🚿</div>
            <div className="mb-4 text-[13px] text-muted">No services yet</div>
            <button
              onClick={() => setFormOpen(true)}
              className="rounded-xl bg-gradient-to-b from-gold2 to-gold px-5 py-2.5 text-[13px] font-bold text-bg"
            >
              Add First Service
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((s) => {
              const carPrices = CAR_TYPES.filter(
                (t) => s[`price_${t}` as keyof Service] != null
              )

              return (
                <div
                  key={s.id}
                  className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-4"
                >
                  <div className="mb-2 flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gold/10 text-2xl">
                      {s.icon || '🚿'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold text-text">{s.name}</div>
                      {s.description && (
                        <div className="mt-0.5 text-[12px] text-muted">{s.description}</div>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                        {s.points_value != null && <span>⭐ {s.points_value} pts</span>}
                        {s.duration != null && <span>⏱ {s.duration} min</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="font-display text-[16px] font-extrabold text-gold">
                        {fmtKes(s.price)}
                      </div>
                      <div className="text-[10px] text-muted">base price</div>
                    </div>
                  </div>

                  {/* Per-car-type prices */}
                  {carPrices.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {carPrices.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-muted"
                        >
                          {CAR_LABELS[t]}: {fmtKes(Number(s[`price_${t}` as keyof Service]))}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {confirmDeleteId === s.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteMutation.mutate(s.id)}
                        className="flex-1 rounded-xl bg-danger px-3 py-2.5 text-[12px] font-bold text-white"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 rounded-xl border border-white/10 px-3 py-2.5 text-[12px] font-semibold text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(s)}
                        className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 text-[12px] font-semibold text-text"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(s.id)}
                        className="flex-1 rounded-xl border border-danger/20 bg-danger/10 py-2.5 text-[12px] font-semibold text-danger"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {(formOpen || editing) && (
        <ServiceFormModal
          initial={editing ?? undefined}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
