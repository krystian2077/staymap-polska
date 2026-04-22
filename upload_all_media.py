"""Uruchom: python upload_all_media.py"""
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

BACKEND_URL = "https://staymap-polska-production.up.railway.app"
UPLOAD_TOKEN = "staymap-upload-secret-2026"
MEDIA_ROOT = Path(__file__).parent / "backend" / "media"
WORKERS = 8


def upload_file(args):
    i, total, file_path = args
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
            print(f"[{i}/{total}] OK {rel_path}")
            return True
        else:
            print(f"[{i}/{total}] FAIL {rel_path} - {resp.status_code}")
            return False
    except Exception as e:
        print(f"[{i}/{total}] ERR {rel_path} - {e}")
        return False


def main():
    all_files = sorted(MEDIA_ROOT.rglob("*"))
    all_files = [f for f in all_files if f.is_file()]
    total = len(all_files)
    print(f"Znaleziono {total} plikow. Upload z {WORKERS} watkami...\n")

    tasks = [(i + 1, total, f) for i, f in enumerate(all_files)]
    ok = 0
    failed = []

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(upload_file, t): t for t in tasks}
        for future in as_completed(futures):
            if future.result():
                ok += 1
            else:
                failed.append(futures[future][2])

    print(f"\nGotowe: {ok}/{total} wgranych.")
    if failed:
        print(f"Nieudane ({len(failed)}):")
        for f in failed[:20]:
            print(f"  - {f}")


if __name__ == "__main__":
    main()
