from typing import TypedDict

from fastapi import APIRouter


class HealthResponse(TypedDict):
    status: str
    service: str


router = APIRouter()


@router.get('/health', response_model=None)
def health() -> HealthResponse:
    return {'status': 'ok', 'service': 'auto-ai-api'}
