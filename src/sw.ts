/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Workbox precaching — injected by vite-plugin-pwa's injectManifest build
// step. This is the only thing the previous (nonexistent) service worker
// would have done if generated via the default generateSW strategy; the
// push handling below is the actual reason this file exists at all.
precacheAndRoute(self.__WB_MANIFEST)

self.skipWaiting()
clientsClaim()

interface BookingPushPayload {
  title: string
  body: string
  bookingId?: string
  url?: string
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: BookingPushPayload = {
    title: 'SplashPass Operator',
    body: 'You have a new notification.',
  }

  // A push event with no data is valid (some browsers/providers send empty
  // pings) — fall back to the generic payload above rather than throwing.
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      payload = { ...payload, body: event.data.text() }
    }
  }

  const url = payload.url || (payload.bookingId ? `/app/queue?booking=${payload.bookingId}` : '/app/queue')

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons.svg',
      badge: '/icons.svg',
      tag: payload.bookingId ? `booking-${payload.bookingId}` : undefined,
      // Replaces an existing notification for the same booking instead of
      // stacking duplicates if, for some reason, more than one push fires
      // for the same request. TS's bundled NotificationOptions type hasn't
      // caught up to this (widely-supported) option, hence the cast.
      renotify: true,
      data: { url },
    } as NotificationOptions)
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url || '/app/queue'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Prefer focusing an already-open tab over opening a new one — an
      // operator likely already has the app open somewhere.
      for (const client of allClients) {
        if ('focus' in client) {
          await (client as WindowClient).navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })()
  )
})
