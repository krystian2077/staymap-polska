from django.shortcuts import get_object_or_404

from apps.listings.models import Listing

from .models import Conversation


def resolve_guest_user(*, listing: Listing, request_user, guest_id=None):
    host_uid = listing.host.user_id
    if request_user.id == host_uid:
        if not guest_id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"guest_id": ["Host musi podać identyfikator gościa."]})
        from apps.users.models import User

        return get_object_or_404(User.objects.filter(deleted_at__isnull=True), pk=guest_id)
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
