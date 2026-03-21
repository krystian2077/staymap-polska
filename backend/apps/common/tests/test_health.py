import pytest
from django.test import Client


@pytest.mark.django_db(databases=["default"])
def test_health_live():
    client = Client()
    response = client.get("/api/v1/health/live/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
