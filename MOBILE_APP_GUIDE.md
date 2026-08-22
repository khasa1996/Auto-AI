# Auto-AI India — Mobile App Guide (Android + iOS)

This guide explains how to package Auto-AI India as Android and iOS apps using Capacitor. The native app uses the production web build bundled into the application, so it does not depend on a hosted app-builder or preview environment.

---

## 📋 What's Already Done

- ✅ Capacitor v7 installed (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`)
- ✅ Capacitor configuration uses:
  - App ID: `com.autoai.india`
  - App Name: `Auto-AI India`
  - Bundled web build mode (`webDir: build`)
  - Dark splash screen + dark status bar
- ✅ Helper scripts in `package.json`:
  - `yarn mobile:init:android`
  - `yarn mobile:init:ios`
  - `yarn mobile:sync`
  - `yarn mobile:open:android`
  - `yarn mobile:open:ios`

---

## 🚨 BEFORE YOU START

### 1. Get the repository directly from GitHub

Clone the Auto-AI repository to your computer and enter the frontend directory:

```bash
git clone <your-auto-ai-github-repository>
cd Auto-AI/frontend
```

### 2. Get Node.js 22+

Capacitor 7 requires a modern Node.js runtime.

```bash
# with nvm
nvm install 22
nvm use 22
```

### 3. Install dependencies

```bash
yarn install
```

No external app-builder preview URL is required. The native application uses the locally generated `build/` directory.

---

## 🤖 ANDROID (Play Store)

### What you need

- Android Studio
- Java JDK 17
- Google Play Console account

### Build

```bash
yarn build
yarn mobile:init:android
yarn mobile:sync
yarn mobile:open:android
```

Then run the app on an emulator/device. When ready, use **Build → Generate Signed Bundle / APK** and upload the signed Android App Bundle to Play Console.

---

## 🍎 iOS (App Store)

### What you need

- Mac
- Xcode 15+
- Apple Developer Program

### Build

```bash
yarn build
yarn mobile:init:ios
yarn mobile:sync
cd ios/App && pod install && cd ../..
yarn mobile:open:ios
```

Configure signing in Xcode, verify the bundle identifier `com.autoai.india`, test on a device/simulator, then archive and distribute through App Store Connect.

---

## 🎨 App Icon & Splash Screen

1. Create a `1024 × 1024` PNG logo.
2. Put it at `frontend/resources/icon.png`.
3. Put splash artwork at `frontend/resources/splash.png`.
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
- [ ] Razorpay one-time Premium checkout and payment verification
- [ ] Navigation and language toggle
- [ ] Splash screen
- [ ] Android back navigation

---

## 💳 Payment Notes

Premium uses Razorpay one-time payments. The mobile client must never contain the Razorpay secret key. The backend creates the order, verifies the checkout signature, confirms captured payment status, and activates the entitlement. Configure the required Razorpay environment variables on the backend before testing payments.

---

## 🚀 Updating the app

With bundled web assets, frontend changes are included in the next native build:

1. Pull the latest GitHub code.
2. Run `yarn build`.
3. Run `yarn mobile:sync`.
4. Build and distribute the updated Android/iOS package when required.

Native plugin changes require a new native build.

---

## 🆘 Common Issues

**Gradle sync failed** → Open Android Studio → Invalidate Caches / Restart and retry.

**No signing certificate found** → Configure the Apple Developer account in Xcode.

**SafeArea overlap** → Verify the Capacitor iOS configuration and safe-area handling.

**App shows stale frontend content** → Run `yarn build` followed by `yarn mobile:sync` before opening the native project.

**Payment starts but verification fails** → Check the backend Razorpay key configuration, webhook secret, order/payment IDs, and server-side signature verification logs. Never put `RAZORPAY_KEY_SECRET` in the frontend.

---

Built with ❤️ for Auto-AI India · Abhishek · Founder
