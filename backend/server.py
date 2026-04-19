from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage
from cars_data import CARS_SEED, NEWS_SEED

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
CLAUDE_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")

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
    session_id: str
    message: str
    language: Optional[str] = "English"


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


async def get_chat(session_id: str, system_message: str) -> LlmChat:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(*CLAUDE_MODEL)
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
    try:
        chat = await get_chat(f"compare-{uuid.uuid4()}", COMPARE_SYSTEM)
        response = await chat.send_message(UserMessage(text=prompt))
        parsed = extract_json(response)
        if not parsed:
            raise HTTPException(status_code=500, detail="AI did not return valid JSON")
        return {"car_a": car_a, "car_b": car_b, "analysis": parsed}
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("compare failure")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


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
            raise HTTPException(status_code=500, detail="AI did not return valid JSON")
        id_map = {c["id"]: c for c in candidates}
        for pick in parsed.get("top_picks", []):
            pick["car"] = id_map.get(pick.get("car_id"))
        return parsed
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("recommend failure")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


# ---------- AI Chat ----------
CHAT_SYSTEM = """You are 'Auto-AI India', a friendly, unbiased car expert assistant for Indian buyers.
Style: Concise, warm, human. Occasionally sprinkle local phrases if user does.
Rules:
- Never promote a brand. Always justify with data points (safety rating, mileage, waiting period, price).
- If you don't know specifics, say so and suggest comparing via the app's Compare tool.
- Keep answers under 180 words unless deep-dive is asked.
- Format with short paragraphs and bullet points when helpful.
- IMPORTANT: Reply in the user's chosen language: {LANGUAGE}. If language is English, reply in English. For Hindi reply in Devanagari Hindi, Tamil in Tamil script, etc. Keep technical terms (EMI, kmpl, bhp) as-is.
"""


@api_router.post("/ai/chat")
async def ai_chat(req: ChatRequest):
    try:
        await db.chat_messages.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": req.session_id,
            "role": "user",
            "content": req.message,
            "ts": datetime.now(timezone.utc).isoformat(),
        })
        system = CHAT_SYSTEM.replace("{LANGUAGE}", req.language or "English")
        chat = await get_chat(req.session_id, system)
        response = await chat.send_message(UserMessage(text=req.message))
        await db.chat_messages.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": req.session_id,
            "role": "assistant",
            "content": response,
            "ts": datetime.now(timezone.utc).isoformat(),
        })
        return {"reply": response}
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
    return booking


@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return b


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
