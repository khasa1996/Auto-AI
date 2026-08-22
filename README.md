# Auto-AI India

Auto-AI India is an independent automotive intelligence platform for Indian car buyers, dealers, and automotive workflows.

## Architecture

- **Frontend:** React 18 + CRACO, deployed from the `frontend` directory.
- **Backend:** FastAPI + Motor/MongoDB.
- **AI:** Direct Anthropic, OpenAI, and Google Gemini provider APIs through `backend/llm_provider.py`.
- **Payments:** Razorpay with server-side signature, order, amount, and capture verification.
- **Mobile:** Capacitor 7 for Android/iOS packaging.
- **Hosting:** Frontend deployment is managed through Vercel; the FastAPI backend is configured separately through `REACT_APP_BACKEND_URL`.

## Independence requirement

Auto-AI is a standalone application. The active repository contains no hosted app-builder SDK, hosted LLM client, hosted payment integration, project/cron/webhook metadata, preview-server integration, or visual-edit integration from the retired development stack. AI providers and payment processing are accessed directly through Auto-AI's own server-side adapters.

## Security

Authentication, authorization, PII isolation, SSRF protections, payment verification, CORS controls, and production configuration requirements are documented in [`SECURITY.md`](SECURITY.md).

Production must provide the required secrets and configuration. Never commit `.env` files, API keys, payment secrets, database credentials, or session secrets.

## Development

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Set `REACT_APP_BACKEND_URL` to the HTTPS URL of the FastAPI backend for browser builds.

## Validation

The repository CI validates backend compilation, direct LLM provider adapters, and Razorpay gateway behavior. The reconciliation branch must pass CI and deployment checks before being merged into `main`.


## Production deployment

### Render API

The repository includes `render.yaml`. Production requires:

- MongoDB
- Redis
- `SECRET_KEY`
- explicit `CORS_ORIGINS`
- `ADMIN_PIN`
- enabled AI provider keys
- Razorpay secrets when checkout is enabled
- `OTP_DEMO_MODE=false`

The Render health check uses `/health/ready`.

### Vercel frontend

Deploy the `frontend` directory as the Vercel project root and set:

```text
REACT_APP_BACKEND_URL=https://<your-render-api>
```

`frontend/vercel.json` contains the SPA rewrite required for direct React Router URLs such as `/cars`, `/compare`, and `/admin`.
