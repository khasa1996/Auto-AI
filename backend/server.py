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
from stripe_provider import StripeCheckout, CheckoutSessionRequest
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
CLAUDE_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")

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


async def require_admin(
    authorization: Optional[str] = Header(None),
    x_admin_pin: Optional[str] = Header(None),
) -> str:
    """Admin auth via a session token from /api/admin/verify, or the admin PIN header."""
    token = _bearer_token(authorization)
    if token:
        sess = await db.admin_sessions.find_one({"token_hash": security.hash_secret(token)}, {"_id": 0})
        if sess and not security.is_expired(sess.get("expires_at")):
            return "admin"
    if x_admin_pin and _admin_pin_valid(x_admin_pin):
        return "admin"
    raise HTTPException(status_code=401, detail="Admin authentication required")


def _admin_pin_valid(pin: str) -> bool:
    if not ADMIN_PIN:
        # Fail closed: without a configured PIN the admin surface stays unreachable.
        raise HTTPException(status_code=503, detail="Admin access is not configured")
    return security.constant_time_equals(pin, ADMIN_PIN)


# ---------- Models ----------
class Car(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    brand: str
    model: str
    variant: str
    segment: str
    fuel: str
    transmission: str
    price_ex_showroom: int
    price_on_road: int
    mileage_kmpl: float
    engine_cc: int
    power_bhp: int
    seats: int
    boot_litres: int
    safety_rating: int
    ground_clearance_mm: int
    waiting_weeks: int
    image: str
    tags: List[str] = []


class NewsItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    summary: str
    category: str
    date: str
    source: str
    image: str


class CompareRequest(BaseModel):
    car_a: str = Field(max_length=120)
    car_b: str = Field(max_length=120)
    user_need: Optional[str] = Field(default="general family use", max_length=500)


class RecommendRequest(BaseModel):
    budget_min: int = Field(ge=0, le=1_000_000_000)
    budget_max: int = Field(ge=0, le=1_000_000_000)
    fuel: Optional[str] = Field(default="Any", max_length=40)
    seats: Optional[int] = Field(default=5, ge=1, le=20)
    usage: Optional[str] = Field(default="city", max_length=200)
    notes: Optional[str] = Field(default="", max_length=1000)


class ChatRequest(BaseModel):
    model_config = {"protected_namespaces": ()}

    session_id: str = Field(max_length=128)
    message: str = Field(min_length=1, max_length=4000)
    language: Optional[str] = Field(default="English", max_length=40)
    model: Optional[str] = Field(default=None, max_length=40)  # "claude" | "gemini-pro" | "gemini-flash"


class BookingRequest(BaseModel):
    car_id: str = Field(max_length=80)
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=PHONE_PATTERN)
    email: Optional[str] = Field(default="", max_length=200)
    city: str = Field(min_length=1, max_length=80)
    preferred_date: Optional[str] = Field(default="", max_length=40)
    test_drive: bool = True
    needs_loan: bool = False
    needs_insurance: bool = False
    exchange_car: Optional[str] = Field(default="", max_length=120)
    notes: Optional[str] = Field(default="", max_length=2000)


class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    car_id: str
    car_name: str
    name: str
    phone: str
    email: str = ""
    city: str
    preferred_date: str = ""
    test_drive: bool
    needs_loan: bool
    needs_insurance: bool
    exchange_car: str = ""
    notes: str = ""
    status: str
    dealer: str
    eta_call_minutes: int
    created_at: str


class EMIRequest(BaseModel):
    principal: float = Field(gt=0, le=1_000_000_000)
    annual_rate: float = Field(ge=0, le=100)
    tenure_months: int = Field(gt=0, le=480)


# ---------- Startup: seed data ----------
@app.on_event("startup")
async def seed_db():
    # Re-seed cars & news every startup so expansions pick up
    await db.cars.delete_many({})
    await db.news.delete_many({})
    if CARS_SEED:
        await db.cars.insert_many([dict(c) for c in CARS_SEED])
    if NEWS_SEED:
        await db.news.insert_many([dict(n) for n in NEWS_SEED])

    await db.otps.create_index("phone")
    await db.user_sessions.create_index("token_hash")
    await db.admin_sessions.create_index("token_hash")
    await db.bookings.create_index("phone")

    if not security.SECRET_KEY_CONFIGURED:
        logger.warning("SECRET_KEY is not configured — sessions and OTPs will be invalidated on restart.")
    if not ADMIN_PIN:
        logger.warning("ADMIN_PIN is not configured — the admin API will refuse all requests.")

    # Pre-warm image proxy cache in the background for popular cars (non-blocking)
    import asyncio as _asyncio
    _asyncio.create_task(_prewarm_images())


async def _prewarm_images():
    """Fetch a curated set of car images to fill the proxy cache before first user visit."""
    import asyncio
    # Top 30 most-viewed cars (matches id list used by CAR_IMAGES on frontend)
    urls_to_warm = [
        "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-79.png",
        "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-6.png",
        "https://imgd.aeplcdn.com/664x374/n/cw/ec/159099/swift-exterior-right-front-three-quarter-31.png",
    ]
    for u in urls_to_warm:
        if u in _IMAGE_CACHE:
            continue
        try:
            r = await _fetch_image(u)
            if r.status_code == 200:
                _IMAGE_CACHE[u] = (r.content, r.headers.get("content-type", "image/jpeg"))
        except Exception:
            pass
        await asyncio.sleep(0.1)


