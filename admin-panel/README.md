# Real Estate Admin Panel

A separate web app (Vite + React + TypeScript) for managing the Brokage
backend — users, communities, and ad review. Talks to the same NestJS API
the mobile app uses.

## Setup

```sh
npm install
cp .env.example .env   # edit VITE_API_BASE_URL to point at your backend
npm run dev
```

## Creating the first admin

There's intentionally no self-serve "become an admin" flow. Promote a user
directly in Postgres after they've registered once through the mobile app
(or `POST /auth/register`):

```sql
UPDATE users SET "isAdmin" = true WHERE email = 'you@example.com';
```

Then sign in on the admin panel's login screen with that account. Any user
without `isAdmin = true` is rejected at login (`AdminGuard` also blocks
every `/admin/*` request server-side, independent of the frontend check).

## What's here

- **Users** — list every registered user; block, disable, or delete them.
  Block/disable take effect immediately (checked on every request server
  side, not just at next login).
- **Communities** — list existing communities (group chats) and create new
  ones. Each community is its own chat thread; messages stay scoped to the
  community they were sent in. Creating one immediately adds every existing
  user as a member so it shows up in their app without waiting.
- **Ads** — read-only list of submitted community posts. Verify/Reject are
  UI-only for now (buttons are visibly disabled) until the moderation
  workflow is built.
- **Payments** — placeholder ("Coming soon").

## Build

```sh
npm run build   # outputs to dist/ — deploy as a static site anywhere
```
