import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      operator: null,
      setOperator: (op) => set({ operator: op }),

      // authChecked is NOT persisted — on a fresh page load we always
      // re-verify the session cookie with the server. The operator object
      // is persisted so navigation within the app doesn't flash to login,
      // but we still confirm with the server on every full reload.
      authChecked: false,
      setAuthChecked: (checked) => set({ authChecked: checked }),

      toastMessage: null,
      toastIsError: false,
      showToast: (msg, isError = false) => set({ toastMessage: msg, toastIsError: isError }),
      hideToast: () => set({ toastMessage: null }),
    }),
    {
      name: 'splashpass_operator',
      // Only persist the operator object — not authChecked or toast state
      partialize: (state) => ({ operator: state.operator }),
    }
  )
)
