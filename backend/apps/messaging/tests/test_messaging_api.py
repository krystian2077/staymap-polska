import pytest


@pytest.mark.django_db
def test_conversations_require_auth(api_client, approved_listing):
    res = api_client.post(
        "/api/v1/conversations/",
        {"listing_id": str(approved_listing.id)},
        format="json",
    )
    assert res.status_code == 401


@pytest.mark.django_db
def test_guest_opens_conversation(api_client, guest_user, approved_listing):
    api_client.force_authenticate(user=guest_user)
    res = api_client.post(
        "/api/v1/conversations/",
        {"listing_id": str(approved_listing.id)},
        format="json",
    )
    assert res.status_code == 200
    body = res.json()["data"]
    assert body["listing_id"] == str(approved_listing.id)
    assert body["guest_id"] == str(guest_user.id)
    assert body["listing_slug"] == approved_listing.slug
    assert body["guest_first_name"] == guest_user.first_name
    assert body["host_display_name"]
    assert body["unread_count"] == 0
    cid = body["id"]

    msg = api_client.post(
        f"/api/v1/conversations/{cid}/messages/",
        {"body": "Czy jest miejsce na parking?"},
        format="json",
    )
    assert msg.status_code == 201
    assert msg.json()["data"]["body"] == "Czy jest miejsce na parking?"

    hist = api_client.get(f"/api/v1/conversations/{cid}/messages/")
    assert hist.status_code == 200
    assert len(hist.json()["data"]) == 1


@pytest.mark.django_db
def test_summary_counts_unread_for_recipient(api_client, user_host, guest_user, approved_listing):
    from apps.messaging.models import Conversation, Message

    conv = Conversation.objects.create(listing=approved_listing, guest=guest_user)
    Message.objects.create(conversation=conv, sender=guest_user, body="Nowa wiadomość")

    api_client.force_authenticate(user=user_host)
    summary = api_client.get("/api/v1/conversations/summary/")
    assert summary.status_code == 200
    assert summary.json()["data"]["unread_total"] == 1

    # Odczyt historii powinien oznaczyć wiadomość jako przeczytaną po stronie hosta.
    history = api_client.get(f"/api/v1/conversations/{conv.id}/messages/")
    assert history.status_code == 200

    summary_after = api_client.get("/api/v1/conversations/summary/")
    assert summary_after.status_code == 200
    assert summary_after.json()["data"]["unread_total"] == 0


@pytest.mark.django_db
def test_host_opens_thread_with_guest_id(api_client, user_host, guest_user, approved_listing):
    api_client.force_authenticate(user=user_host)
    res = api_client.post(
        "/api/v1/conversations/",
        {"listing_id": str(approved_listing.id), "guest_id": str(guest_user.id)},
        format="json",
    )
    assert res.status_code == 200
    assert res.json()["data"]["guest_id"] == str(guest_user.id)
