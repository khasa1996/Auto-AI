# Independent Deployment Guide

This document defines the runtime configuration required to run Auto-AI without an external app-builder or hosted integration layer.

## Required backend variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URL` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | MongoDB database name |
| `SECRET_KEY` | Yes in production | Persistent signing/hash secret for sessions and OTP records |
| `APP_ENV` | Yes in production | Set to `production` to disable demo OTP mode |
| `CORS_ORIGINS` | Yes for production | Comma-separated trusted frontend origins |
| `ADMIN_PIN` | Yes for admin features | Admin authentication secret |
| `ANTHROPIC_API_KEY` | If Claude enabled | Direct Anthropic API access |
| `OPENAI_API_KEY` | If GPT models enabled | Direct OpenAI API access |
| `GEMINI_API_KEY` | If Gemini models enabled | Direct Google Gemini API access |
| `STRIPE_API_KEY` | If subscriptions enabled | Direct Stripe API access |
| `STRIPE_WEBHOOK_SECRET` | If Stripe webhooks enabled | Local Stripe webhook signature verification |
| `ELEVENLABS_API_KEY` | If TTS enabled | Direct ElevenLabs API access |

Do not commit any of these values to Git.

## Production security baseline

Use:

```text
APP_ENV=production
OTP_DEMO_MODE=false
```

`security.py` already refuses demo OTP mode when `APP_ENV=production`, even if `OTP_DEMO_MODE` is accidentally left enabled.

Set a persistent high-entropy `SECRET_KEY`. Without it, sessions are backed by an ephemeral key and will not survive process restarts.

Use explicit production origins in `CORS_ORIGINS`; do not rely on `*` for a credentialed production application.

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

## Stripe

Configure both:

```text
STRIPE_API_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

The application talks directly to Stripe. Checkout return URLs are validated against configured trusted origins, and webhook signatures are verified locally before payment state is changed.

Configure the Stripe webhook endpoint as:

```text
/api/webhook/stripe
```

Use Stripe test credentials during staging. Switch to live credentials only as part of the controlled production launch.

## Vercel

The recovery branch currently has a successful Vercel preview deployment associated with the latest recovery commit.

Before production promotion:

1. Configure production environment variables in Vercel.
2. Confirm the production frontend origin is included in `CORS_ORIGINS`.
3. Confirm the backend has access to MongoDB and all enabled provider APIs.
4. Run authenticated smoke tests.
5. Verify Stripe test-mode checkout and webhook behavior in staging.
6. Only then promote the recovery branch to production.

## Independence verification

The repository CI should fail if active application files contain references to the retired external integration layer. The scan should cover the whole tracked application tree rather than excluding project documentation or memory files.

The only intentional exception is the validation workflow itself when its own search patterns are present.

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

### Stripe

- Create an authenticated checkout session.
- Confirm a foreign `origin_url` is rejected.
- Query checkout status while payment is pending.
- Send a valid signed webhook and verify subscription activation.
- Send an invalid signature and confirm it is rejected.

## Merge rule

Do not merge the recovery branch merely because the frontend build is green. The application is ready for production only when CI, environment configuration and authenticated runtime smoke tests all pass.
