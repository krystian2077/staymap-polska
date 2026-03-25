"""
Generatory tytułów/opisów i puli — do komendy seed_mass_listings.
"""
from __future__ import annotations

import random
from datetime import date
from decimal import Decimal

from apps.common.seed_mass_listings_data import LOCATIONS

RNG = random.Random(7)


def P(lst):
    return RNG.choice(lst)


def PN(lst, n):
    return RNG.sample(lst, min(n, len(lst)))


def RF(a, b, d=1):
    return round(RNG.uniform(a, b), d)


def RI(a, b):
    return RNG.randint(a, b)


LISTING_TYPES = [
    {"slug": "domek", "name": "Domek", "icon": "🏠"},
    {"slug": "glamping", "name": "Glamping", "icon": "⛺"},
    {"slug": "willa", "name": "Willa", "icon": "🏡"},
    {"slug": "chatka", "name": "Chatka / Chata", "icon": "🏕️"},
    {"slug": "apartament", "name": "Apartament", "icon": "🏢"},
    {"slug": "stodola", "name": "Stodoła / Barn House", "icon": "🏚️"},
    {"slug": "pensjonat", "name": "Pensjonat", "icon": "🛏️"},
    {"slug": "dworek", "name": "Dworek / Rezydencja", "icon": "🏛️"},
    {"slug": "treehouse", "name": "Domek na drzewie", "icon": "🌲"},
    {"slug": "kontener", "name": "Container House", "icon": "📦"},
    {"slug": "jurta", "name": "Jurta", "icon": "🏕"},
]

TYPE_WEIGHTS = [
    ("domek", 34),
    ("chatka", 16),
    ("apartament", 14),
    ("glamping", 11),
    ("willa", 8),
    ("stodola", 7),
    ("pensjonat", 4),
    ("dworek", 2),
    ("treehouse", 2),
    ("kontener", 1),
    ("jurta", 1),
]
TYPE_POOL = sum([[s] * w for s, w in TYPE_WEIGHTS], [])

AMENITIES_DATA = [
    ("sauna_fin", "Sauna fińska", "🧖", "wellness"),
    ("sauna_infra", "Sauna infrared", "♨️", "wellness"),
    ("jacuzzi_int", "Jacuzzi wewnętrzne", "🛁", "wellness"),
    ("jacuzzi_ext", "Jacuzzi / hot tub zewn.", "💆", "wellness"),
    ("balia", "Balia ogrodowa", "🛁", "wellness"),
    ("basen_ext", "Basen odkryty", "🏊", "wellness"),
    ("basen_int", "Basen kryty", "🏊", "wellness"),
    ("masaz", "Pokój masażu", "💆‍♀️", "wellness"),
    ("klimatyzacja", "Klimatyzacja", "🌡️", "comfort"),
    ("ogrzewanie_pod", "Ogrzewanie podłogowe", "🔆", "comfort"),
    ("kominek", "Kominek", "🔥", "comfort"),
    ("piec_kaflowy", "Piec kaflowy", "♨️", "comfort"),
    ("smart_tv", 'Smart TV 55"', "📺", "comfort"),
    ("netflix", "Netflix / Disney+", "🎬", "comfort"),
    ("projektor", "Projektor / kino domowe", "🎥", "comfort"),
    ("vinyl", "Gramofon / muzyka vinyl", "🎵", "comfort"),
    ("pralka", "Pralka", "🫧", "comfort"),
    ("suszarka", "Suszarka bębnowa", "👕", "comfort"),
    ("zmywarka", "Zmywarka", "🫧", "comfort"),
    ("lodowka_duza", "Lodówka duża", "🧊", "comfort"),
    ("kuchnia_pelna", "Kuchnia w pełni wyposaż.", "🍳", "kitchen"),
    ("ekspres_deg", "Ekspres De'Longhi", "☕", "kitchen"),
    ("ekspres_nespresso", "Nespresso", "☕", "kitchen"),
    ("taras_widokowy", "Taras z widokiem", "🪑", "outdoor"),
    ("ogrod_prywatny", "Ogród prywatny", "🌿", "outdoor"),
    ("grill_gazowy", "Grill gazowy", "🍖", "outdoor"),
    ("grill_wegiel", "Grill węglowy", "🔥", "outdoor"),
    ("ognisko", "Miejsce na ognisko", "🔥", "outdoor"),
    ("hamak", "Hamak / huśtawka", "🌳", "outdoor"),
    ("plac_zabaw", "Plac zabaw dla dzieci", "🛝", "outdoor"),
    ("rowery", "Rowery", "🚲", "sport"),
    ("kajaki", "Kajaki / SUP", "🛶", "sport"),
    ("narty_schowek", "Schowek na narty", "⛷️", "sport"),
    ("ping_pong", "Stół do ping-ponga", "🏓", "sport"),
    ("bilard", "Stół bilardowy", "🎱", "sport"),
    ("siłownia", "Siłownia", "🏋️", "sport"),
    ("boisko", "Boisko", "⚽", "sport"),
    ("wifi_100", "WiFi 100+ Mb/s", "📶", "work"),
    ("wifi_500", "WiFi 500+ Mb/s (fiber)", "🚀", "work"),
    ("biurko", "Biurko ergonomiczne", "💼", "work"),
    ("parking_bezpl", "Parking bezpłatny", "🅿️", "parking"),
    ("parking_zamkn", "Garaż / parking zamknięty", "🔐", "parking"),
    ("ev_charger", "Ładowarka EV", "⚡", "parking"),
    ("pies_ok", "Psy mile widziane", "🐕", "pets"),
    ("dostep_niep", "Dostępność dla niepełnospr.", "♿", "accessibility"),
]

