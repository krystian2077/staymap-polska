from unittest.mock import patch

import pytest


@pytest.mark.django_db
def test_geocode_requires_q(api_client):
    r = api_client.get("/api/v1/geocode/")
    assert r.status_code == 400


@pytest.mark.django_db
@patch("apps.search.geocode_views.geocode_poland")
def test_geocode_found(mock_geo, api_client):
    mock_geo.return_value = {
        "lat": 52.23,
        "lng": 21.01,
        "display_name": "Warszawa, Polska",
    }
    r = api_client.get("/api/v1/geocode/", {"q": "Warszawa"})
    assert r.status_code == 200
    body = r.json()
    assert body["data"]["lat"] == 52.23
    assert body["data"]["lng"] == 21.01
    assert body["meta"]["found"] is True


@pytest.mark.django_db
@patch("apps.search.geocode_views.geocode_poland")
def test_geocode_not_found(mock_geo, api_client):
    mock_geo.return_value = None
    r = api_client.get("/api/v1/geocode/", {"q": "xyznonexistent123"})
    assert r.status_code == 200
    assert r.json()["data"] is None
    assert r.json()["meta"]["found"] is False
