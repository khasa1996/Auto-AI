# AI Configurator

## Status: FOUNDATION — Contract Defined, Full NLP Flow Phase 3+

## Intended Flow

```
User: "Give me the best-looking SUV under ₹20 lakh with dark interior"
  ↓
AI extracts AIConfiguratorIntent:
  { max_budget: 2000000, preferred_segment: "SUV",
    preferred_interior_description: "dark" }
  ↓
Backend queries /api/v1/variants (budget + segment filter)
Backend queries /api/v1/configurator/:id/options for each candidate
  ↓
AI matches preferences against real option IDs only
(cannot invent option IDs)
  ↓
POST /api/v1/configurator/validate
(AI cannot bypass this — invalid config rejected)
  ↓
POST /api/v1/configurator/price
(AI cannot invent prices)
  ↓
Returns ConfigurationState + PriceResponse
  ↓
UI opens configurator with that configuration applied
```

## What the AI Must Never Do

- Invent a vehicle that is not in the database
- Invent an option ID (paint, wheel, interior, etc.)
- Invent a price
- Skip validation
- Claim a 3D model exists when `configurator_status != AVAILABLE`

## Current Endpoint

`POST /api/v1/configurator/ai` accepts `AIConfiguratorIntent` and returns `AIConfiguratorResponse`.

Currently returns a foundation stub explaining that full NLP flow is Phase 3. The contract is defined and validated — implementation requires connecting to `llm_provider.py` and wiring through the validation + pricing pipeline.
