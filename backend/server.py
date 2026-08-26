from fastapi import FastAPI, APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import json
import logging
import re
import httpx
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone

from llm_provider import LlmChat, UserMessage
from ai_utils import extract_json
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
CORS_ORIGINS = [origin.strip().rstrip("/") for origin in os.environ.get("CORS_ORIGINS", "*").split(",") if origin.strip()] or ["*"]
if security.APP_ENV == "production" and "*" in CORS_ORIGINS:
    raise RuntimeError("CORS_ORIGINS must be explicit when APP_ENV=production")
ALLOW_CREDENTIALS = "*" not in CORS_ORIGINS
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
CLAUDE_MODEL = ("anthropic", "claude-sonnet-4-6")
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
_DOCS_ENABLED = security.APP_ENV != "production"
app = FastAPI(title="Auto-AI India API", docs_url="/docs" if _DOCS_ENABLED else None, redoc_url="/redoc" if _DOCS_ENABLED else None, openapi_url="/openapi.json" if _DOCS_ENABLED else None)
api_router = APIRouter(prefix="/api")

@app.middleware("http")
async def request_security_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > 1_048_576:
                return JSONResponse(status_code=413, content={"detail": "Request body too large", "request_id": request_id})
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length", "request_id": request_id})
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

PHONE_PATTERN = r"^\+?[0-9]{10,15}$"
ADMIN_PIN = os.environ.get("ADMIN_PIN", "").strip()
_rate_limiter = security.DistributedRateLimiter()

async def _rate_allowed(namespace: str, key: str, limit: int, window_seconds: int) -> bool:
    return await _rate_limiter.allow(namespace, key, limit, window_seconds)

def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"

def _bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization: return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip(): return None
    return token.strip()

async def optional_user_phone(authorization: Optional[str] = Header(None)) -> Optional[str]:
    token = _bearer_token(authorization)
    if not token: return None
    sess = await db.user_sessions.find_one({"token_hash": security.hash_secret(token)}, {"_id": 0})
    if not sess or security.is_expired(sess.get("expires_at")): return None
    return sess["phone"]

async def current_user_phone(phone: Optional[str] = Depends(optional_user_phone)) -> str:
    if not phone: raise HTTPException(status_code=401, detail="Authentication required")
    return phone

async def require_admin(authorization: Optional[str] = Header(None)) -> str:
    token = _bearer_token(authorization)
    if token:
        sess = await db.admin_sessions.find_one({"token_hash": security.hash_secret(token)}, {"_id": 0})
        if sess and not security.is_expired(sess.get("expires_at")): return "admin"
    raise HTTPException(status_code=401, detail="Admin authentication required")

def _admin_pin_valid(pin: str) -> bool:
    if not ADMIN_PIN: raise HTTPException(status_code=503, detail="Admin access is not configured")
    return security.constant_time_equals(pin, ADMIN_PIN)

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
    idempotency_key: Optional[str] = Field(default=None, min_length=16, max_length=128)
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

_IMAGE_CACHE: dict[str, tuple[bytes, str]] = {}
_IMAGE_CACHE_BYTES = 50 * 1024 * 1024
_IMAGE_CACHE_MAX_ITEM = 5 * 1024 * 1024
_IMAGE_CACHE_SIZE = 0

@app.on_event("startup")
async def seed_db():
    await db.command("ping")
    await _rate_limiter.connect()
    if await db.cars.estimated_document_count() == 0 and CARS_SEED:
        await db.cars.insert_many([dict(c) for c in CARS_SEED])
    if await db.news.estimated_document_count() == 0 and NEWS_SEED:
        await db.news.insert_many([dict(n) for n in NEWS_SEED])
    await db.otps.create_index("phone")
    await db.otps.create_index("expires_at", expireAfterSeconds=0)
    await db.user_sessions.create_index("token_hash", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.admin_sessions.create_index("token_hash", unique=True)
    await db.admin_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.bookings.create_index("phone")
    await db.bookings.create_index("idempotency_key", unique=True, sparse=True)
    await db.payment_transactions.create_index("order_id", unique=True)
    await db.payment_transactions.create_index("idempotency_key", unique=True, sparse=True)
    await db.payment_transactions.create_index("payment_id", unique=True, sparse=True)
    await db.entitlements.create_index([("phone", 1), ("plan_id", 1)], unique=True)
    await db.processed_payment_events.create_index("expires_at", expireAfterSeconds=0)
    await db.chat_sessions.create_index([("session_id", 1), ("phone", 1)], unique=True)
    await db.chat_messages.create_index([("session_id", 1), ("owner_phone", 1), ("ts", 1)])
    if not security.SECRET_KEY_CONFIGURED:
        logger.warning("SECRET_KEY is not configured — sessions and OTPs will be invalidated on restart.")
    if not ADMIN_PIN:
        logger.warning("ADMIN_PIN is not configured — the admin API will refuse all requests.")
    task = asyncio.create_task(_prewarm_images(), name="auto-ai-image-prewarm")
    task.add_done_callback(lambda completed: (completed.exception() if not completed.cancelled() else None))

async def _prewarm_images() -> None:
    global _IMAGE_CACHE_SIZE
    try:
        await _prewarm_images_impl()
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception("Image prewarm failed")

async def _prewarm_images_impl() -> None:
    global _IMAGE_CACHE_SIZE
    urls_to_warm = [
        "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-79.png",
        "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-6.png",
        "https://imgd.aeplcdn.com/664x374/n/cw/ec/159099/swift-exterior-right-front-three-quarter-31.png",
    ]
    for url in urls_to_warm:
        if url in _IMAGE_CACHE:
            continue
        try:
            data, content_type = await _fetch_image(url)
            if _IMAGE_CACHE_SIZE + len(data) <= _IMAGE_CACHE_BYTES:
                _IMAGE_CACHE[url] = (data, content_type)
                _IMAGE_CACHE_SIZE += len(data)
        except Exception:
            logger.debug("Image prewarm failed", exc_info=True)
        await asyncio.sleep(0.1)

async def get_chat(session_id: str, system_message: str, model_key: Optional[str] = None) -> LlmChat:
    if model_key is not None and model_key not in AI_MODELS:
        raise HTTPException(status_code=400, detail="Unsupported AI model")
    model = AI_MODELS[model_key] if model_key else AI_MODELS[DEFAULT_CHAT_MODEL]
    return LlmChat(api_key=None, session_id=session_id, system_message=system_message).with_model(model["provider"], model["model"])

async def find_car_by_name(name: str) -> Optional[dict]:
    normalized = name.strip().lower()
    cars = await db.cars.find({}, {"_id": 0}).to_list(500)
    for car in cars:
        full_name = f"{car['brand']} {car['model']}".lower()
        if normalized in full_name or full_name in normalized or car["model"].lower() == normalized:
            return car
