# Configurator Rules Engine

## Status: FOUNDATION

The rules engine structure is IMPLEMENTED. Full rule population requires vehicle data (Phase 3+).

## Rule Model

```python
ConfiguratorRule:
  rule_id:             unique ID
  variant_id:          applies to specific variant (or None = model-wide or global)
  model_id:            applies to all variants of a model (or None = global)
  target_option_type:  paint | wheel | interior | roof | accessory | trim
  target_option_id:    the option this rule governs
  effect:              allow | deny | require | exclude
  conditions:          list of RuleCondition
  explanation:         human-readable reason shown when rule blocks a choice
  active:              bool
  priority:            int (higher = evaluated first)
```

## Effects

| Effect | Meaning |
|---|---|
| `deny` | This option is not available when conditions are met |
| `require` | This option requires another option to also be selected |
| `exclude` | This option and another are mutually exclusive |
| `allow` | Explicit allow (overrides a deny when priority is higher) |

## Condition Types

| Condition | IMPLEMENTED? |
|---|---|
| `variant_is` | YES |
| `option_selected` | YES |
| `fuel_type` | FOUNDATION (structure defined) |
| `market_segment` | FOUNDATION |
| `date_before` | FOUNDATION |
| `date_after` | FOUNDATION |

## AI Rule Enforcement

The AI must call `POST /api/v1/configurator/validate` before applying any configuration. The response's `valid: false` must prevent the AI from applying invalid options. The AI cannot invent option IDs or bypass this validation step.