# ---------- Helpers ----------
def extract_json(text: str):
    """Extract first JSON object from an LLM text response."""
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


async def get_chat(session_id: str, system_message: str, model_key: Optional[str] = None) -> LlmChat:
    """Return an LlmChat pinned to the requested model (default: Claude Sonnet)."""
    m = AI_MODELS.get(model_key) if model_key else None
    provider_model = (m["provider"], m["model"]) if m else CLAUDE_MODEL
    chat = LlmChat(
        api_key=None,
        session_id=session_id,
        system_message=system_message,
    ).with_model(*provider_model)
    return chat


async def find_car_by_name(name: str) -> Optional[dict]:
    name = name.strip().lower()
    # Try exact brand+model match first
    cars = await db.cars.find({}, {"_id": 0}).to_list(500)
    for c in cars:
        full = f"{c['brand']} {c['model']}".lower()
        if name in full or full in name or c['model'].lower() == name:
            return c
    # fuzzy: match by model token
    for c in cars:
        if c['model'].lower() in name or any(tok in c['model'].lower() for tok in name.split()):
            return c
    return None


# ---------- Image proxy (fixes Chrome ORB for hotlinked images) ----------
_IMAGE_CACHE: dict = {}
_ALLOWED_HOSTS = ("upload.wikimedia.org", "commons.wikimedia.org", "images.unsplash.com", "images.pexels.com", "videos.pexels.com", "cdn.pixabay.com", "imgd.aeplcdn.com", "imgd-ct.aeplcdn.com", "stimg.cardekho.com", "i.ytimg.com")


_MAX_PROXY_BYTES = 15 * 1024 * 1024


def _require_allowed_host(url: str):
    if not security.host_allowed(url, _ALLOWED_HOSTS):
        raise HTTPException(status_code=400, detail="Host not allowed")


async def _fetch_image(url: str):
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, max_redirects=3) as client:
        r = await client.get(url, headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux) Chrome/120 AutoAIIndia/1.0",
            "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*",
            "Referer": "https://www.carwale.com/",
        })
        # A redirect must not carry the request off the allowlist.
        _require_allowed_host(str(r.url))
        if len(r.content) > _MAX_PROXY_BYTES:
            raise HTTPException(status_code=502, detail="Upstream payload too large")
        return r


@app.get("/api/image-proxy")
async def image_proxy(url: str = Query(max_length=2000)):
    _require_allowed_host(url)

    if url in _IMAGE_CACHE:
        data, ctype = _IMAGE_CACHE[url]
    else:
        try:
            r = await _fetch_image(url)
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail="Upstream fetch failed")
            data = r.content
            ctype = r.headers.get("content-type", "image/jpeg")
            if len(_IMAGE_CACHE) < 1000:
                _IMAGE_CACHE[url] = (data, ctype)
        except HTTPException:
            raise
        except httpx.RequestError:
            logging.exception("image proxy upstream error")
            raise HTTPException(status_code=502, detail="Upstream error")

    return Response(content=data, media_type=ctype, headers={
        "Cache-Control": "public, max-age=604800",
        "Cross-Origin-Resource-Policy": "cross-origin",
    })


@app.api_route("/api/video-proxy", methods=["GET", "HEAD"])
async def video_proxy(request: Request, url: str = Query(max_length=2000)):
    """Stream video from allowed hosts (Pexels) with Range-request passthrough for HTML5 <video>."""
    from fastapi.responses import StreamingResponse
    _require_allowed_host(url)

    # Forward Range header from browser to upstream so video can seek/buffer properly
    forward_headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "video/mp4,video/*,*/*",
        "Referer": "https://www.pexels.com/",
    }
    range_header = request.headers.get("range")
    if range_header:
        forward_headers["Range"] = range_header

    client = httpx.AsyncClient(timeout=30.0, follow_redirects=True, max_redirects=3)
    try:
        method = "HEAD" if request.method == "HEAD" else "GET"
        req = client.build_request(method, url, headers=forward_headers)
        r = await client.send(req, stream=True)
        if not security.host_allowed(str(r.url), _ALLOWED_HOSTS):
            await r.aclose()
            await client.aclose()
            raise HTTPException(status_code=400, detail="Host not allowed")
        if r.status_code not in (200, 206):
            await r.aclose()
            await client.aclose()
            raise HTTPException(status_code=r.status_code, detail="Upstream fetch failed")

        ctype = r.headers.get("content-type", "video/mp4")
        resp_headers = {
            "Cache-Control": "public, max-age=86400",
            "Cross-Origin-Resource-Policy": "cross-origin",
            "Accept-Ranges": "bytes",
        }
        for h in ("content-length", "content-range"):
            if h in r.headers:
                resp_headers[h.title()] = r.headers[h]

        if request.method == "HEAD":
            await r.aclose()
            await client.aclose()
            return Response(status_code=r.status_code, media_type=ctype, headers=resp_headers)

        async def iterator():
            try:
                async for chunk in r.aiter_bytes(chunk_size=64 * 1024):
                    yield chunk
            finally:
                await r.aclose()
                await client.aclose()

        return StreamingResponse(iterator(), status_code=r.status_code, media_type=ctype, headers=resp_headers)
    except HTTPException:
        await client.aclose()
        raise
    except httpx.RequestError:
        await client.aclose()
        logging.exception("video proxy upstream error")
        raise HTTPException(status_code=502, detail="Upstream error")


# ---------- Car routes ----------
@api_router.get("/")
async def root():
    return {"message": "Auto-AI India API - Unbiased Car Intelligence"}


