import { useLocation, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <rect x="3" y="3" width="8" height="10" rx="2" />
        <rect x="13" y="3" width="8" height="6" rx="2" />
        <rect x="13" y="11" width="8" height="10" rx="2" />
        <rect x="3" y="15" width="8" height="6" rx="2" />
      </svg>
    ),
  },
  {
    id: 'queue',
    label: 'Queue',
    path: '/app/queue',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M4 6h4M4 12h4M4 18h4" strokeLinecap="round" />
        <rect x="11" y="4" width="9" height="4" rx="1" />
        <rect x="11" y="10" width="9" height="4" rx="1" />
        <rect x="11" y="16" width="9" height="4" rx="1" />
      </svg>
    ),
  },
  {
    id: 'scan',
    label: 'Scan',
    path: '/app/scan',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
        <path d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 12h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'team',
    label: 'Team',
    path: '/app/team',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <circle cx="17.5" cy="8.5" r="2.4" opacity="0.55" />
      </svg>
    ),
  },
  {
    id: 'more',
    label: 'More',
    path: '/app/more',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-between border-t border-border bg-s1/95 px-1 backdrop-blur-xl"
      style={{ paddingBottom: 'calc(6px + env(safe-area-inset-bottom))' }}
    >
      {NAV_ITEMS.map((item) => {
        const active = location.pathname.startsWith(item.path)
        const isScan = item.id === 'scan'

        if (isScan) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className="relative flex flex-1 flex-col items-center gap-1 pb-1 pt-2"
              aria-label="Scan"
            >
              <span
                className={[
                  '-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-colors duration-150',
                  active
                    ? 'bg-primary text-white shadow-primary/30'
                    : 'bg-primary/90 text-white shadow-primary/20',
                ].join(' ')}
              >
                {item.icon}
              </span>
              <span
                className={[
                  'font-display text-[10px] font-semibold uppercase tracking-wide',
                  active ? 'text-primary2' : 'text-muted',
                ].join(' ')}
              >
                {item.label}
              </span>
            </button>
          )
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.path)}
            className="flex flex-1 flex-col items-center gap-1 px-1 pb-1 pt-2.5"
          >
            <span className={['transition-colors duration-150', active ? 'text-primary2' : 'text-muted'].join(' ')}>
              {item.icon}
            </span>
            <span
              className={[
                'font-display text-[10px] font-semibold uppercase tracking-wide transition-colors duration-150',
                active ? 'text-primary2' : 'text-muted',
              ].join(' ')}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