PREFIXES = {
    "domek": [
        "Domek",
        "Drewniany domek",
        "Leśny domek",
        "Górski domek",
        "Dom letniskowy",
        "Dom przy lesie",
        "Dom na polanie",
        "Mazurski domek",
        "Chalupa",
        "Domek wakacyjny",
        "Domek z bali",
        "Dom w naturze",
        "Przytulny domek",
    ],
    "glamping": [
        "Glamping",
        "Luksusowa kopuła",
        "Kopuła glamping",
        "Nocleg pod gwiazdami",
        "Namiot safari",
        "Szklana kopuła",
        "Geodezyjny domek",
        "Romantyczna kopuła",
    ],
    "willa": [
        "Willa",
        "Rezydencja",
        "Luksusowa willa",
        "Dom wakacyjny premium",
        "Letnia rezydencja",
        "Dom z basenem",
    ],
    "chatka": [
        "Chatka",
        "Drewniana chata",
        "Chata góralska",
        "Bacówka",
        "Leśna chatka",
        "Chatka w górach",
        "Rustykalny dom",
        "Chata z bali",
        "Chata przy potoku",
    ],
    "apartament": [
        "Apartament",
        "Nowoczesny apartament",
        "Studio",
        "Loft",
        "Apartament premium",
        "Mieszkanie wakacyjne",
        "Penthouse",
        "Apartament z widokiem",
    ],
    "stodola": [
        "Stodoła",
        "Stodoła z duszą",
        "Barn House",
        "Zabytkowa stodoła",
        "Stodoła na farmie",
        "Dom w stodole",
        "Stodoła luksusowa",
    ],
    "pensjonat": [
        "Pensjonat",
        "Dom gościnny",
        "Pensjonat rodzinny",
        "Agroturystyka",
        "Kwatera górska",
        "Dom wczasowy",
    ],
    "dworek": [
        "Dworek",
        "Rezydencja dworkowa",
        "Dwór",
        "Historyczny dworek",
        "Szlachecki dworek",
        "Pałacyk",
    ],
    "treehouse": [
        "Domek na drzewie",
        "Treehouse",
        "Dom wśród koron drzew",
        "Domek na dębie",
    ],
    "kontener": [
        "Container House",
        "Dom z kontenera",
        "Nowoczesny kontener",
        "Minimalistyczny dom",
    ],
    "jurta": [
        "Jurta",
        "Mongolska jurta",
        "Jurta w naturze",
    ],
}

