"""Runtime compatibility bootstrap for the Render FastAPI service.

This is intentionally tiny: the current production server references the
module alias `_asyncio` during image prewarming. Python loads sitecustomize
before importing the application, so expose the standard asyncio module under
that legacy alias until the application code is normalized.
"""
import asyncio
import builtins

builtins._asyncio = asyncio
