# Auto-AI India

Auto-AI India is an AI-powered premium car intelligence platform for the Indian market.

## Current architecture

Auto-AI runs as an independent application stack:

- **Frontend:** React 18 + CRACO, with Capacitor 7 support for Android/iOS packaging.
- **Backend:** FastAPI + Motor/PyMongo + MongoDB.
- **AI:** Direct provider adapters for Anthropic, OpenAI, and Google Gemini. Provider credentials remain server-side.
- **Payments:** Direct Stripe REST integration with local webhook-signature verification.
- **Voice:** ElevenLabs API integration.
- **Deployment:** GitHub + Vercel preview/production infrastructure.

The active application does not depend on an external app-builder or hosted integration layer.

## Major product capabilities

- Indian car catalogue, search, filtering and news.
- AI-powered car comparison and recommendations.
- Multi-model AI chat with language support.
- EMI calculation.
- Test-drive and booking workflows.
- OTP authentication and authenticated booking history.
- Dealer onboarding and admin approval workflows.
- Partner lead and commission pipeline.
- Premium subscription checkout through Stripe.
- Image/video proxying for automotive media.
- PWA and Capacitor mobile packaging.
- Premium showroom experience.

## Repository layout

```text
backend/                 FastAPI application, providers and tests
frontend/                React application and Capacitor configuration
memory/                  Product requirements and project documentation
docs/                    Architecture and operational documentation
.github/workflows/       CI validation
```

## Local development

### Backend

```bash
cd backend
python -m venv .venv
# activate the virtual environment
pip install -r requirements.txt
uvicorn server:app --reload
```

Required backend configuration is documented in `docs/INDEPENDENT_DEPLOYMENT.md`.

### Frontend

```bash
cd frontend
npm install
npm start
```

Production build:

```bash
npm run build
```

## AI providers

The backend uses a provider-neutral gateway in `backend/llm_provider.py`. Add provider credentials only to the deployment environment; never commit API keys.

Supported provider families currently include:

- Anthropic Claude
- OpenAI GPT
- Google Gemini

## Security principles

- Secrets are loaded from environment variables and are not stored in Git.
- Production demo OTP mode is disabled by the backend security layer.
- User/admin session tokens are stored as hashes.
- Admin-gated endpoints require authenticated admin access.
- Stripe webhook signatures are verified locally.
- External media proxying uses an explicit HTTPS host allowlist.
- Production CORS should use explicit trusted origins rather than `*`.

## Validation

The recovery branch has a GitHub Actions validation workflow covering:

- active dependency/reference scanning
- backend compilation
- provider adapter tests
- MongoDB driver compatibility
- frontend dependency installation
- frontend production build

Before production merge, also complete authenticated runtime smoke tests for AI, authentication, bookings and Stripe, and verify production environment configuration.

## Status

The independent-recovery work is intentionally isolated on `refactor/remove-emergent` until the merge gates are complete. `main` should remain untouched until the recovery branch is reviewed and validated.
