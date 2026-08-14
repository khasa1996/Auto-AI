"""Provider-neutral LLM gateway for Auto-AI.

This module intentionally uses vendor HTTP APIs through the existing `httpx`
dependency instead of a hosted integration layer. Provider credentials stay
server-side and are read only from environment variables.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Iterable, Optional

import httpx


class LLMProviderError(RuntimeError):
    """Raised when a configured LLM provider cannot satisfy a request."""


@dataclass(frozen=True)
class LLMResult:
    text: str
    provider: str
    model: str


MODELS: dict[str, dict[str, str]] = {
    "claude": {"provider": "anthropic", "model": "claude-sonnet-4-6"},
    "claude-opus": {"provider": "anthropic", "model": "claude-opus-4-7"},
    "claude-haiku": {"provider": "anthropic", "model": "claude-haiku-4-5-20251001"},
    "gpt-flagship": {"provider": "openai", "model": "gpt-5.4"},
    "gpt-mini": {"provider": "openai", "model": "gpt-5.4-mini"},
    "gemini-pro": {"provider": "gemini", "model": "gemini-3.1-pro-preview"},
    "gemini-flash": {"provider": "gemini", "model": "gemini-3.5-flash"},
}


def _required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise LLMProviderError(f"{name} is not configured")
    return value


def resolve_model(model_key: Optional[str]) -> tuple[str, str]:
    key = model_key or "claude"
    entry = MODELS.get(key)
    if not entry:
        raise LLMProviderError(f"Unknown AI model: {key}")
    return entry["provider"], entry["model"]


def _anthropic_messages(user: str, history: Optional[Iterable[dict[str, str]]]) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for item in history or []:
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user})
    return messages


async def _call_anthropic(model: str, system: str, user: str, history: Optional[Iterable[dict[str, str]]]) -> str:
    key = _required_env("ANTHROPIC_API_KEY")
    payload = {
        "model": model,
        "max_tokens": int(os.environ.get("LLM_MAX_TOKENS", "4096")),
        "system": system,
        "messages": _anthropic_messages(user, history),
    }
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
    if response.status_code >= 400:
        raise LLMProviderError(f"Anthropic request failed with HTTP {response.status_code}")
    data = response.json()
    text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
    if not text:
        raise LLMProviderError("Anthropic returned an empty response")
    return text


async def _call_openai(model: str, system: str, user: str, history: Optional[Iterable[dict[str, str]]]) -> str:
    key = _required_env("OPENAI_API_KEY")
    if history:
        input_items: list[dict[str, str]] = []
        for item in history:
            role = item.get("role")
            content = item.get("content")
            if role in {"user", "assistant"} and content:
                input_items.append({"role": role, "content": content})
        input_items.append({"role": "user", "content": user})
        input_value: Any = input_items
    else:
        input_value = user
    payload = {
        "model": model,
        "instructions": system,
        "input": input_value,
        "max_output_tokens": int(os.environ.get("LLM_MAX_TOKENS", "4096")),
    }
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post("https://api.openai.com/v1/responses", headers=headers, json=payload)
    if response.status_code >= 400:
        raise LLMProviderError(f"OpenAI request failed with HTTP {response.status_code}")
    data = response.json()
    text = data.get("output_text")
    if not text:
        parts: list[str] = []
        for item in data.get("output", []):
            for content in item.get("content", []):
                if content.get("type") in {"output_text", "text"} and content.get("text"):
                    parts.append(content["text"])
        text = "".join(parts)
    if not text:
        raise LLMProviderError("OpenAI returned an empty response")
    return text


async def _call_gemini(model: str, system: str, user: str, history: Optional[Iterable[dict[str, str]]]) -> str:
    key = _required_env("GEMINI_API_KEY")
    contents: list[dict[str, Any]] = []
    for item in history or []:
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and content:
            contents.append({"role": "model" if role == "assistant" else "user", "parts": [{"text": content}]})
    contents.append({"role": "user", "parts": [{"text": user}]})
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": int(os.environ.get("LLM_MAX_TOKENS", "4096"))},
    }
    headers = {"x-goog-api-key": key, "Content-Type": "application/json"}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(url, headers=headers, json=payload)
    if response.status_code >= 400:
        raise LLMProviderError(f"Gemini request failed with HTTP {response.status_code}")
    data = response.json()
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts if part.get("text"))
    if not text:
        raise LLMProviderError("Gemini returned an empty response")
    return text


async def generate_text(
    *,
    model_key: Optional[str],
    system: str,
    user: str,
    history: Optional[Iterable[dict[str, str]]] = None,
) -> LLMResult:
    provider, model = resolve_model(model_key)
    if provider == "anthropic":
        text = await _call_anthropic(model, system, user, history)
    elif provider == "openai":
        text = await _call_openai(model, system, user, history)
    elif provider == "gemini":
        text = await _call_gemini(model, system, user, history)
    else:
        raise LLMProviderError(f"Unsupported provider: {provider}")
    return LLMResult(text=text, provider=provider, model=model)


# Compatibility surface for the existing server routes. This deliberately
# mirrors only the tiny subset of the old chat SDK that Auto-AI uses.
@dataclass(frozen=True)
class UserMessage:
    text: str


class LlmChat:
    def __init__(self, api_key: Optional[str], session_id: str, system_message: str):
        self.session_id = session_id
        self.system_message = system_message
        self.model_key: Optional[str] = None

    def with_model(self, provider: str, model: str) -> "LlmChat":
        for key, entry in MODELS.items():
            if entry["provider"] == provider and entry["model"] == model:
                self.model_key = key
                break
        if self.model_key is None:
            raise LLMProviderError(f"Unsupported model: {provider}/{model}")
        return self

    async def send_message(self, message: UserMessage) -> str:
        # The server persists chat messages. Loading recent turns here keeps
        # session continuity without requiring a hosted conversation service.
        history: list[dict[str, str]] = []
        try:
            server_module = __import__("server")
            db = getattr(server_module, "db", None)
            if db is not None:
                rows = await db.chat_messages.find(
                    {"session_id": self.session_id}, {"_id": 0, "role": 1, "content": 1}
                ).sort("ts", 1).to_list(30)
                history = [
                    {"role": row["role"], "content": row["content"]}
                    for row in rows
                    if row.get("role") in {"user", "assistant"} and row.get("content")
                ]
                if history and history[-1]["role"] == "user" and history[-1]["content"] == message.text:
                    history = history[:-1]
        except Exception:
            # Chat generation must not fail merely because optional history
            # loading is unavailable during startup/tests.
            history = []
        result = await generate_text(
            model_key=self.model_key,
            system=self.system_message,
            user=message.text,
            history=history,
        )
        return result.text