@api_router.get("/cars", response_model=List[Car])
async def list_cars(
    q: Optional[str] = Query(None, max_length=120),
    segment: Optional[str] = Query(None, max_length=40),
    fuel: Optional[str] = Query(None, max_length=40),
    budget_max: Optional[int] = Query(None, ge=0, le=1_000_000_000),
):
    query: dict = {}
    if segment:
        query["segment"] = segment
    if fuel and fuel != "Any":
        query["fuel"] = fuel
    if budget_max:
        query["price_ex_showroom"] = {"$lte": budget_max}
    cars = await db.cars.find(query, {"_id": 0}).to_list(500)
    if q:
        ql = q.lower()
        cars = [c for c in cars if ql in f"{c['brand']} {c['model']}".lower()]
    return cars


@api_router.get("/cars/{car_id}", response_model=Car)
async def get_car(car_id: str):
    car = await db.cars.find_one({"id": car_id}, {"_id": 0})
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car


@api_router.get("/news", response_model=List[NewsItem])
async def list_news():
    news = await db.news.find({}, {"_id": 0}).sort("date", -1).to_list(100)
    return news


# ---------- EMI ----------
@api_router.post("/emi/calculate")
async def calculate_emi(req: EMIRequest):
    r = req.annual_rate / 12 / 100
    n = req.tenure_months
    if r == 0:
        emi = req.principal / n
    else:
        emi = req.principal * r * ((1 + r) ** n) / (((1 + r) ** n) - 1)
    total_payment = emi * n
    total_interest = total_payment - req.principal
    return {
        "emi": round(emi, 2),
        "total_payment": round(total_payment, 2),
        "total_interest": round(total_interest, 2),
        "principal": req.principal,
        "tenure_months": n,
        "annual_rate": req.annual_rate,
    }


# ---------- AI Compare ----------
COMPARE_SYSTEM = """You are 'Auto-AI India', an absolutely unbiased Indian automotive analyst.
Rules:
- Zero brand promotion. No marketing fluff.
- Base verdict strictly on the data provided (safety, mileage, power, space, waiting, price).
- Call out HIDDEN CONS brands don't advertise (e.g. low boot, weak safety, long waiting, thirsty engine).
- Output STRICT JSON only. No extra prose, no markdown fences.

JSON schema:
{
  "winner": "<exact name of winning car>",
  "headline": "<one punchy sentence, <= 18 words>",
  "verdict": "<2-3 sentence transparent reasoning, Indian buyer context>",
  "pros_a": ["<pro1>", "<pro2>", "<pro3>"],
  "cons_a": ["<con1>", "<con2>", "<con3>"],
  "pros_b": ["<pro1>", "<pro2>", "<pro3>"],
  "cons_b": ["<con1>", "<con2>", "<con3>"],
  "scores": { "value": {"a": <0-10>, "b": <0-10>}, "safety": {"a": <0-10>, "b": <0-10>}, "efficiency": {"a": <0-10>, "b": <0-10>}, "comfort": {"a": <0-10>, "b": <0-10>}, "performance": {"a": <0-10>, "b": <0-10>} },
  "best_for": "<who should buy the winner>"
}
"""


@api_router.post("/ai/compare")
async def ai_compare(req: CompareRequest):
    car_a = await find_car_by_name(req.car_a)
    car_b = await find_car_by_name(req.car_b)
    if not car_a or not car_b:
        raise HTTPException(
            status_code=404,
            detail=f"Could not find one of the cars. a_found={bool(car_a)}, b_found={bool(car_b)}",
        )
    prompt = f"""Compare these two Indian cars for a buyer whose need is: "{req.user_need}".

CAR A:
{json.dumps(car_a, indent=2)}

CAR B:
{json.dumps(car_b, indent=2)}

Return ONLY the JSON in the exact schema."""
    try:
        chat = await get_chat(f"compare-{uuid.uuid4()}", COMPARE_SYSTEM)
        response = await chat.send_message(UserMessage(text=prompt))
        parsed = extract_json(response)
        if not parsed:
            raise HTTPException(status_code=502, detail="AI did not return valid JSON")
        return {"car_a": car_a, "car_b": car_b, "analysis": parsed}
    except HTTPException:
        raise
    except Exception:
        logging.exception("compare failure")
        raise HTTPException(status_code=502, detail="AI service unavailable")


# ---------- AI Recommend ----------
RECOMMEND_SYSTEM = """You are 'Auto-AI India', unbiased Indian car recommender.
From the candidate list, pick the TOP 3 that best fit the buyer needs. No brand bias.
Output STRICT JSON only:
{
  "top_picks": [
    {"car_id": "<id>", "score": <0-100>, "why": "<1-2 sentence transparent reasoning>", "watchouts": "<one honest con>"}
  ],
  "summary": "<2 sentence overall guidance>"
}
"""


