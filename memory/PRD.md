# Auto-AI India — Product Requirements

## Current Architecture Snapshot

### Backend
- Automotive database and AI engine for compare, recommend, and chat
- AI-as-CRM (booking tracking via chat), multi-language support
- Bookings with partner-lead creation
- Image and video proxying for automotive media
- Phone OTP authentication
- Dealer Command Center endpoints and dealer self-service flows
- Admin panel with PIN authentication
- Razorpay one-time payments with server-side order/signature verification and webhook reconciliation
- Direct AI provider adapters for Anthropic, OpenAI, and Google Gemini

### Frontend
- Routes: `/`, `/compare`, `/recommend`, `/cars`, `/emi`, `/news`, `/book/:id`, `/showroom/:id`, `/premium`, `/dealer`, `/dealers/apply`, `/admin`, `/about`, `/login`, `/my-bookings`
- Real OEM/car imagery through the backend media proxy
- 360° Premium Showroom with interactive rotation and customization
- Founder page, Dealer onboarding, Admin panel
- Razorpay-powered Premium checkout
- PWA and Capacitor mobile packaging
- Multi-language support

## AI Model Integrations

Auto-AI uses direct provider APIs. No external app-builder or hosted AI integration layer is required.

### OpenAI Chat Models
- `gpt-flagship` → `gpt-5.4` (OpenAI · Flagship reasoning · versatile)
- `gpt-mini` → `gpt-5.4-mini` (OpenAI · Fast & efficient)

### Gemini Chat Models
- `gemini-pro` → `gemini-3.1-pro-preview` (Google · Deep analysis · latest)
- `gemini-flash` → `gemini-3.5-flash` (Google · Blazing fast · concise)

### Claude Chat Models
- `claude` → `claude-sonnet-4-6` (Anthropic · Balanced reasoning · unbiased) — DEFAULT
- `claude-opus` → `claude-opus-4-7` (Anthropic · Deepest reasoning · premium)
- `claude-haiku` → `claude-haiku-4-5-20251001` (Anthropic · Ultra-fast · lightweight)

The model registry is exposed through `GET /api/ai/models`. Chat accepts an optional `model` field and returns the selected model label. Compare and Recommend use the configured deep-analysis model.

## Mobile App

- Capacitor 7 packaging is configured for Android/iOS.
- Live web-wrapper mode can point the mobile shell at the deployed Auto-AI frontend.
- Native Android/iOS builds require Android Studio or Xcode on a local development machine.

## Testing

- Backend unit tests cover provider adapters, security, and payment gateway behavior.
- Frontend production builds are validated in CI.
- Deployment reconciliation includes checks for retired external integration references.

## Production Requirements

- Never commit `.env` files, API keys, payment secrets, database credentials, or session secrets.
- Configure provider credentials only in the deployment environment.
- Use `APP_ENV=production` and disable demo OTP mode in production.
- Use explicit production CORS origins.
- Use isolated staging infrastructure for integration tests.

## Go-Live Checklist
1. Configure live Razorpay credentials and webhook secret.
2. Configure production OTP delivery when moving beyond demo/staging flows.
3. Configure founder and product assets.
4. Generate PWA/mobile assets where required.
5. Run authenticated staging smoke tests before production promotion.
6. Verify all enabled direct AI providers in staging.

## Backlog
- **P1** Real SMS OTP via Twilio/MSG91
- **P1** Hard-gate Premium features (lock unlimited compares / priority booking for free tier)
- **P1** Daily live price sync
- **P2** Transactional email for booking and dealer lead notifications
- **P2** Android/iOS store release via Capacitor
- **P3** Refactor `server.py` into modular route files