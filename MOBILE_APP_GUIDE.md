# Auto-AI India — Mobile App Guide (Android + iOS)

Your app is ready to be packaged as a real Android APK and iOS IPA for the Play Store and App Store. This guide is **for you to run on your own computer** (this cloud container cannot produce APKs/IPAs — those need Android Studio / Xcode locally).

You're using **Live Web Wrapper mode**, so the mobile app will load your hosted website inside a native shell. Any change you make on the website (text, car images, AI, etc.) instantly appears in the phone app — no new APK release needed for content updates.

---

## 📋 What's Already Done (inside `/app/frontend`)

- ✅ Capacitor v7 installed (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`)
- ✅ `capacitor.config.json` created with:
  - App ID: `com.autoai.india`
  - App Name: `Auto-AI India`
  - Mode: Live Web Wrapper (loads your deployed URL)
  - Dark splash screen (`#050505`) + dark status bar
- ✅ Helper scripts added to `package.json`:
  - `yarn mobile:init:android` → adds the Android project
  - `yarn mobile:init:ios` → adds the iOS project
  - `yarn mobile:sync` → syncs web build + plugins into native projects
  - `yarn mobile:open:android` → opens Android Studio
  - `yarn mobile:open:ios` → opens Xcode

---

## 🚨 BEFORE YOU START

### 1. Download the project to your computer
- Use Emergent's **"Save to GitHub"** feature (in the chat input bar), then `git clone` the repo on your laptop.

### 2. Install Node 22+ on your computer
Capacitor 7 needs Node.js `>= 22`.
```bash
# macOS with homebrew
brew install node@22
# Or use nvm:
nvm install 22 && nvm use 22
```

### 3. Install project deps locally
```bash
cd frontend
yarn install
```

### 4. Update your production URL (IMPORTANT)
Open `frontend/capacitor.config.json` and replace:
```json
"url": "https://zero-wait-cars.preview.emergentagent.com",
```
with your final deployed URL (e.g. `https://auto-ai-india.com` after you deploy on Emergent / Vercel / Railway).

---

## 🤖 ANDROID (Play Store)

### What you need on your computer
- **Android Studio** (free): https://developer.android.com/studio
- **Java JDK 17** (usually installed with Android Studio)
- **Google Play Console account** (**one-time $25**): https://play.google.com/console

### Step-by-step
```bash
cd frontend

# 1. Do a production web build (even for live mode we need a build folder)
yarn build

# 2. First-time only: add the Android platform
yarn mobile:init:android

# 3. Sync web assets + Capacitor plugins into the Android project
yarn mobile:sync

# 4. Open in Android Studio
yarn mobile:open:android
```

Android Studio will open. From there:

1. Wait for **Gradle sync** to finish (first time takes 5–10 minutes; it downloads Android SDK).
2. Click **Run ▶** to test on an emulator or connected phone.
3. When satisfied, go to **Build → Generate Signed Bundle / APK → Android App Bundle (AAB)**.
4. Create a **keystore** (keep it safe — if you lose it, you can never update your app on Play Store).
5. The signed `.aab` file is what you upload to Play Console.

### Play Console submission
1. Create a new app → category: **Auto & Vehicles**.
2. Upload your `.aab`, add screenshots (at least 2 phone screenshots), short + long description.
3. Complete the content rating questionnaire.
4. Submit for review (usually 1–3 days).

---

## 🍎 iOS (App Store)

### What you need
- A **Mac** (iOS builds can only be done on macOS — no Windows / Linux)
- **Xcode 15+** (free from the Mac App Store)
- **Apple Developer Program** (**$99/year**): https://developer.apple.com

### Step-by-step
```bash
cd frontend
yarn build
yarn mobile:init:ios
yarn mobile:sync
cd ios/App && pod install && cd ../..
yarn mobile:open:ios
```

Xcode will open. From there:

1. Select the **App** target → **Signing & Capabilities** → pick your Apple Developer team.
2. Change the Bundle Identifier if needed (it's set to `com.autoai.india`).
3. Plug in an iPhone OR choose the iOS Simulator → click **Run ▶**.
4. To submit: **Product → Archive**, then in Organizer click **Distribute App → App Store Connect**.

### App Store Connect submission
1. Create an app at https://appstoreconnect.apple.com → category: **Auto & Vehicles**.
2. Upload screenshots (6.7" iPhone required).
3. Fill metadata, privacy policy URL, support URL.
4. Submit for App Review (usually 24–48 hours).

---

## 🎨 App Icon & Splash Screen

The **recommended** way:

1. Create a **1024 × 1024 PNG** of your logo (transparent or `#050505` background). Keep the Auto-AI spark logo centered with ~15% padding.
2. Put it at `frontend/resources/icon.png`.
3. Create a **2732 × 2732 PNG** splash screen (logo centered on `#050505`). Put at `frontend/resources/splash.png`.
4. Install and run the resource generator:
```bash
yarn add -D @capacitor/assets
npx @capacitor/assets generate --iconBackgroundColor "#050505" --splashBackgroundColor "#050505"
```
This auto-generates every size Android and iOS need.

---

## ✅ Test Checklist Before Submitting

Run the app on a **real device**:

- [ ] Login flow (OTP `123456` during testing)
- [ ] AI Compare + Recommend open and work
- [ ] Cars page loads images
- [ ] 360° Showroom shows the car photo + paint switching works
- [ ] Chat orb opens and AI responds
- [ ] Stripe Premium checkout reaches the Stripe page
- [ ] Navbar / language toggle works
- [ ] Splash screen is dark and flashes briefly
- [ ] Back button (Android) navigates properly

---

## 💰 Cost Summary

| Thing | Cost |
|------|------|
| Android Studio | Free |
| Google Play Console | **$25** (one-time, ever) |
| Xcode | Free |
| Apple Developer Program | **$99 / year** |
| **Total to launch on both** | **~$124 first year, $99/year after** |

---

## 🚀 Updating the app in the future

Because you're in **Live Web Wrapper** mode:

- **Content / UI / AI changes** → just redeploy the website. Users open the app and see the update instantly. ZERO Play Store / App Store involvement. ✨
- **Native plugin changes** (camera, notifications, etc.) → rebuild the APK/IPA and re-submit to the stores. Only needed rarely.

---

## 🆘 Common Issues

**"Gradle sync failed"** → Open Android Studio → File → Invalidate Caches → Restart.

**"No signing certificate found" (iOS)** → Xcode → Preferences → Accounts → add your Apple ID → then retry.

**"SafeArea overlap"** → Already handled (`contentInset: always` in capacitor.config.ts).

**"Site won't load in app"** → Check that your production URL is HTTPS, not HTTP (mixed content is disabled). Update `server.url` in `capacitor.config.json`.

---

Built with ❤️ for Auto-AI India · Abhishek · Founder
