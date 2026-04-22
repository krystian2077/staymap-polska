"""
Uruchom: python upload_media.py
Wymaga: pip install requests
"""
import sys
from pathlib import Path

import requests

BACKEND_URL = "https://staymap-polska-production.up.railway.app"
UPLOAD_TOKEN = "staymap-upload-secret-2026"
MEDIA_ROOT = Path(__file__).parent / "backend" / "media"


def upload_covers():
    listings_dir = MEDIA_ROOT / "listings"
    # Cover images kończą się na -0.jpg lub mają hash (pierwsza w folderze)
    cover_files = sorted(listings_dir.glob("*/*-0.*"))
    if not cover_files:
        # fallback: pierwsza w każdym folderze UUID
        cover_files = []
        for uuid_dir in listings_dir.iterdir():
            if uuid_dir.is_dir():
                imgs = sorted(uuid_dir.glob("*.jpg")) + sorted(uuid_dir.glob("*.jpeg")) + sorted(uuid_dir.glob("*.png")) + sorted(uuid_dir.glob("*.webp"))
                if imgs:
                    cover_files.append(imgs[0])

    total = len(cover_files)
    print(f"Znaleziono {total} zdjęć okładek. Rozpoczynam upload...\n")

    ok = 0
    failed = []
    for i, file_path in enumerate(cover_files, 1):
        rel_path = file_path.relative_to(MEDIA_ROOT).as_posix()
        try:
            with open(file_path, "rb") as f:
                resp = requests.post(
                    f"{BACKEND_URL}/api/media-upload/",
                    headers={"X-Upload-Token": UPLOAD_TOKEN},
                    data={"path": rel_path},
                    files={"file": (file_path.name, f)},
                    timeout=60,
                )
            if resp.status_code == 200:
                ok += 1
                print(f"[{i}/{total}] OK {rel_path}")
            else:
                failed.append(rel_path)
                print(f"[{i}/{total}] FAIL {rel_path} - {resp.status_code}: {resp.text}")
        except Exception as e:
            failed.append(rel_path)
            print(f"[{i}/{total}] ERR {rel_path} - {e}")

    print(f"\nGotowe: {ok}/{total} wgranych.")
    if failed:
        print(f"Błędy ({len(failed)}):")
        for f in failed:
            print(f"  - {f}")


if __name__ == "__main__":
    upload_covers()
