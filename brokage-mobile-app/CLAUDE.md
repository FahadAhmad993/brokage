# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Brokage** — React Native 0.85 / React 19 mobile app for property listings + chat. The on-disk folder is still `sanctuaryMobileApp` but the project was renamed: native iOS targets live under `ios/brokageMobileApp*`, `app.json` declares `name: "brokageMobileApp"`, and persisted storage keys are namespaced `brokage.*.v1`. When touching display strings or storage keys, prefer `Brokage` / `brokage.*` and the `APP_NAME` constant from `src/config/appConfig.ts`.

## Commands

```sh
npm start              # Metro bundler
npm run ios            # build + run iOS sim (after `bundle exec pod install` in ios/)
npm run android        # build + run Android
npm run lint           # eslint .
npm test               # jest (preset: @react-native/jest-preset)
npm test -- App.test   # run a single test by name
```

iOS first run (or after native dep changes):

```sh
bundle install                    # one-time
bundle exec pod install --project-directory=ios
```

Node `>= 22.11.0` is required (see `package.json#engines`).

## Architecture

### API mode switch

`src/api/client.ts` is the single network layer. Every exported function branches on `API_MODE` (defined in `src/config/appConfig.ts`):

- `'mock'` — returns local fixtures from `src/api/mockData.ts`, optionally merged with the user's draft listings from `useMyListingsStore`.
- `'live'` — hits `API_BASE_URL` over `fetch`, with a Bearer token loaded from AsyncStorage (`brokage.api.token.v1`), and opens a socket.io connection at `${origin}/chat` for real-time chat/presence/typing.

When adding an API call, follow the existing pattern: implement the `live` branch with `apiRequest<T>` and provide a mock branch that mutates/reads the relevant Zustand store. `apiRequest` unwraps `{ success, data }` envelopes automatically.

`API_BASE_URL` is loaded from `.env` via `react-native-dotenv` (configured in `babel.config.js` under module name `@env`; types declared in `src/types/env.d.ts`). After editing `.env`, **restart Metro with `--reset-cache`** — babel-plugin output is cached and stale `.env` values otherwise persist.

### State: Zustand + AsyncStorage, gated hydration

Persistent state lives in `src/stores/` (`authStore`, `credentialsStore`, `favoritesStore`, `myListingsStore`, `preferencesStore`). Each store exposes a `hydrate()` that reads from AsyncStorage on cold start. `AppProviders` calls all four hydrators in parallel; `useAppHydration()` is the AND of every store's `hydrated` flag and gates `RootNavigator` (boot screen until true). When adding a new persisted store, add its `hydrate()` to both `AppProviders` and `useAppHydration`.

Server state uses **React Query** (`QueryClientProvider` in `AppProviders`) with project defaults (`staleTime: 60s`, `retry: 2`, `networkMode: 'online'`). Real-time chat events update the query cache directly — see the `onThreadUpdate` effect in `AppProviders` that mutates `['threads', userId]`.

### Chat socket lifecycle

Owned by the `chat` registry inside `src/api/client.ts`. Rules:

- **One socket per session, ever.** `connectChatSocket()` coalesces parallel callers via a shared `connecting` promise; `disconnectChatSocket()` is the only way to tear it down. Never call `io(...)` directly elsewhere.
- **Subscribers register against the registry, not the Socket.** `onIncomingChatMessage` / `onTypingUpdate` / `onThreadUpdate` / `onPresenceUpdate` add into `chat.subs.*` Sets that are dispatched to from listeners attached once per socket instance — so subscriptions survive reconnects and socket replacement.
- **Rooms are remembered.** `joinChatThreadSocket(id)` adds to `chat.joinedThreads`; the `connect` handler re-emits `thread:join` for every entry on every (re)connection.
- **Logout disconnects.** `clearSessionToken()` calls `disconnectChatSocket()`, and `AppProviders` does the same in its `userId` effect cleanup. Both are idempotent — the next login authenticates with the new token.

### Navigation

Stacked structure (`@react-navigation/native-stack` + bottom tabs):

```
RootNavigator (Auth | Main, swapped by user presence)
└─ MainTabNavigator
   ├─ GroupChatsTab → ChatsStackNavigatorWithMode(mode="group")
   ├─ ChatsTab      → ChatsStackNavigatorWithMode(mode="all")
   └─ ProfileTab    → ProfileStackNavigator
```

Note: both chat tabs reuse the same stack component with a `mode` prop — don't create a parallel implementation. The `HomeTab` is intentionally commented out in `MainTabNavigator.tsx`; restore it there if Home returns. Deep links are declared centrally in `src/navigation/linking.ts` (scheme `brokage://`).

**Cross-tab navigation must go through `src/navigation/crossTabNavigate.ts`** (e.g. `navigateToChatsThread`). Calling `navigation.navigate('OtherTab', ...)` from a nested stack is unreliable on some Android builds; the helpers dispatch `CommonActions.navigate` against the root tab router.

### Forms

React Hook Form + Zod. The Add Property wizard is the canonical example: per-step schemas in `src/screens/property/addProperty/listingFormSchema.ts`, with `applyZodIssues` translating `ZodIssue[]` into `setError` calls. `ListingFormValues` and its defaults live in `src/types/listingForm.ts`.

### Theming

Always import design tokens from `src/theme/` rather than inlining colors/spacing/typography. The barrel at `src/theme/index.ts` re-exports `colors`, `typography`, `spacing`, `layout`, `shadows`, `iconSize`, `iconStroke`, `screenStyles`, `navigationTheme`. The navigation container is themed via `navigationTheme`.

### Errors and alerts

`AppErrorBoundary` (in `App.tsx`) wraps the whole tree and exposes a recover-key reset. Use `logger` from `src/lib/logger.ts` (debug/info/warn are no-ops in release, errors always emit) — don't `console.log` directly. For user-facing dialogs, use `useAppAlert` / `useAppToast` from `src/components/appAlert`; from non-React code (e.g. image picker helpers) call `showAppAlert` from `src/lib/globalAppAlert.ts`.

## Build configuration gotchas

- **`babel.config.js`** intentionally includes `@babel/plugin-transform-export-namespace-from` — Zod v4's ESM uses `export * as`, which Hermes/Metro need this plugin to handle. Don't remove it.
- **`metro.config.js`** is intentionally the default. The inline comment warns against adding to `unstable_conditionNames` — doing so breaks `package.json` "exports" resolution for some deps and yields wrong interop on device.

## Types

All shared domain types are in `src/types/models.ts` (`Property`, `ManagedListing`, `User`, `ChatThread`, `ChatMessage`, etc.) and `src/types/listingForm.ts`. Navigation param lists are in `src/navigation/types.ts` — keep these in sync when adding screens or route params.
