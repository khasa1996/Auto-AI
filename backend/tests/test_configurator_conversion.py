from pydantic import ValidationError

from configurator_conversion import ConversionIntent, calculate_emi


def test_finance_intent_requires_loan_fields():
    try:
        ConversionIntent(finance_required=True)
    except ValidationError as exc:
        assert "down_payment is required" in str(exc)
    else:
        raise AssertionError("finance intent without loan fields must fail")


def test_zero_rate_emi():
    assert calculate_emi(600000, 0, 60) == 10000


def test_reducing_balance_emi_is_rounded():
    assert calculate_emi(800000, 9.5, 60) == 16801