SUFFIXES_MTN = [
    "z sauną i widokiem na Tatry",
    "na górskiej polanie",
    "z jacuzzi przy Tatrach",
    "z kominkiem — cisza i góry",
    "dla dwojga — sauna i romantyk",
    "w sercu Beskidów",
    "z panoramą na {range}",
    "przy szlaku w {city}",
    "z prywatnym lasem i górami",
    "— góry za oknem, sauna w środku",
    "z widokiem na {range}",
    "na skraju lasu w {city}",
    "z baliją pod gwiazdami",
    "— alpejski klimat w Polsce",
    "z dostępem do szlaków",
    "przy stoku narciarskim",
    "z piecem i starymi belkami",
    "— autentyczna góralska chata",
    "z sauną i baliją pod chmurami",
    "z kominkiem i winem w cenie",
]
SUFFIXES_LAKE = [
    "nad jeziorem {lake}",
    "z prywatnym pomostem",
    "z kajakami w cenie",
    "— mazurski spokój",
    "z widokiem na taflę wody",
    "dla fanów kajaków i wędkowania",
    "z SUP i rowerami",
    "na brzegu jeziora {lake}",
    "przy plaży jeziora",
    "z łódką w cenie",
    "— nocne kąpiele w jeziorze",
    "na wyspie (dojazd łódką)",
    "z prywatną plażą",
]
SUFFIXES_SEA = [
    "100 m od Bałtyku",
    "z widokiem na morze",
    "przy plaży w {city}",
    "dla rodzin — plaża za płotem",
    "z tarasem z widokiem na morze",
    "tuż przy Bałtyku",
    "z rannym śniadaniem nad morzem",
    "— słone powietrze i spacery",
    "5 minut pieszo do wody",
    "z bezpośrednim dostępem do plaży",
    "z hammockiem i widokiem na morze",
]
SUFFIXES_FOREST = [
    "w sercu Puszczy Białowieskiej",
    "w starym lesie buczyny",
    "— żubry za płotem",
    "w głębi leśnej ostoi",
    "w Puszczy Tucholskiej",
    "— grzyby rosną za progiem",
    "otoczona starym borem",
    "w ciszy mazurskiego lasu",
    "na skraju rezerwatu",
    "z widokiem na las bez przerwy",
]
SUFFIXES_GEN = [
    "w {city} — spokój i natura",
    "— idealne dla 2-4 osób",
    "z pięknym ogrodem",
    "dla gości ceniących ciszę",
    "— rustykalnie i przytulnie",
    "w okolicach {city}",
    "z pełnym wyposażeniem",
    "na obrzeżach {city}",
    "— design i komfort",
    "z unikatowym charakterem",
    "w historycznej wsi",
    "— Polska wieś w nowoczesnym wydaniu",
]

MTN_RANGES = {
    "małopolskie": "Tatry",
    "śląskie": "Beskidy",
    "dolnośląskie": "Karkonosze",
    "podkarpackie": "Bieszczady",
    "świętokrzyskie": "Góry Świętokrzyskie",
    "kujawsko-pomorskie": "okolice",
}
POLISH_LAKES = [
    "Śniardwy",
    "Mamry",
    "Niegocin",
    "Kisajno",
    "Drawsko",
    "Charzykowskie",
    "Raduńskie",
    "Szelment",
    "Czos",
    "Tałty",
    "Ryńskie",
    "Łuknajno",
]

