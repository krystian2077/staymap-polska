from __future__ import annotations

import base64
import json


def encode_offset(offset: int) -> str:
    payload = json.dumps({"o": int(offset)})
    return base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")


def decode_offset(raw: str | None) -> int:
    if not raw:
        return 0
    try:
        pad = "=" * (-len(raw) % 4)
        data = json.loads(base64.urlsafe_b64decode((raw + pad).encode()).decode())
        return max(0, int(data.get("o", 0)))
    except (ValueError, json.JSONDecodeError, TypeError, KeyError):
        return 0
