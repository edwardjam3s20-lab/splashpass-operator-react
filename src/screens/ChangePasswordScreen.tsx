import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { changePassword } from '../lib/auth'
import { ApiError } from '../lib/api'

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[12px] font-semibold text-muted">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={label === 'Current Password' ? 'current-password' : 'new-password'}
          className="w-full rounded-xl border border-border bg-s2 px-3.5 py-3 pr-11 text-[14px] text-text outline-none focus:border-primary/50"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-faint"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )
}

export function ChangePasswordScreen() {
  const navigate = useNavigate()
  const showToast = useAppStore((s) => s.showToast)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const nextLongEnough = next.length >= 8

  async function handleSave() {
    if (!current || !next || !confirm) { setError('Please fill in all fields.'); return }
    if (!nextLongEnough) { setError('New password must be at least 8 characters.'); return }
    if (next !== confirm) { setError('Passwords do not match.'); return }

    setSaving(true)
    setError('')
    try {
      await changePassword(current, next)
      showToast('Password updated')
      navigate('/app/more')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change password. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/app/more')}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-s2 text-text"
            aria-label="Back to More"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="font-display text-lg font-extrabold text-text">Change Password</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl border border-border bg-s1 p-4">
          <PasswordField
            label="Current Password"
            value={current}
            onChange={setCurrent}
            placeholder="Enter current password"
          />
          <PasswordField
            label="New Password"
            value={next}
            onChange={setNext}
            placeholder="At least 8 characters"
          />
          <PasswordField
            label="Confirm New Password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat new password"
          />

          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2.5 text-[12px] font-semibold text-danger">
              {error}
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-primary py-3.5 text-[14px] font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
