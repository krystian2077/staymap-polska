"""
Domyślne szablony szybkich odpowiedzi dla gospodarza.

Treść używa {{guest_name}} oraz {{listing_title}} (podmieniane w UI przed wstawieniem do czatu).
Miejsca do uzupełnienia przez gospodarza oznaczone są w nawiasach kwadratowych.
"""

from __future__ import annotations

from typing import TypedDict


class HostMessageTemplateDict(TypedDict):
    title: str
    body: str
    sort_order: int


DEFAULT_HOST_MESSAGE_TEMPLATES: list[HostMessageTemplateDict] = [
    {
        "title": "Powitanie",
        "sort_order": 0,
        "body": (
            "Dzień dobry {{guest_name}},\n\n"
            "dziękuję za kontakt w sprawie oferty „{{listing_title}}”. "
            "Chętnie odpowiem na wszystkie pytania — proszę o informację, czego Państwo potrzebują "
            "(np. planowane daty, liczba osób, ewentualne oczekiwania co do wyposażenia lub atrakcji w okolicy).\n\n"
            "Z pozdrowieniami"
        ),
    },
    {
        "title": "Szczegóły pobytu",
        "sort_order": 1,
        "body": (
            "Dzień dobry {{guest_name}},\n\n"
            "aby dobrze przygotować pobyt w „{{listing_title}}”, proszę o kilka informacji:\n"
            "• planowany czas przyjazdu i wyjazdu,\n"
            "• liczba gości (w tym dzieci — proszę o podanie wieku, jeśli to możliwe),\n"
            "• ewentualne potrzeby specjalne (alergie, łóżeczko, miejsce na sprzęt sportowy itp.).\n\n"
            "Dziękuję z góry — ułatwi to organizację pobytu."
        ),
    },
    {
        "title": "Dojazd i zameldowanie",
        "sort_order": 2,
        "body": (
            "Dzień dobry {{guest_name}},\n\n"
            "najważniejsze informacje do obiektu „{{listing_title}}”:\n"
            "• adres: [uzupełnij]\n"
            "• dojazd / parking: [uzupełnij]\n"
            "• zameldowanie: [np. przedział godzinowy, sposób przekazania klucza lub kodu]\n\n"
            "W razie jakichkolwiek pytań jestem do dyspozycji."
        ),
    },
    {
        "title": "Zasady pobytu",
        "sort_order": 3,
        "body": (
            "Dzień dobry {{guest_name}},\n\n"
            "krótkie przypomnienie zasad obowiązujących w „{{listing_title}}”:\n"
            "• cisza nocna: [np. godziny]\n"
            "• palenie tytoniu: [np. zakaz wewnątrz / wyznaczone miejsce na zewnątrz]\n"
            "• zwierzęta: [zgodnie z ofertą]\n"
            "• odpady / segregacja / dodatkowe ustalenia: [jeśli dotyczy]\n\n"
            "Dziękuję za przestrzeganie zasad — ma to znaczenie dla sąsiedztwa oraz kolejnych gości."
        ),
    },
    {
        "title": "Podziękowanie i recenzja",
        "sort_order": 4,
        "body": (
            "Dzień dobry {{guest_name}},\n\n"
            "serdecznie dziękuję za pobyt w „{{listing_title}}”. "
            "Mam nadzieję, że pobyt spełnił Państwa oczekiwania.\n\n"
            "Jeśli wszystko było w porządku, będę wdzięczny za krótką opinię w serwisie — "
            "pomoże ona kolejnym gościom w podjęciu decyzji.\n\n"
            "Pozdrawiam"
        ),
    },
    {
        "title": "Brak terminu",
        "sort_order": 5,
        "body": (
            "Dzień dobry {{guest_name}},\n\n"
            "dziękuję za zapytanie w sprawie „{{listing_title}}”. "
            "Niestety w wybranym przez Państwa terminie obiekt nie jest dostępny.\n\n"
            "Chętnie zaproponuję inne możliwe daty: [uzupełnij], "
            "lub proszę sprawdzić aktualną dostępność w kalendarzu oferty.\n\n"
            "Pozdrawiam"
        ),
    },
]
