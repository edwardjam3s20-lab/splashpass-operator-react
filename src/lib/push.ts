import { apiFetch } from './api'

// Set via env at build time — the public half of the VAPID keypair
// generated for this app. Safe to expose to the client (that's the whole
// point of the public/private split); only the private key on the
// backend must stay secret.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushSupport = 'unsupported' | 'denied' | 'granted' | 'default'

export function getPushSupport(): PushSupport {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission as PushSupport
}

/**
 * Permission can be 'granted' at the browser level while the user has
 * never actually subscribed (or unsubscribed locally without permission
 * itself being revoked) — those are two different facts. UI that wants to
 * show "Enable" vs "Turn off" correctly needs this, not getPushSupport().
 */
export async function isSubscribedToPush(): Promise<boolean> {
  if (getPushSupport() !== 'granted') return false
  if (!('serviceWorker' in navigator)) return false
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

// PushManager wants the VAPID key as a Uint8Array, not the base64url
// string web-push's CLI prints out — this is the standard conversion.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

/**
 * Full subscribe flow: must be called from a user gesture (e.g. a button
 * tap) — browsers block silent permission requests on page load, and even
 * where they don't, prompting unprompted is bad practice. Returns a
 * human-readable result so the caller can show appropriate UI without
 * needing to know the mechanics.
 */
export async function subscribeToPush(): Promise<{ ok: boolean; message: string }> {
  const support = getPushSupport()
  if (support === 'unsupported') {
    return { ok: false, message: 'Push notifications are not supported on this browser/device.' }
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, message: 'Push is not configured for this build (missing VITE_VAPID_PUBLIC_KEY).' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, message: 'Notification permission was not granted.' }
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  await apiFetch('/api/operator/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription.toJSON()),
  })

  return { ok: true, message: 'Notifications enabled.' }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await apiFetch('/api/operator/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  }).catch(() => {
    // Best-effort — the local unsubscribe already succeeded, which is the
    // part that actually stops notifications from showing on this device.
    // A stale row server-side just means one harmless failed send later.
  })
}