SHORT_DESCS = [
    "Prywatny domek z sauną, kominkiem i widokiem na góry.",
    "Nad jeziorem — cisza, pomost i kajaki w cenie.",
    "Luksusowy glamping pod gwiazdami, z baliją i ogniskiem.",
    "Nowoczesna willa z basenem dla grup do 12 osób.",
    "Romantyczny dworek w starym parku z jacuzzi.",
    "Autentyczna bacówka bez TV, za to z piecem i ciszą.",
    "Apartament z panoramą gór — workation i odpoczynek.",
    "Stodoła z duszą — rustic luxury z sauną na farmie.",
    "Pensjonat rodzinny ze śniadaniem i domowym klimatem.",
    "Tuż przy Bałtyku — codzienne wschody słońca.",
    "Domek z prywatnym dostępem do jeziora i kajakami.",
    "Górski azyl — sauna, jacuzzi i absolutna cisza.",
    "Glamping w kopule szklanej — nocowanie wśród gwiazd.",
    "Bieszczadzki dom — koniec świata z WiFi 100 Mb/s.",
    "Mazurski raj — woda, kajaki i wieczory przy ognisku.",
    "Domek na drzewie — adrenalina, romantyzm i las.",
    "Container house: minimalizm i widok na naturę.",
    "Jurta w górach — odłącz się, odpoczywaj w ciszy.",
    "Chatka przy Puszczy Białowieskiej — żubry za płotem.",
    "Willa z parkietem, sauną i kominkiem dla 10 osób.",
    "Nowoczesny barn house z sauną i balią ogrodową.",
    "Stary dworek z kominkiem i biblioteką 800 książek.",
    "Apartament 5 minut od plaży — klimat i WiFi.",
    "Chatka w lesie bez internetu — celowo i z premedytacją.",
]

DESCS: dict[tuple[str, str], list[str]] = {
    ("domek", "mountains"): [
        "Wyjątkowy drewniany domek na górskiej polanie z widokiem na {range}. Prywatna sauna fińska i jacuzzi na tarasie. Wnętrze z naturalnego drewna i kominkiem — idealne na reset.",
        "Nasza rodzinna chatka stoi w cichej okolicy, zaledwie kilka kilometrów od szlaków w {range}. Sauna, kominek i panorama gór.",
        "Drewniana chata w krajobrazie {range}. Ogrzewanie piecem kaflowym i kominkiem. Trasy narciarskie ok. {ski_dist} km.",
    ],
    ("domek", "lake"): [
        "Nasz domek stoi nad brzegiem jeziora {lake}. Pomost, kajaki i SUP przez cały sezon. Wieczory na tarasie przy szumie wody.",
        "Dom letniskowy z prywatnym wejściem do jeziora {lake}. Dwie sypialnie, pełna kuchnia i duży taras.",
    ],
    ("domek", "sea"): [
        "Domek {sea_dist} m od plaży bałtyckiej. Teras z widokiem na morze, szybkie WiFi i wygodne łóżka.",
        "Rodzinny dom letniskowy przy Bałtyku — kilka minut pieszo do wody. Ogród, parking i miejsce na ognisko.",
    ],
    ("glamping", "mountains"): [
        "Kopuła geodezyjna na polanie — luksus w naturze. Łóżko, łazienka, ognisko i widok na {range}.",
    ],
    ("glamping", "lake"): [
        "Namiot safari nad jeziorem {lake}. Pomost, kajaki i gorąca balia pod gwiazdami.",
    ],
    ("glamping", "forest"): [
        "Domek na drzewie w starym lesie. Drabinka, baldachim, prywatna łazienka — las mówi sam za siebie.",
    ],
    ("willa", "any"): [
        "Reprezentacyjna willa dla grup do {max_g} osób. Basen, sauna, bilard i kuchnia profesjonalna.",
        "Nowoczesna willa ze szkłem i drewnem w starym parku. Sauna, jacuzzi i przestrzeń do wypoczynku.",
    ],
    ("chatka", "mountains"): [
        "Drewniana chatka ręcznie budowana — kominek, książki i widok na las. Dla tych, co chcą naprawdę odpocząć.",
    ],
    ("chatka", "forest"): [
        "Maleńka chatka w Puszczy Białowieskiej — cisza, ptaki, czas zwalnia. Internet tylko na życzenie.",
    ],
    ("apartament", "mountains"): [
        "Apartament z panoramą na {range}. Klimatyzacja, szybki internet i ekspres do kawy — workation i relaks.",
    ],
    ("apartament", "sea"): [
        "Apartament z balkonem i widokiem na morze — kilkaset metrów do plaży. Klimatyzacja i WiFi.",
    ],
    ("stodola", "any"): [
        "Zabytkowa stodoła przerobiona na designerskie wnętrze. Więźba, cegła, sauna i balia w ogrodzie.",
    ],
    ("pensjonat", "any"): [
        "Rodzinny pensjonat — śniadania od lokalnych dostawców i domowe wypieki. Parking i rowery.",
    ],
    ("dworek", "any"): [
        "Historyczny dworek z parkiem. Kominek w salonie, cisza i przestrzeń. Nocleg z klimatem epoki.",
    ],
    ("treehouse", "any"): [
        "Treehouse na dużym drzewie — kładka, łóżko z baldachimem i widok na korony. Romantycznie i dziko.",
    ],
    ("kontener", "any"): [
        "Dom z kontenera — szkło, stal corten, minimalizm. Taras i ognisko, projekt architektoniczny.",
    ],
    ("jurta", "any"): [
        "Jurta na łące z widokiem na góry. Boho wnętrze, piec, cisza — weekend bez ekranów.",
    ],
    ("domek", "any"): [
        "Przytulny domek w okolicach {city}. Pełne wyposażenie, taras i miejsce na grill — dla rodzin i par.",
    ],
}

