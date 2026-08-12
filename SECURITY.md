# Security Policy

## Reporting a Vulnerability

Please report suspected vulnerabilities privately to the repository owner rather
than opening a public issue. Include reproduction steps and the affected
endpoint or page.

## Required configuration

The API fails closed when these are missing, so every deployment must set them:

| Variable | Purpose | If unset |
| --- | --- | --- |
| `SECRET_KEY` | Keys the HMAC used to hash session tokens and OTPs | An ephemeral key is generated: all sessions and OTPs are invalidated on restart |
| `ADMIN_PIN` | Gates `/api/admin/*` and the lead/dealer data | Admin API returns `503`; there is no default PIN |
| `CORS_ORIGINS` | Comma-separated allowlist of browser origins | Falls back to `*`, and credentialed cross-origin requests are then refused |
| `APP_ENV` | Set to `production` in production | Demo mode stays enabled and `/docs` is served |
| `OTP_DEMO_MODE` | When enabled, `/api/auth/send-otp` returns a fixed OTP for local development | Enabled outside production; always disabled when `APP_ENV=production` |

`CORS_ORIGINS` also defines the origins accepted as Stripe return URLs, so it
must list the real frontend origin in production.

## Authentication model

* Users sign in with a phone OTP. The OTP is single-use, expires after five
  minutes, is stored only as an HMAC digest, and is rate limited per phone and
  per IP.
* A successful verification issues an opaque bearer token (stored only as a
  digest) with an expiry; send it as `Authorization: Bearer <token>`.
  `/api/auth/logout` revokes it.
* Endpoints that return customer PII (`/api/me/*`, `/api/bookings/{id}`) derive
  the phone number from the session — never from a request parameter.
* Lead, dealer and booking-wide data requires admin auth: exchange `ADMIN_PIN`
  at `/api/admin/verify` for a short-lived token, or send `X-Admin-Pin`.
  The PIN is never accepted in a query string or request body field other than
  that one login call.
