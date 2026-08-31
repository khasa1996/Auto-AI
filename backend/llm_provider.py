"""Direct provider adapters for Auto-AI's LLM calls.

The application deliberately keeps provider credentials server-side and exposes a
small compatibility surface matching the former hosted-client usage:

    chat = LlmChat(...).with_model(provider, model)
    response = await chat.send_message(UserMessage(text=prompt))

Supported providers: Anthropic, OpenAI, and Google Gemini.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import httpx


class LLMProviderError(RuntimeError):
    """Raised when a provider cannot be resolved or returns an unusable response."""


@dataclass(frozen=True)
class UserMessage:
    text: str


DEFAULT_TIMEOUT = 60.0


# Provider-neutral model aliases. The registry in server.py can still pass the
# explicit provider/model tuple; these aliases are useful to tests and callers.
MODEL_ALIASES = {
    "claude": ("anthropic", "claude-sonnet-4-6"),
    "claude-opus": ("anthropic", "claude-opus-4-7"),
    "claude-haiku": ("anthropic", "claude-haiku-4-5-20251001"),
    "gpt-flagship": ("openai", "gpt-5.6"),
    "gpt-mini": ("openai", "gpt-5.6-luna"),
    "gemini-pro": ("gemini", "gemini-3.1-pro-preview"),
    "gemini-flash": ("gemini", "gemini-3.5-flash"),
}

# Keep already-deployed server registries compatible while they transition to
# the current OpenAI model IDs. The server passes explicit model IDs to this
# adapter, so normalization belongs at this provider boundary.
_OPENAI_MODEL_COMPATIBILITY = {
    "gpt-5.4": "gpt-5.6",
    "gpt-5.4-mini": "gpt-5.6-luna",
}


def resolve_model(model_key: Optional[str] = None) -> tuple[str, str]:
    """Resolve a model key to ``(provider, model)``."""
    if not model_key:
        return MODEL_ALIASES["claude"]
    try:
        return MODEL_ALIASES[model_key]
    except KeyError as exc:
        raise LLMProviderError(f"Unknown LLM model: {model_key}") from exc


class LlmChat:
    """Small async chat facade over direct provider HTTPS APIs."""

    def __init__(
        self,
        api_key: Optional[str],
        session_id: str,
        system_message: str,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        # ``api_key`` is retained for source compatibility but intentionally not
        # used as a shared hosted-provider credential. Each adapter reads its own
        # provider-specific environment variable.
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.timeout = timeout
        self.provider: Optional[str] = None
        self.model: Optional[str] = None

    def with_model(self, provider: str, model: str) -> "LlmChat":
        if provider == "openai":
            model = _OPENAI_MODEL_COMPATIBILITY.get(model, model)
        self.provider = provider
        self.model = model
        return self

    async def send_message(self, message: UserMessage) -> str:
        if not isinstance(message, UserMessage):
            raise LLMProviderError("send_message expects UserMessage")
        if not self.provider or not self.model:
            raise LLMProviderError("LLM provider/model has not been configured")

        if self.provider == "anthropic":
            return await self._anthropic(message.text)
        if self.provider == "openai":
            return await self._openai(message.text)
        if self.provider == "gemini":
            return await self._gemini(message.text)
        raise LLMProviderError(f"Unsupported LLM provider: {self.provider}")

    async def _anthropic(self, text: str) -> str:
        key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not key:
            raise LLMProviderError("ANTHROPIC_API_KEY is not configured")
        payload = {
            "model": self.model,
            "max_tokens": 4096,
            "system": self.system_message,
            "messages": [{"role": "user", "content": text}],
        }
        headers = {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
        if response.is_error:
            raise LLMProviderError(_provider_error("Anthropic", response))
        data = response.json()
        blocks = data.get("content") or []
        result = "".join(block.get("text", "") for block in blocks if block.get("type") == "text").strip()
        if not result:
            raise LLMProviderError("Anthropic returned an empty response")
        return result

    async def _openai(self, text: str) -> str:
        key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not key:
            raise LLMProviderError("OPENAI_API_KEY is not configured")
        payload = {
            "model": self.model,
            "input": [
                {"role": "system", "content": self.system_message},
                {"role": "user", "content": text},
            ],
        }
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post("https://api.openai.com/v1/responses", headers=headers, json=payload)
        if response.is_error:
            raise LLMProviderError(_provider_error("OpenAI", response))
        data = response.json()
        result = data.get("output_text", "").strip()
        if not result:
            # Defensive fallback for compatible Responses payloads.
            parts = []
            for item in data.get("output", []):
                for content in item.get("content", []):
                    if content.get("type") in {"output_text", "text"}:
                        parts.append(content.get("text", ""))
            result = "".join(parts).strip()
        if not result:
            raise LLMProviderError("OpenAI returned an empty response")
        return result

    async def _gemini(self, text: str) -> str:
        key = os.environ.get("GEMINI_API_KEY", "").strip() or os.environ.get("GOOGLE_API_KEY", "").strip()
        if not key:
            raise LLMProviderError("GEMINI_API_KEY is not configured")
        payload = {
            "system_instruction": {"parts": [{"text": self.system_message}]},
            "contents": [{"role": "user", "parts": [{"text": text}]}],
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, params={"key": key}, json=payload)
        if response.is_error:
            raise LLMProviderError(_provider_error("Gemini", response))
        data = response.json()
        parts = []
        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if part.get("text"):
                    parts.append(part["text"])
        result = "".join(parts).strip()
        if not result:
            raise LLMProviderError("Gemini returned an empty response")
        return result


def _provider_error(provider: str, response: httpx.Response) -> str:
    """Return a bounded provider error without exposing request credentials."""
    try:
        body = response.json()
        detail = body.get("error", {}).get("message") or body.get("message") or response.text
    except Exception:
        detail = response.text
    detail = str(detail).replace("\n", " ")[:500]
    return f"{provider} request failed ({response.status_code}): {detail}"
