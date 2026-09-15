import pytest

from configurator_conversion import ConversionIntent
from configurator_premium_routes import build_conversion_response


def test_conversion_finance_rejects_down_payment_above_authoritative_price():
    intent = ConversionIntent(
        finance_required=True,
        down_payment=600000,
        tenure_months=60,
        annual_rate=9.5,
    )

    with pytest.raises(ValueError, match="down payment"):
        build_conversion_response(
            {"lead_id": "lead-1", "variant_id": "v1", "status": "NEW"},
            intent,
            500000,
        )
