# Configurator Pricing

## Status: IMPLEMENTED (engine) | DATA REQUIRED (city components)

## Formula

```
base_ex_showroom                 ← from variant_pricing collection
+ Σ option price deltas          ← from variant_colors / variant_wheels / variant_interiors
= subtotal_ex_showroom

+ rto                            ← city-specific (DATA REQUIRED)
+ insurance_approx               ← city-specific (DATA REQUIRED)
+ tcs                            ← 1% for vehicles > ₹10L
+ other_charges                  ← handling, fast-tag, etc.
- Σ offer discounts              ← from offers collection (DATA REQUIRED)

= estimated_on_road
```

## Rules

1. The **backend is the sole source of truth** for all pricing.
2. The **frontend never calculates price** — it only displays what the backend returns.
3. The **AI never sets prices** — it may request a configuration, but pricing always flows through `POST /api/v1/configurator/price`.
4. All prices are in **Indian Rupees as integers** (paise not used).
5. The response always includes `"price_is_estimate": true` until we have verified city-specific data.

## What Is Missing

- City-specific RTO, insurance, TCS data — these vary by state and must come from verified sources (RTO schedules, insurance guidelines). They cannot be invented.
- Offer/discount data — requires an admin offer management interface (Phase 3+).
