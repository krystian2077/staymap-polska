import pytest
from django.test import Client


@pytest.mark.django_db(databases=["default"])
def test_health_live():
    client = Client()
    response = client.get("/api/v1/health/live/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.django_db(databases=["default"])
def test_health_ready():
    client = Client()
    response = client.get("/api/v1/health/ready/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "checks" in data
    assert data["checks"]["database"]["status"] == "ok"
    assert data["checks"]["redis"]["status"] == "ok"
