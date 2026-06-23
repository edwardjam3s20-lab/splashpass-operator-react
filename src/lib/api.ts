const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * Every backend call in this app goes through here. Two things this
 * centralizes on purpose:
 *
 * 1. The base URL — currently splashmain's deployed Next.js app, but this
 *    is the ONLY place that's referenced, so relocating the backend later
 *    (see splashpass-api extraction plan) is a one-line env var change,
 *    not a find-and-replace across the codebase.
 *
 * 2. credentials: 'include' — required because the operator session is a
 *    cross-origin httpOnly cookie (this app's domain differs from the
 *    backend's domain). Without this, the session cookie set by
 *    /api/operator/auth/login would never be sent back on subsequent
 *    requests, and every call would silently 401.
 *
 * Note: API_BASE is intentionally empty in local dev — Vite's proxy
 * forwards /api/* to splashmain.vercel.app, so requests stay same-origin
 * and bypass CORS + Secure-cookie restrictions entirely.
 */
export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(json.error || `Request failed (${res.status})`, res.status)
  }

  return json as T
}
