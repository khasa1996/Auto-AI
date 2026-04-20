# Auto-AI India — Product Requirements

## Original Problem
Build a 100% unbiased AI-powered car buying platform for Indian car buyers. Founder has 8+ years of auto industry experience. Core USP: No human bias, no paid promotions - AI gives true verdict on cars. Pillars: Unbiased AI, Zero Waiting Period, Under One Roof (EMI/Loans/Insurance), Daily Updates, Multi-Language.

## User Choices
- Platform: Both (Web + Mobile responsive)
- AI model: Claude Sonnet 4.5 (Emergent LLM key)
- Car data: Curated DB for MVP, real-time APIs later
- Auth: None for MVP
- Design: Premium, futuristic, dark, AI-advanced (CRED-style illustrated cards)
- Languages: All top Indian languages
- NO FOREIGN CAR PHOTOS — only India-sold cars visualized

## What's Implemented (as of 2026-02-19, iteration 3)

### Backend (FastAPI + MongoDB)
- 106-car curated DB across 19 Indian brands
- `GET/POST /api/cars`, `/api/news`, `/api/emi/calculate`
- `POST /api/ai/compare` — Claude-powered unbiased verdict
- `POST /api/ai/recommend` — top-3 picks
- `POST /api/ai/chat` + `GET /api/ai/chat/{sid}/history` — multi-language, CRM-aware
- `POST /api/bookings` — auto-assigns loan/insurance partners, creates leads
- `GET /api/partners` — 9 partners (5 banks + 4 insurers)
- `GET /api/partners/leads` — aggregated commission tracking

### AI-as-CRM
- Chat detects CRM keywords (track, booking, cancel, etc.) and phone numbers
- Fetches booking context and AI responds with exact booking details (id prefix, dealer, status, ETA)
- Logs notifications to DB (replaces Twilio/SendGrid for MVP)
- Multi-language responses (8 Indian languages verified including Hindi Devanagari)

### Frontend (React + Tailwind + Shadcn)
- Premium Obsidian (#050505) + Amber (#F59E0B) theme, Outfit + Manrope + JetBrains Mono fonts
- Routes: `/`, `/compare`, `/recommend`, `/cars`, `/emi`, `/news`, `/book/:carId`, `/showroom/:carId`, `/premium`
- **CarVisual component** — CRED-style brand-gradient cards with segment-aware SVG silhouettes (hatchback/sedan/SUV/MPV/pickup). Each of 19 brands has unique color palette. **ZERO foreign car photos across the app.**
- **NewsVisual component** — category-themed gradients with lucide icons (no photos)
- **360° Premium Showroom** (`/showroom/:carId`):
  - Auto-rotating 3D SVG car (CSS perspective transforms)
  - Drag-to-rotate with pause/auto-spin toggle
  - 7 paint colors (Obsidian, Snow Pearl, Brunt Amber, Metallic, Ocean, Racing Green, Sangria)
  - 4 live state toggles: Doors Open, Hood Open, Boot Open, Headlights
  - 3 view modes: Exterior / Interior (dashboard & steering SVG) / Top-down
  - 3-minute free trial timer, then lock overlay with upgrade CTA
  - Luxury Segment badge
- **Premium subscription page** (`/premium`) — 3 tiers (Free, Premium ₹199/mo, Dealer ₹999/mo) + 5 perks grid
- Multi-language toggle (8 Indian languages)
- Enhanced 24×7 AI ChatDrawer with quick prompts, language-aware greetings, session persistence
- Dealer booking flow with 12 Indian cities, 15-min callback ETA

### Testing
- iteration_1: 11/11 backend, ~90% frontend
- iteration_2: 9/9 backend new features, 95% frontend
- iteration_3: 14/14 backend total, 95% frontend (all 3 new major features verified)

## Tech Stack
- Backend: FastAPI, Motor/MongoDB, emergentintegrations (Claude Sonnet 4.5)
- Frontend: React 19, React Router 7, Tailwind, Shadcn UI, pure CSS 3D transforms (no three.js)
- Fonts: Outfit, Manrope, JetBrains Mono

## Prioritized Backlog

### P0
- [ ] Real car data pipeline (when public API / scraping infra is ready)
- [ ] Twilio SMS + SendGrid email for booking confirmations (currently AI-chat-only)
- [ ] Stripe subscription checkout for Premium plan
- [ ] User auth (phone OTP recommended for India)

### P1
- [ ] Partner admin dashboard UI (leads, commissions earned)
- [ ] More cars (target 200+ covering every Indian model)
- [ ] Real 360° spin images per luxury car (18-72 frames each) when dealer feeds available
- [ ] Price-drop alert subscriptions
- [ ] Referral program with car comparison sharing

### P2
- [ ] Resale value prediction
- [ ] Service cost forecaster per car
- [ ] Voice input to chatbot
- [ ] Dealer CRM portal (lead management)

## Next Tasks
1. Stripe subscription + paywall enforcement
2. Partner admin dashboard UI
3. Car DB expansion