FN_M = [
    "Marek",
    "Jan",
    "Piotr",
    "Andrzej",
    "Krzysztof",
    "Tomasz",
    "Paweł",
    "Michał",
    "Grzegorz",
    "Łukasz",
    "Adam",
    "Zbigniew",
    "Dariusz",
    "Mariusz",
    "Jacek",
    "Wojciech",
    "Rafał",
    "Kamil",
    "Bartłomiej",
    "Sebastian",
    "Damian",
    "Marcin",
    "Sławomir",
    "Robert",
    "Leszek",
    "Tadeusz",
    "Henryk",
    "Józef",
    "Stanisław",
    "Ryszard",
    "Mirosław",
    "Wiesław",
    "Artur",
    "Mateusz",
    "Konrad",
    "Hubert",
    "Maciej",
    "Jakub",
    "Patryk",
    "Radosław",
    "Witold",
    "Zdzisław",
    "Eugeniusz",
    "Bogdan",
    "Kazimierz",
    "Waldemar",
    "Jerzy",
    "Władysław",
    "Tobiasz",
    "Cezary",
]
FN_F = [
    "Anna",
    "Maria",
    "Katarzyna",
    "Małgorzata",
    "Agnieszka",
    "Krystyna",
    "Barbara",
    "Ewa",
    "Elżbieta",
    "Zofia",
    "Joanna",
    "Monika",
    "Beata",
    "Marta",
    "Dorota",
    "Magdalena",
    "Aleksandra",
    "Natalia",
    "Karolina",
    "Paulina",
    "Justyna",
    "Sylwia",
    "Iwona",
    "Renata",
    "Grażyna",
    "Wiesława",
    "Halina",
    "Irena",
    "Teresa",
    "Danuta",
    "Bożena",
    "Jadwiga",
    "Urszula",
    "Klaudia",
    "Weronika",
    "Dominika",
    "Patrycja",
    "Emilia",
    "Zuzanna",
    "Lidia",
    "Celina",
    "Eleonora",
    "Helena",
    "Aurelia",
    "Bronisława",
    "Cecylia",
    "Florentyna",
]
LN = [
    "Kowalski",
    "Nowak",
    "Wiśniewski",
    "Wójcik",
    "Kowalczyk",
    "Kamiński",
    "Lewandowski",
    "Zieliński",
    "Woźniak",
    "Szymański",
    "Dąbrowski",
    "Kozłowski",
    "Jankowski",
    "Mazur",
    "Wojciechowski",
    "Kwiatkowski",
    "Krawczyk",
    "Kaczmarek",
    "Grabowski",
    "Nowakowski",
    "Pawłowski",
    "Michalski",
    "Nowicki",
    "Adamski",
    "Dudek",
    "Jabłoński",
    "Maj",
    "Malinowski",
    "Sikora",
    "Wróbel",
    "Ostrowski",
    "Kubiak",
    "Zawadzki",
    "Pietrzak",
    "Walczak",
    "Baran",
    "Szczepański",
    "Szewczyk",
    "Tomczak",
    "Nawrocki",
    "Borkowski",
    "Jaworski",
    "Błaszczyk",
    "Przybylski",
    "Zakrzewski",
    "Chmielewski",
    "Gajewski",
    "Klimek",
    "Czajkowski",
    "Sadowski",
    "Pawlak",
    "Rogowski",
    "Kucharski",
    "Górski",
    "Domański",
    "Wolski",
    "Rutkowski",
    "Krupa",
    "Marciniak",
    "Witek",
    "Głowacki",
    "Sobierajski",
    "Laskowski",
    "Pawlik",
    "Stępień",
    "Wysocki",
    "Kowalec",
    "Pietrzyk",
    "Bąk",
    "Wojtala",
    "Lis",
    "Krzemień",
    "Zając",
    "Kopytko",
    "Cichy",
    "Głowacz",
    "Szymczak",
]

