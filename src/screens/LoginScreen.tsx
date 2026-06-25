import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { login } from '../lib/auth'
import { ApiError } from '../lib/api'

export function LoginScreen() {
  const navigate = useNavigate()
  const operator = useAppStore((s) => s.operator)
  const setOperator = useAppStore((s) => s.setOperator)
  const setAuthChecked = useAppStore((s) => s.setAuthChecked)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect as soon as operator lands in the store
  useEffect(() => {
    if (operator) navigate('/app/dashboard', { replace: true })
  }, [operator, navigate])

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Email and password required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const op = await login(email.trim(), password)
      setAuthChecked(true)
      setOperator(op) // triggers the useEffect above
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError(e.message)
      } else {
        setError(e instanceof Error ? e.message : 'Could not sign in.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-white">
            S
          </div>
          <div className="font-display text-xl font-extrabold text-text">SplashPass Operator</div>
        </div>

        <div className="rounded-2xl border border-border bg-s1 p-6">
          <h1 className="mb-1.5 text-xl font-bold text-text">Sign in</h1>
          <p className="mb-6 text-sm text-muted">Use your operator email and password.</p>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full rounded-xl border border-border bg-s2 px-4 py-3 text-sm text-text outline-none focus:border-primary/50"
              autoComplete="email"
            />
          </div>
          <div className="mb-5">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full rounded-xl border border-border bg-s2 px-4 py-3 text-sm text-text outline-none focus:border-primary/50"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-danger">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleLogin}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}
