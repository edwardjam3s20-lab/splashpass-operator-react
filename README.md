# SplashPass Operator (React)

## Architecture

This app does **not** talk to Supabase directly. Every data access goes
through `splashmain`'s Next.js API routes (`/api/operator/...`), which use
a service-role Supabase client server-side. This is intentional and
permanent — `splashmain` is the backend for this app and for the customer
app (`splashpass-react`); there is no plan to extract it elsewhere.

All API calls go through `src/lib/api.ts`, which reads a single
`VITE_API_BASE_URL` env var. This is the only place that URL appears, kept
that way so a future change (e.g. a custom API domain) stays a one-line
edit rather than a find-and-replace.

## The cross-origin cookie constraint

The operator session is an `httpOnly` JWT cookie set by `splashmain`. Since
this app is deployed on a different domain in production, every request is
cross-origin, which means:

- `splashmain`'s `lib/operatorSession.js` sets the cookie with
  `sameSite: 'none'` and `secure: true` (not `'lax'`) — required or the
  browser silently refuses to send the cookie back on requests from this
  app. This fix is already deployed.
- `secure: true` cookies only work over HTTPS — handled for local dev by
  the Vite proxy below, so this isn't something you need to think about
  day-to-day.
- Every `fetch()` call in `src/lib/api.ts` uses `credentials: 'include'`,
  required to send cookies cross-origin — don't remove this.

## Local development

`vite.config.ts` proxies `/api/*` to `splashmain`'s deployed URL, so
requests made via `npm run dev` are same-origin from the browser's
perspective. This means **auth and all API calls work locally**, including
login — you no longer need a deployed preview just to test the app.

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL to splashmain's deployed URL
npm run dev
```

## Confirmed backend routes

All of the following have been read against real source (not guessed) at
some point during development:
- `/api/operator/auth/{login,me,logout,change-password}`
- `/api/operator/services` and `/api/operator/services/[id]`
- `/api/operator/washers` and `/api/operator/washers/[id]`
- `/api/operator/bookings` and `/api/operator/bookings/[id]` (including the
  action-based PATCH lifecycle: assign / start / complete / free)
- `/api/operator/lookup`

**Not yet confirmed:** `/api/operator/status`. If the status toggle on
Home ever behaves unexpectedly, check this one first.