BIO_TMPLS = [
    "Cześć! Jestem {fn}, mieszkam w {city} od {yrs} lat. Z rodziną prowadzimy to miejsce z pasją — zapraszamy jak do siebie.",
    "Hej! Nazywam się {fn}. Nasza oferta to owoc wieloletniej pracy i miłości do tej okolicy. Doradzimy w sprawie atrakcji.",
    "Witam serdecznie! To moje szczególne miejsce dla gości szukających spokoju. Zapraszam — {fn}.",
    "Jestem {fn} — każdy detal obiektu jest przemyślany. Gościmy ludzi z całej Polski.",
    "Rodzinne gospodarstwo prowadzimy od {yrs} lat. Ja — {fn} — zajmuję się gośćmi, reszta domem i ogrodem.",
    "Cześć! Pracowałem/am w hotelarstwie, teraz robię to po swojemu — mniej procedur, więcej serca. {fn}.",
    "Z wykształcenia biolog — mam na imię {fn}. Chętnie doradzę szlaki i przyrodę.",
    "Kochamy przyjmować gości. Zbudowaliśmy to miejsce razem — jestem {fn}.",
    "Emerytowany inżynier i amator gotowania — {fn} z {city}, do usług.",
    "Przez lata szukałem/em miejsca, które będzie moje. Znalazłem/em je tutaj. {fn}.",
]

PRICE_RANGES = {
    "domek": (120, 650),
    "glamping": (180, 580),
    "willa": (380, 1100),
    "chatka": (90, 380),
    "apartament": (100, 450),
    "stodola": (160, 480),
    "pensjonat": (100, 300),
    "dworek": (420, 1200),
    "treehouse": (200, 500),
    "kontener": (160, 420),
    "jurta": (150, 380),
}
SEA_MTN_BOOST = 1.30
YR = date.today().year


def gen_title(ltype, city, region, near_mtn, near_lake, near_sea, near_forest):
    pre = P(PREFIXES.get(ltype, PREFIXES["domek"]))
    mrange = MTN_RANGES.get(region, "Tatry")
    lake = P(POLISH_LAKES)
    if near_sea:
        suf = P(SUFFIXES_SEA).format(city=city)
    elif near_mtn:
        suf = P(SUFFIXES_MTN).format(range=mrange, city=city)
    elif near_lake:
        suf = P(SUFFIXES_LAKE).format(lake=lake, city=city)
    elif near_forest:
        suf = P(SUFFIXES_FOREST)
    else:
        suf = P(SUFFIXES_GEN).format(city=city)
    return f"{pre} {suf}".strip()[:200]


