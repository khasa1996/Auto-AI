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
CLAUDE_MODEL = ("anthropic", "claude-sonnet-4-6")

# ---------- AI Model Registry ----------
AI_MODELS = {
    "claude": {"provider": "anthropic", "model": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6", "family": "Anthropic", "strength": "Balanced reasoning · unbiased"},
    "claude-opus": {"provider": "anthropic", "model": "claude-opus-4-7", "label": "Claude Opus 4.7", "family": "Anthropic", "strength": "Deepest reasoning · premium"},
    "claude-haiku": {"provider": "anthropic", "model": "claude-haiku-4-5-20251001", "label": "Claude Haiku 4.5", "family": "Anthropic", "strength": "Ultra-fast · lightweight"},
    "gpt-flagship": {"provider": "openai", "model": "gpt-5.4", "label": "GPT-5.4", "family": "OpenAI", "strength": "Flagship reasoning · versatile"},
    "gpt-mini": {"provider": "openai", "model": "gpt-5.4-mini", "label": "GPT-5.4 Mini", "family": "OpenAI", "strength": "Fast & efficient"},
    "gemini-pro": {"provider": "gemini", "model": "gemini-3.1-pro-preview", "label": "Gemini 3.1 Pro", "family": "Google", "strength": "Deep analysis · latest"},
    "gemini-flash": {"provider": "gemini", "model": "gemini-3.5-flash", "label": "Gemini 3.5 Flash", "family": "Google", "strength": "Blazing fast · concise"},
}
DEFAULT_CHAT_MODEL = "claude"

# Keep API documentation enabled so production operators can validate the live API.
# Authentication/authorization remain enforced at individual routes.
app = FastAPI(title="Auto-AI India API")
api_router = APIRouter(prefix="/api")
PHONE_PATTERN = r"^\+?[0-9]{10,15}$"

ADMIN_PIN = os.environ.get("ADMIN_PIN", "").strip()
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
        raise HTTPException(status_code=503, detail="Admin access is not configured")
    return security.constant_time_equals(pin, ADMIN_PIN)

async def require_admin(authorization: Optional[str] = Header(None), x_admin_pin: Optional[str] = Header(None)) -> str:
    token = _bearer_token(authorization)
    if token:
        sess = await db.admin_sessions.find_one({"token_hash": security.hash_secret(token)}, {"_id": 0})
        if sess and not security.is_expired(sess.get("expires_at")):
            return "admin"
    if x_admin_pin and _admin_pin_valid(x_admin_pin):
        return "admin"
    raise HTTPException(status_code=401, detail="Admin authentication required")

class Car(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str; brand: str; model: str; variant: str; segment: str; fuel: str; transmission: str
    price_ex_showroom: int; price_on_road: int; mileage_kmpl: float; engine_cc: int; power_bhp: int
    seats: int; boot_litres: int; safety_rating: int; ground_clearance_mm: int; waiting_weeks: int; image: str
    tags: List[str] = []

class NewsItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str; title: str; summary: str; category: str; date: str; source: str; image: str

class CompareRequest(BaseModel):
    car_a: str = Field(max_length=120); car_b: str = Field(max_length=120); user_need: Optional[str] = Field(default="general family use", max_length=500)

class RecommendRequest(BaseModel):
    budget_min: int = Field(ge=0, le=1_000_000_000); budget_max: int = Field(ge=0, le=1_000_000_000)
    fuel: Optional[str] = Field(default="Any", max_length=40); seats: Optional[int] = Field(default=5, ge=1, le=20)
    usage: Optional[str] = Field(default="city", max_length=200); notes: Optional[str] = Field(default="", max_length=1000)

class ChatRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    session_id: str = Field(max_length=128); message: str = Field(min_length=1, max_length=4000)
    language: Optional[str] = Field(default="English", max_length=40); model: Optional[str] = Field(default=None, max_length=40)

class BookingRequest(BaseModel):
    car_id: str = Field(max_length=80); name: str = Field(min_length=1, max_length=120); phone: str = Field(pattern=PHONE_PATTERN)
    email: Optional[str] = Field(default="", max_length=200); city: str = Field(min_length=1, max_length=80)
    preferred_date: Optional[str] = Field(default="", max_length=40); test_drive: bool = True; needs_loan: bool = False; needs_insurance: bool = False
    exchange_car: Optional[str] = Field(default="", max_length=120); notes: Optional[str] = Field(default="", max_length=2000)

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str; car_id: str; car_name: str; name: str; phone: str; email: str = ""; city: str; preferred_date: str = ""
    test_drive: bool; needs_loan: bool; needs_insurance: bool; exchange_car: str = ""; notes: str = ""; status: str; dealer: str; eta_call_minutes: int; created_at: str

class EMIRequest(BaseModel):
    principal: float = Field(gt=0, le=1_000_000_000); annual_rate: float = Field(ge=0, le=100); tenure_months: int = Field(gt=0, le=480)

@app.get("/health")
async def health():
    await db.command("ping")
    return {"status": "ok"}

@app.on_event("startup")
async def seed_db():
    await db.cars.delete_many({}); await db.news.delete_many({})
    if CARS_SEED: await db.cars.insert_many([dict(c) for c in CARS_SEED])
    if NEWS_SEED: await db.news.insert_many([dict(n) for n in NEWS_SEED])
    await db.otps.create_index("phone"); await db.user_sessions.create_index("token_hash"); await db.admin_sessions.create_index("token_hash"); await db.bookings.create_index("phone")
    if not security.SECRET_KEY_CONFIGURED: logger.warning("SECRET_KEY is not configured — sessions and OTPs will be invalidated on restart.")
    if not ADMIN_PIN: logger.warning("ADMIN_PIN is not configured — the admin API will refuse all requests.")
    import asyncio as _asyncio; _asyncio.create_task(_prewarm_images())

async def _prewarm_images():
    import asyncio
    urls_to_warm = [
        "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-79.png",
        "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-6.png",
        "https://imgd.aeplcdn.com/664x374/n/cw/ec/159099/swift-exterior-right-front-three-quarter-31.png",
    ]
    for u in urls_to_warm:
        if u in _IMAGE_CACHE: continue
        try:
            r = await _fetch_image(u)
            if r.status_code == 200: _IMAGE_CACHE[u] = (r.content, r.headers.get("content-type", "image/jpeg"))
        except Exception: pass
        await asyncio.sleep(0.1)

def extract_json(text: str):
    match = re.search(r"\{[\s\S]*\}", text)
    if not match: return None
    try: return json.loads(match.group(0))
    except Exception: return None
