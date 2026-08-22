"""Small deterministic helpers for bounded AI responses."""
from __future__ import annotations

import json
from typing import Optional


def extract_json(text: str) -> Optional[dict]:
    """Extract the first valid JSON object without greedy regex parsing."""
    decoder = json.JSONDecoder()
    cleaned = text.strip()

    if cleaned.startswith("```"):
        first_newline = cleaned.find("\n")
        if first_newline >= 0:
            cleaned = cleaned[first_newline + 1 :]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    for index, character in enumerate(cleaned):
        if character != "{":
            continue
        try:
            value, _ = decoder.raw_decode(cleaned[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value

    return None