def gen_desc(ltype, region, near_mtn, near_lake, near_sea, near_forest, max_g, city):
    mrange = MTN_RANGES.get(region, "Tatry")
    lake = P(POLISH_LAKES)
    sea_d = RI(80, 400)
    ski_d = RI(3, 18)
    age = RI(50, 200)

    if near_sea:
        key = (ltype, "sea") if (ltype, "sea") in DESCS else (ltype, "any")
    elif near_mtn:
        key = (ltype, "mountains") if (ltype, "mountains") in DESCS else (ltype, "any")
    elif near_lake:
        key = (ltype, "lake") if (ltype, "lake") in DESCS else (ltype, "any")
    elif near_forest:
        key = (ltype, "forest") if (ltype, "forest") in DESCS else (ltype, "any")
    else:
        key = (ltype, "any")

    if key not in DESCS:
        key = (ltype, "any")
    if key not in DESCS:
        key = ("domek", "mountains")
    tmpl = P(DESCS[key])
    return tmpl.format(
        range=mrange,
        city=city,
        lake=lake,
        sea_dist=sea_d,
        ski_dist=ski_d,
        max_g=max_g,
        age=age,
    )


def gen_host_data(hi: int):
    from django.utils.text import slugify

    gender = P(["M", "F", "F"])
    fn = P(FN_M) if gender == "M" else P(FN_F)
    ln = P(LN)
    if gender == "F":
        if ln.endswith("ski"):
            ln = ln[:-3] + "ska"
        elif ln.endswith("cki"):
            ln = ln[:-3] + "cka"
        elif ln.endswith("dzki"):
            ln = ln[:-4] + "dzka"
    city = P([loc[0] for loc in LOCATIONS])
    yrs = RI(2, 22)
    bio = P(BIO_TMPLS).format(fn=fn, city=city, yrs=yrs)
    nick = slugify(f"{fn}.{ln}").replace("-", ".")
    email = f"{nick}{hi}@staymap.pl"
    return {
        "fn": fn,
        "ln": ln,
        "email": email,
        "bio": bio,
        "avatar_seed": hi,
        "response_rate": RF(0.78, 1.0, 2),
    }


def amenity_set(ltype, near_mtn, near_lake, near_sea, pet_ok, price):
    base = [
        "parking_bezpl",
        "wifi_100",
        "kuchnia_pelna",
        "pralka",
        "taras_widokowy",
        "ogrod_prywatny",
        "grill_wegiel",
    ]
    luxury = [
        "sauna_fin",
        "jacuzzi_ext",
        "basen_ext",
        "ekspres_deg",
        "bilard",
        "siłownia",
        "projektor",
        "vinyl",
    ]
    mid = [
        "kominek",
        "ognisko",
        "hamak",
        "ekspres_nespresso",
        "ping_pong",
        "smart_tv",
        "netflix",
    ]
    budget = ["wifi_100", "grill_wegiel", "ognisko", "hamak"]

    result = list(base)
    if price > 600:
        result += PN(luxury, 4)
    elif price > 350:
        result += PN(luxury, 2) + PN(mid, 2)
    elif price > 200:
        result += PN(mid, 3)
    else:
        result += PN(budget, 2)

    if near_mtn:
        result += PN(["kominek", "piec_kaflowy", "narty_schowek", "ognisko", "rowery", "balia"], 3)
    if near_lake:
        result += PN(["kajaki", "rowery", "ognisko", "grill_gazowy", "hamak", "basen_ext"], 2)
    if near_sea:
        result += PN(["rowery", "hamak", "ognisko", "grill_gazowy", "plac_zabaw"], 2)
    if ltype == "glamping":
        result += ["ognisko", "balia", "hamak"]
    if ltype == "willa":
        result += PN(["basen_ext", "bilard", "ping_pong", "siłownia", "projektor"], 3)
    if ltype == "pensjonat":
        result += ["ekspres_deg", "zmywarka"]
    if ltype == "treehouse":
        result += ["ognisko", "hamak"]
    if ltype == "stodola":
        result += ["ognisko", "grill_gazowy", "balia"]
    if pet_ok:
        result.append("pies_ok")
    if price > 400:
        result.append("wifi_500")
    if RNG.random() < 0.15:
        result.append("ev_charger")

    slugs = {a[0] for a in AMENITIES_DATA}
    return list(set(result) & slugs)


