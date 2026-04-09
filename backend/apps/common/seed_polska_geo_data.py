"""
Kuratorowane dane geograficzne, fotograficzne i tekstowe do profesjonalnego seedu 230 ofert
na mapie Polski — regiony, miejscowości, szablony nazw, pule Unsplash, udogodnienia, recenzje.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Pomocnicza funkcja URL Unsplash
# ---------------------------------------------------------------------------

def _u(photo_id: str) -> str:
    return f"https://images.unsplash.com/photo-{photo_id}?auto=format&w=1280&q=80"


# ---------------------------------------------------------------------------
# Pule zdjęć Unsplash pogrupowane tematycznie
# Każda pula: min. 8 URL-i — seed rotuje po puli, żeby sąsiednie oferty
# tego samego typu dostawały różne zdjęcia.
# ---------------------------------------------------------------------------

PHOTO_POOLS: dict[str, list[str]] = {
    # drewniane domki i chaty górskie (Tatry, Karkonosze, Beskidy)
    "mountain_cabin": [
        _u("1518780664697-55e3ad937233"),
        _u("1542718610-a1d656d1884c"),
        _u("1449158743715-0a90ebb6d2d8"),
        _u("1510798831971-661eb04b3739"),
        _u("1587061949409-02df41d5e8a4"),
        _u("1480074568708-e7b720bb3f09"),
        _u("1536891961032-f2dfbd8d3cb5"),
        _u("1449824913935-59a10b8d2000"),
        _u("1470770903676-df940cc05e09"),
        _u("1452784444945-695d28537af6"),
        _u("1463693100688-b73d6cd80890"),
        _u("1604537466573-cefe02e2ff12"),
    ],
    # górskie apartamenty i wnętrza nowoczesne (Tatry, Karkonosze)
    "mountain_apartment": [
        _u("1522708323590-d24dbb6b0267"),
        _u("1600596542815-ffad4c1539a9"),
        _u("1600585154340-be6161a56a0c"),
        _u("1502672260266-1c1ef2d93688"),
        _u("1484154218962-a197022b5858"),
        _u("1600607687939-ce8a6c25118c"),
        _u("1600566753190-17f0baa2a6c3"),
        _u("1560448204-e02f11c3d0e2"),
        _u("1616594039964-ae9021a400a0"),
    ],
    # domki i domy nad jeziorami (Mazury, Warmia)
    "lake_house": [
        _u("1566073771259-6a8506099945"),
        _u("1500534314209-a25ddb2bd429"),
        _u("1560347876-aeef00ee58a1"),
        _u("1501854140801-50d01698950b"),
        _u("1476220406401-82b31b6e8d58"),
        _u("1505765050516-f72dc64f9d93"),
        _u("1600047509807-ba8f99d2cdde"),
        _u("1615529182904-14819c35db37"),
        _u("1600566752355-35792bedcfea"),
        _u("1587300003388-59208cc962cb"),
        _u("1505228395891-9a51e7e86bf6"),
    ],
    # domy i apartamenty nadmorskie (Hel, Sopot, Łeba, Ustka)
    "sea_house": [
        _u("1507525428034-b723cf961d3e"),
        _u("1504681869696-d977f3f0c0f5"),
        _u("1520250497591-112f2f40a3f4"),
        _u("1519046904884-53103b34b206"),
        _u("1531971589569-0d9370cbe1e5"),
        _u("1507525428034-b723cf961d3e"),
        _u("1449824913935-59a10b8d2000"),
        _u("1560449752-3fd5d2652bdb"),
        _u("1469796466635-5b6a8c2f9048"),
        _u("1467139701409-4fd74ea09d60"),
    ],
    # leśne domki i chaty wiejskie (Bieszczady, Roztocze, Mazowsze, Warmia)
    "forest_rural": [
        _u("1448375240586-882707db888b"),
        _u("1476242906366-d8eb64c2f661"),
        _u("1532624938-db64a53e0e6b"),
        _u("1571896349842-33c89424de2d"),
        _u("1605276374104-dee2a0ed3cd6"),
        _u("1600585154526-990dced4db0d"),
        _u("1416339134316-0e91dc9ded92"),
        _u("1478131143081-80f7f84ca84d"),
        _u("1464822759023-fed622ff2c3b"),
        _u("1519302024244-85c8daf93c1d"),
    ],
    # apartamenty miejskie i lofty (Kraków, Poznań, Wrocław, Warszawa)
    "apartment_city": [
        _u("1560448204-e02f11c3d0e2"),
        _u("1484154218962-a197022b5858"),
        _u("1493809842364-78817add7ffb"),
        _u("1505692952047-1a78307da8f2"),
        _u("1598928506311-c55ded91a20c"),
        _u("1522708323590-d24dbb6b0267"),
        _u("1502672260266-1c1ef2d93688"),
        _u("1600607687644-c7171b42498f"),
        _u("1600585154084-4e5fe7c39198"),
        _u("1522771739844-6a9cf6b9b671"),
    ],
    # wille i luksusowe obiekty
    "luxury_villa": [
        _u("1613490493576-7fde63acd811"),
        _u("1564013799919-ab600027ffc6"),
        _u("1512917774080-9991f1c4c750"),
        _u("1600210491892-03d54c0aaf87"),
        _u("1600210492486-724fe5c67fb0"),
        _u("1600585154084-4e5fe7c39198"),
        _u("1580587771525-4c16a00a7a9a"),
        _u("1575517111839-3a3843ee7f5d"),
    ],
    # dworki i obiekty historyczne
    "manor_house": [
        _u("1613490493576-7fde63acd811"),
        _u("1558618666-fcd25c85cd64"),
        _u("1600210492486-724fe5c67fb0"),
        _u("1564013799919-ab600027ffc6"),
        _u("1598488035139-bdbb2231ce04"),
        _u("1600585154526-990dced4db0d"),
        _u("1519302024244-85c8daf93c1d"),
        _u("1604709177225-3ad87ba7f3b2"),
    ],
    # glamping i kemping
    "glamping": [
        _u("1504280390367-361c6d9f38f4"),
        _u("1523987355523-c7b5b0dd90a7"),
        _u("1533873984035-25970ab07461"),
        _u("1487730116645-74489c55374e"),
        _u("1478131143081-80f7f84ca84d"),
        _u("1606787366850-de6330128bfc"),
        _u("1617027703682-2a2a05ce7bf2"),
    ],
    # pokoje i pensjonaty
    "guesthouse": [
        _u("1600566753376-12c8ab7fb75b"),
        _u("1505693314120-0d443867891c"),
        _u("1600585154340-be6161a56a0c"),
        _u("1600607687939-ce8a6c25118c"),
        _u("1522708323590-d24dbb6b0267"),
        _u("1505692952047-1a78307da8f2"),
        _u("1600566753190-17f0baa2a6c3"),
    ],
}


# ---------------------------------------------------------------------------
# Typy obiektów
# ---------------------------------------------------------------------------

LISTING_TYPES: list[dict] = [
    {"name": "Domek letniskowy", "icon": "🏠", "slug": "domek"},
    {"name": "Apartament",       "icon": "🏢", "slug": "apartament"},
    {"name": "Chata / chałupa",  "icon": "🪵", "slug": "chata"},
    {"name": "Kemping / biwak",  "icon": "⛺", "slug": "kemping"},
    {"name": "Willa / luksus",   "icon": "🏡", "slug": "luksus"},
    {"name": "Pokój w pensjonacie", "icon": "🛏️", "slug": "pokoj"},
    {"name": "Dworek",           "icon": "🏛️", "slug": "dworek"},
]

LISTING_TYPE_BY_SLUG: dict[str, dict] = {lt["slug"]: lt for lt in LISTING_TYPES}


# ---------------------------------------------------------------------------
# Udogodnienia
# ---------------------------------------------------------------------------

AMENITIES: dict[str, dict] = {
    "wifi":        {"id": "wifi",        "name": "Wi-Fi",                   "icon": "wifi",        "category": "tech"},
    "parking":     {"id": "parking",     "name": "Parking",                 "icon": "parking",     "category": "outdoor"},
    "kitchen":     {"id": "kitchen",     "name": "Pełna kuchnia",           "icon": "kitchen",     "category": "comfort"},
    "fireplace":   {"id": "fireplace",   "name": "Kominek",                 "icon": "fireplace",   "category": "comfort"},
    "sauna":       {"id": "sauna",       "name": "Sauna fińska",            "icon": "sauna",       "category": "wellness"},
    "jacuzzi":     {"id": "jacuzzi",     "name": "Jacuzzi",                 "icon": "jacuzzi",     "category": "wellness"},
    "hot_tub":     {"id": "hot_tub",     "name": "Balia ogrodowa",          "icon": "hot_tub",     "category": "wellness"},
    "pool":        {"id": "pool",        "name": "Basen",                   "icon": "pool",        "category": "wellness"},
    "ac":          {"id": "ac",          "name": "Klimatyzacja",            "icon": "ac",          "category": "comfort"},
    "tv":          {"id": "tv",          "name": "Telewizor",               "icon": "tv",          "category": "tech"},
    "washer":      {"id": "washer",      "name": "Pralka",                  "icon": "washer",      "category": "comfort"},
    "dishwasher":  {"id": "dishwasher",  "name": "Zmywarka",                "icon": "dishwasher",  "category": "comfort"},
    "grill":       {"id": "grill",       "name": "Grill",                   "icon": "grill",       "category": "outdoor"},
    "garden":      {"id": "garden",      "name": "Ogród",                   "icon": "garden",      "category": "outdoor"},
    "terrace":     {"id": "terrace",     "name": "Taras",                   "icon": "terrace",     "category": "outdoor"},
    "bike":        {"id": "bike",        "name": "Rowery w cenie",          "icon": "bike",        "category": "outdoor"},
    "kayak":       {"id": "kayak",       "name": "Kajak",                   "icon": "kayak",       "category": "outdoor"},
    "boat":        {"id": "boat",        "name": "Łódka wiosłowa",          "icon": "boat",        "category": "outdoor"},
    "ski_storage": {"id": "ski_storage", "name": "Suszarnia nart",          "icon": "ski",         "category": "outdoor"},
    "pets_ok":     {"id": "pets_ok",     "name": "Zwierzęta mile widziane", "icon": "pets",        "category": "outdoor"},
    "breakfast":   {"id": "breakfast",   "name": "Śniadanie w cenie",       "icon": "breakfast",   "category": "comfort"},
    "desk":        {"id": "desk",        "name": "Biurko do pracy",         "icon": "desk",        "category": "tech"},
    "crib":        {"id": "crib",        "name": "Łóżeczko dziecięce",      "icon": "crib",        "category": "comfort"},
    "bbq":         {"id": "bbq",         "name": "Wędzarnia / BBQ",         "icon": "bbq",         "category": "outdoor"},
    "fishing":     {"id": "fishing",     "name": "Możliwość wędkowania",    "icon": "fishing",     "category": "outdoor"},
}

# Gwarantowane udogodnienia per typ
TYPE_BASE_AMENITIES: dict[str, list[str]] = {
    "domek":      ["wifi", "parking", "kitchen", "tv"],
    "chata":      ["wifi", "parking", "kitchen", "fireplace"],
    "apartament": ["wifi", "ac", "kitchen", "tv", "washer"],
    "luksus":     ["wifi", "parking", "kitchen", "sauna", "terrace", "tv", "washer", "dishwasher"],
    "dworek":     ["wifi", "parking", "kitchen", "fireplace", "garden", "terrace", "tv"],
    "kemping":    ["wifi", "grill"],
    "pokoj":      ["wifi", "tv", "breakfast"],
}

# Opcjonalne udogodnienia per typ (2–3 losowo dodawane)
TYPE_OPTIONAL_AMENITIES: dict[str, list[str]] = {
    "domek":      ["grill", "garden", "terrace", "fireplace", "bike", "washer", "dishwasher", "sauna", "hot_tub", "crib", "pets_ok", "bbq"],
    "chata":      ["sauna", "jacuzzi", "grill", "garden", "terrace", "bike", "ski_storage", "washer", "hot_tub", "bbq", "fishing"],
    "apartament": ["desk", "bike", "dishwasher", "terrace", "grill", "crib", "ac"],
    "luksus":     ["pool", "jacuzzi", "hot_tub", "boat", "kayak", "bike", "bbq", "crib", "fishing"],
    "dworek":     ["pool", "sauna", "bike", "bbq", "crib", "washer", "dishwasher", "desk", "hot_tub"],
    "kemping":    ["bike", "kayak", "boat", "crib", "pets_ok", "washer", "fishing"],
    "pokoj":      ["desk", "ac", "crib", "bike", "sauna"],
}

# Mapowanie typ × teren → klucz puli zdjęć
TYPE_PHOTO_THEME: dict[str, dict[str, str]] = {
    "domek":      {"mountains": "mountain_cabin",    "lake": "lake_house",     "sea": "sea_house",     "forest": "forest_rural",  "city": "forest_rural"},
    "chata":      {"mountains": "mountain_cabin",    "lake": "forest_rural",   "sea": "forest_rural",  "forest": "forest_rural",  "city": "forest_rural"},
    "apartament": {"mountains": "mountain_apartment","lake": "apartment_city", "sea": "apartment_city","forest": "apartment_city","city": "apartment_city"},
    "luksus":     {"mountains": "luxury_villa",      "lake": "luxury_villa",   "sea": "luxury_villa",  "forest": "luxury_villa",  "city": "luxury_villa"},
    "dworek":     {"mountains": "manor_house",       "lake": "manor_house",    "sea": "manor_house",   "forest": "manor_house",   "city": "manor_house"},
    "kemping":    {"mountains": "glamping",           "lake": "glamping",       "sea": "glamping",      "forest": "glamping",      "city": "glamping"},
    "pokoj":      {"mountains": "guesthouse",        "lake": "guesthouse",     "sea": "guesthouse",    "forest": "guesthouse",    "city": "guesthouse"},
}


# ---------------------------------------------------------------------------
# Kontekstowe zdania do opisów (per region — dołączane do Faker paragrafów)
# ---------------------------------------------------------------------------

REGION_CONTEXT: dict[str, list[str]] = {
    "podhale": [
        "Położony w samym sercu Podhala, tuż przy granicy Tatrzańskiego Parku Narodowego.",
        "Panorama Giewontu i Tatr widoczna z tarasu zapiera dech w piersiach.",
        "Szlak turystyczny zaczyna się dosłownie za progiem — na Gubałówkę dojdziecie w 30 minut.",
        "W sezonie zimowym stoki narciarskie Kasprowego dostępne w kilkanaście minut samochodem.",
        "Zakopane z całą infrastrukturą gastronomiczną i SPA w zasięgu krótkiej jazdy.",
        "Idealne miejsce na aktywny wypoczynek latem i zimą — góry przez cały rok.",
        "Lokalni gazdowie polecają wędrówkę przez Dolinę Chochołowską o świcie.",
        "Po całym dniu na szlaku sauna lub balia ogrodowa to prawdziwy luksus.",
    ],
    "mazury": [
        "Mazury to kraina tysiąca jezior — jezioro widoczne z tarasu.",
        "Do mariny i wypożyczalni kajaków zaledwie kilka minut pieszo lub rowerem.",
        "Idealne miejsce na żeglowanie, wędkarstwo i spacery leśnymi ścieżkami.",
        "Czyste powietrze, cisza lasu i gwiezdne niebo — ideał na urlop z dala od miasta.",
        "W pobliżu liczne szlaki rowerowe i spływy kajakowe po Krutyni.",
        "Jezioro dostępne przez cały sezon — kąpiele od czerwca do września.",
        "Mazurskie zachody słońca nad wodą to widok, który zostaje w pamięci na długo.",
        "Do Mikołajek i centrum Giżycka 10–15 minut samochodem.",
    ],
    "bieszczady": [
        "Bieszczady — ostatni prawdziwy dziki wschód Europy.",
        "Połoniny dostępne pieszo z poziomu domu — widok bezcenny.",
        "Absolutna cisza, czyste powietrze i rozgwieżdżone niebo bez zanieczyszczenia świetlnego.",
        "Magiczne mgły w dolinie o świcie — ten widok wynagrodzi każde kilometry jazdy.",
        "Szlak na Tarnicę — najwyższy szczyt polskich Bieszczadów — w zasięgu dnia.",
        "Lokalne produkty: oscypek, żurek, barszcz z fasoli — kuchnia kresowa.",
        "Rezerwat Biosfery UNESCO — dzika przyroda na wyciągnięcie ręki.",
        "Idealne miejsce dla rowerzystów: Droga przez Bieszczady to prawdziwa perełka.",
    ],
    "karkonosze": [
        "Karkonosze — najwyższe góry Sudetów, magiczne o każdej porze roku.",
        "Wyciąg na Szrenicę w 10 minutach samochodem — narciarze będą zachwyceni.",
        "Śnieżka, Wodospady Szklarki i Kamieńczyka — klasyczne trasy turystyczne.",
        "Pieniste piwo i oscypek po góralsku w lokalnej karczmie do 15 minut spacerem.",
        "Latem szlaki rowerowe i piesze, zimą stoki Szklarskiej Poręby lub Karpacza.",
        "Uzdrowiskowy klimat Sudetów sprzyja odpoczynkowi i regeneracji.",
        "Bliskość granicy czeskiej — wypad do Harrachova na piwo i spa.",
        "Jelenia Góra z bogatą ofertą kulturalną i restauracyjną — 20 minut jazdy.",
    ],
    "pomorze": [
        "Bałtyk jest w zasięgu spaceru — plaża czysta, piasek drobny.",
        "Słona bryza morska, szum fal i zapach lasu sosnowego to tutejsza codzienność.",
        "Rowerem wzdłuż wybrzeża do kolejnej miejscowości — trasy nadmorskie są piękne.",
        "Molo, port rybacki i lokalny targ rybny — morze w wydaniu najbardziej lokalnym.",
        "Sezon letni w pełni czerwiec–sierpień, ale wrzesień nad morzem to złoty czas.",
        "Łeba, Władysławowo i Sopot w bliskiej odległości — różnorodność oferty.",
        "Zachody słońca nad Bałtykiem o niepowtarzalnej barwie — wieczory tu są bajkowe.",
        "Kaszubskie Szwajcaria i Trójmiejski Park Krajobrazowy w pobliżu.",
    ],
    "mazowsze": [
        "Spokojny zakątek Mazowsza — 40–60 minut samochodem od centrum Warszawy.",
        "Dolina Wisły, Kampinoski PN lub Zalew Zegrzyński — przyroda blisko stolicy.",
        "Idealne na weekendowy odpoczynek dla Warszawiaków — blisko, a jak daleko.",
        "Czyste powietrze, cisza i brak miejskiego zgiełku po przekroczeniu progu.",
        "Zegrze i okolice — żeglarstwo i sporty wodne dostępne przez cały sezon.",
        "Kazimierz Dolny, Nałęczów — urokliwe miejsca w godzinnym zasięgu.",
    ],
    "roztocze": [
        "Roztoczański Park Narodowy — jedne z najpiękniejszych lasów Polsce.",
        "Dzikie rzeki, stawy Echem i drogi krzyżowe Zamojszczyzny.",
        "Wąski tor kolejki wąskotorowej, koniki polskie i łosie w pobliżu.",
        "Zamość — renesansowe miasto UNESCO — 30 minut samochodem.",
        "Kazimierz Dolny nad Wisłą to jedna z pereł turystycznych Lubelszczyzny.",
        "Nałęczów — uzdrowisko z tradycją, Bocian i winiarnia pod ręką.",
        "Roztocze to jedno z najlepszych miejsc na rowerowy urlop w Polsce.",
        "Ekologiczna kuchnia i lokalne sery owcze — smak regionu na stole.",
    ],
    "wielkopolska": [
        "Wielkopolska — kolebka polskiej państwowości, kraj Piastów.",
        "Gniezno i Biskupin w zasięgu jednodniowej wycieczki.",
        "Jezioro Gopło, legendarne miejsce narodzin dynastii Piastów.",
        "Winiarnie Wielkopolskie coraz chętniej odwiedzane przez turystów.",
        "Poznań z Starym Rynkiem i restauracjami — godzina jazdy samochodem.",
        "Szlak Piastowski — jeden z najważniejszych historycznych szlaków Polski.",
        "Wielkopolski Park Narodowy — doskonałe trasy rowerowe i leśne.",
        "Licheń — jedno z największych sanktuariów w Polsce.",
    ],
    "slask_beskidy": [
        "Beskidy Śląskie — zielone góry tuż przy granicy ze Słowacją i Czechami.",
        "Wisła, Szczyrk, Ustroń — znane ośrodki sportów zimowych i letnich.",
        "Trasa rowerowa Velo Beskidy prowadzi tuż obok.",
        "Uzdrowiskowy klimat Ustronia służy regeneracji i leczeniu.",
        "Zapora w Goczałkowicach i Żywieckim — wodne krajobrazy na południu Śląska.",
        "Rynek Katowic i Nikiszowiec w bliskim zasięgu — kultura industrialna.",
        "Istebna, Brenna i Koniaków znane z koronki i rękodzieła.",
        "Latem szlaki piesze i MTB, zimą narty w Szczyrku i Brennej.",
    ],
    "warmia": [
        "Warmia — kraina spokoju, zamków krzyżackich i mazurskich jezior.",
        "Olsztyn z gotycką starówką i zamkiem Kapituły Warmińskiej w pobliżu.",
        "Jezioro Łuknajno — rezerwat biosfery UNESCO, łabędzie i czaple na wyciągnięcie ręki.",
        "Lidzbark Warmiński i Kętrzyn z Wilczym Szańcem — historia ożywa.",
        "Spokojne jeziora warmińskie, mniej znane niż Mazury, równie piękne.",
        "Drogi warmińskie — trasy rowerowe między kościołami i zamkami.",
        "Reszel, Orneta i Pieniężno — średniowieczne miasteczka czekające na odkrycie.",
        "Idealne na aktywny urlop z dala od tłumów wysokiego sezonu.",
    ],
    "zachodniopomorskie": [
        "Zachodnie wybrzeże Bałtyku — szerokie plaże, niskie tłumy poza szczytem sezonu.",
        "Morze w odległości kilkuminutowego spaceru — zapach soli i szum fal codziennie rano.",
        "Świnoujście i Dziwnów: uzdrowiskowy klimat, promenady i wydmy na wyciągnięcie ręki.",
        "Szczecin z Wałami Chrobrego i Bulwarem Nadodrzańskim — kultura i architektura blisko.",
        "Woliński Park Narodowy i bieliki nad morzem — przyroda robi wrażenie.",
        "Wyspy Uznam i Wolin, klify i morskie mierzeje — krajobraz unikalny w skali kraju.",
        "Kołobrzeg i Koszalin — uzdrowiskowa tradycja i solanka prosto z morza.",
        "Rowery nadmorskie i trasa R10 wzdłuż Bałtyku — ideał dla cyklistów.",
    ],
    "podlaskie": [
        "Puszcza Augustowska — jeden z największych kompleksów leśnych Niżu Europejskiego.",
        "Kanał Augustowski — zabytkowy szlak wodny z śluzami z XIX wieku.",
        "Wigry i Jezioro Studzieniczne: kryształowo czysta woda i cisza absolutna.",
        "Wigierski Park Narodowy — bobry, wydry i ryby w tutejszych rzekach i jeziorach.",
        "Suwałki i okolice: pagórkowata Suwalszczyzna — naturalnie piękna i mało znana.",
        "Podlaskie knajpki serwujące kartacze, babkę ziemniaczaną i kwaśne mleko.",
        "Septembres nad Biebrzą — żurawie, łosie i bociany wprost z łąk.",
        "Turystycznie cicho, przyrodniczo głośno — lasy i mokradła niezmienione od wieków.",
    ],
    "lodz_centrum": [
        "Centrum Polski — w sercu kraju, spokojne lasy Pilicy i doliny rzek.",
        "Spała i Inowłódz — dawne letnie rezydencje królewskie i prezydenckie.",
        "Rzeka Pilica: spływy kajakowe i wędkarstwo w rajskich warunkach.",
        "Lasy borów nadpilicznych — doskonałe trasy rowerowe i spacerowe.",
        "Tomaszów Mazowiecki i Nieborów — historyczne pałace w bliskim zasięgu.",
        "Łodź Manufaktura, Piotrkowska i Muzeum Sztuki — wielkomiejska kultura blisko.",
        "Idealne centrum bazowe dla wyjazdów w każdym kierunku Polski.",
        "Cicho, zielono i bez tłumów — alternatywa dla bardziej obleganych regionów.",
    ],
    "kujawsko_pomorskie": [
        "Bory Tucholskie — największy obszar leśny Polski Środkowej, tysiące jezior.",
        "Brda i Drawa — legendarne rzeki do kajakowania przez serce Borów.",
        "Zalew Koronowski — ulubione miejsce żeglarzy i wędkarzy z całego regionu.",
        "Toruń z Gotycką Starówką UNESCO i piernikami — historia zamknięta w murach.",
        "Bydgoszcz z Wenecją Bydgoską i filharmonią — kultura i architektura blisko.",
        "Tuchola i Chełmno — zabytkowe miasteczka w cieniu starych lasów.",
        "Trasy rowerowe przez Bory Tucholskie łączą jeziora, wsie i zamki.",
        "Cisza nocna gwarantowana — las dookoła, żadnych świateł z miasta na horyzoncie.",
    ],
    "lubuskie": [
        "Lubuskie — kraina winnic, jezior i pradoliny Odry.",
        "Łagów z zamkiem joannitów i jeziorami Łagowskim oraz Ciecz — perła regionu.",
        "Winnice Lubuskie produkują coraz lepsze wina — degustacje na miejscu.",
        "Odra i lasy łęgowe — dzika przyroda rzeki granicznej.",
        "Zielona Góra i jej winobranie — największe święto wina w Polsce.",
        "Lubuski Park Krajobrazowy i doliny rzeczne pełne bocianów i czapli.",
        "Bliskość granicy z Niemcami — wypad za Odrę łatwy i kuszący.",
        "Spokój, las i jezioro — Lubuskie oferuje wypoczynek bez tłumów.",
    ],
}


# ---------------------------------------------------------------------------
# Szablony recenzji (gwiazdki, tytuł, treść)
# ---------------------------------------------------------------------------

REVIEW_TEMPLATES: list[tuple[float, str, str]] = [
    (5.0, "Miejsce idealne na wypoczynek", "Wszystko zgodne z opisem — a nawet lepiej. Wnętrze zadbane i czyste, lokalizacja pierwsza klasa. Na pewno wrócimy."),
    (5.0, "Cudowny pobyt, polecamy!", "Gospodarz bardzo pomocny, odpowiadał na wiadomości błyskawicznie. Widok z tarasu niesamowity. Najlepszy wybór tego sezonu."),
    (4.9, "Prawie doskonałe", "Domek przepięknie wyposażony, kuchnia ma wszystko czego potrzeba. Jedyna uwaga — dojazd ostatnim kilometrem wymagał ostrożności. Wrócimy latem."),
    (4.8, "Rewelacyjna lokalizacja", "Cisza i spokój po całym tygodniu w mieście — o to nam chodziło. Łóżka wygodne, pościel czysta, klimatyzacja działa. Polecamy parom."),
    (4.8, "Idealne miejsce dla rodziny", "Dzieci zachwycone, my też. Bezpiecznie, czysto i przestronnie. Ogród z huśtawką i grillem — wieczory spędzaliśmy przy ognisku."),
    (4.7, "Bardzo dobry stosunek ceny do jakości", "Nie spodziewaliśmy się aż tyle za tę cenę. Wyposażenie solidne, nic nie brakuje. Kolejny raz przyjedziemy z większą grupą."),
    (4.7, "Klimatyczne miejsce z duszą", "Drewno, kamień i kominek — to połączenie tworzy niesamowity klimat. Popołudnie z herbatą przy kominku to był hit. Sauna extra."),
    (4.6, "Spokojny wypoczynek zapewniony", "Absolutna cisza w nocy — coś, czego w mieście nie uświadczysz. Szlak za płotem, sklep 8 km — byliśmy przygotowani. Polecamy."),
    (4.6, "Świetna baza wypadowa", "Rano wycieczka, wieczorem relaks w jacuzzi — tak wygląda idealne Górskie Wakacje. Gospodarz dał nam mapę tras, bardzo pomocny."),
    (4.5, "Przyjemny pobyt", "Miejsce schludne i spokojne. Kuchnia wyposażona w podstawowy sprzęt, WiFi działa sprawnie. Widok na góry/jezioro naprawdę robi wrażenie."),
    (4.5, "Dobry wybór na weekend", "Cena uczciwa, wyposażenie odpowiednie, ogród przestronny. Grillowaliśmy do późna — sąsiedzi bardzo daleko, więc zero problemów."),
    (4.4, "Solidne miejsce", "Zgodne z opisem. Parking wygodny, kuchnia funkcjonalna, łazienka czysta. Teren wokół piękny. Mogłoby być nieco więcej poduszek, ale to szczegół."),
    (4.3, "Przyjemne, choć jest parę drobiazgów", "Ogólnie jesteśmy zadowoleni. Spodziewaliśmy się może lepszego internetu, ale do relaksu wystarczy. Polecamy na spokojny urlop."),
    (5.0, "Wakacje jak z bajki", "Jezioro za oknem, las dookoła, cisza absolutna — to tutaj. Właściciel zostawił nam lokalny miód i ziółka z ogrodu. Wzruszeni."),
    (5.0, "Perełka na mapie", "Znaleźliśmy to miejsce przez przypadek i to był najlepszy przypadek w życiu. Wrócimy z całą rodziną na dłużej. Serdecznie polecamy!"),
    (4.9, "Nasz ulubiony zakątek w Polsce", "Byliśmy tu już trzeci raz i nadal zachwyca. Właściciele dbają o każdy szczegół, co roku coś nowego i na plus. Brawo!"),
    (4.8, "Romantyczny weekend — spełnione marzenie", "Wino, kominek, balia — i właśnie tak wyobrażaliśmy sobie idealny weekendowy wyjazd. Polecamy parom bez zastrzeżeń."),
    (4.7, "Czysto, spokojnie, pięknie", "Dokładnie to, czego potrzebowaliśmy. Miejsce zadbane, gospodarz życzliwy, okolica urokliwa. Bez zarzutów — wrócimy."),
]


# ---------------------------------------------------------------------------
# Dane 20 hostów
# ---------------------------------------------------------------------------

HOST_DATA: list[dict] = [
    {"email": "anna.kowalska@host.staymap.pl",        "first": "Anna",      "last": "Kowalska",    "bio": "Od 15 lat prowadzę domki górskie w Tatrach. Znam każdy szlak i każdą chatę z imienia."},
    {"email": "piotr.lewandowski@host.staymap.pl",    "first": "Piotr",     "last": "Lewandowski", "bio": "Żeglarz i miłośnik Mazur. Pomogę zaplanować rejs lub spływ — znám jeziora jak własną kieszeń."},
    {"email": "magdalena.nowak@host.staymap.pl",      "first": "Magdalena", "last": "Nowak",       "bio": "Prowadzę dwie chaty w Sudetach. Wierzę, że gość powinien poczuć się jak u siebie w domu."},
    {"email": "tomasz.wisniewski@host.staymap.pl",    "first": "Tomasz",    "last": "Wiśniewski",  "bio": "Rybak z zamiłowania i przewodnik nadmorski. Wskażę najlepsze miejsca na foki i świeże ryby."},
    {"email": "katarzyna.zielinska@host.staymap.pl",  "first": "Katarzyna", "last": "Zielińska",   "bio": "Ekoturystyka, lokalne produkty, spokój Bieszczadów — to moja filozofia gościnności."},
    {"email": "michal.dabrowski@host.staymap.pl",     "first": "Michał",    "last": "Dąbrowski",   "bio": "Architekt wnętrz — moje nieruchomości są zaprojektowane z myślą o komforcie i estetyce."},
    {"email": "ewa.szymanska@host.staymap.pl",        "first": "Ewa",       "last": "Szymańska",   "bio": "Trzecie pokolenie sopockiej rodziny. Historia i gościnność to wartości, które przekazuję dalej."},
    {"email": "lukasz.wojcik@host.staymap.pl",        "first": "Łukasz",    "last": "Wójcik",      "bio": "Rolnik i entuzjasta wędkarstwa w Wielkopolsce — za moim domem zaczyna się prawdziwa Polska."},
    {"email": "barbara.krawczyk@host.staymap.pl",     "first": "Barbara",   "last": "Krawczyk",    "bio": "Kocham Bieszczady od dziecka — prowadzę tu pensjonat rodzinny od ponad dekady."},
    {"email": "adam.kowalczyk@host.staymap.pl",       "first": "Adam",      "last": "Kowalczyk",   "bio": "Były przewodnik PTTK, teraz gospodarz dworku na Mazowszu. Historię okolicy znam na pamięć."},
    {"email": "agnieszka.malinowska@host.staymap.pl", "first": "Agnieszka", "last": "Malinowska",  "bio": "Warmia to mój dom od urodzenia — ciche jeziora i warmińskie zamki to tutejszy skarb."},
    {"email": "krzysztof.wojciechowski@host.staymap.pl", "first": "Krzysztof", "last": "Wojciechowski", "bio": "Inżynier budownictwa — moje domki budowałem sam, każdy detal przemyślany."},
    {"email": "monika.jablonska@host.staymap.pl",     "first": "Monika",    "last": "Jabłońska",   "bio": "Kocham Beskidy — prowadzę tu domki wypoczynkowe z widokiem na góry przez cały rok."},
    {"email": "marcin.wrobel@host.staymap.pl",        "first": "Marcin",    "last": "Wróbel",      "bio": "Przewodnik karkonoski z pasji. Zimą narty, latem trasy MTB — pomogę zaplanować każdy pobyt."},
    {"email": "joanna.pawlowska@host.staymap.pl",     "first": "Joanna",    "last": "Pawłowska",   "bio": "Roztocze to raj dla rowerystów i przyrodników — moje domki stoją na skraju lasu."},
    {"email": "rafal.kwiatkowski@host.staymap.pl",    "first": "Rafał",     "last": "Kwiatkowski", "bio": "Kazimierz Dolny i okolice Lubelszczyzny — malarski kraj, gdzie czas płynie wolniej."},
    {"email": "dorota.kaminska@host.staymap.pl",      "first": "Dorota",    "last": "Kamińska",    "bio": "Mój dworek to miejsce, gdzie natura spotyka historię — zapraszam na chwilę prawdziwego odpoczynku."},
    {"email": "pawel.kozlowski@host.staymap.pl",      "first": "Paweł",     "last": "Kozłowski",   "bio": "Mazury zachodnie — Warmia — to moja mała ojczyzna. Cisza tu jest prawdziwa."},
    {"email": "natalia.grabowska@host.staymap.pl",    "first": "Natalia",   "last": "Grabowska",   "bio": "Socjolog z zawodu, gospodyni z powołania. Wierzę, że idealny urlop to spokój i dobry kontakt."},
    {"email": "szymon.mazur@host.staymap.pl",         "first": "Szymon",    "last": "Mazur",       "bio": "Architekt krajobrazu — moje posiadłości otoczone są zaprojektowanymi ogrodami i sadami."},
]


# ---------------------------------------------------------------------------
# Regiony — definicje z lokalizacjami, szablonami nazw i wagami typów
# ---------------------------------------------------------------------------

REGIONS: list[dict] = [
    # ------------------------------------------------------------------
    # 1. PODHALE / TATRY — 22 ofert
    # ------------------------------------------------------------------
    {
        "id": "podhale",
        "label": "Podhale / Tatry",
        "count": 22,
        "terrain": "mountains",
        "location_tags": {
            "near_mountains": True,
            "near_forest": True,
            "ski_slopes_nearby": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 1.30,
        "type_weights": {"domek": 3, "chata": 3, "apartament": 2, "luksus": 1, "dworek": 1, "pokoj": 2, "kemping": 0},
        "localities": [
            {"city": "Zakopane",             "voivodeship": "małopolskie", "lat": 49.2992, "lng": 19.9496, "weight": 5, "r": 0.018, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Bukowina Tatrzańska",  "voivodeship": "małopolskie", "lat": 49.3644, "lng": 20.1218, "weight": 3, "r": 0.012},
            {"city": "Białka Tatrzańska",    "voivodeship": "małopolskie", "lat": 49.3567, "lng": 20.1100, "weight": 3, "r": 0.010},
            {"city": "Kościelisko",          "voivodeship": "małopolskie", "lat": 49.3138, "lng": 19.8756, "weight": 2, "r": 0.012, "extra_tags": {"quiet_rural": True}},
            {"city": "Murzasichle",          "voivodeship": "małopolskie", "lat": 49.3292, "lng": 19.9881, "weight": 2, "r": 0.010, "extra_tags": {"quiet_rural": True}},
            {"city": "Nowy Targ",            "voivodeship": "małopolskie", "lat": 49.4817, "lng": 20.0325, "weight": 1, "r": 0.015},
            {"city": "Rabka-Zdrój",          "voivodeship": "małopolskie", "lat": 49.6086, "lng": 19.9678, "weight": 1, "r": 0.013, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Szczawnica",           "voivodeship": "małopolskie", "lat": 49.4242, "lng": 20.4898, "weight": 1, "r": 0.012},
        ],
        "name_templates": {
            "domek": [
                "Domek pod Giewontem",      "Domek przy Potoku Górskim",  "Chatka na Górskiej Polanie",
                "Dom u Gazdy",              "Leśny Domek Tatrzański",     "Domek przy Gubałówce",
                "Górski Domek z Kominkiem", "Domek Bacówka",              "Koliba pod Reglami",
                "Domek na Skraju Tatrzańskiego Lasu", "Dom przy Szlaku Górskim", "Tatrzański Domek Drewniany",
                "Domek z Widokiem na Tatry",
            ],
            "chata": [
                "Chata Góralska",           "Zbójnicka Chata",            "Stara Chata na Hali",
                "Chata pod Reglami",        "Karpacka Chata z Sauną",     "Górska Chata przy Potoku",
                "Chata dla Narciarzy",      "Bacówka na Polanie",         "Drewniana Chata Góralska",
                "Chata pod Krokwią",        "Góralska Chata z Jacuzzi",
            ],
            "apartament": [
                "Apartament Tatrzański",    "Apartament z Widokiem na Tatry", "Apartament przy Stoku",
                "Górski Apartament z Kominkiem", "Studio z Widokiem na Góry",  "Apartament na Krupówkach",
                "Apartament pod Giewontem", "Apartament u Podnóża Tatr",
            ],
            "luksus": [
                "Willa Tatrzańska z Sauną", "Luksusowy Domek z Jacuzzi i Panoramą", "Rezydencja Górska",
                "Willa przy Reglach",       "Tatrzańska Rezydencja z Basenem",
            ],
            "dworek": [
                "Dworek Podhalański",       "Dworek Góralski z Tradycją",  "Zabytkowy Dworek pod Tatrami",
            ],
            "pokoj": [
                "Pokoje w Górskim Pensjonacie", "Pokój z Widokiem na Tatry", "Pensjonat pod Gubałówką",
                "Pokoje Górskie przy Szlaku",
            ],
            "kemping": [
                "Kemping pod Tatrami", "Biwak w Tatrzańskiej Dolinie",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 2. MAZURY — 18 ofert
    # ------------------------------------------------------------------
    {
        "id": "mazury",
        "label": "Mazury",
        "count": 18,
        "terrain": "lake",
        "location_tags": {
            "near_lake": True,
            "near_forest": True,
            "cycling_routes_nearby": True,
            "quiet_rural": True,
        },
        "price_multiplier": 1.10,
        "type_weights": {"domek": 4, "chata": 2, "apartament": 2, "luksus": 1, "dworek": 1, "pokoj": 2, "kemping": 1},
        "localities": [
            {"city": "Mikołajki",    "voivodeship": "warmińsko-mazurskie", "lat": 53.7948, "lng": 21.5714, "weight": 4, "r": 0.015, "extra_tags": {"near_river": True}},
            {"city": "Giżycko",      "voivodeship": "warmińsko-mazurskie", "lat": 54.0378, "lng": 21.7668, "weight": 3, "r": 0.018, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Mrągowo",      "voivodeship": "warmińsko-mazurskie", "lat": 53.8648, "lng": 21.3058, "weight": 2, "r": 0.015},
            {"city": "Pisz",         "voivodeship": "warmińsko-mazurskie", "lat": 53.6290, "lng": 21.8186, "weight": 2, "r": 0.015, "extra_tags": {"near_forest": True}},
            {"city": "Ryn",          "voivodeship": "warmińsko-mazurskie", "lat": 53.9391, "lng": 21.5563, "weight": 2, "r": 0.010, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Ełk",          "voivodeship": "warmińsko-mazurskie", "lat": 53.8273, "lng": 22.3600, "weight": 1, "r": 0.015},
            {"city": "Węgorzewo",    "voivodeship": "warmińsko-mazurskie", "lat": 54.2100, "lng": 21.7375, "weight": 1, "r": 0.013},
        ],
        "name_templates": {
            "domek": [
                "Domek nad Jeziorem",          "Dom z Pomostem Mazurskim",   "Chatka na Mazurskiej Wyspie",
                "Mazurski Domek przy Marinie", "Dom nad Śniardwami",          "Domek na Skraju Mazurskiego Lasu",
                "Domek Mazurski z Kajakiem",   "Dom przy Mazurskim Szlaku",  "Domek Myśliwski",
                "Mazurski Domek z Wędką",      "Dom na Mazurskiej Łące",      "Chatka przy Jeziorze",
                "Domek Żeglarski nad Jeziorem",
            ],
            "chata": [
                "Chata Mazurska",              "Leśna Chata nad Wodą",        "Drewniana Chata przy Jeziorze",
                "Chata Myśliwska na Mazurach", "Stara Chata Mazurska",        "Chata z Pomostem",
            ],
            "apartament": [
                "Apartament przy Marinie",          "Apartament z Widokiem na Jezioro", "Mazurski Apartament Wodny",
                "Apartament nad Śniardwami",         "Studio przy Przystani",
            ],
            "luksus": [
                "Willa Mazurska z Pomostem",  "Luksusowy Dom nad Niegocinem", "Rezydencja nad Jeziorem",
                "Willa z Basenem na Mazurach",
            ],
            "dworek": [
                "Dworek Mazurski",             "Dworek nad Jeziorem Łańskim", "Zabytkowy Dworek Mazurski",
            ],
            "pokoj": [
                "Pokoje nad Mazurskim Jeziorem", "Pensjonat przy Marinie", "Pokoje Wodne na Mazurach",
            ],
            "kemping": [
                "Kemping nad Jeziorkiem", "Biwak Mazurski przy Wodzie", "Glamping Mazurski",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 3. BIESZCZADY / PODKARPACIE — 16 ofert
    # ------------------------------------------------------------------
    {
        "id": "bieszczady",
        "label": "Bieszczady / Podkarpacie",
        "count": 16,
        "terrain": "mountains",
        "location_tags": {
            "near_mountains": True,
            "near_forest": True,
            "near_protected_area": True,
            "quiet_rural": True,
        },
        "price_multiplier": 1.00,
        "type_weights": {"domek": 3, "chata": 3, "apartament": 1, "luksus": 1, "dworek": 1, "pokoj": 1, "kemping": 2},
        "localities": [
            {"city": "Ustrzyki Dolne",  "voivodeship": "podkarpackie", "lat": 49.4299, "lng": 22.5969, "weight": 3, "r": 0.015},
            {"city": "Cisna",           "voivodeship": "podkarpackie", "lat": 49.2322, "lng": 22.3283, "weight": 2, "r": 0.010, "extra_tags": {"quiet_rural": True}},
            {"city": "Lesko",           "voivodeship": "podkarpackie", "lat": 49.4708, "lng": 22.3382, "weight": 2, "r": 0.012},
            {"city": "Solina",          "voivodeship": "podkarpackie", "lat": 49.3786, "lng": 22.4656, "weight": 2, "r": 0.012, "extra_tags": {"near_lake": True, "beach_access": True}},
            {"city": "Sanok",           "voivodeship": "podkarpackie", "lat": 49.5580, "lng": 22.2046, "weight": 1, "r": 0.018, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Baligród",        "voivodeship": "podkarpackie", "lat": 49.3342, "lng": 22.2915, "weight": 1, "r": 0.010, "extra_tags": {"near_river": True}},
            {"city": "Wetlina",         "voivodeship": "podkarpackie", "lat": 49.1667, "lng": 22.5167, "weight": 1, "r": 0.008, "extra_tags": {"quiet_rural": True}},
            {"city": "Rzeszów ok.",     "voivodeship": "podkarpackie", "lat": 50.0413, "lng": 22.0052, "weight": 2, "r": 0.025, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Łańcut ok.",      "voivodeship": "podkarpackie", "lat": 50.0688, "lng": 22.2263, "weight": 1, "r": 0.015, "extra_tags": {"historic_center_nearby": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek na Połoninach",          "Dom w Bieszczadzkiej Dolinie",  "Chatka przy Bieszczadzkim Szlaku",
                "Bieszczadzki Domek w Lesie",   "Dom z Widokiem na Połoniny",    "Chatka przy Potoku Bieszczadzkim",
                "Domek na Dzikim Wschodzie",    "Dom przy Sanie",
            ],
            "chata": [
                "Chata Bieszczadzka",           "Bojkowska Chata",               "Drewniana Chata w Bieszczadach",
                "Chata przy Połoninie",         "Stara Chata Bieszczadzka",      "Chata przy Zalewie Solińskim",
                "Karpacka Chata Bieszczadzka",
            ],
            "apartament": [
                "Apartament z Widokiem na Połoniny", "Bieszczadzki Apartament",  "Studio w Sercu Bieszczadów",
                "Apartament w Rzeszowie",       "Studio Podkarpackie",
            ],
            "luksus": [
                "Willa Bieszczadzka z Sauną",   "Rezydencja na Połoninach",      "Luksusowy Dom w Bieszczadach",
                "Willa pod Łańcutem",
            ],
            "dworek": [
                "Dworek Bieszczadzki",          "Szlachecki Dworek w Bieszczadach", "Dworek Podkarpacki",
                "Dworek przy Zamku w Łańcucie",
            ],
            "pokoj": [
                "Pokoje u Pani Basi w Bieszczadach", "Pensjonat Bieszczadzki",   "Pokoje na Szlaku Połoninowym",
            ],
            "kemping": [
                "Glamping w Bieszczadach",      "Kemping przy Połoninie",        "Biwak w Bieszczadzkim Parku",
                "Kemping Leśny w Bieszczadach",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 4. KARKONOSZE / SUDETY — 16 ofert
    # ------------------------------------------------------------------
    {
        "id": "karkonosze",
        "label": "Karkonosze / Sudety",
        "count": 16,
        "terrain": "mountains",
        "location_tags": {
            "near_mountains": True,
            "near_forest": True,
            "ski_slopes_nearby": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 1.10,
        "type_weights": {"domek": 3, "chata": 3, "apartament": 2, "luksus": 1, "dworek": 1, "pokoj": 2, "kemping": 0},
        "localities": [
            {"city": "Szklarska Poręba",  "voivodeship": "dolnośląskie", "lat": 50.8247, "lng": 15.5225, "weight": 4, "r": 0.018},
            {"city": "Karpacz",           "voivodeship": "dolnośląskie", "lat": 50.7748, "lng": 15.7565, "weight": 3, "r": 0.015},
            {"city": "Jelenia Góra",      "voivodeship": "dolnośląskie", "lat": 50.9044, "lng": 15.7345, "weight": 2, "r": 0.020, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Świeradów-Zdrój",   "voivodeship": "dolnośląskie", "lat": 50.9003, "lng": 15.3408, "weight": 2, "r": 0.013, "extra_tags": {"quiet_rural": True}},
            {"city": "Lądek-Zdrój",       "voivodeship": "dolnośląskie", "lat": 50.3497, "lng": 16.8883, "weight": 1, "r": 0.012, "extra_tags": {"near_river": True}},
            {"city": "Kudowa-Zdrój",      "voivodeship": "dolnośląskie", "lat": 50.4400, "lng": 16.2447, "weight": 1, "r": 0.012, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Wrocław ok.",       "voivodeship": "dolnośląskie", "lat": 51.1079, "lng": 17.0385, "weight": 3, "r": 0.028, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Sobótka / Ślęża",   "voivodeship": "dolnośląskie", "lat": 50.9097, "lng": 16.7492, "weight": 2, "r": 0.015, "extra_tags": {"near_mountains": True, "quiet_rural": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek w Karkonoszach",        "Dom pod Śnieżką",              "Chatka przy Wyciągu Szrenica",
                "Domek Sudeckiej Przygody",    "Dom przy Wodospadzie",          "Sudecki Domek z Kominkiem",
                "Domek w Dolinie Szklarki",    "Dom na Zboczu Karkonoszy",
            ],
            "chata": [
                "Chata pod Śnieżką",           "Kamienna Chata w Sudetach",    "Chata przy Szrenicy",
                "Sudecka Chata z Jacuzzi",     "Górska Chata Karkonoszy",      "Drewniana Chata Sudecka",
                "Chata na Granicy",
            ],
            "apartament": [
                "Apartament Karkonoski",        "Apartament przy Wyciągu",      "Studio z Widokiem na Śnieżkę",
                "Apartament w Szklarskiej",     "Sudecki Apartament",           "Apartament Wrocławski przy Rynku",
                "Studio w Centrum Wrocławia",
            ],
            "luksus": [
                "Willa Sudecka z Sauną",        "Luksusowy Dom w Karkonoszach", "Rezydencja pod Śnieżką",
                "Willa Wrocławska z Ogrodem",
            ],
            "dworek": [
                "Dworek Sudecki",               "Zabytkowy Dworek w Sudetach",  "Dworek Dolnośląski",
            ],
            "pokoj": [
                "Pokoje w Górskim Pensjonacie", "Pensjonat pod Śnieżką",        "Pokoje Sudeckie",
                "Pokoje przy Szlaku Karkonoskim",
            ],
            "kemping": [],
        },
    },

    # ------------------------------------------------------------------
    # 5. POMORZE / TRÓJMIASTO — 14 ofert
    # ------------------------------------------------------------------
    {
        "id": "pomorze",
        "label": "Pomorze / Trójmiasto",
        "count": 14,
        "terrain": "sea",
        "location_tags": {
            "near_sea": True,
            "beach_access": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 1.20,
        "type_weights": {"domek": 3, "chata": 1, "apartament": 3, "luksus": 1, "dworek": 1, "pokoj": 2, "kemping": 1},
        "localities": [
            {"city": "Sopot",           "voivodeship": "pomorskie", "lat": 54.4418, "lng": 18.5601, "weight": 3, "r": 0.015, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Hel",             "voivodeship": "pomorskie", "lat": 54.6067, "lng": 18.7933, "weight": 2, "r": 0.010, "extra_tags": {"near_forest": True, "quiet_rural": True}},
            {"city": "Władysławowo",    "voivodeship": "pomorskie", "lat": 54.7899, "lng": 18.4046, "weight": 2, "r": 0.015},
            {"city": "Łeba",            "voivodeship": "pomorskie", "lat": 54.7596, "lng": 17.5382, "weight": 2, "r": 0.013, "extra_tags": {"near_forest": True}},
            {"city": "Ustka",           "voivodeship": "pomorskie", "lat": 54.5811, "lng": 16.8614, "weight": 2, "r": 0.013},
            {"city": "Mielno",          "voivodeship": "zachodniopomorskie", "lat": 54.2600, "lng": 16.0700, "weight": 1, "r": 0.012},
            {"city": "Kołobrzeg",       "voivodeship": "zachodniopomorskie", "lat": 54.1758, "lng": 15.5789, "weight": 1, "r": 0.018, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Gdańsk",          "voivodeship": "pomorskie", "lat": 54.3520, "lng": 18.6466, "weight": 1, "r": 0.020, "extra_tags": {"historic_center_nearby": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek przy Plaży Bałtyckiej",  "Dom Morska Bryza",             "Chatka przy Molo",
                "Dom Rybacki przy Plaży",        "Bałtycki Domek z Ogrodem",    "Dom przy Wydmach",
                "Domek Nadmorski z Grillem",     "Dom przy Sosnowym Lesie",
            ],
            "chata": [
                "Kaszubska Chata przy Morzu",   "Rybacka Chata nad Bałtykiem", "Chata Nadmorska",
            ],
            "apartament": [
                "Apartament z Widokiem na Bałtyk", "Apartament przy Plaży",    "Studio Morskie na Molo",
                "Apartament Morska Fala",           "Bałtycki Apartament",      "Apartament przy Promenadzie",
                "Studio z Widokiem na Morze",
            ],
            "luksus": [
                "Willa przy Monciaku",          "Luksusowa Willa Bałtycka",    "Rezydencja Nadmorska z Tarasem",
            ],
            "dworek": [
                "Dworek Kaszubski przy Morzu",  "Zabytkowy Dworek Nadmorski",
            ],
            "pokoj": [
                "Pokoje przy Plaży",            "Pensjonat Morski",             "Pokoje nad Bałtykiem",
                "Pensjonat przy Molo",
            ],
            "kemping": [
                "Kemping Nadmorski",            "Glamping przy Bałtyku",       "Biwak nad Morzem",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 6. MAZOWSZE / WARSZAWA OKOLICE — 13 ofert
    # ------------------------------------------------------------------
    {
        "id": "mazowsze",
        "label": "Mazowsze / Warszawa okolice",
        "count": 14,
        "terrain": "forest",
        "location_tags": {
            "near_forest": True,
            "quiet_rural": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 1.10,
        "type_weights": {"domek": 2, "chata": 1, "apartament": 3, "luksus": 1, "dworek": 2, "pokoj": 1, "kemping": 0},
        "localities": [
            {"city": "Konstancin-Jeziorna", "voivodeship": "mazowieckie", "lat": 52.0795, "lng": 21.1094, "weight": 3, "r": 0.015, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Serock",              "voivodeship": "mazowieckie", "lat": 52.5294, "lng": 21.0490, "weight": 2, "r": 0.013, "extra_tags": {"near_lake": True, "near_river": True}},
            {"city": "Nowy Dwór Mazowiecki","voivodeship": "mazowieckie", "lat": 52.4468, "lng": 20.7181, "weight": 1, "r": 0.015},
            {"city": "Żelazowa Wola",       "voivodeship": "mazowieckie", "lat": 52.3378, "lng": 20.3000, "weight": 1, "r": 0.010, "extra_tags": {"historic_center_nearby": True, "quiet_rural": True}},
            {"city": "Kazuń",               "voivodeship": "mazowieckie", "lat": 52.4300, "lng": 20.5200, "weight": 1, "r": 0.010, "extra_tags": {"near_river": True}},
            {"city": "Warszawa okolice",    "voivodeship": "mazowieckie", "lat": 52.2297, "lng": 21.0122, "weight": 2, "r": 0.030},
        ],
        "name_templates": {
            "domek": [
                "Domek na Mazowieckiej Wsi",    "Chatka w Kampinoskim Parku",  "Dom przy Zalewie Zegrzyńskim",
                "Mazowiecki Domek w Lesie",     "Dom na Skraju Puszczy",
            ],
            "chata": [
                "Chata Mazowiecka",             "Leśna Chata przy Wiśle",      "Chata na Mazowieckich Łąkach",
            ],
            "apartament": [
                "Apartament w Śródmieściu",     "Apartament przy Parku",        "Studio Miejskie z Widokiem",
                "Apartament Blisko Centrum",    "Loft w Starej Kamienicy",      "Apartament Warszawa Mokotów",
            ],
            "luksus": [
                "Willa Mazowiecka z Basenem",   "Rezydencja pod Warszawą",     "Luksusowy Dworek na Mazowszu",
            ],
            "dworek": [
                "Dworek Mazowiecki",            "Szlachecki Dworek przy Wiśle", "Zabytkowy Dworek pod Warszawą",
                "Dworek w Sercu Mazowsza",
            ],
            "pokoj": [
                "Pokoje Blisko Centrum",        "Pensjonat nad Zalewem",
            ],
            "kemping": [],
        },
    },

    # ------------------------------------------------------------------
    # 7. ROZTOCZE / LUBELSZCZYZNA — 14 ofert
    # ------------------------------------------------------------------
    {
        "id": "roztocze",
        "label": "Roztocze / Lubelszczyzna",
        "count": 14,
        "terrain": "forest",
        "location_tags": {
            "near_forest": True,
            "near_protected_area": True,
            "quiet_rural": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 0.90,
        "type_weights": {"domek": 3, "chata": 2, "apartament": 1, "luksus": 1, "dworek": 2, "pokoj": 2, "kemping": 1},
        "localities": [
            {"city": "Zwierzyniec",       "voivodeship": "lubelskie", "lat": 50.6098, "lng": 22.9731, "weight": 3, "r": 0.012, "extra_tags": {"near_river": True}},
            {"city": "Kazimierz Dolny",   "voivodeship": "lubelskie", "lat": 51.3199, "lng": 21.9521, "weight": 3, "r": 0.012, "extra_tags": {"historic_center_nearby": True, "near_river": True}},
            {"city": "Nałęczów",          "voivodeship": "lubelskie", "lat": 51.2842, "lng": 22.2236, "weight": 2, "r": 0.013, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Józefów Roztoczański", "voivodeship": "lubelskie", "lat": 50.4787, "lng": 23.0474, "weight": 2, "r": 0.010, "extra_tags": {"quiet_rural": True}},
            {"city": "Zamość",            "voivodeship": "lubelskie", "lat": 50.7231, "lng": 23.2519, "weight": 1, "r": 0.018, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Biała Podlaska ok.", "voivodeship": "lubelskie", "lat": 52.0322, "lng": 23.1164, "weight": 2, "r": 0.020, "extra_tags": {"near_river": True}},
            {"city": "Chełm ok.",          "voivodeship": "lubelskie", "lat": 51.1430, "lng": 23.4716, "weight": 1, "r": 0.018, "extra_tags": {"historic_center_nearby": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek na Roztoczu",            "Dom w Roztoczańskim Parku",    "Chatka nad Wieprzem",
                "Leśny Domek przy Świteziankach","Dom na Skraju Roztocza",
            ],
            "chata": [
                "Chata Roztoczańska",           "Drewniana Chata w Lesie",      "Chata przy Wąskiej Rzece",
                "Stara Chata na Roztoczu",
            ],
            "apartament": [
                "Apartament w Kazimierzu",      "Studio przy Rynku w Zamościu", "Apartament Lubelski",
                "Apartament w Białej Podlaskiej",
            ],
            "luksus": [
                "Willa Lubelska w Parku",       "Rezydencja na Roztoczu",       "Willa Podlaska z Ogrodem",
            ],
            "dworek": [
                "Dworek Lubelski",              "Zabytkowy Dworek na Roztoczu", "Dworek w Sercu Lubelszczyzny",
                "Szlachecki Dworek przy Wiśle", "Dworek Podlaski",
            ],
            "pokoj": [
                "Pokoje w Kazimierzu Dolnym",   "Pensjonat Lubelski",           "Pokoje w Nałęczowie",
                "Pokoje przy Bugu",
            ],
            "kemping": [
                "Kemping Roztoczański",         "Biwak w Parku Krajobrazowym",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 8. WIELKOPOLSKA / KUJAWY — 14 ofert
    # ------------------------------------------------------------------
    {
        "id": "wielkopolska",
        "label": "Wielkopolska / Kujawy",
        "count": 14,
        "terrain": "forest",
        "location_tags": {
            "near_lake": True,
            "near_forest": True,
            "quiet_rural": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 0.95,
        "type_weights": {"domek": 3, "chata": 1, "apartament": 2, "luksus": 1, "dworek": 3, "pokoj": 1, "kemping": 1},
        "localities": [
            {"city": "Gniezno",          "voivodeship": "wielkopolskie", "lat": 52.5356, "lng": 17.5857, "weight": 2, "r": 0.018, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Biskupin",         "voivodeship": "kujawsko-pomorskie", "lat": 52.7597, "lng": 17.9614, "weight": 2, "r": 0.010, "extra_tags": {"historic_center_nearby": True, "near_lake": True}},
            {"city": "Kruszwica",        "voivodeship": "kujawsko-pomorskie", "lat": 52.6776, "lng": 18.3280, "weight": 2, "r": 0.012, "extra_tags": {"near_lake": True}},
            {"city": "Poznań okolice",   "voivodeship": "wielkopolskie", "lat": 52.4064, "lng": 16.9252, "weight": 2, "r": 0.025, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Kórnik",           "voivodeship": "wielkopolskie", "lat": 52.2441, "lng": 17.0985, "weight": 2, "r": 0.012, "extra_tags": {"historic_center_nearby": True, "near_lake": True}},
            {"city": "Licheń",           "voivodeship": "wielkopolskie", "lat": 52.2950, "lng": 18.3060, "weight": 1, "r": 0.010, "extra_tags": {"near_lake": True}},
            {"city": "Kalisz ok.",       "voivodeship": "wielkopolskie", "lat": 51.7610, "lng": 18.0910, "weight": 2, "r": 0.020, "extra_tags": {"historic_center_nearby": True, "near_river": True}},
            {"city": "Ostrów Wlkp. ok.", "voivodeship": "wielkopolskie", "lat": 51.6523, "lng": 17.8165, "weight": 1, "r": 0.018},
        ],
        "name_templates": {
            "domek": [
                "Domek przy Jeziorze Gopło",    "Dom na Kujawskiej Wsi",        "Chatka Piastowska",
                "Wielkopolski Domek w Lesie",   "Dom przy Szlaku Piastowskim",
            ],
            "chata": [
                "Chata Wielkopolska",           "Drewniana Chata na Kujawach",  "Stara Chata Piastowska",
            ],
            "apartament": [
                "Apartament przy Starym Rynku", "Studio w Sercu Wielkopolski",  "Apartament Blisko Zamku",
                "Apartament w Kaliszu",         "Studio przy Rynku w Kaliszu",
            ],
            "luksus": [
                "Willa Wielkopolska z Ogrodem", "Rezydencja Piastowska",        "Willa Kaliska z Ogrodem",
            ],
            "dworek": [
                "Dworek Kujawski",              "Szlachecki Dworek Piastowski", "Dworek w Sercu Wielkopolski",
                "Zabytkowy Dworek Kujawski",    "Dworek nad Gopłem",            "Dworek Kaliski",
            ],
            "pokoj": [
                "Pokoje przy Szlaku Piastowskim", "Pensjonat Kujawski",
            ],
            "kemping": [
                "Kemping przy Jeziorze Gopło",  "Biwak Piastowski",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 9. ŚLĄSK / BESKIDY — 14 ofert
    # ------------------------------------------------------------------
    {
        "id": "slask_beskidy",
        "label": "Śląsk / Beskidy Śląskie",
        "count": 14,
        "terrain": "mountains",
        "location_tags": {
            "near_mountains": True,
            "near_forest": True,
            "ski_slopes_nearby": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 1.05,
        "type_weights": {"domek": 3, "chata": 3, "apartament": 2, "luksus": 1, "dworek": 1, "pokoj": 2, "kemping": 0},
        "localities": [
            {"city": "Wisła",           "voivodeship": "śląskie", "lat": 49.6500, "lng": 18.8531, "weight": 3, "r": 0.015},
            {"city": "Szczyrk",         "voivodeship": "śląskie", "lat": 49.7208, "lng": 19.0364, "weight": 3, "r": 0.013},
            {"city": "Ustroń",          "voivodeship": "śląskie", "lat": 49.7170, "lng": 18.8017, "weight": 2, "r": 0.013},
            {"city": "Istebna",         "voivodeship": "śląskie", "lat": 49.5822, "lng": 18.9544, "weight": 2, "r": 0.010, "extra_tags": {"quiet_rural": True}},
            {"city": "Brenna",          "voivodeship": "śląskie", "lat": 49.7222, "lng": 18.8625, "weight": 1, "r": 0.012},
            {"city": "Żywiec",          "voivodeship": "śląskie", "lat": 49.6845, "lng": 19.1940, "weight": 1, "r": 0.018, "extra_tags": {"near_lake": True, "historic_center_nearby": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek Beskidzki",             "Dom przy Wyciągu Narciarskim", "Chatka w Beskidach Śląskich",
                "Beskidzki Domek z Kominkiem", "Dom na Górskiej Polanie",      "Domek Góralski",
            ],
            "chata": [
                "Chata Beskidzka",             "Góralska Chata w Wiśle",       "Drewniana Chata Śląska",
                "Chata na Stoku Narciarskim",  "Chata Istebniańska",           "Chata Czantoria",
            ],
            "apartament": [
                "Apartament Beskidzki",        "Apartament przy Wyciągu",      "Studio z Widokiem na Beskidy",
                "Apartament w Uzdrowisku",
            ],
            "luksus": [
                "Willa Beskidzka z Sauną",     "Rezydencja w Górach Śląskich",
            ],
            "dworek": [
                "Dworek Beskidzki",            "Zabytkowy Dworek Śląski",
            ],
            "pokoj": [
                "Pokoje Uzdrowiskowe Ustroń",  "Pensjonat Beskidzki",          "Pokoje Górskie w Wiśle",
            ],
            "kemping": [],
        },
    },

    # ------------------------------------------------------------------
    # 10. WARMIA / MAZURY ZACHODNIE — 12 ofert
    # ------------------------------------------------------------------
    {
        "id": "warmia",
        "label": "Warmia / Mazury Zachodnie",
        "count": 13,
        "terrain": "lake",
        "location_tags": {
            "near_lake": True,
            "near_forest": True,
            "quiet_rural": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 1.00,
        "type_weights": {"domek": 3, "chata": 2, "apartament": 1, "luksus": 1, "dworek": 2, "pokoj": 2, "kemping": 1},
        "localities": [
            {"city": "Olsztyn",            "voivodeship": "warmińsko-mazurskie", "lat": 53.7784, "lng": 20.4801, "weight": 2, "r": 0.020, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Ostróda",            "voivodeship": "warmińsko-mazurskie", "lat": 53.7021, "lng": 19.9583, "weight": 2, "r": 0.015, "extra_tags": {"near_river": True}},
            {"city": "Iława",              "voivodeship": "warmińsko-mazurskie", "lat": 53.5988, "lng": 19.5692, "weight": 2, "r": 0.015},
            {"city": "Lidzbark Warmiński", "voivodeship": "warmińsko-mazurskie", "lat": 54.1304, "lng": 20.5778, "weight": 2, "r": 0.013, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Reszel",             "voivodeship": "warmińsko-mazurskie", "lat": 54.0514, "lng": 21.1470, "weight": 1, "r": 0.010, "extra_tags": {"historic_center_nearby": True, "quiet_rural": True}},
            {"city": "Kętrzyn",            "voivodeship": "warmińsko-mazurskie", "lat": 54.0792, "lng": 21.3746, "weight": 1, "r": 0.013, "extra_tags": {"historic_center_nearby": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek na Warmii",             "Dom przy Warmińskim Jeziorze", "Chatka w Sercu Warmii",
                "Warmijski Domek w Lesie",     "Dom przy Kanalię Ostródzkim",
            ],
            "chata": [
                "Chata Warmijska",             "Drewniana Chata nad Jeziorkiem", "Stara Chata Pruska",
                "Warmijska Chata w Lesie",
            ],
            "apartament": [
                "Apartament w Starym Mieście", "Studio przy Warmińskim Zamku", "Apartament Warmijski",
            ],
            "luksus": [
                "Willa Warmijska z Ogrodem",   "Rezydencja przy Zamku Reszla",
            ],
            "dworek": [
                "Dworek Warmijski",            "Pruski Dworek na Warmii",      "Dworek przy Zamku",
                "Zabytkowy Dworek Warmijski",
            ],
            "pokoj": [
                "Pokoje przy Warmińskim Zamku", "Pensjonat Warmijski",          "Pokoje na Warmii",
            ],
            "kemping": [
                "Kemping przy Jeziorze na Warmii", "Biwak Warmijski",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 11. ZACHODNIOPOMORSKIE — 17 ofert
    # ------------------------------------------------------------------
    {
        "id": "zachodniopomorskie",
        "label": "Zachodniopomorskie / Wybrzeże Zachodnie",
        "count": 17,
        "terrain": "sea",
        "location_tags": {
            "near_sea": True,
            "near_forest": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 1.05,
        "type_weights": {"domek": 3, "chata": 1, "apartament": 3, "luksus": 2, "dworek": 1, "pokoj": 3, "kemping": 2},
        "localities": [
            {"city": "Świnoujście",  "voivodeship": "zachodniopomorskie", "lat": 53.9065, "lng": 14.2421, "weight": 3, "r": 0.018, "extra_tags": {"near_sea": True, "historic_center_nearby": True}},
            {"city": "Dziwnów",     "voivodeship": "zachodniopomorskie", "lat": 54.0197, "lng": 14.7361, "weight": 3, "r": 0.015, "extra_tags": {"near_sea": True}},
            {"city": "Rewal",       "voivodeship": "zachodniopomorskie", "lat": 54.0480, "lng": 14.9020, "weight": 2, "r": 0.012, "extra_tags": {"near_sea": True}},
            {"city": "Pobierowo",   "voivodeship": "zachodniopomorskie", "lat": 54.0140, "lng": 14.7530, "weight": 2, "r": 0.012, "extra_tags": {"near_sea": True}},
            {"city": "Kołobrzeg",   "voivodeship": "zachodniopomorskie", "lat": 54.1758, "lng": 15.5789, "weight": 3, "r": 0.018, "extra_tags": {"near_sea": True, "historic_center_nearby": True}},
            {"city": "Mielno",      "voivodeship": "zachodniopomorskie", "lat": 54.2640, "lng": 16.0100, "weight": 2, "r": 0.013, "extra_tags": {"near_sea": True}},
            {"city": "Niechorze",   "voivodeship": "zachodniopomorskie", "lat": 54.0900, "lng": 15.0860, "weight": 2, "r": 0.010, "extra_tags": {"near_sea": True}},
            {"city": "Szczecin",    "voivodeship": "zachodniopomorskie", "lat": 53.4289, "lng": 14.5530, "weight": 2, "r": 0.025, "extra_tags": {"historic_center_nearby": True, "near_river": True}},
            {"city": "Wolin",       "voivodeship": "zachodniopomorskie", "lat": 53.8408, "lng": 14.6226, "weight": 2, "r": 0.013, "extra_tags": {"near_sea": True, "near_forest": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek nad Bałtykiem",         "Dom przy Zachodniopomorskiej Plaży", "Chatka na Zachodnim Wybrzeżu",
                "Domek w Świnoujściu",         "Dom przy Morzu w Pobierowie",        "Nadmorski Domek pod Sosnami",
            ],
            "chata": [
                "Chata przy Bałtyku",          "Leśna Chata nad Morzem",             "Chata Kaszubska nad Zatoką",
            ],
            "apartament": [
                "Apartament z Widokiem na Morze", "Studio Bałtyckie w Kołobrzegu",   "Apartament Przy Plaży",
                "Studio nad Zalewem Szczecińskim", "Apartament Uzdrowiskowy",
            ],
            "luksus": [
                "Willa Bałtycka z Basenem",    "Rezydencja przy Morzu Zachodnim",    "Luksusowy Dom na Wydmach",
            ],
            "dworek": [
                "Dworek Zachodniopomorski",    "Dworek przy Zatoce Szczecińskiej",   "Dworek Nadmorski",
            ],
            "pokoj": [
                "Pokoje nad Morzem",           "Pensjonat Bałtycki",                 "Pokoje Uzdrowiskowe Kołobrzeg",
                "Willa Morska — pokoje",
            ],
            "kemping": [
                "Kemping Zachodniopomorski",   "Glamping przy Bałtyku",              "Kemping Nadmorski pod Sosnami",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 12. PODLASKIE / SUWALSZCZYZNA — 15 ofert
    # ------------------------------------------------------------------
    {
        "id": "podlaskie",
        "label": "Podlaskie / Suwalszczyzna",
        "count": 15,
        "terrain": "lake",
        "location_tags": {
            "near_lake": True,
            "near_forest": True,
            "near_river": True,
            "quiet_rural": True,
        },
        "price_multiplier": 0.90,
        "type_weights": {"domek": 3, "chata": 3, "apartament": 1, "luksus": 1, "dworek": 2, "pokoj": 2, "kemping": 2},
        "localities": [
            {"city": "Augustów",       "voivodeship": "podlaskie", "lat": 53.8436, "lng": 22.9790, "weight": 3, "r": 0.018, "extra_tags": {"near_river": True, "near_lake": True}},
            {"city": "Suwałki",        "voivodeship": "podlaskie", "lat": 54.1116, "lng": 22.9307, "weight": 2, "r": 0.020},
            {"city": "Wigry",          "voivodeship": "podlaskie", "lat": 54.0266, "lng": 23.0897, "weight": 3, "r": 0.012, "extra_tags": {"near_lake": True, "quiet_rural": True}},
            {"city": "Sejny",          "voivodeship": "podlaskie", "lat": 54.0963, "lng": 23.3459, "weight": 2, "r": 0.013, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Supraśl",        "voivodeship": "podlaskie", "lat": 53.2095, "lng": 23.3396, "weight": 2, "r": 0.012, "extra_tags": {"near_forest": True, "historic_center_nearby": True}},
            {"city": "Białowieża",     "voivodeship": "podlaskie", "lat": 52.6958, "lng": 23.8561, "weight": 3, "r": 0.013, "extra_tags": {"near_forest": True, "quiet_rural": True}},
            {"city": "Hajnówka",       "voivodeship": "podlaskie", "lat": 52.7400, "lng": 23.5900, "weight": 2, "r": 0.015, "extra_tags": {"near_forest": True}},
            {"city": "Biebrzański PN", "voivodeship": "podlaskie", "lat": 53.4900, "lng": 22.8600, "weight": 2, "r": 0.020, "extra_tags": {"near_river": True, "quiet_rural": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek przy Wigrach",              "Dom w Puszczy Augustowskiej",       "Chatka nad Kanałem Augustowskim",
                "Domek w Białowieży",              "Dom na Suwalszczyźnie",             "Leśna Chata Podlaska",
            ],
            "chata": [
                "Chata Podlaska",                  "Chata przy Jeziorze Wigry",         "Stara Chata w Puszczy Białowieskiej",
                "Chata Suwalska",                  "Puszczańska Chata Hajnówka",
            ],
            "apartament": [
                "Apartament w Augustowie",         "Studio w Suwalskim Parku",          "Apartament przy Puszczy",
            ],
            "luksus": [
                "Willa w Puszczy Białowieskiej",   "Rezydencja przy Wigrach",
            ],
            "dworek": [
                "Dworek Podlaski",                 "Dworek na Suwalszczyźnie",          "Dworek Białowieski",
                "Dworek przy Puszczy",
            ],
            "pokoj": [
                "Pokoje przy Wigrach",             "Pensjonat Podlaski",                "Pokoje Augustowskie",
            ],
            "kemping": [
                "Kemping przy Wigrach",            "Glamping w Puszczy Białowieskiej",  "Biwak nad Kanałem Augustowskim",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 13. ŁÓDŹ / CENTRUM POLSKI — 17 ofert
    # ------------------------------------------------------------------
    {
        "id": "lodz_centrum",
        "label": "Centrum Polski / Łódź okolice",
        "count": 17,
        "terrain": "forest",
        "location_tags": {
            "near_forest": True,
            "near_river": True,
            "quiet_rural": True,
        },
        "price_multiplier": 0.85,
        "type_weights": {"domek": 3, "chata": 2, "apartament": 2, "luksus": 1, "dworek": 3, "pokoj": 2, "kemping": 1},
        "localities": [
            {"city": "Spała",                  "voivodeship": "łódzkie", "lat": 51.5537, "lng": 20.0881, "weight": 3, "r": 0.015, "extra_tags": {"near_forest": True, "near_river": True, "quiet_rural": True}},
            {"city": "Inowłódz",               "voivodeship": "łódzkie", "lat": 51.5492, "lng": 20.2101, "weight": 2, "r": 0.012, "extra_tags": {"near_river": True, "historic_center_nearby": True}},
            {"city": "Tomaszów Mazowiecki ok.", "voivodeship": "łódzkie", "lat": 51.5249, "lng": 20.0141, "weight": 2, "r": 0.020},
            {"city": "Piotrków ok.",            "voivodeship": "łódzkie", "lat": 51.4053, "lng": 19.7035, "weight": 2, "r": 0.020, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Łęczyca ok.",             "voivodeship": "łódzkie", "lat": 52.0603, "lng": 19.2050, "weight": 2, "r": 0.018, "extra_tags": {"historic_center_nearby": True}},
            {"city": "Skierniewice ok.",        "voivodeship": "łódzkie", "lat": 51.9558, "lng": 20.1547, "weight": 2, "r": 0.018},
            {"city": "Bolimowski PK",           "voivodeship": "łódzkie", "lat": 52.0700, "lng": 20.2200, "weight": 2, "r": 0.018, "extra_tags": {"near_forest": True}},
            {"city": "Kielce ok.",              "voivodeship": "świętokrzyskie", "lat": 50.8661, "lng": 20.6286, "weight": 2, "r": 0.022, "extra_tags": {"near_mountains": True, "historic_center_nearby": True}},
            {"city": "Chęciny ok.",             "voivodeship": "świętokrzyskie", "lat": 50.8058, "lng": 20.4617, "weight": 1, "r": 0.012, "extra_tags": {"historic_center_nearby": True, "near_mountains": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek w Borach Spały",            "Dom w Dolinie Pilicy",             "Chatka w Centralnej Polsce",
                "Leśny Domek nad Pilicą",          "Dom przy Bolimowskim Parku",
            ],
            "chata": [
                "Chata w Łódzkich Lasach",         "Leśna Chata nad Pilicą",           "Chata w Sercu Polski",
            ],
            "apartament": [
                "Apartament w Centrum Polski",     "Studio przy Leśnym Parku",         "Apartament Łódzki",
                "Apartament Kielecki",             "Studio w Świętokrzyskim",
            ],
            "luksus": [
                "Willa w Borach Centralnych",      "Rezydencja w Sercu Polski",        "Willa Kielecka z Tarasem",
            ],
            "dworek": [
                "Dworek w Dolinie Pilicy",         "Dworek Piotrkowski",               "Dworek Łódzki z Ogrodem",
                "Dworek w Sercu Mazowsza",         "Historyczny Dworek nad Pilicą",    "Dworek Świętokrzyski",
            ],
            "pokoj": [
                "Pokoje przy Lesie Spała",         "Pensjonat Centralny",              "Pokoje nad Pilicą",
                "Pokoje w Kielcach",
            ],
            "kemping": [
                "Kemping nad Pilicą",              "Biwak w Borach Spały",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 14. KUJAWSKO-POMORSKIE / BORY TUCHOLSKIE — 15 ofert
    # ------------------------------------------------------------------
    {
        "id": "kujawsko_pomorskie",
        "label": "Kujawsko-Pomorskie / Bory Tucholskie",
        "count": 15,
        "terrain": "lake",
        "location_tags": {
            "near_lake": True,
            "near_forest": True,
            "near_river": True,
            "cycling_routes_nearby": True,
        },
        "price_multiplier": 0.90,
        "type_weights": {"domek": 3, "chata": 3, "apartament": 2, "luksus": 1, "dworek": 2, "pokoj": 2, "kemping": 2},
        "localities": [
            {"city": "Tuchola",              "voivodeship": "kujawsko-pomorskie", "lat": 53.5896, "lng": 17.8572, "weight": 3, "r": 0.020, "extra_tags": {"near_forest": True, "historic_center_nearby": True}},
            {"city": "Chojnice ok.",         "voivodeship": "kujawsko-pomorskie", "lat": 53.6968, "lng": 17.5620, "weight": 2, "r": 0.018, "extra_tags": {"near_forest": True, "near_lake": True}},
            {"city": "Zalew Koronowski",     "voivodeship": "kujawsko-pomorskie", "lat": 53.3500, "lng": 17.9500, "weight": 3, "r": 0.015, "extra_tags": {"near_lake": True, "near_river": True}},
            {"city": "Toruń ok.",            "voivodeship": "kujawsko-pomorskie", "lat": 53.0138, "lng": 18.5982, "weight": 2, "r": 0.025, "extra_tags": {"historic_center_nearby": True, "near_river": True}},
            {"city": "Bydgoszcz ok.",        "voivodeship": "kujawsko-pomorskie", "lat": 53.1235, "lng": 18.0084, "weight": 2, "r": 0.025},
            {"city": "Grudziądz ok.",        "voivodeship": "kujawsko-pomorskie", "lat": 53.4842, "lng": 18.7536, "weight": 2, "r": 0.018, "extra_tags": {"historic_center_nearby": True, "near_river": True}},
            {"city": "Świecie ok.",          "voivodeship": "kujawsko-pomorskie", "lat": 53.4136, "lng": 18.4316, "weight": 2, "r": 0.015, "extra_tags": {"near_river": True}},
            {"city": "Brodnica ok.",         "voivodeship": "kujawsko-pomorskie", "lat": 53.2576, "lng": 19.3920, "weight": 2, "r": 0.015, "extra_tags": {"near_lake": True, "historic_center_nearby": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek w Borach Tucholskich",      "Dom nad Zalewem Koronowskim",       "Chatka w Tucholskim Lesie",
                "Leśny Domek nad Brdą",            "Dom przy Zalewie Koronowskim",
            ],
            "chata": [
                "Chata w Borach",                  "Leśna Chata Kujawska",              "Chata w Sercu Borów Tucholskich",
                "Stara Chata przy Brdzie",
            ],
            "apartament": [
                "Apartament przy Toruniu",         "Studio w Starym Mieście Toruń",     "Apartament Kujawski",
            ],
            "luksus": [
                "Willa przy Zalewie Koronowskim",  "Rezydencja Kujawska",
            ],
            "dworek": [
                "Dworek Kujawski",                 "Szlachecki Dworek przy Wiśle",      "Dworek w Borach Tucholskich",
                "Dworek Chełmiński",
            ],
            "pokoj": [
                "Pokoje w Borach Tucholskich",     "Pensjonat Kujawski",                "Pokoje przy Brdzie",
            ],
            "kemping": [
                "Kemping w Borach Tucholskich",    "Glamping Tucholski",                "Biwak nad Brdą",
            ],
        },
    },

    # ------------------------------------------------------------------
    # 15. LUBUSKIE / ZACHODNIA POLSKA — 11 ofert
    # ------------------------------------------------------------------
    {
        "id": "lubuskie",
        "label": "Lubuskie / Zachodnia Polska",
        "count": 11,
        "terrain": "lake",
        "location_tags": {
            "near_lake": True,
            "near_forest": True,
            "near_river": True,
            "quiet_rural": True,
        },
        "price_multiplier": 0.85,
        "type_weights": {"domek": 3, "chata": 2, "apartament": 2, "luksus": 1, "dworek": 2, "pokoj": 2, "kemping": 1},
        "localities": [
            {"city": "Łagów",            "voivodeship": "lubuskie", "lat": 52.3425, "lng": 15.2979, "weight": 3, "r": 0.012, "extra_tags": {"near_lake": True, "historic_center_nearby": True, "quiet_rural": True}},
            {"city": "Lubniewice",       "voivodeship": "lubuskie", "lat": 52.5271, "lng": 15.2788, "weight": 3, "r": 0.012, "extra_tags": {"near_lake": True, "quiet_rural": True}},
            {"city": "Zielona Góra ok.", "voivodeship": "lubuskie", "lat": 51.9356, "lng": 15.5062, "weight": 2, "r": 0.020},
            {"city": "Gorzów Wlkp. ok.", "voivodeship": "lubuskie", "lat": 52.7368, "lng": 15.2288, "weight": 2, "r": 0.022},
            {"city": "Krosno Odrzańskie","voivodeship": "lubuskie", "lat": 52.0564, "lng": 15.1017, "weight": 2, "r": 0.015, "extra_tags": {"near_river": True, "historic_center_nearby": True}},
            {"city": "Międzyrzecz ok.", "voivodeship": "lubuskie", "lat": 52.4430, "lng": 15.5680, "weight": 2, "r": 0.015, "extra_tags": {"near_lake": True}},
        ],
        "name_templates": {
            "domek": [
                "Domek nad Jeziorem Łagowskim",   "Dom przy Odrze",                   "Lubuski Domek w Lesie",
                "Dom nad Jeziorem Lubniewskim",   "Chatka w Lubuskim Parku",
            ],
            "chata": [
                "Chata Lubuska",                   "Leśna Chata nad Odrą",             "Chata przy Jeziorze",
            ],
            "apartament": [
                "Apartament Zielonogórski",        "Studio nad Jeziorem Łagowskim",    "Apartament przy Odrze",
            ],
            "luksus": [
                "Willa Lubuska z Winnicą",         "Rezydencja przy Odrze",
            ],
            "dworek": [
                "Dworek Lubuski",                  "Dworek nad Odrą",                  "Dworek w Sercu Lubuskiego",
            ],
            "pokoj": [
                "Pokoje przy Jeziorze Łagowskim",  "Pensjonat Lubuski",                "Pokoje nad Odrą",
            ],
            "kemping": [
                "Kemping nad Jeziorem Lubniewskim","Biwak Lubuski",
            ],
        },
    },
]
