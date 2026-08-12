from fastapi import FastAPI, APIRouter, HTTPException, Request
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

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
from cars_data import CARS_SEED, NEWS_SEED
from utils import (
    build_query,
    ensure_allowed_host,
    extract_json,
    new_id,
    proxy_headers,
    random_hex,
    top_counts,
    utc_now_iso,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
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

app = FastAPI(title="Auto-AI India API")
api_router = APIRouter(prefix="/api")


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
    car_a: str
    car_b: str
    user_need: Optional[str] = "general family use"


class RecommendRequest(BaseModel):
    budget_min: int
    budget_max: int
    fuel: Optional[str] = "Any"
    seats: Optional[int] = 5
    usage: Optional[str] = "city"
    notes: Optional[str] = ""


class ChatRequest(BaseModel):
    model_config = {"protected_namespaces": ()}

    session_id: str
    message: str
    language: Optional[str] = "English"
    model: Optional[str] = None  # "claude" | "gemini-pro" | "gemini-flash"


class BookingRequest(BaseModel):
    car_id: str
    name: str
    phone: str
    email: Optional[str] = ""
    city: str
    preferred_date: Optional[str] = ""
    test_drive: bool = True
    needs_loan: bool = False
    needs_insurance: bool = False
    exchange_car: Optional[str] = ""
    notes: Optional[str] = ""


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
    principal: float
    annual_rate: float
    tenure_months: int


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
async def get_chat(session_id: str, system_message: str, model_key: Optional[str] = None) -> LlmChat:
    """Return an LlmChat pinned to the requested model (default: Claude Sonnet)."""
    m = AI_MODELS.get(model_key) if model_key else None
    provider_model = (m["provider"], m["model"]) if m else CLAUDE_MODEL
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(*provider_model)
    return chat


async def ask_for_json(session_prefix: str, system_message: str, prompt: str) -> dict:
    """Run a one-shot LLM prompt that must answer with JSON, or fail with an HTTP error."""
    try:
        chat = await get_chat(f"{session_prefix}-{new_id()}", system_message)
        response = await chat.send_message(UserMessage(text=prompt))
        parsed = extract_json(response)
        if not parsed:
            raise HTTPException(status_code=500, detail="AI did not return valid JSON")
        return parsed
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("%s failure", session_prefix)
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


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


async def _fetch_image(url: str):
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        r = await client.get(url, headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux) Chrome/120 AutoAIIndia/1.0",
            "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*",
            "Referer": "https://www.carwale.com/",
        })
        return r


@app.get("/api/image-proxy")
async def image_proxy(url: str):
    ensure_allowed_host(url, _ALLOWED_HOSTS)

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
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

    return Response(content=data, media_type=ctype, headers=proxy_headers(604800))


@app.api_route("/api/video-proxy", methods=["GET", "HEAD"])
async def video_proxy(url: str, request: Request):
    """Stream video from allowed hosts (Pexels) with Range-request passthrough for HTML5 <video>."""
    from fastapi.responses import StreamingResponse
    ensure_allowed_host(url, _ALLOWED_HOSTS)

    # Forward Range header from browser to upstream so video can seek/buffer properly
    forward_headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "video/mp4,video/*,*/*",
        "Referer": "https://www.pexels.com/",
    }
    range_header = request.headers.get("range")
    if range_header:
        forward_headers["Range"] = range_header

    client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
    try:
        method = "HEAD" if request.method == "HEAD" else "GET"
        req = client.build_request(method, url, headers=forward_headers)
        r = await client.send(req, stream=True)
        if r.status_code not in (200, 206):
            await r.aclose()
            await client.aclose()
            raise HTTPException(status_code=r.status_code, detail="Upstream fetch failed")

        ctype = r.headers.get("content-type", "video/mp4")
        resp_headers = proxy_headers(86400, **{"Accept-Ranges": "bytes"})
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
    except httpx.RequestError as e:
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"Upstream error: {e}")


# ---------- Car routes ----------
@api_router.get("/")
async def root():
    return {"message": "Auto-AI India API - Unbiased Car Intelligence"}


