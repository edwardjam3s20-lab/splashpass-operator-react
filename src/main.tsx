import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Registers the service worker (src/sw.ts) so it's installed and ready
// before any push-subscribe attempt later. This only registers it — it
// does NOT request notification permission or subscribe to push; that
// stays gated behind an explicit user action (see lib/push.ts), since
// browsers require a user gesture for permission prompts and silently
// asking on load is both bad UX and often blocked outright.
registerSW({ immediate: true })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
