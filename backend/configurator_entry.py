"""Staging entrypoint that layers the Phase 2 configurator onto the production app."""

from server import app, db, optional_user_phone
from configurator_routes import make_configurator_router


app.include_router(make_configurator_router(db, optional_user_phone))
