"""Compatibility exports for Auto-AI's former Emergent LLM import path.

The implementation delegates to the project's direct-provider gateway. No
Emergent service or SDK is contacted by this module.
"""

from llm_provider import LlmChat, UserMessage

__all__ = ["LlmChat", "UserMessage"]
