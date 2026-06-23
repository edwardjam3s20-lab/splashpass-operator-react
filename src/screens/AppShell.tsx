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
  const navigate = useNavigate()

  useEffect(() => {
    // Operator already in store (e.g. just logged in) — no need to re-fetch
    if (operator) {
      setAuthChecked(true)
      return
    }
    if (authChecked) return
    // Page refresh: no operator in store, check session cookie with server
    getCurrentOperator().then((op) => {
      setOperator(op)
      setAuthChecked(true)
      if (!op) navigate('/login', { replace: true })
    })
  }, [authChecked, operator, setOperator, setAuthChecked, navigate])

  // Still checking session on refresh
  if (!authChecked && !operator) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gold/20 border-t-gold" />
      </div>
    )
  }

  if (!operator) return <Navigate to="/login" replace />

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Scrollable screen content */}
      <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
        <Outlet />
      </div>

      {/* Fixed bottom nav */}
      <BottomNav />
    </div>
  )
}
