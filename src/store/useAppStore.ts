import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Operator } from '../types'

interface AppState {
  operator: Operator | null
  setOperator: (op: Operator | null) => void

  authChecked: boolean
  setAuthChecked: (checked: boolean) => void

  // True once zustand/persist has rehydrated from localStorage.
  // AppShell must wait for this before deciding whether to redirect.
  _hydrated: boolean
  _setHydrated: () => void

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

      authChecked: false,
      setAuthChecked: (checked) => set({ authChecked: checked }),

      _hydrated: false,
      _setHydrated: () => set({ _hydrated: true }),

      toastMessage: null,
      toastIsError: false,
      showToast: (msg, isError = false) => set({ toastMessage: msg, toastIsError: isError }),
      hideToast: () => set({ toastMessage: null }),
    }),
    {
      name: 'splashpass_operator',
      partialize: (state) => ({ operator: state.operator }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated()
      },
    }
  )
)
