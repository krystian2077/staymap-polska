from django.shortcuts import get_object_or_404

from apps.listings.models import Listing

from .models import Conversation


def resolve_guest_user(*, listing: Listing, request_user, guest_id=None):
    from rest_framework.exceptions import PermissionDenied, ValidationError

    host_uid = listing.host.user_id
    if request_user.id == host_uid:
        if not guest_id:
            raise ValidationError({"guest_id": ["Host musi podać identyfikator gościa."]})
        from apps.users.models import User

        guest = get_object_or_404(User.objects.filter(deleted_at__isnull=True), pk=guest_id)
        if guest.id == host_uid:
            raise ValidationError({"guest_id": ["Nie można utworzyć rozmowy z samym sobą."]})
        return guest

    if listing.status != Listing.Status.APPROVED:
        raise PermissionDenied("Nie można wysłać wiadomości dla nieaktywnej oferty.")

    return request_user


def get_or_create_conversation(listing: Listing, guest) -> tuple[Conversation, bool]:
    return Conversation.objects.get_or_create(
        listing=listing,
        guest=guest,
        defaults={},
    )


def assert_conversation_member(conversation: Conversation, user) -> None:
    from rest_framework.exceptions import PermissionDenied

    host_uid = conversation.listing.host.user_id
    if user.id not in (host_uid, conversation.guest_id):
        raise PermissionDenied()
