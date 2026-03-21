"""Testy PATCH /api/v1/profile/ — imię, nazwisko, bio, avatar."""

from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.users.models import UserProfile


@pytest.mark.django_db
def test_profile_patch_updates_names(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    res = api_client.patch(
        "/api/v1/profile/",
        {"first_name": "Zdzisław", "last_name": "Gospodarz"},
        format="json",
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["first_name"] == "Zdzisław"
    assert data["last_name"] == "Gospodarz"
    user_host.refresh_from_db()
    assert user_host.first_name == "Zdzisław"


@pytest.mark.django_db
def test_profile_patch_updates_bio(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    res = api_client.patch(
        "/api/v1/profile/",
        {"bio": "Pozdrawiam z Beskidu — witają wszystkich gości."},
        format="json",
    )
    assert res.status_code == 200
    assert res.json()["data"]["bio"] == "Pozdrawiam z Beskidu — witają wszystkich gości."
    prof = UserProfile.objects.get(user=user_host)
    assert "Beskidu" in prof.bio


@pytest.mark.django_db
def test_profile_get_includes_bio_and_avatar_keys(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/profile/")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "bio" in data
    assert "avatar_url" in data


@pytest.mark.django_db
def test_profile_patch_upload_avatar(api_client, user_host):
    buf = BytesIO()
    Image.new("RGB", (32, 32), color=(20, 120, 60)).save(buf, format="JPEG")
    buf.seek(0)
    upload = SimpleUploadedFile("avatar.jpg", buf.read(), content_type="image/jpeg")

    api_client.force_authenticate(user=user_host)
    res = api_client.patch(
        "/api/v1/profile/",
        {"avatar": upload},
        format="multipart",
    )
    assert res.status_code == 200
    url = res.json()["data"].get("avatar_url")
    assert url
    assert url.startswith("http") or url.startswith("/")
    prof = UserProfile.objects.get(user=user_host)
    assert prof.avatar
