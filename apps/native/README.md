# Native companion (React Native / Expo)

Optional mobile companion for the Oequ SaaS Starter. Same **Supabase Auth** as `apps/web` (sign in, register, email confirmation OTP). Not a full dashboard / API Console port.

**SDK:** Expo **54** (matches current Play Store Expo Go).

## What / not

| In scope now | Out of scope |
|---|---|
| Login, register, confirm email, sign out | Org switcher, billing tables, API Console |
| Session persistence (AsyncStorage) | Push / HITL alerts (later) |
| Local APK sideload | Required App Store / Play listing |

## Prerequisites

1. Local Supabase: from repo root `npm run db:start` (or hosted project).
2. Copy env:

```bash
cd apps/native
cp .env.example .env
```

Fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `npm run db:status`.

**Phone on Wi‑Fi:** use your PC LAN IP (`http://192.168.x.x:54321`), not `127.0.0.1`.  
**Android emulator:** often `http://10.0.2.2:54321`.  
**Cleartext HTTP** is enabled for local API (`usesCleartextTraffic`).

3. Install deps (own `package.json`):

```bash
npx nx run native:install
# or: cd apps/native && npm install --legacy-peer-deps
```

## Run

```bash
# repo root — LAN
npm run start:native

# tunnel
npx nx run native:start-tunnel
```

Open Expo Go and scan the QR code. Restart with cache clear after env changes: `npx expo start -c` from `apps/native`.

### Auth flow

1. **Create account** → if email confirmations are on (default in `supabase/config.toml`), enter the 6-digit OTP.
2. Local mail: [Inbucket](http://127.0.0.1:54324) on the machine running Supabase.
3. **Sign in** with the same credentials as web.

## Local APK

See [BUILD_ANDROID.md](./BUILD_ANDROID.md). Env vars are baked in at bundle time — set `.env` before `npm run apk:debug`.

## Design

- `src/ui/tokens.ts` + primitives (`Screen`, `Text`, `Button`, `TextField`, `Checkbox`, `Sheet`)
- Fonts: Fraunces + DM Sans
- No Spartan / Angular DI — thin React providers over `src/auth/*` + `@supabase/supabase-js`

## Why Expo

Angular UI does not transfer to phones. Expo is the standard React Native toolchain for Android + iOS. Capacitor (WebView wrap) is not the companion path.
