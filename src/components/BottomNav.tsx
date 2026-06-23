import { useLocation, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    path: '/app/home',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.5z" />
      </svg>
    ),
  },
  {
    id: 'scan',
    label: 'Scan',
    path: '/app/scan',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <path d="M14 14h3v3h-3zM18 14h3v3h-3zM14 18h3v3h-3zM18 18h3v3h-3z" />
      </svg>
    ),
  },
  {
    id: 'washers',
    label: 'Wash',
    path: '/app/washers',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M12 2a4 4 0 014 4v2h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h2V6a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    id: 'earnings',
    label: 'Earnings',
    path: '/app/earnings',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.5]">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'more',
    label: 'More',
    path: '/app/more',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t border-white/[0.07] bg-s1/95 backdrop-blur-xl"
      style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
    >
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.path
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.path)}
            className="flex flex-1 flex-col items-center gap-1 px-1 pt-2 pb-1"
          >
            <span
              className={[
                'transition-all duration-150',
                active ? 'text-gold drop-shadow-[0_0_6px_rgba(255,176,32,0.6)]' : 'text-muted',
              ].join(' ')}
            >
              {item.icon}
            </span>
            <span
              className={[
                'font-display text-[10px] font-semibold uppercase tracking-wide transition-colors duration-150',
                active ? 'text-gold' : 'text-muted',
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
