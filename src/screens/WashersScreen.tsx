import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { fetchWashers, addWasher, updateWasher, deleteWasher } from '../lib/washers'
import { fetchTodayBookings } from '../lib/bookings'
import type { Washer } from '../types'

const ROLES = ['Washer', 'Senior Washer', 'Supervisor']

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Add/Edit modal ────────────────────────────────
function WasherFormModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: Washer
  onSave: (name: string, role: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState(initial?.role ?? ROLES[0])

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-[28px] bg-s1 px-5 pt-6"
        style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/10" />
        <div className="mb-4 font-display text-xl font-extrabold text-text">
          {initial ? 'Edit Washer' : 'Add Washer'}
        </div>

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text outline-none focus:border-gold/50"
        />

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Role
        </label>
        <div className="mb-5 flex gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={[
                'flex-1 rounded-xl border px-2 py-2.5 text-[12px] font-semibold',
                role === r ? 'border-gold/40 bg-gold/15 text-gold' : 'border-white/10 bg-white/[0.03] text-muted',
              ].join(' ')}
            >
              {r}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => onSave(name.trim(), role)}
          className="mb-2.5 w-full rounded-xl bg-gold py-3.5 text-sm font-bold text-bg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
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

// ── WashersScreen ──────────────────────────────────
export function WashersScreen() {
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Washer | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: washersData, isLoading } = useQuery({
    queryKey: ['washers'],
    queryFn: fetchWashers,
  })
  const washers = washersData?.washers ?? []

  // Reuse today's bookings to know who's currently busy — same derivation
  // as HomeScreen, kept in sync via the shared 'bookings','today' query key.
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: fetchTodayBookings,
    refetchInterval: 30_000,
  })
  const busyWasherIds = new Set(
    bookings
      .filter((b) => b.status !== 'completed' && b.assigned_washer_id)
      .map((b) => String(b.assigned_washer_id))
  )

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['washers'] })
  }

  const addMutation = useMutation({
    mutationFn: ({ name, role }: { name: string; role: string }) => addWasher(name, role),
    onSuccess: () => {
      invalidate()
      showToast('✓ Washer added')
      setFormOpen(false)
    },
    onError: (e: Error) => showToast(e.message, true),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name, role }: { id: string; name: string; role: string }) =>
      updateWasher(id, { name, role }),
    onSuccess: () => {
      invalidate()
      showToast('✓ Washer updated')
      setEditing(null)
    },
    onError: (e: Error) => showToast(e.message, true),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWasher,
    onSuccess: () => {
      invalidate()
      showToast('Washer removed')
      setConfirmDeleteId(null)
    },
    onError: (e: Error) => showToast(e.message, true),
  })

  function handleSave(name: string, role: string) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, name, role })
    } else {
      addMutation.mutate({ name, role })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.05] bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <h2 className="font-display text-xl font-extrabold text-text">Washers</h2>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-xl border border-gold/25 bg-gold/10 px-3.5 py-2 text-[12px] font-bold text-gold"
        >
          + Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {washersData?.useLocal && (
          <div className="mb-4 rounded-xl border border-warn/20 bg-warn/10 px-3.5 py-2.5 text-[12px] text-warn">
            Your account isn't linked to a wash point yet — ask admin to link it before adding staff.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gold/20 border-t-gold" />
          </div>
        ) : washers.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] py-10 text-center">
            <div className="mb-2 text-3xl">👷</div>
            <div className="text-[13px] text-muted">No washers added yet</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {washers.map((w) => {
              const busy = busyWasherIds.has(String(w.id))
              return (
                <div
                  key={w.id}
                  className="flex items-center gap-3 rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-4"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-info/15 font-display text-sm font-bold text-info">
                    {initials(w.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-text">{w.name}</div>
                    <div className="text-[11px] text-muted">{w.role || 'Washer'}</div>
                  </div>
                  <span
                    className={[
                      'flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                      busy ? 'bg-info/15 text-info' : 'bg-success/15 text-success',
                    ].join(' ')}
                  >
                    {busy ? '🔵 Washing' : '✅ Free'}
                  </span>

                  {confirmDeleteId === w.id ? (
                    <div className="flex flex-shrink-0 gap-1.5">
                      <button
                        onClick={() => deleteMutation.mutate(w.id)}
                        className="rounded-lg bg-danger px-2.5 py-1.5 text-[11px] font-bold text-white"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-shrink-0 gap-1.5">
                      <button
                        onClick={() => setEditing(w)}
                        className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/[0.05] text-[13px]"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(w.id)}
                        disabled={busy}
                        className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-danger/10 text-[13px] disabled:opacity-30"
                      >
                        🗑️
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
        <WasherFormModal
          initial={editing ?? undefined}
          saving={addMutation.isPending || updateMutation.isPending}
          onSave={handleSave}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
