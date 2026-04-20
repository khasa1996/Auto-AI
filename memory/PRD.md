# Auto-AI India — Product Requirements

## What's Implemented (iteration 6, 2026-02-20)

### Backend
- 106-car database, Claude Sonnet 4.5 AI engine (compare, recommend, chat)
- AI-as-CRM (booking tracking via chat), multi-language (8 Indian languages)
- Bookings with auto partner-lead creation, 9 partners (5 banks + 4 insurers)
- Image proxy for 106 CarWale CDN photos (bypasses Chrome ORB), pre-warmed cache
- Phone OTP auth (MVP: 123456)
- Dealer Command Center endpoints + **dealer self-service apply/list**
- **Admin panel** with PIN auth for approving dealer applications
- **Stripe subscriptions**: `/api/checkout/session`, `/api/checkout/status/{id}`, `/api/webhook/stripe`, `/api/me/subscription`
  - Plans: Premium ₹199/mo, Dealer ₹999/mo

### Frontend
- Routes: `/`, `/compare`, `/recommend`, `/cars`, `/emi`, `/news`, `/book/:id`, `/showroom/:id`, `/premium`, `/dealer`, `/dealers/apply`, `/admin`, `/about`, `/login`, `/my-bookings`
- Real latest OEM photos for all 106 cars via backend proxy
- 360° Premium Showroom (drag-rotate, 7 colors, interior toggles, 3-min paywall)
- Founder page, Dealer onboarding, Admin panel (PIN 108108)
- Stripe-powered Premium checkout + post-payment status polling
- PWA (manifest + service worker + install prompt)
- Multi-language toggle (8 Indian languages)

### **NEW — Premium Visual Redesign (iter 6, 2026-02-20)**
- **framer-motion** installed, all hero/section reveals use spring + stagger motion
- Overhauled `index.css`: added grain, tracing-beam, glass-strong, dot-grid, corner-notch, btn-shine, breathe, scan-line, shimmer, gradient-amber-text utilities + Outfit/Manrope/Bebas Neue fonts
- **Home.jsx**: hero now has **looping Pexels driving reel video background** (proxied via backend `/api/video-proxy` with HTTP Range support) + luxury car poster fallback + parallax scroll + italic amber gradient headline + HUD glass card with live zero-wait tracker + floating "AI LIVE" badge
- **Navbar**: scroll-responsive glass with border glow, animated `layoutId` underline, gradient logo, mobile staggered reveal
- **CarCard**: glass-chip segment badge, Bebas-Neue price chip, Framer-Motion hover lift, glow overlay, gradient CTA
- **ChatDrawer**: breathing gradient amber orb FAB + tooltip; drawer slides in with spring on glass-strong surface
- **Premium.jsx**: tracing-beam animated conic-gradient border on ₹199 plan + MOST POPULAR pill + Bebas-Neue big prices + motion stagger

### **NEW — 360° Showroom Fix (iter 7, 2026-02-20)**
- Previously the Showroom rendered a generic hand-drawn SVG instead of the real car. Now it uses the **actual CarWale OEM photo** (same source as listings, via `getCarImage` + `/api/image-proxy`).
- Added **3D sway rotation** (Framer Motion rotateY + translateX + perspective) driven by drag/slider/auto-spin — car appears to rotate, flips horizontally past 90° to suggest the rear side.
- **Paint customization**: color wash overlays (mix-blend-overlay + soft-light) let users preview 7 paint colors on the real photo.
- **State chips**: Doors Open / Hood Up / Boot Open / Lights ON appear as visible amber chips on the viewer when toggled.
- **Angle slider** at bottom + touch/swipe support for mobile.
- **Studio spotlight + floor reflection ring** + paint name readout + FRONT/REAR readout.
- Interior view renders a luxury SVG cabin diagram.

### **NEW — Video Proxy Endpoint (iter 7)**
- `/api/video-proxy` streams from `videos.pexels.com` with full HTTP Range-request passthrough (required for HTML5 `<video>` seeking/buffering). Returns 206 Partial Content on Range, supports HEAD for preflight.

### Testing
- iter 1-5: backend + frontend comprehensive (~100% pass)
- iter 6: design smoke tested on desktop + mobile (Home / Cars / Compare / Premium) — all pages render, chat orb visible, no console errors

## Known Limits / Not Yet Done
- Stripe uses TEST keys (not real rupees yet)
- OTP hardcoded to 123456 (needs Twilio/MSG91)
- No real-time car data feed (CarDekho/CarWale have no public API)
- Daily car refresh is simulated

## Go-Live Checklist
1. Replace STRIPE_API_KEY with live key → real payments live
2. Get Twilio/MSG91 account → replace OTP stub for real SMS
3. Upload founder photo to replace "A" initials on /about
4. Generate PWA icons (icon-192.png, icon-512.png) in /public
5. Optionally wrap with Capacitor for Play Store + App Store

## Backlog (ROADMAP)
- **P1** Real SMS OTP via Twilio/MSG91
- **P1** Hard-gate Premium features (lock unlimited compares / priority booking for free tier)
- **P1** Daily live price sync (scheduled scrape from CarDekho/CarWale)
- **P2** Transactional email (SendGrid/Resend) for booking + dealer lead notifications
- **P2** Android/iOS wrapper via Capacitor
- **P3** Refactor `server.py` (650+ lines) into modular route files

## Mobile App Paths
- **Now**: PWA is live. Users tap "Install" (Android) or Share→Add to Home (iOS).
- **Next**: Capacitor wrapper for Play Store + App Store (~₹4,200 fees, 2–4 weeks).
- **Future**: React Native rewrite (2–3 months).
