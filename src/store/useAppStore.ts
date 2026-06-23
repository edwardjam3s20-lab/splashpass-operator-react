import { create } from 'zustand'
import type { Operator } from '../types'

interface AppState {
  operator: Operator | null
  setOperator: (op: Operator | null) => void

  authChecked: boolean
  setAuthChecked: (checked: boolean) => void

  toastMessage: string | null
  toastIsError: boolean
  showToast: (msg: string, isError?: boolean) => void
  hideToast: () => void
}

export const useAppStore = create<AppState>((set) => ({
  operator: null,
  setOperator: (op) => set({ operator: op }),

  // Tracks whether we've completed the initial /api/operator/auth/me check.
  // Needed because there's no synchronous way to know login state (httpOnly
  // cookie) — RequireAuth needs to distinguish "still checking" from
  // "checked and not logged in" to avoid a flash-redirect to login.
  authChecked: false,
  setAuthChecked: (checked) => set({ authChecked: checked }),

  toastMessage: null,
  toastIsError: false,
  showToast: (msg, isError = false) => set({ toastMessage: msg, toastIsError: isError }),
  hideToast: () => set({ toastMessage: null }),
}))
