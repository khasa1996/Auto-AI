"""Regression tests for configurator compatibility rules."""

from typing import Any, Dict, List, Optional

import pytest

from configurator_schemas import ConfigurationValidationRequest
from rules_engine import validate_configuration


class _Cursor:
    def __init__(self, documents: List[Dict[str, Any]]) -> None:
        self.documents = documents

    def sort(self, *args: Any, **kwargs: Any) -> "_Cursor":
        return self

    async def to_list(self, limit: int) -> List[Dict[str, Any]]:
        return self.documents[:limit]


class _Collection:
    def __init__(self, documents: List[Dict[str, Any]]) -> None:
        self.documents = documents

    async def find_one(
        self,
        query: Dict[str, Any],
        projection: Optional[Dict[str, int]] = None,
    ) -> Optional[Dict[str, Any]]:
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return dict(document)
        return None

    def find(
        self,
        query: Dict[str, Any],
        projection: Optional[Dict[str, int]] = None,
    ) -> _Cursor:
        matched = [
            dict(document)
            for document in self.documents
            if document.get("active") is True
        ]
        return _Cursor(matched)


class _Database:
    def __init__(self) -> None:
        self.variants = _Collection([
            {"variant_id": "variant-1", "model_id": "model-1"},
        ])
        self.cars = _Collection([])
        self.variant_colors = _Collection([])
        self.variant_wheels = _Collection([])
        self.variant_interiors = _Collection([])
        self.configurator_options = _Collection([
            {
                "option_id": "roof-panoramic",
                "variant_id": "variant-1",
                "option_type": "roof",
                "available": True,
            },
        ])
        self.configurator_rules = _Collection([
            {
                "rule_id": "roof-requires-package",
                "variant_id": "variant-1",
                "model_id": None,
                "target_option_type": "roof",
                "target_option_id": "roof-panoramic",
                "effect": "require",
                "conditions": [
                    {"condition_type": "option_selected", "value": "premium-package"},
                ],
                "active": True,
                "priority": 100,
            },
        ])


@pytest.mark.asyncio
async def test_require_rule_rejects_missing_required_option() -> None:
    request = ConfigurationValidationRequest(
        configuration={
            "variant_id": "variant-1",
            "roof_id": "roof-panoramic",
        }
    )

    result = await validate_configuration(request, _Database())

    assert result.valid is False
    assert result.errors == [
        "Option 'roof-panoramic' requires 'premium-package' to also be selected"
    ]
