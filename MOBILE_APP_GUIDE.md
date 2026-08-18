# Auto-AI India — Mobile App Guide (Android + iOS)

This guide explains how to package Auto-AI India as Android and iOS apps using Capacitor. The native app uses the production web build bundled into the application, so it does not depend on a hosted app-builder or preview environment.

---

## 📋 What's Already Done

- ✅ Capacitor v7 installed (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`)
- ✅ `capacitor.config.json` configured with:
  - App ID: `com.autoai.india`
  - App Name: `Auto-AI India`
  - Bundled web build mode (`webDir: build`)
  - Dark splash screen (`#050505`) + dark status bar
- ✅ Helper scripts in `package.json`:
  - `yarn mobile:init:android`
  - `yarn mobile:init:ios`
  - `yarn mobile:sync`
  - `yarn mobile:open:android`
  - `yarn mobile:open:ios`

---

## 🚨 BEFORE YOU START

### 1. Get the repository directly from GitHub
Clone the Auto-AI repository to your computer using Git:
```bash
git clone <your-auto-ai-github-repository>
cd Auto-AI/frontend
```

### 2. Install Node 22+
Capacitor 7 needs Node.js `>= 22`.

```bash
# macOS with Homebrew
brew install node@22
# Or with nvm:
nvm install 22 && nvm use 22
```

### 3. Install project dependencies
```bash
yarn install
```

No external app-builder preview URL is required. The native application uses the locally generated `build/` directory.

---

## 🤖 ANDROID (Play Store)

### What you need
- **Android Studio**
- **Java JDK 17**
- **Google Play Console account**

### Step-by-step
```bash
yarn build
yarn mobile:init:android
yarn mobile:sync
yarn mobile:open:android
```

Android Studio will open. Then:

1. Wait for Gradle sync to finish.
2. Click **Run ▶** to test on an emulator or connected phone.
3. When satisfied, use **Build → Generate Signed Bundle / APK → Android App Bundle (AAB)**.
4. Store the signing keystore securely.
5. Upload the signed `.aab` to Play Console.

### Play Console
1. Create the app under **Auto & Vehicles**.
2. Upload the AAB and store screenshots.
3. Complete the content-rating and policy forms.
4. Submit for review.

---

## 🍎 iOS (App Store)

### What you need
- **Mac**
- **Xcode 15+**
- **Apple Developer Program**

### Step-by-step
```bash
yarn build
yarn mobile:init:ios
yarn mobile:sync
cd ios/App && pod install && cd ../..
yarn mobile:open:ios
```

In Xcode:

1. Select the **App** target.
2. Configure **Signing & Capabilities** with your Apple Developer team.
3. Confirm the Bundle Identifier is `com.autoai.india`.
4. Test on a device or simulator.
5. Use **Product → Archive** and distribute through App Store Connect.

---

## 🎨 App Icon & Splash Screen

1. Create a **1024 × 1024 PNG** logo.
2. Put it at `frontend/resources/icon.png`.
3. Create the splash artwork and put it at `frontend/resources/splash.png`.
4. Generate platform assets:
```bash
yarn add -D @capacitor/assets
npx @capacitor/assets generate --iconBackgroundColor "#050505" --splashBackgroundColor "#050505"
```

---

## ✅ Test Checklist

Run the app on a real device:

- [ ] Login / OTP flow
- [ ] AI Compare + Recommend
- [ ] Cars page and images
- [ ] 360° Showroom and paint switching
- [ ] Chat orb and AI responses
- [ ] Stripe Premium checkout
- [ ] Navigation and language toggle
- [ ] Splash screen
- [ ] Android back navigation

---

## 🚀 Updating the app

With bundled web assets, changes to the website/frontend are included in the next native build:

1. Pull the latest GitHub code.
2. Run `yarn build`.
3. Run `yarn mobile:sync`.
4. Build and distribute the updated Android/iOS package when required.

Native plugin changes also require a new native build.

---

## 🆘 Common Issues

**Gradle sync failed** → Open Android Studio → Invalidate Caches / Restart and retry the sync.

**No signing certificate found** → Configure your Apple Developer account in Xcode.

**SafeArea overlap** → The Capacitor configuration already sets `contentInset: always` for iOS.

**App shows stale frontend content** → Run `yarn build` followed by `yarn mobile:sync` before opening the native project.

---

Built with ❤️ for Auto-AI India · Abhishek · Founder
