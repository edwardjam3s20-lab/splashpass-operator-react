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

    // Operator already in store — trust it, skip server check
    if (operator) {
      setAuthChecked(true)
      return
    }

    // No operator in store after hydration — verify with server
    if (authChecked) return
    getCurrentOperator().then((op) => {
      setOperator(op)
      setAuthChecked(true)
      if (!op) navigate('/login', { replace: true })
    })
  }, [hydrated, authChecked, operator, setOperator, setAuthChecked, navigate])

  // Wait for hydration before rendering anything
  if (!hydrated) {
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
