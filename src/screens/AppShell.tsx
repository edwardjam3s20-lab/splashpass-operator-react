import { useEffect } from 'react'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { getCurrentOperator } from '../lib/auth'
import { BottomNav } from '../components/BottomNav'

export function AppShell() {
  const operator = useAppStore((s) => s.operator)
  const setOperator = useAppStore((s) => s.setOperator)
  const authChecked = useAppStore((s) => s.authChecked)
  const setAuthChecked = useAppStore((s) => s.setAuthChecked)
  const hydrated = useAppStore((s) => s._hydrated)
  const navigate = useNavigate()

  useEffect(() => {
    // Wait for persist to rehydrate before doing anything
    if (!hydrated) return

    // Already revalidated this mount — don't re-fire on every render
    if (authChecked) return

    // Show cached operator immediately (avoids the flash-redirect on
    // refresh), but always confirm with the server in the background —
    // a cached operator is a UX optimization, never the final word.
    // If the server disagrees (session revoked, wash_point_id changed,
    // operator deactivated), this corrects the cache and redirects.
    getCurrentOperator().then((op) => {
      setOperator(op)
      setAuthChecked(true)
      if (!op) navigate('/login', { replace: true })
    })
  }, [hydrated, authChecked, setOperator, setAuthChecked, navigate])

  // Wait for hydration before rendering anything
  if (!hydrated) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gold/20 border-t-gold" />
      </div>
    )
  }

  // No cached operator and haven't confirmed yet — show loader rather than
  // a real screen, since we don't yet know if this person is logged in.
  if (!operator && !authChecked) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gold/20 border-t-gold" />
      </div>
    )
  }

  if (!operator) return <Navigate to="/login" replace />

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
