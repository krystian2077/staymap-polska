"""
Dane wejściowe do seed_mass_listings — lokalizacje (waga = udział w puli ofert).
Format linii: city|region|lat|lon|sea|mtn|lake|forest|weight (0/1)
"""
from __future__ import annotations

LOCATIONS_RAW = """
Zakopane|małopolskie|49.2992|19.9496|0|1|0|1|50
Kościelisko|małopolskie|49.3166|19.8744|0|1|0|1|28
Bukowina Tatrzańska|małopolskie|49.3639|20.1183|0|1|0|1|22
Białka Tatrzańska|małopolskie|49.3766|20.1419|0|1|0|1|20
Murzasichle|małopolskie|49.3358|19.9972|0|1|0|1|16
Witów|małopolskie|49.3341|19.8283|0|1|0|1|14
Poronin|małopolskie|49.3469|20.0319|0|1|0|1|12
Ząb|małopolskie|49.3097|19.9766|0|1|0|1|10
Czarny Dunajec|małopolskie|49.4244|19.8841|0|1|0|1|9
Nowy Targ|małopolskie|49.4783|20.0314|0|1|0|1|9
Chochołów|małopolskie|49.3622|19.8092|0|1|0|1|10
Dzianisz|małopolskie|49.3481|19.8486|0|1|0|1|8
Gronków|małopolskie|49.3889|20.1661|0|1|0|1|8
Leśnica|małopolskie|49.3022|19.9308|0|1|0|1|7
Szczawnica|małopolskie|49.4213|20.4833|0|1|0|1|12
Krościenko n/Dunajcem|małopolskie|49.4371|20.4187|0|1|0|1|10
Czorsztyn|małopolskie|49.4480|20.3230|0|1|1|1|10
Maniowy|małopolskie|49.4280|20.2280|0|1|1|1|8
Nowy Sącz okolice|małopolskie|49.6236|20.6992|0|1|0|1|8
Stary Sącz|małopolskie|49.5594|20.6385|0|1|0|1|7
Rytro|małopolskie|49.5430|20.5858|0|1|0|1|7
Rabka-Zdrój|małopolskie|49.6086|19.9656|0|1|0|1|8
Sopot|pomorskie|54.4418|18.5601|1|0|0|0|30
Gdańsk|pomorskie|54.3520|18.6466|1|0|0|0|15
Gdynia|pomorskie|54.5189|18.5305|1|0|0|0|12
Hel|pomorskie|54.6063|18.7996|1|0|0|0|20
Jastarnia|pomorskie|54.6985|18.6783|1|0|0|0|16
Jurata|pomorskie|54.7097|18.6672|1|0|0|0|14
Władysławowo|pomorskie|54.7916|18.4089|1|0|0|0|14
Łeba|pomorskie|54.7614|17.5368|1|0|0|0|16
Ustka|pomorskie|54.5806|16.8617|1|0|0|0|14
Kołobrzeg|zachodniopomorskie|54.1759|15.5814|1|0|0|0|14
Mielno|zachodniopomorskie|54.2619|16.0069|1|0|0|0|10
Dziwnów|zachodniopomorskie|54.0163|14.7364|1|0|0|0|9
Świnoujście|zachodniopomorskie|53.9099|14.2498|1|0|0|0|9
Rewal|zachodniopomorskie|54.0666|14.9816|1|0|0|0|8
Pobierowo|zachodniopomorskie|54.0363|14.9008|1|0|0|0|7
Niechorze|zachodniopomorskie|54.0994|15.0722|1|0|0|0|7
Darłowo|pomorskie|54.4224|16.4138|1|0|0|0|7
Karwia|pomorskie|54.7883|18.2783|1|0|0|0|7
Dębki|pomorskie|54.7521|17.9838|1|0|0|0|6
Rowy|pomorskie|54.6636|17.0297|1|0|0|0|6
Łazy|zachodniopomorskie|54.0497|14.8019|1|0|0|0|5
Międzyzdroje|zachodniopomorskie|53.9258|14.4424|1|0|0|0|8
Krynica Morska|pomorskie|54.3851|19.4501|1|0|0|0|7
Mikołajki|warmińsko-mazurskie|53.8033|21.5705|0|0|1|1|22
Giżycko|warmińsko-mazurskie|54.0369|21.7681|0|0|1|1|18
Mrągowo|warmińsko-mazurskie|53.8691|21.3016|0|0|1|1|12
Węgorzewo|warmińsko-mazurskie|54.2155|21.7372|0|0|1|1|10
Pisz|warmińsko-mazurskie|53.6305|21.8160|0|0|1|1|10
Ruciane-Nida|warmińsko-mazurskie|53.6344|21.5303|0|0|1|1|12
Ełk|warmińsko-mazurskie|53.8278|22.3635|0|0|1|1|8
Ostróda|warmińsko-mazurskie|53.6983|19.9694|0|0|1|1|8
Olsztyn okolice|warmińsko-mazurskie|53.7784|20.4801|0|0|1|1|7
Reszel|warmińsko-mazurskie|54.0477|21.1424|0|0|1|1|8
Kętrzyn|warmińsko-mazurskie|54.0774|21.3703|0|0|1|1|7
Sorkwity|warmińsko-mazurskie|53.7836|21.0122|0|0|1|1|6
Ryn|warmińsko-mazurskie|53.9338|21.5361|0|0|1|1|6
Sztynort|warmińsko-mazurskie|54.1247|21.7050|0|0|1|1|7
Wilkasy|warmińsko-mazurskie|54.0258|21.7069|0|0|1|1|6
Ustrzyki Dolne|podkarpackie|49.4330|22.5823|0|1|0|1|16
Lesko|podkarpackie|49.4700|22.3300|0|1|0|1|12
Sanok|podkarpackie|49.5580|22.2044|0|1|0|1|8
Cisna|podkarpackie|49.2289|22.3361|0|1|0|1|14
Wetlina|podkarpackie|49.1867|22.3183|0|1|0|1|12
Solina|podkarpackie|49.3799|22.4561|0|1|1|1|14
Baligród|podkarpackie|49.3336|22.2861|0|1|0|1|7
Komańcza|podkarpackie|49.3186|22.0597|0|1|0|1|7
Szklarska Poręba|dolnośląskie|50.8261|15.5166|0|1|0|1|18
Karpacz|dolnośląskie|50.7644|15.7316|0|1|0|1|16
Świeradów-Zdrój|dolnośląskie|50.9066|15.3383|0|1|0|1|10
Lądek-Zdrój|dolnośląskie|50.3477|16.8844|0|1|0|1|9
Duszniki-Zdrój|dolnośląskie|50.3991|16.3936|0|1|0|1|8
Kudowa-Zdrój|dolnośląskie|50.4350|16.2487|0|1|0|1|8
Polanica-Zdrój|dolnośląskie|50.3994|16.5099|0|1|0|1|7
Stronie Śląskie|dolnośląskie|50.2956|16.8811|0|1|0|1|7
Wrocław okolice|dolnośląskie|51.1079|17.0385|0|0|0|1|6
Wisła|śląskie|49.6527|18.8586|0|1|0|1|16
Ustroń|śląskie|49.7184|18.8079|0|1|0|1|12
Szczyrk|śląskie|49.7177|19.0344|0|1|0|1|12
Brenna|śląskie|49.7117|18.9133|0|1|0|1|8
Koniaków|śląskie|49.6219|18.9619|0|1|0|1|6
Milówka|śląskie|49.6039|18.9397|0|1|0|1|5
Maków Podhalański|małopolskie|49.7227|19.6830|0|1|0|1|6
Zawoja|małopolskie|49.6500|19.5122|0|1|0|1|8
Sucha Beskidzka|małopolskie|49.7438|19.5922|0|1|0|1|6
Chmielno|pomorskie|54.2488|17.9994|0|0|1|1|10
Kartuzy|pomorskie|54.3340|18.2001|0|0|1|1|8
Wdzydze Kiszewskie|pomorskie|53.9669|17.9036|0|0|1|1|9
Stężyca|pomorskie|54.2184|18.0977|0|0|1|1|8
Szymbark Kasz.|pomorskie|54.3040|17.9160|0|0|1|1|7
Przodkowo|pomorskie|54.3667|18.2127|0|0|1|1|6
Somonino|pomorskie|54.2969|18.1458|0|0|1|1|6
Konstancin-Jeziorna|mazowieckie|52.0760|21.1179|0|0|0|1|8
Serock|mazowieckie|52.5217|21.0542|0|0|1|1|8
Zegrze|mazowieckie|52.5008|21.0508|0|0|1|1|8
Kampinos okolice|mazowieckie|52.3230|20.3788|0|0|0|1|8
Mszczonów okolice|mazowieckie|51.9750|20.5219|0|0|0|1|6
Góra Kalwaria|mazowieckie|51.9775|21.2147|0|0|1|1|5
Białowieża|podlaskie|52.6953|23.8643|0|0|0|1|16
Hajnówka|podlaskie|52.7504|23.5826|0|0|0|1|9
Augustów|podlaskie|53.8420|22.9787|0|0|1|1|10
Suwałki okolice|podlaskie|54.1019|22.9307|0|0|1|1|8
Sejny|podlaskie|54.1160|23.3494|0|0|1|1|5
Supraśl|podlaskie|53.2091|23.3458|0|0|0|1|6
Zwierzyniec|lubelskie|50.6127|22.9772|0|0|0|1|9
Szczebrzeszyn|lubelskie|50.6949|22.9846|0|0|0|1|6
Zamość okolice|lubelskie|50.7228|23.2519|0|0|0|1|8
Kazimierz Dolny|lubelskie|51.3236|21.9531|0|0|1|1|9
Nałęczów|lubelskie|51.2878|22.2158|0|0|0|1|6
Sieraków|wielkopolskie|52.6530|16.0830|0|0|1|1|8
Rogalin|wielkopolskie|52.1833|16.9500|0|0|1|1|6
Szamotuły|wielkopolskie|52.6106|16.5844|0|0|0|1|5
Puszcza Zielonka|wielkopolskie|52.5300|17.1400|0|0|1|1|6
Tuchola|kujawsko-pomorskie|53.5980|17.8614|0|0|1|1|8
Charzykowy|kujawsko-pomorskie|53.6766|17.6172|0|0|1|1|7
Świecie okolice|kujawsko-pomorskie|53.4091|18.4344|0|0|1|1|5
Rzeszów okolice|podkarpackie|50.0412|21.9991|0|1|0|1|6
Przemyśl okolice|podkarpackie|49.7838|22.7677|0|1|0|1|5
Łańcut|podkarpackie|50.0694|22.2294|0|0|0|1|4
Kielce okolice|świętokrzyskie|50.8661|20.6286|0|1|0|1|6
Sandomierz|świętokrzyskie|50.6822|21.7488|0|0|1|1|6
Busko-Zdrój|świętokrzyskie|50.4629|20.7165|0|0|0|1|5
Święty Krzyż okol.|świętokrzyskie|50.8683|21.0456|0|1|0|1|5
Lidzbark Warmiński|warmińsko-mazurskie|54.1314|20.5757|0|0|0|1|6
Olsztynek|warmińsko-mazurskie|53.5897|20.2847|0|0|1|1|5
Dobre Miasto|warmińsko-mazurskie|54.0000|20.3971|0|0|1|1|4
Łagów|lubuskie|52.3393|15.3091|0|0|1|1|7
Międzychód|lubuskie|52.5955|15.8843|0|0|1|1|5
Pszczew|lubuskie|52.5147|15.9514|0|0|1|1|5
Góra Świętej Anny|opolskie|50.4482|18.1616|0|0|0|1|5
Turawa|opolskie|50.7225|18.1305|0|0|1|1|5
Spała|łódzkie|51.5479|20.2000|0|0|0|1|6
Sulejów okolice|łódzkie|51.3536|19.8817|0|0|1|1|4
Milicz|dolnośląskie|51.5364|17.2783|0|0|1|1|5
Odolanów|wielkopolskie|51.5722|17.6697|0|0|1|1|3
Malbork okolice|pomorskie|54.0395|19.0300|0|0|1|0|5
Czersk|pomorskie|53.7972|18.0194|0|0|1|1|3
"""


def parse_locations():
    rows: list[tuple] = []
    for line in LOCATIONS_RAW.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        p = line.split("|")
        if len(p) != 9:
            continue
        city, region = p[0], p[1]
        lat, lon = float(p[2]), float(p[3])
        near_sea = p[4] == "1"
        near_mtn = p[5] == "1"
        near_lake = p[6] == "1"
        near_forest = p[7] == "1"
        weight = int(p[8])
        rows.append((city, region, lat, lon, near_sea, near_mtn, near_lake, near_forest, weight))
    return rows


LOCATIONS = parse_locations()
