# Dokladne dane mapy Polski (GeoJSON)

Te pliki sa ladowane przez `loadPolandGeoData()` w `src/lib/maps/poland.ts`.

## Wymagane pliki

- `poland-border.geojson` - granica Polski (FeatureCollection, Polygon/MultiPolygon)
- `voivodeships.geojson` - granice wojewodztw (FeatureCollection)
- `cities.geojson` - miasta (FeatureCollection, najlepiej Point)

## Minimalny format miast

Kazdy feature miasta powinien miec:

- geometrie `Point` z `[lng, lat]`
- nazwe miasta w `properties.name` (lub `city`, `NAME`)

Przyklad:

```json
{
  "type": "Feature",
  "properties": { "name": "Warszawa" },
  "geometry": { "type": "Point", "coordinates": [21.0122, 52.2297] }
}
```

## Uwaga

Domyslnie aplikacja ma fallback do uproszczonej granicy, wiec brak tych plikow nie blokuje mapy.
Dla maksymalnej wiernosci podmien te pliki na wysokiej jakosci dane administracyjne.

