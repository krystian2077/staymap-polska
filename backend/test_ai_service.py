from django.conf import settings
from apps.ai_assistant.services import AISearchService

print(f"OPENAI_API_KEY is set: {bool(settings.OPENAI_API_KEY)}")
print(f"OPENAI_API_KEY length: {len(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else 0}")

try:
    AISearchService._require_api_key()
    print("✓ API key check passed!")
except Exception as e:
    print(f"✗ API key check failed: {e}")

