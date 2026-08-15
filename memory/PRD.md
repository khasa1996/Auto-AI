# Auto-AI India — Product Requirements

## Product

Auto-AI India is an AI-powered premium automotive intelligence platform for Indian car buyers, dealers and partners.

The product goal is to provide an independent automotive decision layer covering discovery, comparison, recommendation, financing guidance, bookings, dealer workflows and premium digital experiences.

## Current implementation

### Backend

- 100+ Indian car records with brand/model/variant/specification data.
- Car search, filtering and individual-car APIs.
- AI comparison and recommendation endpoints.
- 24/7 AI chat with language selection and selectable model providers.
- EMI calculation.
- Test-drive and booking workflows with city/dealer mapping.
- OTP authentication and authenticated booking history.
- Dealer self-service onboarding and admin approval workflow.
- Partner lead and commission pipeline for financing and insurance.
- Premium subscription checkout and payment-status handling.
- Stripe webhook handling with local signature verification.
- Image and video proxy endpoints with HTTPS host allowlisting.
- ElevenLabs text-to-speech integration.

### Frontend

- Home, compare, recommend, cars, EMI, news, booking, showroom, premium, dealer, dealer-application, admin, about, login and booking-history routes.
- Automotive media and visual car presentation.
- AI chat drawer and model selector.
- Multi-language UI.
- Premium showroom experience with interactive visual states and paint customization.
- PWA manifest/service-worker support.
- Capacitor 7 configuration for Android/iOS packaging using the bundled production web build.

## AI architecture

Auto-AI uses a provider-neutral server-side gateway in `backend/llm_provider.py`.

Current model registry:

- `claude` → Anthropic `claude-sonnet-4-6` — default balanced model.
- `claude-opus` → Anthropic `claude-opus-4-7` — deep reasoning.
- `claude-haiku` → Anthropic `claude-haiku-4-5-20251001` — fast/lightweight.
- `gpt-flagship` → OpenAI `gpt-5.4` — flagship reasoning.
- `gpt-mini` → OpenAI `gpt-5.4-mini` — fast/efficient.
- `gemini-pro` → Google `gemini-3.1-pro-preview` — deep analysis.
- `gemini-flash` → Google `gemini-3.5-flash` — fast/efficient.

Provider credentials are read only from deployment environment variables. The application does not require a hosted app-builder or intermediary AI integration service.

## Payments architecture

Stripe is accessed directly from the backend through `backend/stripe_provider.py`.

The backend:

- creates checkout sessions directly with Stripe;
- stores the Auto-AI transaction/session mapping;
- verifies Stripe webhook signatures locally;
- updates payment/subscription state from verified events;
- restricts checkout-status access to the authenticated customer session;
- validates allowed return origins.

## Authentication and security

- Production must provide a persistent `SECRET_KEY`.
- Demo OTP mode is disabled automatically when `APP_ENV=production`.
- User and admin session tokens are stored as hashes.
- Admin endpoints are protected by authenticated admin sessions or the configured admin PIN.
- Booking/customer endpoints use authenticated user sessions.
- External media proxy requests use an HTTPS host allowlist.
- Stripe webhook signatures are verified before processing payment events.
- Production CORS should use explicit trusted origins.

## Independent deployment requirements

Required/feature-dependent environment variables are documented in `docs/INDEPENDENT_DEPLOYMENT.md`.

The deployment must not depend on any external app-builder runtime, preview service, hosted AI integration layer, or hosted payment wrapper.

## Validation gates

The recovery branch must pass:

1. Active independence/reference scan.
2. Backend compilation.
3. Provider adapter tests.
4. MongoDB driver compatibility check.
5. Frontend production build.
6. Authenticated runtime smoke tests for AI, authentication and bookings.
7. Stripe test-mode checkout and webhook verification.
8. Production environment-variable verification.
9. Vercel preview validation.

Only after these gates are satisfied should the recovery branch be merged into `main`.

## Known engineering follow-ups

- Split the large `backend/server.py` into focused routers/services.
- Replace in-process rate limiting with a shared store when running multiple API replicas.
- Add stronger automated runtime/API smoke tests to CI without exposing production credentials.
- Improve frontend dependency reproducibility with a committed package lockfile strategy.
- Add server-side entitlement enforcement for premium/showroom limits before real paid rollout.
- Replace demo OTP delivery with a production SMS provider before launch.
- Replace Stripe test credentials with live credentials only during the controlled production launch.
- Add live automotive data ingestion only where source licensing and API access permit it.

## Go-live checklist

- [ ] Recovery branch reviewed and all CI checks green.
- [ ] No active dependency or runtime integration with external app-builder services.
- [ ] Production secrets configured independently.
- [ ] `APP_ENV=production` configured.
- [ ] `SECRET_KEY` configured with a persistent high-entropy value.
- [ ] AI provider keys configured for the providers enabled in production.
- [ ] `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` configured for the intended Stripe environment.
- [ ] `CORS_ORIGINS` contains only trusted production origins.
- [ ] `ADMIN_PIN` configured securely.
- [ ] Authenticated AI, booking and payment smoke tests completed.
- [ ] Production Vercel configuration verified.
- [ ] Only then merge to `main` and deploy production.