@api_router.post("/ai/recommend")
async def ai_recommend(req: RecommendRequest):
    query: dict = {"price_ex_showroom": {"$gte": req.budget_min, "$lte": req.budget_max}}
    if req.fuel and req.fuel != "Any":
        query["fuel"] = req.fuel
    if req.seats:
        query["seats"] = {"$gte": req.seats}
    candidates = await db.cars.find(query, {"_id": 0}).to_list(200)
    if not candidates:
        return {"top_picks": [], "summary": "No cars match your criteria. Try widening the budget or seat filter.", "candidates": []}

    prompt = f"""Buyer profile:
- Budget: ₹{req.budget_min:,} to ₹{req.budget_max:,}
- Fuel: {req.fuel}
- Seats needed: {req.seats}
- Usage: {req.usage}
- Notes: {req.notes}

Candidate cars (JSON):
{json.dumps(candidates, indent=2)}

Return ONLY the JSON in the exact schema."""
    try:
        chat = await get_chat(f"recommend-{uuid.uuid4()}", RECOMMEND_SYSTEM)
        response = await chat.send_message(UserMessage(text=prompt))
        parsed = extract_json(response)
        if not parsed:
            raise HTTPException(status_code=502, detail="AI did not return valid JSON")
        id_map = {c["id"]: c for c in candidates}
        for pick in parsed.get("top_picks", []):
            pick["car"] = id_map.get(pick.get("car_id"))
        return parsed
    except HTTPException:
        raise
    except Exception:
        logging.exception("recommend failure")
        raise HTTPException(status_code=502, detail="AI service unavailable")


@api_router.get("/ai/models")
async def list_ai_models():
    """Return the list of chat models the user can pick from."""
    return {
        "default": DEFAULT_CHAT_MODEL,
        "models": [
            {"id": k, "label": v["label"], "family": v["family"], "strength": v["strength"]}
            for k, v in AI_MODELS.items()
        ],
    }


# ---------- Text-to-Speech (ElevenLabs) ----------
# Voice IDs are ElevenLabs' well-known public voices (multilingual_v2 handles Indian English pronunciation).
TTS_VOICES = {
    "female": {
        "voice_id": "EXAVITQu4vr4xnSDxMaL",  # Sarah — clear, warm female
        "label": "Sarah",
        "gender": "Female",
    },
    "male": {
        "voice_id": "IKne3meq5aSn9XLyUdCD",  # Charlie — confident, versatile male
        "label": "Charlie",
        "gender": "Male",
    },
}
DEFAULT_TTS_VOICE = "female"
_TTS_CHAR_LIMIT = 1200  # keep clips short — free tier is 10k chars/month


@api_router.get("/tts/voices")
async def tts_list_voices():
    return {
        "default": DEFAULT_TTS_VOICE,
        "voices": [
            {"id": k, "label": v["label"], "gender": v["gender"]}
            for k, v in TTS_VOICES.items()
        ],
    }


class TTSRequest(BaseModel):
    text: str = Field(max_length=5000)
    voice: Optional[str] = Field(default=None, max_length=20)  # "female" | "male"


@api_router.post("/tts/speak")
async def tts_speak(req: TTSRequest):
    """Generate MP3 audio for given text using ElevenLabs. Returns audio/mpeg bytes."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="TTS not configured")
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    if len(text) > _TTS_CHAR_LIMIT:
        text = text[:_TTS_CHAR_LIMIT] + "…"

    voice_key = req.voice if req.voice in TTS_VOICES else DEFAULT_TTS_VOICE
    voice_id = TTS_VOICES[voice_key]["voice_id"]

    try:
        # Local import so a missing pkg doesn't crash server startup
        from elevenlabs import ElevenLabs
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        audio_iter = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )
        # audio_iter is a byte generator; drain to bytes
        audio_bytes = b"".join(chunk for chunk in audio_iter if chunk)
        if not audio_bytes:
            raise HTTPException(status_code=502, detail="Empty audio from provider")
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Cross-Origin-Resource-Policy": "cross-origin",
            },
        )
    except HTTPException:
        raise
    except Exception:
        logging.exception("TTS failure")
        raise HTTPException(status_code=502, detail="TTS service unavailable")


# ---------- AI Chat ----------
CHAT_SYSTEM = """You are 'Auto-AI India', a 24×7 AI concierge for Indian car buyers.
Core abilities:
1. Unbiased car advice, comparisons, EMI guidance (data-driven, no brand promotion).
2. CUSTOMER SUCCESS / CRM: if the user mentions "my booking", "track", "my order", "cancel", "confirmation", "SMS", "email", or gives a booking id — use the BOOKING CONTEXT block below. Respond with exact details (booking id, car, dealer, status, ETA call time). Promise the dealer will call; acknowledge cancellation or reschedule requests politely.
3. NOTIFICATIONS: tell the user you've logged their request in-app and that the AI will remind the dealer. DO NOT claim SMS/email have been sent unless BOOKING CONTEXT explicitly mentions that.

Style: Concise, warm, confident. Use short paragraphs and bullet points.
Length: Under 180 words unless a deep-dive is asked.
Language: Reply in {LANGUAGE}. Devanagari for Hindi, Tamil script for Tamil, etc. Keep technical terms (EMI, kmpl, bhp, ADAS) as-is.

