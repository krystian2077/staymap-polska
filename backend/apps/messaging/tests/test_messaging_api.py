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


@pytest.mark.django_db
def test_message_history_visible_for_guest_and_host(api_client, user_host, guest_user, approved_listing):
    api_client.force_authenticate(user=guest_user)
    created = api_client.post(
        "/api/v1/conversations/",
        {"listing_id": str(approved_listing.id)},
        format="json",
    )
    assert created.status_code == 200
    cid = created.json()["data"]["id"]

    guest_msg = api_client.post(
        f"/api/v1/conversations/{cid}/messages/",
        {"body": "Dzień dobry, czy parking jest dostępny?"},
        format="json",
    )
    assert guest_msg.status_code == 201

    api_client.force_authenticate(user=user_host)
    host_msg = api_client.post(
        f"/api/v1/conversations/{cid}/messages/",
        {"body": "Tak, parking jest bezpłatny dla gości."},
        format="json",
    )
    assert host_msg.status_code == 201

    host_history = api_client.get(f"/api/v1/conversations/{cid}/messages/")
    assert host_history.status_code == 200
    host_data = host_history.json()["data"]
    assert [row["body"] for row in host_data] == [
        "Dzień dobry, czy parking jest dostępny?",
        "Tak, parking jest bezpłatny dla gości.",
    ]

    api_client.force_authenticate(user=guest_user)
    guest_history = api_client.get(f"/api/v1/conversations/{cid}/messages/")
    assert guest_history.status_code == 200
    guest_data = guest_history.json()["data"]
    assert len(guest_data) == 2
    assert guest_data[0]["sender_id"] == str(guest_user.id)
    assert guest_data[1]["sender_id"] == str(user_host.id)


@pytest.mark.django_db
def test_host_notifications_include_new_message_and_read_state(
    api_client,
    user_host,
    guest_user,
    approved_listing,
):
    api_client.force_authenticate(user=guest_user)
    created = api_client.post(
        "/api/v1/conversations/",
        {"listing_id": str(approved_listing.id)},
        format="json",
    )
    assert created.status_code == 200
    cid = created.json()["data"]["id"]

    sent = api_client.post(
        f"/api/v1/conversations/{cid}/messages/",
        {"body": "Czy mogę przyjechać wcześniej?"},
        format="json",
    )
    assert sent.status_code == 201
    msg_id = sent.json()["data"]["id"]

    api_client.force_authenticate(user=user_host)
    notifications = api_client.get("/api/v1/host/notifications/?limit=20")
    assert notifications.status_code == 200
    rows = notifications.json()["data"]

    message_notification = next((row for row in rows if row["id"] == f"message:{msg_id}"), None)
    assert message_notification is not None
    assert message_notification["type"] == "message.new"
    assert message_notification["is_read"] is False
    assert message_notification["link"] == f"/host/messages?conv={cid}"

    history = api_client.get(f"/api/v1/conversations/{cid}/messages/")
    assert history.status_code == 200

    notifications_after_read = api_client.get("/api/v1/host/notifications/?limit=20")
    assert notifications_after_read.status_code == 200
    rows_after = notifications_after_read.json()["data"]
    message_notification_after = next(
        (row for row in rows_after if row["id"] == f"message:{msg_id}"),
        None,
    )
    assert message_notification_after is not None
    assert message_notification_after["is_read"] is True


@pytest.mark.django_db
def test_new_host_gets_default_message_templates(user_host):
    from apps.host.models import HostProfile
    from apps.messaging.models import MessageTemplate

    profile = HostProfile.objects.get(user=user_host)
    rows = MessageTemplate.objects.filter(host=profile, deleted_at__isnull=True)
    assert rows.count() == 6
    titles = set(rows.values_list("title", flat=True))
    assert titles == {
        "Powitanie",
        "Szczegóły pobytu",
        "Dojazd i zameldowanie",
        "Zasady pobytu",
        "Podziękowanie i recenzja",
        "Brak terminu",
    }


@pytest.mark.django_db
def test_host_message_templates_list(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/host/message-templates/")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 6
    assert data[0]["title"] == "Powitanie"
    assert "{{guest_name}}" in data[0]["body"]
    assert "{{listing_title}}" in data[0]["body"]


@pytest.mark.django_db
def test_list_repairs_empty_templates_via_ensure(api_client, user_host):
    """Gdy gospodarz nie ma aktywnych szablonów (np. usunięte lub stara baza), GET zasiewa zestaw."""
    from apps.host.models import HostProfile
    from apps.messaging.models import MessageTemplate

    profile = HostProfile.objects.get(user=user_host)
    for t in MessageTemplate.objects.filter(host=profile, deleted_at__isnull=True):
        t.soft_delete()

    api_client.force_authenticate(user=user_host)
    res = api_client.get("/api/v1/host/message-templates/")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 6
    assert data[0]["title"] == "Powitanie"


@pytest.mark.django_db
def test_host_message_template_patch(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    list_res = api_client.get("/api/v1/host/message-templates/")
    assert list_res.status_code == 200
    tid = list_res.json()["data"][0]["id"]
    patch = api_client.patch(
        f"/api/v1/host/message-templates/{tid}/",
        {"title": "Powitanie (test)", "body": "Zmieniona treść {{guest_name}} w {{listing_title}}."},
        format="json",
    )
    assert patch.status_code == 200
    body = patch.json()["data"]
    assert body["title"] == "Powitanie (test)"
    assert body["body"] == "Zmieniona treść {{guest_name}} w {{listing_title}}."


@pytest.mark.django_db
def test_ensure_default_message_templates_idempotent(user_host):
    from apps.host.models import HostProfile
    from apps.messaging.models import MessageTemplate
    from apps.messaging.template_seeding import ensure_default_message_templates

    profile = HostProfile.objects.get(user=user_host)
    assert MessageTemplate.objects.filter(host=profile, deleted_at__isnull=True).count() == 6
    assert ensure_default_message_templates(profile) == 0
    assert MessageTemplate.objects.filter(host=profile, deleted_at__isnull=True).count() == 6

