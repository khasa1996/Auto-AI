from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"{label}: expected source block not found")
    path.write_text(text.replace(old, new, 1))


server = Path("backend/server.py")
replace_once(
    server,
    '''async def get_chat(session_id: str, system_message: str, model_key: Optional[str] = None) -> LlmChat:\n    """Return an LlmChat pinned to the requested model (default: Claude Sonnet)."""\n    m = AI_MODELS.get(model_key) if model_key else None\n    provider_model = (m["provider"], m["model"]) if m else CLAUDE_MODEL\n    chat = LlmChat(\n        api_key=None,\n        session_id=session_id,\n        system_message=system_message,\n    ).with_model(*provider_model)\n    return chat\n''',
    '''async def get_chat(\n    session_id: str,\n    system_message: str,\n    model_key: Optional[str] = None,\n    owner_phone: Optional[str] = None,\n) -> LlmChat:\n    """Return an LlmChat pinned to the requested model and caller-owned history."""\n    m = AI_MODELS.get(model_key) if model_key else None\n    provider_model = (m["provider"], m["model"]) if m else CLAUDE_MODEL\n    chat = LlmChat(\n        api_key=None,\n        session_id=session_id,\n        system_message=system_message,\n        owner_phone=owner_phone,\n    ).with_model(*provider_model)\n    return chat\n''',
    "get_chat",
)
replace_once(
    server,
    '''@api_router.post("/ai/chat")\nasync def ai_chat(req: ChatRequest, caller_phone: Optional[str] = Depends(optional_user_phone)):\n    try:\n        await db.chat_messages.insert_one({\n            "id": str(uuid.uuid4()),\n            "session_id": req.session_id,\n            "role": "user",\n            "content": req.message,\n            "ts": datetime.now(timezone.utc).isoformat(),\n        })\n''',
    '''@api_router.post("/ai/chat")\nasync def ai_chat(req: ChatRequest, caller_phone: Optional[str] = Depends(optional_user_phone)):\n    try:\n        # Guest chat is intentionally stateless. Authenticated chat is persisted\n        # and bound to the authenticated phone so a session id cannot cross users.\n        if caller_phone:\n            existing = await db.chat_messages.find_one(\n                {"session_id": req.session_id}, {"_id": 0, "owner_phone": 1}\n            )\n            if existing and existing.get("owner_phone") != caller_phone:\n                raise HTTPException(status_code=403, detail="Chat session belongs to another user")\n            await db.chat_messages.insert_one({\n                "id": str(uuid.uuid4()),\n                "session_id": req.session_id,\n                "owner_phone": caller_phone,\n                "role": "user",\n                "content": req.message,\n                "ts": datetime.now(timezone.utc).isoformat(),\n            })\n''',
    "ai_chat user persistence",
)
replace_once(server, '        chat = await get_chat(req.session_id, system, req.model)\n', '        chat = await get_chat(req.session_id, system, req.model, caller_phone)\n', "ai_chat get_chat call")
replace_once(
    server,
    '''        await db.chat_messages.insert_one({\n            "id": str(uuid.uuid4()),\n            "session_id": req.session_id,\n            "role": "assistant",\n            "content": response,\n            "model": chosen["label"],\n            "ts": datetime.now(timezone.utc).isoformat(),\n        })\n''',
    '''        if caller_phone:\n            await db.chat_messages.insert_one({\n                "id": str(uuid.uuid4()),\n                "session_id": req.session_id,\n                "owner_phone": caller_phone,\n                "role": "assistant",\n                "content": response,\n                "model": chosen["label"],\n                "ts": datetime.now(timezone.utc).isoformat(),\n            })\n''',
    "ai_chat assistant persistence",
)
replace_once(
    server,
    '''@api_router.get("/ai/chat/{session_id}/history")\nasync def chat_history(session_id: str):\n    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(500)\n    return msgs\n''',
    '''@api_router.get("/ai/chat/{session_id}/history")\nasync def chat_history(session_id: str, caller_phone: str = Depends(current_user_phone)):\n    msgs = await db.chat_messages.find(\n        {"session_id": session_id, "owner_phone": caller_phone}, {"_id": 0}\n    ).sort("ts", 1).to_list(500)\n    return msgs\n''',
    "chat_history",
)
replace_once(
    server,
    '''    request_origin = http_request.headers.get("origin")\n    if candidate in allowed or (request_origin and candidate == request_origin.rstrip("/")):\n        return candidate\n''',
    '''    if candidate in allowed:\n        return candidate\n''',
    "Stripe origin validation",
)

llm = Path("backend/llm_provider.py")
replace_once(
    llm,
    '''class LlmChat:\n    def __init__(self, api_key: Optional[str], session_id: str, system_message: str):\n        self.session_id = session_id\n        self.system_message = system_message\n        self.model_key: Optional[str] = None\n''',
    '''class LlmChat:\n    def __init__(\n        self,\n        api_key: Optional[str],\n        session_id: str,\n        system_message: str,\n        owner_phone: Optional[str] = None,\n    ):\n        self.session_id = session_id\n        self.system_message = system_message\n        self.owner_phone = owner_phone\n        self.model_key: Optional[str] = None\n''',
    "LlmChat constructor",
)
replace_once(
    llm,
    '''        history: list[dict[str, str]] = []\n        try:\n            server_module = __import__("server")\n            db = getattr(server_module, "db", None)\n            if db is not None:\n                rows = await db.chat_messages.find(\n                    {"session_id": self.session_id}, {"_id": 0, "role": 1, "content": 1}\n                ).sort("ts", 1).to_list(30)\n                history = [\n                    {"role": row["role"], "content": row["content"]}\n                    for row in rows\n                    if row.get("role") in {"user", "assistant"} and row.get("content")\n                ]\n                if history and history[-1]["role"] == "user" and history[-1]["content"] == message.text:\n                    history = history[:-1]\n        except Exception:\n            # Chat generation must not fail merely because optional history\n            # loading is unavailable during startup/tests.\n            history = []\n''',
    '''        history: list[dict[str, str]] = []\n        # Only authenticated sessions have persisted history. Guest chat is\n        # stateless, preventing an attacker from replaying a guessed session id.\n        if self.owner_phone:\n            try:\n                server_module = __import__("server")\n                db = getattr(server_module, "db", None)\n                if db is not None:\n                    rows = await db.chat_messages.find(\n                        {"session_id": self.session_id, "owner_phone": self.owner_phone},\n                        {"_id": 0, "role": 1, "content": 1},\n                    ).sort("ts", 1).to_list(30)\n                    history = [\n                        {"role": row["role"], "content": row["content"]}\n                        for row in rows\n                        if row.get("role") in {"user", "assistant"} and row.get("content")\n                    ]\n                    if history and history[-1]["role"] == "user" and history[-1]["content"] == message.text:\n                        history = history[:-1]\n            except Exception:\n                # Chat generation must not fail merely because optional history\n                # loading is unavailable during startup/tests.\n                history = []\n''',
    "LlmChat history",
)
