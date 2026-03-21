from django.conf import settings
from django.db import models

from apps.common.models import BaseModel


class HostProfile(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="host_profile",
    )

    class Meta:
        verbose_name = "Profil gospodarza"
        verbose_name_plural = "Profile gospodarzy"

    def __str__(self):
        return f"Host: {self.user.get_full_name()} ({self.user.email})"
