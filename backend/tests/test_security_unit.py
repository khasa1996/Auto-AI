import pytest
from unittest.mock import patch
from datetime import datetime, timezone

from backend.security import generate_token, generate_otp, utcnow, DEMO_OTP, OTP_LENGTH

def test_generate_token():
    token = generate_token()
    assert isinstance(token, str)
    # secrets.token_urlsafe(32) returns a base64 encoded string of 32 bytes, which is 43 chars
    assert len(token) == 43

@patch('backend.security.OTP_DEMO_MODE', True)
def test_generate_otp_demo_mode():
    otp = generate_otp()
    assert otp == DEMO_OTP

@patch('backend.security.OTP_DEMO_MODE', False)
def test_generate_otp_real_mode():
    for _ in range(10): # Test multiple times to ensure randomness works
        otp = generate_otp()
        assert isinstance(otp, str)
        assert len(otp) == OTP_LENGTH
        assert otp.isdigit()

def test_utcnow():
    now = utcnow()
    assert isinstance(now, datetime)
    assert now.tzinfo == timezone.utc
