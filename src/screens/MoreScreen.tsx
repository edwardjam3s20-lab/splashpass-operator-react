import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { logout } from '../lib/auth'
import { initials } from '../lib/operations'

const MENU_ITEMS = [
  {
    key: 'earnings',
    label: 'Earnings',
    path: '/app/more/earnings',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'services',
    label: 'Services & pricing',
    path: '/app/more/services',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M3 12c1.5-4 4-6 9-6s7.5 2 9 6c-1.5 4-4 6-9 6s-7.5-2-9-6z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'roster',
    label: 'Manage team',
    path: '/app/team/roster',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <circle cx="9" cy="8" r="3" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" strokeLinecap="round" />
        <path d="M16 3.5a3 3 0 010 9M19 14.5c2 .6 3.3 2.4 3.3 5.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'change-password',
    label: 'Change password',
    path: '/app/more/change-password',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round" />
      </svg>
    ),
  },
]

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
      showToast('Logged out locally — server may not have cleared the session.', true)
    }
    setOperator(null)
    setAuthChecked(false)
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <h2 className="font-display text-lg font-extrabold text-text">More</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Profile card */}
        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-s1 p-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-white">
            {operator ? initials(operator.wash_point || operator.name) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold text-text">
              {operator?.wash_point || '—'}
            </div>
            <div className="truncate text-[13px] text-muted">{operator?.name}</div>
            {operator?.commission_tier && (
              <div className="mt-0.5 text-[11px] font-semibold text-primary2">
                Tier {operator.commission_tier}
              </div>
            )}
          </div>
        </div>

        {/* Menu grid */}
        <div className="mb-5 grid grid-cols-2 gap-2.5">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex flex-col items-start gap-3 rounded-xl border border-border bg-s1 p-4 text-left active:bg-s2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary2">
                {item.icon}
              </span>
              <span className="text-[13px] font-semibold text-text">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Log out */}
        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          className="w-full rounded-xl border border-danger/25 bg-danger/10 py-3.5 text-sm font-bold text-danger disabled:opacity-50"
        >
          {loggingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>
    </div>
  )
}
