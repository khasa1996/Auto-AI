# Independent Deployment Guide

This document defines the runtime configuration required to run Auto-AI without Emergent or another external app-builder/hosted integration layer.

## Required backend variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URL` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | MongoDB database name |
| `SECRET_KEY` | Yes in production/staging | Persistent signing/hash secret for sessions and OTP records |
| `APP_ENV` | Yes | Use `staging` for integration testing and `production` for launch |
| `OTP_DEMO_MODE` | Yes for staging tests | Set `true` only in an isolated staging environment so tests can read `demo_otp` |
| `CORS_ORIGINS` | Yes | Comma-separated trusted frontend origins |
| `ADMIN_PIN` | Yes for admin features | Admin authentication secret |
| `ANTHROPIC_API_KEY` | If Claude enabled | Direct Anthropic API access |
| `OPENAI_API_KEY` | If GPT models enabled | Direct OpenAI API access |
| `GEMINI_API_KEY` | If Gemini models enabled | Direct Google Gemini API access |
| `RAZORPAY_KEY_ID` | If Razorpay payments enabled | Public Razorpay API/Checkout key identifier |
| `RAZORPAY_KEY_SECRET` | If Razorpay payments enabled | Backend-only Razorpay secret used for order/signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | If Razorpay webhook reconciliation enabled | Backend-only webhook signature secret |
| `ELEVENLABS_API_KEY` | If TTS enabled | Direct ElevenLabs API access |

Do not commit any of these values to Git.

## Production security baseline

Use:

```text
APP_ENV=production
OTP_DEMO_MODE=false
```

`security.py` refuses demo OTP mode when `APP_ENV=production`, even if `OTP_DEMO_MODE` is accidentally left enabled.

Set a persistent high-entropy `SECRET_KEY`. Without it, sessions are backed by an ephemeral key and will not survive process restarts.

Use explicit production origins in `CORS_ORIGINS`; do not rely on `*` for a credentialed production application.

## Staging integration-test baseline

The repository contains `.github/workflows/integration-tests.yml`. It is deliberately manual and requires a deployed HTTPS staging backend before it can run.

Configure the GitHub Actions secret:

```text
AUTO_AI_STAGING_ADMIN_PIN
```

Do not put the value in workflow YAML or source code.

The staging backend should use:

```text
APP_ENV=staging
OTP_DEMO_MODE=true
```

and an isolated staging MongoDB database. Do not point staging tests at the production database.

The workflow accepts the staging backend URL as a manual input and runs:

- backend booking/API regression tests
- authentication and authorization tests
- OTP and rate-limit tests
- AI privacy/booking-context tests
- dealer and partner tests
- Razorpay/payment tests when enabled
- deployed API health checks

The existing integration fixtures authenticate through `/api/auth/send-otp` and `/api/auth/verify-otp`; they expect `demo_otp` in the response so CI can obtain a test session without receiving real SMS messages. Admin-gated tests use `AUTO_AI_STAGING_ADMIN_PIN` through the workflow's `ADMIN_PIN` environment variable.

## AI providers

The backend calls provider APIs directly through `backend/llm_provider.py`.

No external AI integration service is required. Enable only the providers for which a production API key has been deliberately configured.

The current registry is:

```text
claude        -> anthropic / claude-sonnet-4-6
claude-opus   -> anthropic / claude-opus-4-7
claude-haiku  -> anthropic / claude-haiku-4-5-20251001
gpt-flagship  -> openai / gpt-5.4
gpt-mini      -> openai / gpt-5.4-mini
gemini-pro    -> gemini / gemini-3.1-pro-preview
gemini-flash  -> gemini / gemini-3.5-flash
```

Model availability should be checked against the provider's current API documentation before a production rollout.

## Razorpay

Razorpay is the active payment gateway. Configure the required credentials only in the deployment environment:

```text
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

The application uses a server-created order flow. Plan pricing is selected server-side, checkout signatures are verified server-side before entitlements are activated, and captured-payment webhook events are reconciled for reliability and idempotency.

Current one-time plans are:

```text
Premium: ₹199
Dealer / Business: ₹999
```

The backend must never expose `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to the frontend.

Use Razorpay test credentials during staging. Switch to live credentials only as part of the controlled production launch.

## Vercel / frontend deployment

The recovery branch has been validated for frontend production builds and has associated preview deployments. A preview deployment being green is not sufficient for production promotion.

Before production promotion:

1. Configure production frontend environment variables in Vercel.
2. Configure the independently deployed backend and its production environment variables.
3. Confirm the production frontend origin is included in `CORS_ORIGINS`.
4. Confirm the backend has access to MongoDB and all enabled provider APIs.
5. Run the staging integration workflow against a real HTTPS staging backend.
6. Verify Razorpay test-mode order creation, checkout signature verification, entitlement activation and webhook reconciliation in staging.
7. Perform authenticated runtime smoke tests.
8. Only then promote the recovery branch to production.

## Independence verification

Repository CI should fail if active application files contain references to the retired external integration layer. The scan covers the tracked application tree while excluding only the validation workflow's own search patterns and historical generated test reports.

## Runtime smoke-test checklist

### AI

- `GET /api/ai/models` returns the configured model registry.
- `POST /api/ai/chat` returns a response using the selected provider.
- `POST /api/ai/compare` returns structured comparison JSON.
- `POST /api/ai/recommend` returns structured recommendations.

### Authentication

- Send OTP.
- Verify OTP.
- Confirm authenticated requests resolve the correct phone/session.
- Confirm unauthenticated access to protected customer endpoints returns `401`.
- Confirm admin authentication works only with valid admin credentials.

### Bookings

- Create a booking.
- Confirm booking ownership is enforced.
- Confirm dealer/admin views require appropriate authentication.
- Confirm AI CRM context only uses the signed-in customer's bookings.

### Razorpay

- Create an authenticated Razorpay order using staging/test credentials.
- Confirm the amount is selected server-side from the plan identifier.
- Confirm a valid checkout signature activates the correct one-time entitlement.
- Confirm an invalid signature is rejected.
- Send a valid signed captured-payment webhook and verify reconciliation/idempotency.
- Confirm Razorpay secrets are never returned by frontend-facing API responses.

## Merge rule

Do not merge the recovery branch merely because the frontend build is green. The application is ready for production only when CI, environment configuration and authenticated staging runtime smoke tests all pass.
