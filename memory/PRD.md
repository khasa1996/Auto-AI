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
- **Home.jsx**: new massive editorial hero with luxury car background image, parallax scroll, italic amber gradient headline, HUD glass card with live zero-wait tracker, floating "AI LIVE" badge, scanning line accent, bento-grid with tilt cards, new pledge section, tracing-beam final CTA
- **Navbar**: scroll-responsive glass with border glow, animated `layoutId` underline on active link, mobile staggered reveal, gradient logo badge with hover rotate
- **CarCard**: glass-chip segment badge, floating Bebas-Neue price chip, Framer-Motion hover lift, glow overlay, arrow-up-right action icon, corner-notch, gradient-button
- **ChatDrawer**: replaced boxy FAB with breathing gradient amber orb + tooltip; drawer now slides in with spring animation on glass-strong surface
- **Premium.jsx**: tracing-beam animated conic-gradient border on ₹199 plan, MOST POPULAR pill, Framer-Motion plan-card stagger, Bebas-Neue big prices
- **Footer**: dot-grid bg, gradient logo, social icons, "Made in Bharat" sign-off

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
