import os
import sys
sys.path.insert(0, '.')
os.chdir('.')
from django.conf import settings
from pathlib import Path

# Check if .env exists
env_file = Path('..').resolve() / '.env'
print(f'Looking for .env at: {env_file}')
print(f'.env exists: {env_file.exists()}')

# Try to read it manually
if env_file.exists():
    with open(env_file) as f:
        lines = f.readlines()
    for line in lines:
        if 'OPENAI_API_KEY' in line:
            print(f'Found in .env: {line.strip()[:60]}...')
            break

if settings.OPENAI_API_KEY:
    print(f'Django OPENAI_API_KEY: {settings.OPENAI_API_KEY[:60]}...')
else:
    print("ERROR: Django OPENAI_API_KEY is NOT SET")