@api_router.get("/cars", response_model=List[Car])
async def list_cars(
    q: Optional[str] = None,
    segment: Optional[str] = None,
    fuel: Optional[str] = None,
    budget_max: Optional[int] = None,
):
    query = build_query(segment=segment, fuel=fuel)
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
    if req.tenure_months <= 0 or req.principal <= 0:
        raise HTTPException(status_code=400, detail="Invalid input")
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
    parsed = await ask_for_json("compare", COMPARE_SYSTEM, prompt)
    return {"car_a": car_a, "car_b": car_b, "analysis": parsed}


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
    query = build_query(fuel=req.fuel)
    query["price_ex_showroom"] = {"$gte": req.budget_min, "$lte": req.budget_max}
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
    parsed = await ask_for_json("recommend", RECOMMEND_SYSTEM, prompt)
    id_map = {c["id"]: c for c in candidates}
    for pick in parsed.get("top_picks", []):
        pick["car"] = id_map.get(pick.get("car_id"))
    return parsed


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
    text: str
    voice: Optional[str] = None  # "female" | "male"


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
            headers=proxy_headers(3600),
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("TTS failure")
        raise HTTPException(status_code=502, detail=f"TTS error: {e}")



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
async def ai_chat(req: ChatRequest):
    try:
        await db.chat_messages.insert_one({
            "id": new_id(),
            "session_id": req.session_id,
            "role": "user",
            "content": req.message,
            "ts": utc_now_iso(),
        })

        # Fetch booking context if the message looks CRM-ish or a phone number was provided
        booking_context = "(none)"
        msg_l = req.message.lower()
        crm_keywords = ["booking", "track", "order", "cancel", "confirm", "sms", "email", "my car", "dealer", "delivery"]
        if any(k in msg_l for k in crm_keywords):
            # look for phone number or booking id in the message
            phone_match = re.search(r"\b(\d{10})\b", req.message)
            bk_match = re.search(r"\b([A-F0-9]{8})\b", req.message.upper())
            query: dict = {}
            if phone_match:
                query["phone"] = phone_match.group(1)
            if not query:
                # Use all recent bookings from this session_id (chat already established trust)
                bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
            else:
                bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(5)
            if bk_match:
                # filter by id prefix
                bookings = [b for b in bookings if b["id"][:8].upper() == bk_match.group(1)] or bookings
            booking_context = _format_booking_context(bookings)

            # Log notification intent
            await db.notifications.insert_one({
                "id": new_id(),
                "session_id": req.session_id,
                "type": "crm_query",
                "message": req.message[:200],
                "ts": utc_now_iso(),
            })

        system = (CHAT_SYSTEM
                  .replace("{LANGUAGE}", req.language or "English")
                  .replace("{BOOKING_CONTEXT}", booking_context))
        chat = await get_chat(req.session_id, system, req.model)
        response = await chat.send_message(UserMessage(text=req.message))
        chosen = AI_MODELS.get(req.model or DEFAULT_CHAT_MODEL, AI_MODELS[DEFAULT_CHAT_MODEL])
        await db.chat_messages.insert_one({
            "id": new_id(),
            "session_id": req.session_id,
            "role": "assistant",
            "content": response,
            "model": chosen["label"],
            "ts": utc_now_iso(),
        })
        return {"reply": response, "model": chosen["label"]}
    except Exception as e:
        logging.exception("chat failure")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


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
async def create_booking(req: BookingRequest):
    car = await db.cars.find_one({"id": req.car_id}, {"_id": 0})
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    dealer = DEALERS_BY_CITY.get(req.city.strip().title(), f"Auto-AI Partner — {req.city}")
    booking = Booking(
        id=new_id(),
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
        created_at=utc_now_iso(),
    )
    await db.bookings.insert_one(booking.model_dump())

    leads = _assign_partners_to_booking(booking, car)
    if leads:
        await db.partner_leads.insert_many(leads)

    return booking


@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return b


@api_router.get("/bookings")
async def list_bookings(phone: Optional[str] = None, limit: int = 20):
    q = build_query(phone=phone)
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
async def list_partners(type: Optional[str] = None):
    all_p = LOAN_PARTNERS + INSURANCE_PARTNERS
    if type:
        return [p for p in all_p if p["type"] == type]
    return all_p


@api_router.get("/partners/leads")
async def partner_leads():
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
    phone: str


class OtpVerifyReq(BaseModel):
    phone: str
    otp: str


