from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.host.models import HostProfile

from .template_seeding import ensure_default_message_templates


@receiver(post_save, sender=HostProfile)
def create_default_message_templates_for_new_host(
    sender,
    instance: HostProfile,
    created: bool,
    **kwargs,
):
    if created:
        ensure_default_message_templates(instance)
