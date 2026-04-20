# Auto-AI India — Product Requirements

## What's Implemented (iteration 5, 2026-02-20)

### Backend
- 106-car database, Claude Sonnet 4.5 AI engine (compare, recommend, chat)
- AI-as-CRM (booking tracking via chat), multi-language (8 Indian languages)
- Bookings with auto partner-lead creation, 9 partners (5 banks + 4 insurers)
- Image proxy for 106 CarWale CDN photos (bypasses Chrome ORB), pre-warmed cache
- Phone OTP auth (MVP: 123456)
- Dealer Command Center endpoints + **dealer self-service apply/list**
- **Stripe subscriptions**: `/api/checkout/session`, `/api/checkout/status/{id}`, `/api/webhook/stripe`, `/api/me/subscription`
  - Plans: Premium ₹199/mo, Dealer ₹999/mo
  - Checkout status endpoint handles unpaid/pending gracefully (no 500s)

### Frontend
- Routes: `/`, `/compare`, `/recommend`, `/cars`, `/emi`, `/news`, `/book/:id`, `/showroom/:id`, `/premium`, `/dealer`, `/dealers/apply`, `/about`, `/login`, `/my-bookings`
- Real latest OEM photos for all 106 cars via backend proxy
- 360° Premium Showroom (drag-rotate, 7 colors, door/hood/boot/lights toggles, interior view, 3-min paywall)
- **Founder page** (`/about`) — Abhishek · Founder of Auto-AI India with contact card
- **Dealer onboarding** (`/dealers/apply`) — business form with brand multi-select + bid slider
- **Stripe-powered Premium checkout** — Subscribe button redirects to `checkout.stripe.com`, post-payment status polling
- **PWA** — manifest.json, service worker, install prompt banner (Android + iOS)
- Multi-language toggle (8 Indian languages)

### Testing
- iter 1-4: 43/44 backend cumulative, 95%+ frontend
- iter 5: 11/11 backend (after checkout/status fix), 100% frontend

## Known Limits / Not Yet Done
- Stripe uses TEST keys (not real rupees yet — replace STRIPE_API_KEY with live key at launch)
- OTP hardcoded to 123456 (needs Twilio/MSG91)
- Dealer verification is manual ("pending_verification" status — needs admin approval UI)
- No real-time car data feed (CarDekho/CarWale have no public API — scraping works for images only)
- Daily car refresh is simulated

## Go-Live Checklist
1. Replace STRIPE_API_KEY with live key from Stripe dashboard → real payments live
2. Get Twilio/MSG91 account → replace OTP stub for real SMS
3. Add admin UI to approve dealer applications
4. Upload founder photo to replace "A" initials on /about
5. Generate PWA icons (icon-192.png, icon-512.png) in /public
6. Optionally wrap with Capacitor for Play Store + App Store

## Mobile App Paths
- **Now (free, 1 day)**: PWA is live. Users tap "Install" on Android or Share→Add to Home Screen on iPhone.
- **Next (~₹4,200 fees, 2–4 weeks)**: Capacitor wrapper for Play Store + App Store submission.
- **Future (2–3 months, native feel)**: React Native rewrite.