BOOKING CONTEXT:
{BOOKING_CONTEXT}
"""


def _format_booking_context(bookings: list) -> str:
    if not bookings:
        return "(no bookings linked to this phone)"
    lines = []
    for b in bookings[:5]:
        lines.append(
            f"- Booking #{b['id'][:8].upper()} · {b['car_name']} · City: {b['city']} · Dealer: {b['dealer']} · "
            f"Status: {b['status']} · ETA call: {b['eta_call_minutes']} min · Test drive: {b['test_drive']} · "
            f"Loan: {b['needs_loan']} · Insurance: {b['needs_insurance']}"
        )
    return "\n".join(lines)


@api_router.post("/ai/chat")
async def ai_chat(req: ChatRequest, caller_phone: Optional[str] = Depends(optional_user_phone)):
    try:
        await db.chat_messages.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": req.session_id,
            "role": "user",
            "content": req.message,
            "ts": datetime.now(timezone.utc).isoformat(),
        })

        # Fetch booking context if the message looks CRM-ish. Only the signed-in
        # caller's own bookings are ever loaded — a phone number typed into the
        # chat must not unlock someone else's records.
        booking_context = "(none)"
        msg_l = req.message.lower()
        crm_keywords = ["booking", "track", "order", "cancel", "confirm", "sms", "email", "my car", "dealer", "delivery"]
        if any(k in msg_l for k in crm_keywords):
            if caller_phone:
                bookings = await db.bookings.find({"phone": caller_phone}, {"_id": 0}).sort("created_at", -1).to_list(5)
                bk_match = re.search(r"\b([A-F0-9]{8})\b", req.message.upper())
                if bk_match:
                    bookings = [b for b in bookings if b["id"][:8].upper() == bk_match.group(1)] or bookings
                booking_context = _format_booking_context(bookings)
            else:
                booking_context = "(caller is not signed in — ask them to sign in at /login to see booking details)"

            # Log notification intent
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "session_id": req.session_id,
                "type": "crm_query",
                "message": req.message[:200],
                "ts": datetime.now(timezone.utc).isoformat(),
            })

        system = (CHAT_SYSTEM
                  .replace("{LANGUAGE}", req.language or "English")
                  .replace("{BOOKING_CONTEXT}", booking_context))
        chat = await get_chat(req.session_id, system, req.model)
        response = await chat.send_message(UserMessage(text=req.message))
        chosen = AI_MODELS.get(req.model or DEFAULT_CHAT_MODEL, AI_MODELS[DEFAULT_CHAT_MODEL])
        await db.chat_messages.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": req.session_id,
            "role": "assistant",
            "content": response,
            "model": chosen["label"],
            "ts": datetime.now(timezone.utc).isoformat(),
        })
        return {"reply": response, "model": chosen["label"]}
    except HTTPException:
        raise
    except Exception:
        logging.exception("chat failure")
        raise HTTPException(status_code=502, detail="AI service unavailable")


@api_router.get("/ai/chat/{session_id}/history")
async def chat_history(session_id: str):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(500)
    return msgs


# ---------- Bookings ----------
DEALERS_BY_CITY = {
    "Mumbai": "Auto-AI Partner — Andheri Hub",
    "Delhi": "Auto-AI Partner — Karol Bagh",
    "Bengaluru": "Auto-AI Partner — Indiranagar",
    "Bangalore": "Auto-AI Partner — Indiranagar",
    "Hyderabad": "Auto-AI Partner — Jubilee Hills",
    "Pune": "Auto-AI Partner — Koregaon Park",
    "Chennai": "Auto-AI Partner — Nungambakkam",
    "Kolkata": "Auto-AI Partner — Park Street",
    "Ahmedabad": "Auto-AI Partner — SG Highway",
    "Jaipur": "Auto-AI Partner — C-Scheme",
    "Lucknow": "Auto-AI Partner — Hazratganj",
    "Chandigarh": "Auto-AI Partner — Sector 17",
}


@api_router.post("/bookings", response_model=Booking)
async def create_booking(req: BookingRequest, request: Request):
    if not _booking_limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many bookings, try again later")
    car = await db.cars.find_one({"id": req.car_id}, {"_id": 0})
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    dealer = DEALERS_BY_CITY.get(req.city.strip().title(), f"Auto-AI Partner — {req.city}")
    booking = Booking(
        id=str(uuid.uuid4()),
        car_id=req.car_id,
        car_name=f"{car['brand']} {car['model']}",
        name=req.name,
        phone=req.phone,
        email=req.email or "",
        city=req.city,
        preferred_date=req.preferred_date or "",
        test_drive=req.test_drive,
        needs_loan=req.needs_loan,
        needs_insurance=req.needs_insurance,
        exchange_car=req.exchange_car or "",
        notes=req.notes or "",
        status="Confirmed — Dealer will call shortly",
        dealer=dealer,
        eta_call_minutes=15,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    await db.bookings.insert_one(booking.model_dump())

    leads = _assign_partners_to_booking(booking, car)
    if leads:
        await db.partner_leads.insert_many(leads)

    return booking


@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(
    booking_id: str,
    caller_phone: Optional[str] = Depends(optional_user_phone),
    x_admin_pin: Optional[str] = Header(None),
):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    is_admin = bool(x_admin_pin) and _admin_pin_valid(x_admin_pin)
    if not is_admin and b.get("phone") != caller_phone:
        # Same 404 as a missing booking so ids can't be enumerated.
        raise HTTPException(status_code=404, detail="Booking not found")
    return b


@api_router.get("/bookings")
async def list_bookings(
    phone: Optional[str] = Query(None, max_length=20),
    limit: int = Query(20, ge=1, le=200),
    _: str = Depends(require_admin),
):
    q: dict = {}
    if phone:
        q["phone"] = phone
    items = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return items


# ---------- Partners / Commission pipeline ----------
LOAN_PARTNERS = [
    {"id": "hdfc-bank", "name": "HDFC Bank", "type": "loan", "rate_min": 8.75, "rate_max": 10.25, "commission_pct": 1.2},
    {"id": "sbi", "name": "SBI", "type": "loan", "rate_min": 8.5, "rate_max": 9.95, "commission_pct": 1.0},
    {"id": "icici-bank", "name": "ICICI Bank", "type": "loan", "rate_min": 8.9, "rate_max": 10.5, "commission_pct": 1.3},
    {"id": "axis-bank", "name": "Axis Bank", "type": "loan", "rate_min": 9.0, "rate_max": 10.75, "commission_pct": 1.25},
    {"id": "bajaj-finserv", "name": "Bajaj Finserv", "type": "loan", "rate_min": 9.25, "rate_max": 11.5, "commission_pct": 1.5},
]
INSURANCE_PARTNERS = [
    {"id": "bajaj-allianz", "name": "Bajaj Allianz", "type": "insurance", "avg_premium_pct": 3.2, "commission_pct": 17.5},
    {"id": "icici-lombard", "name": "ICICI Lombard", "type": "insurance", "avg_premium_pct": 3.0, "commission_pct": 16.0},
    {"id": "hdfc-ergo", "name": "HDFC ERGO", "type": "insurance", "avg_premium_pct": 3.1, "commission_pct": 16.5},
    {"id": "tata-aig", "name": "TATA AIG", "type": "insurance", "avg_premium_pct": 2.9, "commission_pct": 15.5},
]


@api_router.get("/partners")
async def list_partners(type: Optional[str] = Query(None, max_length=20)):
    all_p = LOAN_PARTNERS + INSURANCE_PARTNERS
    if type:
        all_p = [p for p in all_p if p["type"] == type]
    return all_p


@api_router.get("/partners/leads")
async def partner_leads(_: str = Depends(require_admin)):
    leads = await db.partner_leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Aggregate commission totals
    total_commission = sum(lead.get("expected_commission", 0) for lead in leads)
    by_partner = {}
    for lead in leads:
        p = lead["partner_name"]
        if p not in by_partner:
            by_partner[p] = {"count": 0, "commission": 0.0}
        by_partner[p]["count"] += 1
        by_partner[p]["commission"] += lead.get("expected_commission", 0)
    return {"leads": leads, "total_commission": round(total_commission, 2), "by_partner": by_partner}


# ---------- Phone OTP Auth ----------
class OtpSendReq(BaseModel):
    phone: str = Field(pattern=PHONE_PATTERN)


class OtpVerifyReq(BaseModel):
    phone: str = Field(pattern=PHONE_PATTERN)
    otp: str = Field(min_length=4, max_length=10)


@api_router.post("/auth/send-otp")
async def send_otp(req: OtpSendReq, request: Request):
    if not _otp_send_limiter.allow(req.phone) or not _otp_send_ip_limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many OTP requests, try again later")

    otp = security.generate_otp()
    # Only the digest is persisted, and any earlier code for this phone is invalidated.
    await db.otps.delete_many({"phone": req.phone})
    await db.otps.insert_one({
        "phone": req.phone,
        "otp_hash": security.hash_secret(otp),
        "attempts": 0,
        "expires_at": security.expiry_iso(seconds=security.OTP_TTL_SECONDS),
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    if security.OTP_DEMO_MODE:
        return {"sent": True, "message": f"OTP sent (demo mode: use {otp})", "demo_otp": otp}
    # Delivery is the SMS provider's job; the code never leaves the server here.
    logger.info("OTP issued for %s", req.phone)
    return {"sent": True, "message": "OTP sent"}


@api_router.post("/auth/verify-otp")
async def verify_otp(req: OtpVerifyReq, request: Request):
    if not _otp_verify_limiter.allow(req.phone) or not _otp_verify_ip_limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")

    record = await db.otps.find_one({"phone": req.phone}, {"_id": 0})
    if not record or security.is_expired(record.get("expires_at")):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    if record.get("attempts", 0) >= security.OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts, request a new OTP")
    if not security.constant_time_equals(security.hash_secret(req.otp), record["otp_hash"]):
        await db.otps.update_one({"phone": req.phone}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")

    await db.otps.delete_many({"phone": req.phone})  # single use
    token = security.generate_token()
    await db.user_sessions.insert_one({
        "token_hash": security.hash_secret(token),
        "phone": req.phone,
        "expires_at": security.expiry_iso(hours=security.USER_SESSION_TTL_HOURS),
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return {"token": token, "phone": req.phone}


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    token = _bearer_token(authorization)
    if token:
        await db.user_sessions.delete_many({"token_hash": security.hash_secret(token)})
    return {"ok": True}


@api_router.get("/me/bookings")
async def my_bookings(phone: str = Depends(current_user_phone)):
    bookings = await db.bookings.find({"phone": phone}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return bookings


# ---------- Dealer Portal ----------
@api_router.get("/dealer/leads")
async def dealer_leads(
    city: Optional[str] = Query(None, max_length=80),
    _: str = Depends(require_admin),
):
    q: dict = {}
    if city:
        q["city"] = city
    bookings = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    total = len(bookings)
    by_car: dict = {}
    by_city: dict = {}
    test_drive_count = sum(1 for b in bookings if b.get("test_drive"))
    loan_count = sum(1 for b in bookings if b.get("needs_loan"))
    insurance_count = sum(1 for b in bookings if b.get("needs_insurance"))
    for b in bookings:
        by_car[b.get("car_name", "Unknown")] = by_car.get(b.get("car_name", "Unknown"), 0) + 1
        by_city[b.get("city", "Unknown")] = by_city.get(b.get("city", "Unknown"), 0) + 1
    top_cars = sorted(by_car.items(), key=lambda x: -x[1])[:10]
    top_cities = sorted(by_city.items(), key=lambda x: -x[1])[:10]
    return {
        "total_leads": total,
        "test_drive_requests": test_drive_count,
        "loan_interest": loan_count,
        "insurance_interest": insurance_count,
        "top_cars": [{"car": c, "count": n} for c, n in top_cars],
        "top_cities": [{"city": c, "count": n} for c, n in top_cities],
        "recent": bookings[:20],
    }


# ---------- Dealer self-service onboarding + lead bidding ----------
class DealerApplication(BaseModel):
    business_name: str = Field(min_length=1, max_length=160)
    owner_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=PHONE_PATTERN)
    email: Optional[str] = Field(default="", max_length=200)
    city: str = Field(min_length=1, max_length=80)
    brands: List[str] = Field(default_factory=list, max_length=40)
    bid_per_lead: float = Field(default=500.0, ge=0, le=1_000_000)  # how much they'll pay per qualified lead


@api_router.post("/dealers/apply")
async def dealer_apply(app: DealerApplication, request: Request):
    if not _dealer_apply_limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many applications, try again later")
    record = {
        "id": str(uuid.uuid4()),
        "business_name": app.business_name,
        "owner_name": app.owner_name,
        "phone": app.phone,
        "email": app.email or "",
        "city": app.city,
        "brands": app.brands,
        "bid_per_lead": app.bid_per_lead,
        "status": "pending_verification",
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.dealer_partners.insert_one(record.copy())
    record.pop("_id", None)
    return record


@api_router.get("/dealers")
async def list_dealers(
    city: Optional[str] = Query(None, max_length=80),
    _: str = Depends(require_admin),
):
    q: dict = {}
    if city:
        q["city"] = city
    items = await db.dealer_partners.find(q, {"_id": 0}).sort("bid_per_lead", -1).to_list(200)
    return items


# ---------- Admin Panel (token-gated; PIN only exchanged for a session token) ----------
class AdminPinReq(BaseModel):
    pin: str = Field(min_length=4, max_length=64)


@api_router.post("/admin/verify")
async def admin_verify(req: AdminPinReq, request: Request):
    if not _admin_login_limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")
    if not _admin_pin_valid(req.pin):
        raise HTTPException(status_code=401, detail="Invalid admin PIN")
    token = security.generate_token()
    await db.admin_sessions.insert_one({
        "token_hash": security.hash_secret(token),
        "expires_at": security.expiry_iso(hours=security.ADMIN_SESSION_TTL_HOURS),
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "token": token}


@api_router.post("/admin/logout")
async def admin_logout(authorization: Optional[str] = Header(None)):
    token = _bearer_token(authorization)
    if token:
        await db.admin_sessions.delete_many({"token_hash": security.hash_secret(token)})
    return {"ok": True}


@api_router.get("/admin/dealers")
async def admin_list_dealers(
    status: Optional[str] = Query(None, max_length=40),
    _: str = Depends(require_admin),
):
    q: dict = {}
    if status:
        q["status"] = status
    items = await db.dealer_partners.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Stats
    all_items = await db.dealer_partners.find({}, {"_id": 0, "status": 1, "bid_per_lead": 1}).to_list(500)
    stats = {
        "total": len(all_items),
        "pending": sum(1 for d in all_items if d.get("status") == "pending_verification"),
        "approved": sum(1 for d in all_items if d.get("status") == "approved"),
        "rejected": sum(1 for d in all_items if d.get("status") == "rejected"),
        "avg_bid": round(sum(d.get("bid_per_lead", 0) for d in all_items) / max(1, len(all_items)), 2),
    }
    return {"dealers": items, "stats": stats}


class AdminActionReq(BaseModel):
    note: Optional[str] = Field(default="", max_length=1000)


@api_router.post("/admin/dealers/{dealer_id}/approve")
async def admin_approve_dealer(dealer_id: str, req: AdminActionReq, _: str = Depends(require_admin)):
    result = await db.dealer_partners.update_one(
        {"id": dealer_id},
        {"$set": {
            "status": "approved",
            "verified": True,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "admin_note": req.note or "",
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dealer not found")
    updated = await db.dealer_partners.find_one({"id": dealer_id}, {"_id": 0})
    return updated


@api_router.post("/admin/dealers/{dealer_id}/reject")
async def admin_reject_dealer(dealer_id: str, req: AdminActionReq, _: str = Depends(require_admin)):
    result = await db.dealer_partners.update_one(
        {"id": dealer_id},
        {"$set": {
            "status": "rejected",
            "verified": False,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "admin_note": req.note or "",
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dealer not found")
    updated = await db.dealer_partners.find_one({"id": dealer_id}, {"_id": 0})
    return updated


# ---------- Stripe subscriptions ----------
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")

PLANS = {
    "premium": {"name": "Premium", "amount": 199.00, "currency": "inr"},
    "dealer": {"name": "Dealer", "amount": 999.00, "currency": "inr"},
}


class CheckoutRequest(BaseModel):
    plan_id: str = Field(max_length=40)
    origin_url: str = Field(max_length=300)


def _validated_origin(origin_url: str, http_request: Request) -> str:
    """Only ever redirect back to an origin we control — an attacker-supplied
    origin_url would otherwise turn Stripe's return flow into an open redirect."""
    candidate = origin_url.rstrip("/")
    allowed = {o.rstrip("/") for o in CORS_ORIGINS if o != "*"}
    allowed.add(str(http_request.base_url).rstrip("/"))
    request_origin = http_request.headers.get("origin")
    if candidate in allowed or (request_origin and candidate == request_origin.rstrip("/")):
        return candidate
    raise HTTPException(status_code=400, detail="origin_url is not allowed")


