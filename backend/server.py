from fastapi import FastAPI, APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from llm_provider import LlmChat, UserMessage
from razorpay_gateway import (
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    create_order as razorpay_create_order,
    fetch_payment as razorpay_fetch_payment,
    is_configured as razorpay_is_configured,
    verify_payment_signature as razorpay_verify_payment_signature,
)
from cars_data import CARS_SEED, NEWS_SEED
import security
from security import RateLimiter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

CORS_ORIGINS = [o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',') if o.strip()] or ['*']
ALLOW_CREDENTIALS = '*' not in CORS_ORIGINS

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
# Keep the deep-analysis endpoints aligned with the public Claude model registry.
CLAUDE_MODEL = ("anthropic", "claude-sonnet-4-6")

# ---------- AI Model Registry ----------
# Models available for the 24/7 chatbot. Compare/Recommend continue to use
# CLAUDE_MODEL for deep, unbiased analysis.
AI_MODELS = {
    "claude": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "label": "Claude Sonnet 4.6",
        "family": "Anthropic",
        "strength": "Balanced reasoning · unbiased",
    },
    "claude-opus": {
        "provider": "anthropic",
        "model": "claude-opus-4-7",
        "label": "Claude Opus 4.7",
        "family": "Anthropic",
        "strength": "Deepest reasoning · premium",
    },
    "claude-haiku": {
        "provider": "anthropic",
        "model": "claude-haiku-4-5-20251001",
        "label": "Claude Haiku 4.5",
        "family": "Anthropic",
        "strength": "Ultra-fast · lightweight",
    },
    "gpt-flagship": {
        "provider": "openai",
        "model": "gpt-5.4",
        "label": "GPT-5.4",
        "family": "OpenAI",
        "strength": "Flagship reasoning · versatile",
    },
    "gpt-mini": {
        "provider": "openai",
        "model": "gpt-5.4-mini",
        "label": "GPT-5.4 Mini",
        "family": "OpenAI",
        "strength": "Fast & efficient",
    },
    "gemini-pro": {
        "provider": "gemini",
        "model": "gemini-3.1-pro-preview",
        "label": "Gemini 3.1 Pro",
        "family": "Google",
        "strength": "Deep analysis · latest",
    },
    "gemini-flash": {
        "provider": "gemini",
        "model": "gemini-3.5-flash",
        "label": "Gemini 3.5 Flash",
        "family": "Google",
        "strength": "Blazing fast · concise",
    },
}
DEFAULT_CHAT_MODEL = "claude"

_DOCS_ENABLED = security.APP_ENV != "production"
app = FastAPI(
    title="Auto-AI India API",
    # The interactive docs enumerate every endpoint and schema; keep them off in production.
    docs_url="/docs" if _DOCS_ENABLED else None,
    redoc_url="/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)
api_router = APIRouter(prefix="/api")

PHONE_PATTERN = r"^\+?[0-9]{10,15}$"


# ---------- Auth ----------
ADMIN_PIN = os.environ.get("ADMIN_PIN", "").strip()

# Per-phone limits stop OTP bombing a single number; the looser per-IP limits
# still allow shared/NAT egress addresses to sign several people in.
_otp_send_limiter = RateLimiter(limit=5, window_seconds=600)
_otp_send_ip_limiter = RateLimiter(limit=40, window_seconds=600)
_otp_verify_limiter = RateLimiter(limit=10, window_seconds=600)
_otp_verify_ip_limiter = RateLimiter(limit=60, window_seconds=600)
_admin_login_limiter = RateLimiter(limit=10, window_seconds=600)
_booking_limiter = RateLimiter(limit=60, window_seconds=600)
_dealer_apply_limiter = RateLimiter(limit=20, window_seconds=600)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


async def optional_user_phone(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Resolve the caller's phone from a session token, or None when unauthenticated."""
    token = _bearer_token(authorization)
    if not token:
        return None
    sess = await db.user_sessions.find_one({"token_hash": security.hash_secret(token)}, {"_id": 0})
    if not sess or security.is_expired(sess.get("expires_at")):
        return None
    return sess["phone"]


async def current_user_phone(phone: Optional[str] = Depends(optional_user_phone)) -> str:
    if not phone:
        raise HTTPException(status_code=401, detail="Authentication required")
    return phone


def _admin_pin_valid(pin: str) -> bool:
    if not ADMIN_PIN:
        # Fail closed: without a configured PIN the admin surface stays unreachable.
        raise HTTPException(status_code=503, detail="Admin access is not configured")
    return security.constant_time_equals(pin, ADMIN_PIN)
