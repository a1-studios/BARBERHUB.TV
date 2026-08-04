# Shipping barberhub-tv as a native iOS app (Capacitor)

Capacitor is already configured in this repo:

- `capacitor.config.ts` — appId `app.lovable.64d76cf785b647159c81e3a2358707e1`, appName `barberhub-tv`, `webDir: dist`, hot-reload `server.url` pointed at the Lovable sandbox.
- `@capacitor/core`, `@capacitor/ios`, `@capacitor/android` installed; `@capacitor/cli` as a dev dependency.
- The service worker is disabled inside the native WebView (`src/lib/pwa.ts`), so the app never serves stale HTML in the shell.

## Steps you run locally (Mac + Xcode required)

```bash
# 1. Export to GitHub from Lovable, then clone/pull it
git pull

# 2. Install deps
npm install

# 3. Add the native platform
npx cap add ios          # and/or: npx cap add android
npx cap update ios

# 4. Build the web bundle and sync it into the native project
npm run build
npx cap sync

# 5. Run on simulator or device
npx cap run ios
```

Re-run `npm run build && npx cap sync` after every `git pull`.

## iOS permissions

Battle streaming uses the camera and microphone (LiveKit / getUserMedia). After
`npx cap add ios`, add these to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Barber-Hub uses your camera for live battles and video submissions.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Barber-Hub uses your microphone during live battles.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save your battle clips to your photo library.</string>
```

WKWebView supports WebRTC on iOS 14.3+; LiveKit works without a native plugin.

## Auth redirects

Add these to Supabase → Authentication → URL Configuration → Redirect URLs so
OAuth completes inside the app:

```
capacitor://localhost
capacitor://localhost/auth/callback
https://barberhub.tv/auth/callback
```

## Going to production

Before submitting to the App Store, remove or comment out the `server` block in
`capacitor.config.ts` — it points the shell at the Lovable sandbox for hot
reload. Without it the app loads the bundled `dist/` build.