@api_router.post("/checkout/session")
async def create_checkout(
    req: CheckoutRequest,
    http_request: Request,
    customer_phone: str = Depends(current_user_phone),
):
    if req.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    origin_url = _validated_origin(req.origin_url, http_request)
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    plan = PLANS[req.plan_id]
    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{origin_url}/premium?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/premium"

    ck_req = CheckoutSessionRequest(
        amount=plan["amount"],
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"plan_id": req.plan_id, "phone": customer_phone},
    )
    session = await checkout.create_checkout_session(ck_req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "plan_id": req.plan_id,
        "amount": plan["amount"],
        "currency": plan["currency"],
        "phone": customer_phone,
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/checkout/status/{session_id}")
async def checkout_status(
    session_id: str,
    http_request: Request,
    caller_phone: str = Depends(current_user_phone),
):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or tx.get("phone") != caller_phone:
        raise HTTPException(status_code=404, detail="Session not found")

    if tx.get("payment_status") == "paid":
        return {"payment_status": "paid", "status": "complete"}

    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    status = None
    try:
        checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        status = await checkout.get_checkout_status(session_id)
    except Exception as e:
        logging.warning("Stripe status fetch failed (likely unpaid/pending): %s", e)
        # Return the DB-known state rather than 500ing
        return {
            "payment_status": tx.get("payment_status", "initiated"),
            "status": "open",
            "amount_total": None,
            "currency": tx.get("currency", "inr"),
        }

    if status is None:
        # Defensive guard — should not reach here since except returns above
        return {
            "payment_status": tx.get("payment_status", "initiated"),
            "status": "open",
            "amount_total": None,
            "currency": tx.get("currency", "inr"),
        }

    if tx.get("payment_status") != "paid" and status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": status.status, "paid_at": datetime.now(timezone.utc).isoformat()}},
        )
        if tx.get("phone"):
            await db.subscriptions.update_one(
                {"phone": tx["phone"], "plan_id": tx["plan_id"]},
                {"$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "phone": tx["phone"],
                    "plan_id": tx["plan_id"],
                    "session_id": session_id,
                    "status": "active",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=True,
            )
    return {
        "payment_status": status.payment_status,
        "status": status.status,
        "amount_total": status.amount_total,
        "currency": status.currency,
    }


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"ok": False}
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        evt = await checkout.handle_webhook(body, sig)
    except Exception:
        logging.exception("webhook error")
        return JSONResponse({"ok": False, "err": "invalid webhook"}, status_code=400)

    if evt.payment_status == "paid" and evt.session_id:
        await db.payment_transactions.update_one(
            {"session_id": evt.session_id},
            {"$set": {"payment_status": "paid", "webhook_event": evt.event_type, "paid_at": datetime.now(timezone.utc).isoformat()}},
        )
        meta = evt.metadata or {}
        if meta.get("phone") and meta.get("plan_id"):
            await db.subscriptions.update_one(
                {"phone": meta["phone"], "plan_id": meta["plan_id"]},
                {"$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "phone": meta["phone"],
                    "plan_id": meta["plan_id"],
                    "session_id": evt.session_id,
                    "status": "active",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=True,
            )
    return {"ok": True}


@api_router.get("/me/subscription")
async def my_subscription(phone: str = Depends(current_user_phone)):
    sub = await db.subscriptions.find_one({"phone": phone, "status": "active"}, {"_id": 0})
    return sub or {"status": "none"}


def _assign_partners_to_booking(booking: Booking, car: dict):
    """Create partner leads for bookings that need loan/insurance."""
    leads = []
    car_price = car.get("price_on_road") or car.get("price_ex_showroom") or 0

    if booking.needs_loan and LOAN_PARTNERS:
        # round-robin by count in DB
        partner = LOAN_PARTNERS[0]
        loan_amount = car_price * 0.85  # assume 85% LTV
        commission = loan_amount * partner["commission_pct"] / 100
        leads.append({
            "id": str(uuid.uuid4()),
            "booking_id": booking.id,
            "car_id": booking.car_id,
            "car_name": booking.car_name,
            "customer_name": booking.name,
            "customer_phone": booking.phone,
            "city": booking.city,
            "partner_id": partner["id"],
            "partner_name": partner["name"],
            "partner_type": "loan",
            "loan_amount": loan_amount,
            "expected_commission": round(commission, 2),
            "status": "assigned",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    if booking.needs_insurance and INSURANCE_PARTNERS:
        partner = INSURANCE_PARTNERS[0]
        premium = car_price * partner["avg_premium_pct"] / 100
        commission = premium * partner["commission_pct"] / 100
        leads.append({
            "id": str(uuid.uuid4()),
            "booking_id": booking.id,
            "car_id": booking.car_id,
            "car_name": booking.car_name,
            "customer_name": booking.name,
            "customer_phone": booking.phone,
            "city": booking.city,
            "partner_id": partner["id"],
            "partner_name": partner["name"],
            "partner_type": "insurance",
            "annual_premium": round(premium, 2),
            "expected_commission": round(commission, 2),
            "status": "assigned",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return leads


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    # Credentials cannot be combined with a wildcard origin, so a wildcard
    # deployment stays credential-less until CORS_ORIGINS is set explicitly.
    allow_credentials=ALLOW_CREDENTIALS,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Pin"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
