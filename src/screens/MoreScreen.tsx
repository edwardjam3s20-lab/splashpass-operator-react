import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { logout } from '../lib/auth'

export function MoreScreen() {
  const operator = useAppStore((s) => s.operator)
  const setOperator = useAppStore((s) => s.setOperator)
  const setAuthChecked = useAppStore((s) => s.setAuthChecked)
  const showToast = useAppStore((s) => s.showToast)
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // Clear local state regardless — even if the server call fails,
      // there's nothing useful the user can do except try again, and
      // staying "logged in" client-side with a dead session helps no one.
      showToast('Logged out locally — server may not have cleared the session.', true)
    }
    setOperator(null)
    setAuthChecked(false)
    navigate('/login', { replace: true })
  }

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <h2 className="font-display text-xl font-extrabold text-text">More</h2>
      </div>

      <div className="flex-1 p-4">
        {/* Profile card */}
        <div className="mb-4 flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold2 to-gold font-display text-lg font-extrabold text-bg">
            {operator ? initials(operator.wash_point || operator.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate font-display text-base font-bold text-text">
              {operator?.wash_point || '—'}
            </div>
            <div className="truncate text-[13px] text-muted">{operator?.name}</div>
            <div className="mt-0.5 text-[11px] font-semibold text-gold">
              Tier {operator?.commission_tier}
            </div>
          </div>
        </div>

        {/* Log out */}
        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          className="w-full rounded-xl border border-danger/20 bg-danger/10 py-3.5 text-sm font-bold text-danger disabled:opacity-50"
        >
          {loggingOut ? 'Signing out…' : 'Log Out'}
        </button>
      </div>
    </div>
  )
}
