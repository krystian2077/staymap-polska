"""
Wgrywa wszystkie pliki z backend/media/ do Cloudflare R2.

Uruchom:
    python upload_to_r2.py

Wymaga:
    pip install boto3 python-dotenv

Zmienne środowiskowe (ustaw w .env lub eksportuj przed uruchomieniem):
    R2_ENDPOINT       — https://<account_id>.r2.cloudflarestorage.com
    R2_ACCESS_KEY     — klucz API R2
    R2_SECRET_KEY     — secret API R2
    R2_BUCKET         — nazwa bucketu (domyślnie: staymap-media)
"""
import os
import mimetypes
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import boto3
from botocore.config import Config

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        print(f"Błąd: brak zmiennej środowiskowej {name}")
        print("Ustaw ją w .env lub eksportuj przed uruchomieniem skryptu.")
        sys.exit(1)
    return value


R2_ENDPOINT = _require("R2_ENDPOINT")
R2_ACCESS_KEY = _require("R2_ACCESS_KEY")
R2_SECRET_KEY = _require("R2_SECRET_KEY")
R2_BUCKET = os.environ.get("R2_BUCKET", "staymap-media")
MEDIA_ROOT = Path(__file__).parent / "backend" / "media"
MAX_WORKERS = 20

s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)


def upload_file(local_path: Path) -> tuple[str, bool, str]:
    rel = local_path.relative_to(MEDIA_ROOT).as_posix()
    content_type, _ = mimetypes.guess_type(str(local_path))
    extra = {"ContentType": content_type or "application/octet-stream"}
    try:
        s3.upload_file(str(local_path), R2_BUCKET, rel, ExtraArgs=extra)
        return rel, True, ""
    except Exception as e:
        return rel, False, str(e)


def main():
    if not MEDIA_ROOT.exists():
        print(f"Błąd: katalog {MEDIA_ROOT} nie istnieje.")
        sys.exit(1)

    files = [p for p in MEDIA_ROOT.rglob("*") if p.is_file()]
    total = len(files)
    print(f"Endpoint: {R2_ENDPOINT}")
    print(f"Bucket:   {R2_BUCKET}")
    print(f"Znaleziono {total} plików. Wgrywam...\n")

    ok = failed = 0
    errors = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(upload_file, f): f for f in files}
        for i, fut in enumerate(as_completed(futures), 1):
            rel, success, err = fut.result()
            if success:
                ok += 1
            else:
                failed += 1
                errors.append(f"{rel}: {err}")
            if i % 200 == 0 or i == total:
                print(f"  [{i}/{total}] OK: {ok}  Błędy: {failed}")

    print(f"\nGotowe! Wgrano: {ok}, Błędów: {failed}")
    if errors:
        print("\nBłędy:")
        for e in errors[:20]:
            print(f"  {e}")


if __name__ == "__main__":
    main()
