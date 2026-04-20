# Auto-AI India — Product Requirements

## What's Implemented (as of 2026-02-20, iteration 4)

### Backend (FastAPI + MongoDB + httpx)
- 106-car curated DB across 19 Indian brands
- AI: `/api/ai/compare`, `/api/ai/recommend`, `/api/ai/chat` (Claude Sonnet 4.5, multi-language, CRM-aware)
- Commerce: `/api/bookings` (auto-assigns partner leads), `/api/partners`, `/api/partners/leads`
- Auth: `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/me/bookings` (phone OTP — demo: 123456)
- Dealer portal: `/api/dealer/leads` with city filter & aggregated KPIs
- **Image Proxy**: `/api/image-proxy` fetches real car images from CarWale/Wikimedia/etc, bypasses Chrome ORB, caches in memory, pre-warmed on startup
- EMI, News, Car listings

### Frontend (React + Tailwind)
- **REAL car photos** for all 106 cars via CarWale CDN (official OEM press images), proxied through backend
- Routes: `/`, `/compare`, `/recommend`, `/cars`, `/emi`, `/news`, `/book/:carId`, `/showroom/:carId`, `/premium`, `/dealer`, `/login`, `/my-bookings`
- Premium 360° Showroom (drag-rotate, 7 paint colors, door/hood/boot/light toggles, interior view, 3-min paywall)
- Subscription page with 3 tiers (Free, Premium ₹199/mo, Dealer ₹999/mo)
- Phone-OTP authentication → My Bookings dashboard
- **Dealer Command Center** (`/dealer`): live KPIs (leads, test drives, loan/insurance interest), commission earned, top cars, top cities, recent leads table
- Multi-language support (8 Indian languages)
- 24×7 AI ChatDrawer with CRM context awareness, quick prompts, language toggle

### Testing
- iter 1: 11/11 backend
- iter 2: 9/9 backend (multi-lang + booking)
- iter 3: 14/14 backend (partners + showroom)
- iter 4: 9/9 backend (auth + dealer + image proxy)

## Tech Stack
FastAPI, Motor/MongoDB, emergentintegrations (Claude Sonnet 4.5), httpx (image proxy)
React 19, Tailwind, Shadcn UI, CSS 3D transforms

## Backlog
- P0: Stripe subscription, Twilio SMS, real JWT sessions
- P1: Dealer self-service onboarding, partner commission payouts
- P2: Resale value AI, voice chat, dealer CRM export
