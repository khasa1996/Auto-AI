# Configurator API Reference

All endpoints are under `/api/v1/`. They are **additive** — existing `/api/` endpoints are unchanged.

## Vehicle Data

| Method | Endpoint | Description | Status |
|---|---|---|---|
| GET | `/api/v1/brands` | List all brands | IMPLEMENTED |
| GET | `/api/v1/brands/:brand_id` | Get brand detail | IMPLEMENTED |
| GET | `/api/v1/models` | List models (filter by brand_id, body_type, segment) | IMPLEMENTED |
| GET | `/api/v1/models/:model_id` | Get model detail | IMPLEMENTED |
| GET | `/api/v1/variants` | List variants (filter by model_id, brand_id, fuel) | IMPLEMENTED |
| GET | `/api/v1/variants/:variant_id` | Get variant with pricing, colors, wheels, interiors | IMPLEMENTED |

## Configurator

| Method | Endpoint | Description | Status |
|---|---|---|---|
| GET | `/api/v1/configurator/:variant_id/availability` | Configurator status (AVAILABLE/COMING_SOON/etc) | IMPLEMENTED |
| GET | `/api/v1/configurator/:variant_id/asset` | Published 3D asset metadata | IMPLEMENTED |
| GET | `/api/v1/configurator/:variant_id/options` | All purchasable options (colors/wheels/interiors/roof/accessories) | IMPLEMENTED |
| GET | `/api/v1/configurator/:variant_id/rules` | Active compatibility rules | IMPLEMENTED |
| POST | `/api/v1/configurator/validate` | Validate a configuration against rules | IMPLEMENTED |
| POST | `/api/v1/configurator/price` | Calculate on-road price (backend authoritative) | IMPLEMENTED |
| POST | `/api/v1/configurator/configurations` | Save a configuration | FOUNDATION |
| GET | `/api/v1/configurator/configurations/:id` | Load a saved config (by ID or share token) | FOUNDATION |
| POST | `/api/v1/configurator/ai` | AI configuration intent (contract defined) | FOUNDATION |
| POST | `/api/v1/configurator/assets/validate-url` | Validate a 3D asset URL structurally | IMPLEMENTED |

## Price Request/Response

**POST** `/api/v1/configurator/price`

```json
{
  "configuration": {
    "variant_id": "tata-nexon-xz-plus",
    "paint_id": "nexon-xzp-flame-red",
    "wheel_id": "nexon-xzp-17inch-alloy",
    "interior_id": null,
    "roof_id": null,
    "accessory_ids": []
  },
  "city": "Mumbai"
}
```

Response:
```json
{
  "variant_id": "tata-nexon-xz-plus",
  "city": "Mumbai",
  "base_ex_showroom": 1099000,
  "option_deltas": [
    { "name": "Flame Red", "amount": 15000 },
    { "name": "17-inch Alloys", "amount": 20000 }
  ],
  "total_options": 35000,
  "subtotal_ex_showroom": 1134000,
  "rto": 120000,
  "insurance_approx": 45000,
  "estimated_on_road": 1299000,
  "price_is_estimate": true,
  "effective_date": "2026-09-03T17:00:00+00:00"
}
```

## Validate Request/Response

**POST** `/api/v1/configurator/validate`

```json
{
  "configuration": {
    "variant_id": "tata-nexon-xz-plus",
    "paint_id": "nexon-xzp-flame-red",
    "wheel_id": "incompatible-wheel"
  }
}
```

Response (invalid):
```json
{
  "valid": false,
  "errors": ["Wheel option 'incompatible-wheel' is not available for variant 'tata-nexon-xz-plus'"],
  "warnings": [],
  "rules_applied": []
}
```
