import sys
import os

# Set necessary environment variables for server.py initialization
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'testdb'
os.environ['ELEVENLABS_API_KEY'] = 'testkey'
os.environ['ELEVENLABS_VOICE_ID'] = 'testvoice'

# Mock emergentintegrations module
sys.modules['emergentintegrations'] = type('', (), {})()
sys.modules['emergentintegrations.llm'] = type('', (), {})()
sys.modules['emergentintegrations.llm.chat'] = type('', (), {})()
sys.modules['emergentintegrations.llm.chat'].LlmChat = type('', (), {})
sys.modules['emergentintegrations.llm.chat'].UserMessage = type('', (), {})

from server import extract_json

def test_extract_json_valid():
    """Test valid JSON extraction."""
    text = 'some prefix {"key": "value"} some suffix'
    assert extract_json(text) == {"key": "value"}

def test_extract_json_no_match():
    """Test when no JSON-like structure is present."""
    text = "just a string without json"
    assert extract_json(text) is None

def test_extract_json_invalid_json():
    """Test that extract_json gracefully handles invalid JSON matched by the regex."""
    # Matches regex but fails json.loads due to trailing comma
    text = '{ "key": "value", }'
    assert extract_json(text) is None
