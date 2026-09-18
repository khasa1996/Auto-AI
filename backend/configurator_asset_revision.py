"""Production-safe lifecycle contracts for Ultra 3D asset revisions."""

from __future__ import annotations

import re
from enum import Enum

from pydantic import BaseModel, Field, field_validator

_SHA256_PATTERN = re.compile(r"^[0-9a-fA-F]{64}$")


class AssetRevisionStatus(str, Enum):
    INTAKE = "INTAKE"
    VALIDATING = "VALIDATING"
    VALIDATED = "VALIDATED"
    REVIEWED = "REVIEWED"
    PUBLISHED = "PUBLISHED"
    SUPERSEDED = "SUPERSEDED"


_ALLOWED_TRANSITIONS: dict[AssetRevisionStatus, frozenset[AssetRevisionStatus]] = {
    AssetRevisionStatus.INTAKE: frozenset({AssetRevisionStatus.VALIDATING}),
    AssetRevisionStatus.VALIDATING: frozenset({AssetRevisionStatus.VALIDATED}),
    AssetRevisionStatus.VALIDATED: frozenset({AssetRevisionStatus.REVIEWED}),
    AssetRevisionStatus.REVIEWED: frozenset({AssetRevisionStatus.PUBLISHED}),
    AssetRevisionStatus.PUBLISHED: frozenset({AssetRevisionStatus.SUPERSEDED}),
    AssetRevisionStatus.SUPERSEDED: frozenset(),
}


class ConfiguratorAssetRevision(BaseModel):
    """Immutable identity/evidence snapshot for one asset revision."""

    revision_id: str = Field(..., min_length=2, max_length=120)
    asset_id: str = Field(..., min_length=2, max_length=100)
    variant_id: str = Field(..., min_length=1, max_length=100)
    version: str = Field(..., min_length=1, max_length=30)
    checksum_sha256: str = Field(..., min_length=64, max_length=64)
    state: AssetRevisionStatus = AssetRevisionStatus.INTAKE
    supersedes_revision_id: str | None = Field(None, max_length=120)

    @field_validator("checksum_sha256")
    @classmethod
    def checksum_must_be_sha256(cls, value: str) -> str:
        if not _SHA256_PATTERN.fullmatch(value):
            raise ValueError("checksum_sha256 must be a 64-char hex string")
        return value.lower()


def can_transition_revision(
    current: AssetRevisionStatus,
    target: AssetRevisionStatus,
) -> bool:
    """Return whether a revision may move to the requested lifecycle state."""
    return target in _ALLOWED_TRANSITIONS[current]


def select_active_revision(
    active_revision_id: str,
    revisions: list[ConfiguratorAssetRevision],
    expected_variant_id: str | None = None,
) -> ConfiguratorAssetRevision:
    """Resolve an explicitly selected published revision without mutation."""
    revision = next(
        (item for item in revisions if item.revision_id == active_revision_id),
        None,
    )
    if revision is None:
        raise ValueError("active revision was not found")

    if expected_variant_id is not None and revision.variant_id != expected_variant_id:
        raise ValueError("active revision does not match expected variant")

    if revision.state is not AssetRevisionStatus.PUBLISHED:
        raise ValueError("active revision must be PUBLISHED")

    return revision
