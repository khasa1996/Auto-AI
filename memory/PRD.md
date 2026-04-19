# Auto-AI India — Product Requirements

## Original Problem
Build a 100% unbiased AI-powered car buying platform for Indian car buyers. Founder has 8+ years of auto industry experience. Core USP: No human bias, no paid promotions - AI gives true verdict on cars. Pillars: Unbiased AI, Zero Waiting Period, Under One Roof (EMI/Loans/Insurance), Daily Updates, Multi-Language.

## User Choices
- Platform: Both (Web + Mobile responsive)
- AI model: Claude Sonnet 4.5 (Emergent LLM key)
- Car data: Curated DB for MVP, real-time APIs later
- Auth: None for MVP
- Design: Premium, futuristic, dark, AI-advanced
- Languages: All top Indian languages

## Personas
1. **First-time buyer (22-35)**: Needs clear guidance without sales pressure
2. **Upgrader (30-50)**: Wants honest comparison between shortlisted cars
3. **Enthusiast (25-45)**: Wants deep data, waiting period intel, EMI math
4. **Regional buyer**: Prefers content in Hindi/Tamil/Telugu/Marathi/etc.

## What's Implemented (as of 2026-02-19)

### Backend (FastAPI + MongoDB)
- 106-car curated DB across 19 brands (Maruti, Hyundai, Tata, Mahindra, Kia, Toyota, Honda, MG, Skoda, Volkswagen, Renault, Nissan, Citroen, Jeep, Mercedes, BMW, Audi, Volvo, MINI)
- `GET /api/cars` + filters (q, segment, fuel, budget_max) + `GET /api/cars/{id}`
- `GET /api/news` (curated)
- `POST /api/emi/calculate`
- `POST /api/ai/compare` — Claude-powered unbiased verdict with pros/cons/scores/winner
- `POST /api/ai/recommend` — top-3 picks with transparent "why"
- `POST /api/ai/chat` + `GET /api/ai/chat/{sid}/history` — language-aware, session persistence
- `POST /api/bookings` + `GET /api/bookings/{id}` — dealer booking with 12 Indian cities mapped

### Frontend (React + Tailwind + Shadcn)
- Premium Obsidian (#050505) + Amber (#F59E0B) theme, Outfit display font + Manrope body
- Routes: `/` (cinematic hero + bento features + trending cars + pledge + CTA), `/compare`, `/recommend`, `/cars`, `/emi`, `/news`, `/book/:carId`
- Multi-language: 8 Indian languages (EN, HI, TA, TE, MR, KN, BN, GU) via `I18nProvider`, globe toggle in navbar, AI chat replies in selected language
- 24×7 AI ChatDrawer with quick-prompt chips, clear conversation, session persistence, language-aware replies
- Dealer booking flow with full form (name, phone, email, city, test drive, loan/insurance/exchange) → confirmation screen with dealer assignment + ETA callback
- Live Zero-Wait Tracker on homepage
- Marquee ticker with safety/waiting highlights
- EMI Studio with 3 live sliders + principal/interest visualization
- Sharp square corners, grain overlay, glassmorphism nav

### Testing
- Iteration 1: Backend 11/11 pass, Frontend ~90%
- Iteration 2: Backend 9/9 pass (new features), Frontend 95%

## Tech Stack
- **Backend**: FastAPI, Motor/MongoDB, emergentintegrations (Claude Sonnet 4.5)
- **Frontend**: React 19, React Router 7, Tailwind, Shadcn UI (DropdownMenu, Slider, Sonner)
- **Fonts**: Outfit (headings), Manrope (body), JetBrains Mono (code/ticker)

## Prioritized Backlog

### P0 (critical for launch)
- [ ] Hook real-time car data API (e.g. CarDekho / CarWale scrapers or official feeds)
- [ ] Add more cars (target 200+ covering every Indian model)
- [ ] Real dealer integration (beyond mocked DEALERS_BY_CITY)
- [ ] Email/SMS confirmation on booking

### P1 (monetization + growth)
- [ ] Subscription tier (free → premium with unlimited comparisons, price alerts, 1-on-1 expert chat)
- [ ] Referral + social share of AI verdicts
- [ ] Price drop alerts
- [ ] Loan/Insurance partner integrations (commission model)
- [ ] Dealer partner portal (bookings CRM)
- [ ] Daily AI-generated news scraper (currently curated seed)

### P2 (nice-to-have)
- [ ] User accounts (saved shortlists, compare history)
- [ ] Resale value prediction AI
- [ ] Service cost calculator per car
- [ ] Image-based car identification
- [ ] Voice input to chatbot
- [ ] Regional language AI that stays in-language across navigation

## Next Tasks
1. Expand car DB to 200+ models
2. Integrate real dealer booking API
3. Add subscription paywall + Stripe
