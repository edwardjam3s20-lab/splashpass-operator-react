# SplashPass Operator — React migration (work in progress)

## Architecture — read this before touching auth

This app does **not** talk to Supabase directly. Every data access goes
through `splashmain`'s existing Next.js API routes (`/api/operator/...`),
which use a service-role Supabase client server-side. This is intentional —
it's the same pattern the real backend already uses, and it means this app
never needs (or should have) database credentials.

All API calls go through `src/lib/api.ts`, which reads a single
`VITE_API_BASE_URL` env var. **This is the only place that URL should ever
appear.** When the backend is eventually extracted out of `splashmain` into
its own project, this is a one-line change, not a rewrite.

## The cross-origin cookie constraint

The operator session is an `httpOnly` JWT cookie set by `splashmain`. Since
this app is deployed on a *different domain*, every request is
cross-origin, which means:

- `splashmain`'s `lib/operatorSession.js` **must** set the cookie with
  `sameSite: 'none'` and `secure: true` (not `'lax'`) — otherwise the
  browser silently refuses to send the cookie back on requests from this
  app, and every authenticated call 401s even right after a successful
  login. This has already been fixed in the copy under
  `operator-react-prep/lib/operatorSession.js` — make sure that fix is
  deployed to splashmain before testing.
- `secure: true` cookies **only work over HTTPS**. This means:
  - `npm run dev` (plain Vite) works fine for UI-only work.
  - Testing the actual login flow requires a deployed HTTPS preview URL —
    `vercel dev` on `http://localhost` will NOT work for anything
    auth-related, because the browser won't set/send a Secure cookie over
    plain HTTP.
  - Every `fetch()` call in `src/lib/api.ts` uses `credentials: 'include'`,
    which is required to send cookies cross-origin — don't remove this.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL to splashmain's deployed URL
npm run dev             # UI work only — auth won't work over plain HTTP
```

To test auth/login for real, deploy a preview (`vercel deploy`) and test
against that HTTPS URL instead.

## Known unverified assumptions

A few backend route shapes were inferred from convention rather than
directly confirmed at the time this was written. If something behaves
unexpectedly, check these first:
- All four `/api/operator/auth/*` routes (login, me, logout,
  change-password) — confirmed against real source as of this writing.
- `/api/operator/services` and `/api/operator/services/[id]` — confirmed.
- Bookings, washers, status, lookup routes — **not yet confirmed**, built
  against guesses about likely shape. Verify before trusting blindly.
