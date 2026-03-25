"""
Zdjęcia demo z Unsplash (images.unsplash.com) — pobierane do lokalnego /media przy seedzie.

Źródła: https://unsplash.com — używane wyłącznie jako stock w środowisku developerskim.
"""
from __future__ import annotations

import urllib.error
import urllib.request

# Pamięć podręczna bajtów JPEG (masowy seed: ~40 unikalnych URL-i zamiast 2500 pobrań).
_unsplash_jpeg_bytes_cache: dict[str, bytes] = {}


def get_cached_unsplash_jpeg_bytes(url: str, timeout: int = 25) -> bytes | None:
    """Pobiera JPEG z URL i cache’uje po URL (bezpieczne przy tysiącach ofert z rotacją puli)."""
    if url in _unsplash_jpeg_bytes_cache:
        return _unsplash_jpeg_bytes_cache[url]
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "StayMapPolska/1.0 (mass-seed; +https://staymap.pl)"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
    except (urllib.error.URLError, OSError, ValueError):
        return None
    if not data or len(data) < 800:
        return None
    _unsplash_jpeg_bytes_cache[url] = data
    return data


# Klucz = slug oferty z DEMO_LISTINGS (seed_db). Każda lista: 5 ujęć (okładka + galeria).
DEMO_LISTING_PHOTOS: dict[str, list[str]] = {
    "domek-z-widokiem-na-giewont-zakopane": [
        "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&w=1280&q=80",
    ],
    "apartament-nad-jeziorem-niegocin": [
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&w=1280&q=80",
    ],
    "chata-szklarska-poręba-kamienna": [
        "https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&w=1280&q=80",
    ],
    "dom-morski-bryza-hel": [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&w=1280&q=80",
    ],
    "glamping-bieszczady-dolina": [
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&w=1280&q=80",
    ],
    "loft-krakow-kazimierz": [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&w=1280&q=80",
    ],
    "willa-sopot-molo": [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&w=1280&q=80",
    ],
    "domek-nad-stawem-wielkopolska": [
        "https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&w=1280&q=80",
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&w=1280&q=80",
    ],
}


def mass_seed_unsplash_url_pool() -> list[str]:
    """Unikalne URL-e z puli demo — używane rotacyjnie jako okładki w seed_mass_listings."""
    seen: set[str] = set()
    out: list[str] = []
    for urls in DEMO_LISTING_PHOTOS.values():
        for u in urls:
            if u not in seen:
                seen.add(u)
                out.append(u)
    return out
