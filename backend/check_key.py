from django.conf import settings

key = settings.OPENAI_API_KEY
print(f"OPENAI_API_KEY is set: {bool(key)}")
print(f"Key length: {len(key) if key else 0}")
if key:
    print(f"Starts with: {key[:30]}...")
else:
    print("OPENAI_API_KEY is NOT SET!")

