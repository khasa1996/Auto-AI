"""Early Python runtime bootstrap for Render."""
import asyncio
import builtins

builtins._asyncio = asyncio
