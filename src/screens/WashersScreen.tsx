import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { fetchWashers, addWasher, updateWasher, deleteWasher } from '../lib/washers'
import { fetchTodayBookings } from '../lib/bookings'
import { initials } from '../lib/operations'
import type { Washer } from '../types'

const ROLES = ['Washer', 'Senior Washer', 'Supervisor']

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
        className="w-full max-w-lg rounded-t-2xl bg-s1 px-5 pt-6"
        style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
        <div className="mb-4 font-display text-lg font-extrabold text-text">
          {initial ? 'Edit washer' : 'Add washer'}
        </div>

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="mb-4 w-full rounded-xl border border-border bg-s2 px-4 py-3 text-sm text-text outline-none focus:border-primary/50"
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
                role === r ? 'border-primary/40 bg-primary/15 text-primary2' : 'border-border bg-s2 text-muted',
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
          className="mb-2.5 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-border bg-s2 py-3 text-[13px] font-semibold text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── WashersScreen — roster CRUD, reached via Team → "Manage roster" ──
export function WashersScreen() {
  const navigate = useNavigate()
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
  // as the Team and Dashboard screens, kept in sync via the shared
  // ['bookings','today'] query key.
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
      showToast('Washer added')
      setFormOpen(false)
    },
    onError: (e: Error) => showToast(e.message, true),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name, role }: { id: string; name: string; role: string }) =>
      updateWasher(id, { name, role }),
    onSuccess: () => {
      invalidate()
      showToast('Washer updated')
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
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/app/team')}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-s2 text-text"
            aria-label="Back to Team"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="font-display text-lg font-extrabold text-text">Manage roster</h2>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-2 text-[12px] font-bold text-primary2"
        >
          + Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {washersData?.useLocal && (
          <div className="mb-4 rounded-xl border border-warn/25 bg-warn/10 px-3.5 py-2.5 text-[12px] text-warn">
            Your account isn't linked to a wash point yet — ask admin to link it before adding staff.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          </div>
        ) : washers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-s1 py-10 text-center">
            <div className="text-[13px] text-faint">No washers added yet</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {washers.map((w) => {
              const busy = busyWasherIds.has(String(w.id))
              return (
                <div
                  key={w.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-s1 p-3.5"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 font-display text-[13px] font-bold text-primary2">
                    {initials(w.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-text">{w.name}</div>
                    <div className="text-[11px] text-faint">{w.role || 'Washer'}</div>
                  </div>
                  <span
                    className={[
                      'flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                      busy ? 'bg-primary/15 text-primary2' : 'bg-success/15 text-success',
                    ].join(' ')}
                  >
                    {busy ? 'Washing' : 'Available'}
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
                        className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-shrink-0 gap-1.5">
                      <button
                        onClick={() => setEditing(w)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-s2 text-muted"
                        aria-label="Edit"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(w.id)}
                        disabled={busy}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger disabled:opacity-30"
                        aria-label="Remove"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a1 1 0 001 1h6a1 1 0 001-1V7" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