def amenities_to_json(slugs: list[str]) -> list[dict]:
    am_map = {a[0]: a for a in AMENITIES_DATA}
    out = []
    for s in slugs:
        row = am_map.get(s)
        if not row:
            continue
        nm, ic, cat = row[1], row[2], row[3]
        out.append({"id": s, "name": nm, "icon": ic, "category": cat})
    return out


def listing_type_json(slug: str) -> dict:
    for lt in LISTING_TYPES:
        if lt["slug"] == slug:
            return dict(lt)
    return dict(LISTING_TYPES[0])


def pricing_rules_payload(base: int, near_sea: bool, near_mtn: bool) -> list[dict]:
    rules = [
        {
            "kind": "seasonal",
            "name": "Sezon letni (VII-VIII)",
            "multiplier": RF(1.30, 1.65, 2),
            "date_from": f"{YR}-07-01",
            "date_to": f"{YR}-08-31",
        },
        {
            "kind": "seasonal",
            "name": "Sylwester",
            "multiplier": RF(1.65, 2.30, 2),
            "date_from": f"{YR}-12-28",
            "date_to": f"{YR + 1}-01-02",
        },
        {
            "kind": "long_stay",
            "name": "Zniżka 7+ nocy",
            "min_nights": 7,
            "discount_percent": RI(10, 22),
        },
    ]
    if near_mtn:
        rules.append(
            {
                "kind": "seasonal",
                "name": "Ferie zimowe",
                "multiplier": RF(1.35, 1.75, 2),
                "date_from": f"{YR}-01-15",
                "date_to": f"{YR}-02-28",
            }
        )
        rules.append(
            {
                "kind": "seasonal",
                "name": "Długi Weekend Majowy",
                "multiplier": RF(1.25, 1.50, 2),
                "date_from": f"{YR}-04-30",
                "date_to": f"{YR}-05-04",
            }
        )
    if near_sea:
        rules.append(
            {
                "kind": "seasonal",
                "name": "Czerwiec (długi weekend)",
                "multiplier": RF(1.20, 1.40, 2),
                "date_from": f"{YR}-06-20",
                "date_to": f"{YR}-06-30",
            }
        )
    if RNG.random() < 0.45:
        rules.append(
            {
                "kind": "long_stay",
                "name": "Zniżka 14+ nocy",
                "min_nights": 14,
                "discount_percent": RI(20, 38),
            }
        )
    if RNG.random() < 0.2:
        rules.append(
            {
                "kind": "seasonal",
                "name": "Wielkanoc",
                "multiplier": RF(1.20, 1.45, 2),
                "date_from": f"{YR}-04-17",
                "date_to": f"{YR}-04-21",
            }
        )
    return rules


def build_pool(total: int = 2500):
    tw = sum(loc[8] for loc in LOCATIONS)
    pool = []
    for loc in LOCATIONS:
        cnt = max(1, round(loc[8] / tw * total))
        pool.extend([loc] * cnt)
    while len(pool) < total:
        pool.append(P(LOCATIONS))
    pool = pool[:total]
    RNG.shuffle(pool)
    return pool


def extra_location_tags(
    near_sea: bool,
    near_mtn: bool,
    near_lake: bool,
    near_forest: bool,
) -> dict[str, bool]:
    """Rozszerza tagi z LOCATIONS o pola z modelu ListingLocation."""
    return {
        "near_river": (near_lake or near_mtn) and RNG.random() < 0.28,
        "near_protected_area": near_forest and RNG.random() < 0.45,
        "beach_access": near_sea and RNG.random() < 0.72,
        "historic_center_nearby": RNG.random() < 0.12,
        "quiet_rural": (not near_sea) and RNG.random() < 0.55,
        "ski_slopes_nearby": near_mtn and RNG.random() < 0.45,
        "cycling_routes_nearby": RNG.random() < 0.45,
    }
