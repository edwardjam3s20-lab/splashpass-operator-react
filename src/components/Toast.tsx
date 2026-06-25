import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function Toast() {
  const message = useAppStore((s) => s.toastMessage)
  const isError = useAppStore((s) => s.toastIsError)
  const hideToast = useAppStore((s) => s.hideToast)

  useEffect(() => {
    if (!message) return
    const id = setTimeout(hideToast, 3500)
    return () => clearTimeout(id)
  }, [message, hideToast])

  return (
    <div
      className={[
        'fixed left-1/2 top-6 z-[999] -translate-x-1/2 max-w-[90vw] whitespace-nowrap overflow-hidden text-ellipsis',
        'rounded-2xl border-l-4 bg-s2 px-5 py-3.5 text-sm text-text shadow-lg transition-all duration-300',
        isError ? 'border-l-danger' : 'border-l-success',
        message ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      {message}
    </div>
  )
}