@api_router.post("/auth/send-otp")
async def send_otp(req: OtpSendReq):
    # MVP: OTP is always 123456. Replace with Twilio/MSG91 integration when keys available.
    await db.otps.insert_one({
        "phone": req.phone, "otp": "123456",
        "ts": utc_now_iso(),
    })
    return {"sent": True, "message": "OTP sent (MVP: use 123456)", "demo_otp": "123456"}


@api_router.post("/auth/verify-otp")
async def verify_otp(req: OtpVerifyReq):
    if req.otp != "123456":
        raise HTTPException(status_code=401, detail="Invalid OTP")
    token = f"autoai_{req.phone}_{random_hex(12)}"
    await db.user_sessions.insert_one({
        "token": token, "phone": req.phone,
        "ts": utc_now_iso(),
    })
    return {"token": token, "phone": req.phone}


@api_router.get("/me/bookings")
async def my_bookings(phone: str):
    bookings = await db.bookings.find({"phone": phone}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return bookings


# ---------- Dealer Portal ----------
@api_router.get("/dealer/leads")
async def dealer_leads(city: Optional[str] = None):
    q = build_query(city=city)
    bookings = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    total = len(bookings)
    test_drive_count = sum(1 for b in bookings if b.get("test_drive"))
    loan_count = sum(1 for b in bookings if b.get("needs_loan"))
    insurance_count = sum(1 for b in bookings if b.get("needs_insurance"))
    top_cars = top_counts(bookings, "car_name")
    top_cities = top_counts(bookings, "city")
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
    business_name: str
    owner_name: str
    phone: str
    email: Optional[str] = ""
    city: str
    brands: List[str] = []
    bid_per_lead: float = 500.0  # how much they'll pay per qualified lead


@api_router.post("/dealers/apply")
async def dealer_apply(app: DealerApplication):
    record = {
        "id": new_id(),
        "business_name": app.business_name,
        "owner_name": app.owner_name,
        "phone": app.phone,
        "email": app.email or "",
        "city": app.city,
        "brands": app.brands,
        "bid_per_lead": app.bid_per_lead,
        "status": "pending_verification",
        "verified": False,
        "created_at": utc_now_iso(),
    }
    await db.dealer_partners.insert_one(record.copy())
    record.pop("_id", None)
    return record


@api_router.get("/dealers")
async def list_dealers(city: Optional[str] = None):
    q = build_query(city=city)
    items = await db.dealer_partners.find(q, {"_id": 0}).sort("bid_per_lead", -1).to_list(200)
    return items


# ---------- Admin Panel (PIN-gated) ----------
ADMIN_PIN = os.environ.get("ADMIN_PIN", "108108")  # default demo PIN


def _check_admin(pin: str):
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid admin PIN")


class AdminPinReq(BaseModel):
    pin: str


@api_router.post("/admin/verify")
async def admin_verify(req: AdminPinReq):
    _check_admin(req.pin)
    return {"ok": True, "token": f"admin_{random_hex()}"}


@api_router.get("/admin/dealers")
async def admin_list_dealers(pin: str, status: Optional[str] = None):
    _check_admin(pin)
    q = build_query(status=status)
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
    pin: str
    note: Optional[str] = ""


async def _set_dealer_status(dealer_id: str, status: str, verified: bool, decided_at_field: str, note: str):
    """Apply an admin verdict to a dealer application and return the updated record."""
    result = await db.dealer_partners.update_one(
        {"id": dealer_id},
        {"$set": {
            "status": status,
            "verified": verified,
            decided_at_field: utc_now_iso(),
            "admin_note": note or "",
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dealer not found")
    return await db.dealer_partners.find_one({"id": dealer_id}, {"_id": 0})


@api_router.post("/admin/dealers/{dealer_id}/approve")
async def admin_approve_dealer(dealer_id: str, req: AdminActionReq):
    _check_admin(req.pin)
    return await _set_dealer_status(dealer_id, "approved", True, "approved_at", req.note)


@api_router.post("/admin/dealers/{dealer_id}/reject")
async def admin_reject_dealer(dealer_id: str, req: AdminActionReq):
    _check_admin(req.pin)
    return await _set_dealer_status(dealer_id, "rejected", False, "rejected_at", req.note)


# ---------- Stripe subscriptions ----------
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")

PLANS = {
    "premium": {"name": "Premium", "amount": 199.00, "currency": "inr"},
    "dealer": {"name": "Dealer", "amount": 999.00, "currency": "inr"},
}


class CheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str
    customer_phone: Optional[str] = ""


@api_router.post("/checkout/session")
async def create_checkout(req: CheckoutRequest, http_request: Request):
    if req.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    plan = PLANS[req.plan_id]
    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{req.origin_url}/premium?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/premium"

    ck_req = CheckoutSessionRequest(
        amount=plan["amount"],
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"plan_id": req.plan_id, "phone": req.customer_phone or "anonymous"},
    )
    session = await checkout.create_checkout_session(ck_req)

    await db.payment_transactions.insert_one({
        "id": new_id(),
        "session_id": session.session_id,
        "plan_id": req.plan_id,
        "amount": plan["amount"],
        "currency": plan["currency"],
        "phone": req.customer_phone or "",
        "payment_status": "initiated",
        "created_at": utc_now_iso(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, http_request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
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
        await _mark_transaction_paid(session_id, {"status": status.status})
        if tx.get("phone"):
            await _activate_subscription(tx["phone"], tx["plan_id"], session_id)
    return {
        "payment_status": status.payment_status,
        "status": status.status,
        "amount_total": status.amount_total,
        "currency": status.currency,
    }


async def _mark_transaction_paid(session_id: str, extra: dict):
    """Flag a checkout transaction as paid, plus caller-specific fields."""
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": "paid", "paid_at": utc_now_iso(), **extra}},
    )


async def _activate_subscription(phone: str, plan_id: str, session_id: str):
    """Create the active subscription for a paid plan if it does not exist yet."""
    await db.subscriptions.update_one(
        {"phone": phone, "plan_id": plan_id},
        {"$setOnInsert": {
            "id": new_id(),
            "phone": phone,
            "plan_id": plan_id,
            "session_id": session_id,
            "status": "active",
            "started_at": utc_now_iso(),
        }},
        upsert=True,
    )


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
    except Exception as e:
        logging.exception("webhook error")
        return JSONResponse({"ok": False, "err": str(e)}, status_code=400)

    if evt.payment_status == "paid" and evt.session_id:
        await _mark_transaction_paid(evt.session_id, {"webhook_event": evt.event_type})
        meta = evt.metadata or {}
        if meta.get("phone") and meta.get("plan_id"):
            await _activate_subscription(meta["phone"], meta["plan_id"], evt.session_id)
    return {"ok": True}


@api_router.get("/me/subscription")
async def my_subscription(phone: str):
    sub = await db.subscriptions.find_one({"phone": phone, "status": "active"}, {"_id": 0})
    return sub or {"status": "none"}



def _partner_lead(booking: Booking, partner: dict, partner_type: str, commission: float, extra: dict) -> dict:
    """Build a partner lead document for a booking."""
    return {
        "id": new_id(),
        "booking_id": booking.id,
        "car_id": booking.car_id,
        "car_name": booking.car_name,
        "customer_name": booking.name,
        "customer_phone": booking.phone,
        "city": booking.city,
        "partner_id": partner["id"],
        "partner_name": partner["name"],
        "partner_type": partner_type,
        "expected_commission": round(commission, 2),
        "status": "assigned",
        "created_at": utc_now_iso(),
        **extra,
    }


def _assign_partners_to_booking(booking: Booking, car: dict):
    """Create partner leads for bookings that need loan/insurance."""
    leads = []
    car_price = car.get("price_on_road") or car.get("price_ex_showroom") or 0

    if booking.needs_loan and LOAN_PARTNERS:
        # round-robin by count in DB
        partner = LOAN_PARTNERS[0]
        loan_amount = car_price * 0.85  # assume 85% LTV
        commission = loan_amount * partner["commission_pct"] / 100
        leads.append(_partner_lead(booking, partner, "loan", commission, {"loan_amount": loan_amount}))
    if booking.needs_insurance and INSURANCE_PARTNERS:
        partner = INSURANCE_PARTNERS[0]
        premium = car_price * partner["avg_premium_pct"] / 100
        commission = premium * partner["commission_pct"] / 100
        leads.append(_partner_lead(booking, partner, "insurance", commission, {"annual_premium": round(premium, 2)}))
    return leads


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
