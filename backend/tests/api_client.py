"""Shared test bootstrap: resolves the backend base URL the suites hit."""
import os
from pathlib import Path

from dotenv import load_dotenv

_FRONTEND_ENV = Path('/app/frontend/.env')
_ENV_KEY = 'REACT_APP_BACKEND_URL'


def _base_url_from_env_file(path: Path) -> str:
    if not path.exists():
        return ""
    for line in path.read_text().splitlines():
        if line.startswith(f"{_ENV_KEY}="):
            return line.split('=', 1)[1].strip().rstrip('/')
    return ""


load_dotenv(Path(__file__).resolve().parents[1] / '.env')
BASE_URL = os.environ.get(_ENV_KEY, '').rstrip('/') or _base_url_from_env_file(_FRONTEND_ENV)
API = f"{BASE_URL}/api"
