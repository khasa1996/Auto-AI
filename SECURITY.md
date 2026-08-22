# Security Policy

## Reporting a Vulnerability

Please report suspected vulnerabilities privately to the repository owner rather
than opening a public issue. Include reproduction steps and the affected
endpoint or page.

## Required production configuration

Production deployments must fail closed when critical authentication or browser-security configuration is missing:

| Variable | Purpose | Production requirement |
| --- | --- | --- |
| `SECRET_KEY` | HMAC key for session tokens and OTP digests | Required; the API refuses to start without it |
| `ADMIN_PIN` | Gates `/api/admin/*` and lead/dealer data | Required for admin functionality; otherwise admin access returns `503` |
| `CORS_ORIGINS` | Comma-separated allowlist of browser origins | Must contain the real frontend origin; do not use `*` with authenticated browser traffic |
| `APP_ENV` | Controls production behavior | Set to `production` |
| `OTP_DEMO_MODE` | Fixed OTP for local development | Must be disabled in production; production logic forces it off |
| `MONGO_URL` | MongoDB connection string | Required |
| `DB_NAME` | MongoDB database name | Required |
| `ANTHROPIC_API_KEY` | Anthropic direct LLM access | Required if Anthropic models are enabled |
| `OPENAI_API_KEY` | OpenAI direct LLM access | Required if OpenAI models are enabled |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Google Gemini direct LLM access | Required if Gemini models are enabled |
| `RAZORPAY_KEY_ID` | Razorpay checkout key | Required for paid checkout |
| `RAZORPAY_KEY_SECRET` | Razorpay server-side verification | Required for paid checkout |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature verification | Required when webhooks are enabled |\n| `REDIS_URL` | Shared production rate limiting | Required when `APP_ENV=production` |

Only configure provider credentials that are required by enabled production features. Keep all credentials in the deployment secret store and never commit them to Git.

## Authentication model

* Users sign in with a phone OTP. The OTP is single-use, expires after five
  minutes, is stored only as an HMAC digest, and is rate limited per phone and
  per IP.
* A successful verification issues an opaque bearer token (stored only as a
  digest) with an expiry; send it as `Authorization: Bearer <token>`.
  `/api/auth/logout` revokes it.
* Endpoints that return customer PII (`/api/me/*`, `/api/bookings/{id}`) derive
  the phone number from the authenticated session — never from an untrusted
  request parameter.
* Lead, dealer and booking-wide data requires admin auth: exchange `ADMIN_PIN`
  at `/api/admin/verify` for a short-lived token, or use the `X-Admin-Pin`
  header where explicitly supported. The PIN is never accepted in a query
  string.
* AI chat requires an authenticated user and persists history scoped to the
  authenticated phone/session owner.

## Payment security

Auto-AI uses Razorpay for checkout. The backend verifies the Razorpay payment
signature, confirms the payment belongs to the authenticated user's order,
checks the Razorpay order ID, verifies the captured status and validates the
server-recorded amount before activating an entitlement. Razorpay webhooks
require an HMAC signature and use the provider event ID for duplicate-event
protection.

## SSRF and media proxying

Image and video proxy endpoints accept only HTTPS URLs whose hosts are on an
explicit allowlist. Redirect destinations are checked again against that
allowlist, response sizes are bounded, and credentials embedded in URLs are
rejected. The allowlist must be reviewed whenever a new media provider is added.

## Operational hardening

Production rate limiting uses Redis so limits are shared across Render replicas. The local in-process limiter is retained only as a development/test fallback. `REDIS_URL` is therefore mandatory when `APP_ENV=production`.

Production API documentation (`/docs`, `/redoc`, and OpenAPI) is disabled.