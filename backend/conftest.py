import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_host(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        email="host@test.pl",
        password="secret12345",
        first_name="Jan",
        last_name="Host",
    )
    user.is_host = True
    user.save(update_fields=["is_host", "updated_at"])
    return user
