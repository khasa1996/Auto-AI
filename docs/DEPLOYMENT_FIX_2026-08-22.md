# Auto-AI Render Deployment Fix

Render startup showed `NameError: name '_IMAGE_CACHE' is not defined` inside
`_prewarm_images()`.

The image-cache globals are now declared before the startup handler, and image
prewarming is exception-safe. The background task consumes failures instead of
emitting `Task exception was never retrieved`.

Deploy this exact commit to the Render service configured by `render.yaml`
(`auto-ai-api`), then verify:

```bash
curl -i https://auto-ai-api.onrender.com/health/live
curl -i https://auto-ai-api.onrender.com/health/ready
```

The ready endpoint must report MongoDB and Redis as healthy.
