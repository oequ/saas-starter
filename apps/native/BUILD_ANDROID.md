# Local Android APK (no Play Store)

Sideload an APK onto a phone without Google Play registration. Free. Needs a one-time Android toolchain on this PC.

## Prerequisites (once)

1. Install **Android Studio** (includes SDK + platform tools):  
   https://developer.android.com/studio
2. In Android Studio → **SDK Manager**, install:
   - Android SDK Platform **35** (or the one Expo prebuild requests)
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
3. Install a **JDK 17** (Android Studio’s bundled JBR is fine).
4. Set user env vars (or let the script detect Studio defaults):

```text
ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr
```

Add to `PATH`: `%ANDROID_HOME%\platform-tools`, `%JAVA_HOME%\bin`.

5. Accept licenses:

```powershell
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
```

No Expo account and no Play Developer account are required for a local debug/release APK you install yourself.

## Build (from this folder)

```powershell
npm install --legacy-peer-deps
npm run apk:debug
```

Output (typical):

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Also copied to:

```text
dist-apk/oequ-companion-debug.apk
```

Set `apps/native/.env` **before** building — Expo embeds `EXPO_PUBLIC_*` at bundle time.

Release (still local signing with the debug keystore unless you add your own):

```powershell
npm run apk:release
```

## Install on phone

1. Copy the APK to the device (USB, Drive, Telegram to yourself).
2. Allow **Install unknown apps** for that file source.
3. Open the APK and install.

Package id: `io.oequ.companion`

### "Unable to load script"

A stock React Native **debug** APK looks for Metro (`localhost:8081`) and shows a red screen if the phone is not tethered to a running bundler. The local build script embeds the JS bundle into **debug and release** APKs (`debuggableVariants = []`), so sideload works offline. Rebuild with `npm run apk:debug` (or `apk:release`) after pulling that change.

## Optional: EAS cloud APK

If you prefer not to install Android Studio, create a free Expo account and run:

```powershell
npx eas-cli login
npx eas-cli build -p android --profile preview
```

That uses Expo’s builders (free tier limits). Local scripts above stay the default for this repo.

## Nx

```powershell
npx nx run native:apk-debug
```
