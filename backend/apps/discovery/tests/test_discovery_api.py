import pytest
from django.core.cache import cache


@pytest.mark.django_db
def test_discovery_homepage_returns_shape(api_client):
    cache.clear()
    res = api_client.get("/api/v1/discovery/homepage/")
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    assert "featured_collections" in body["data"]
    assert "last_minute" in body["data"]
    assert isinstance(body["data"]["featured_collections"], list)
    assert isinstance(body["data"]["last_minute"], list)


@pytest.mark.django_db
def test_compare_bootstrap_anon(api_client):
    res = api_client.post("/api/v1/compare/bootstrap/")
    assert res.status_code == 201
    key = res.json()["data"]["session_key"]
    assert key


@pytest.mark.django_db
def test_compare_flow_anon(api_client):
    boot = api_client.post("/api/v1/compare/bootstrap/")
    key = boot.json()["data"]["session_key"]
    r = api_client.get("/api/v1/compare/", HTTP_X_COMPARE_SESSION=key)
    assert r.status_code == 200
    assert r.json()["data"]["listing_ids"] == []
