from django.conf import settings
from django.db import models

from apps.common.models import BaseModel


class HostProfile(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="host_profile",
    )
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)
    is_verified = models.BooleanField(default=False)
    response_rate = models.DecimalField(
        max_digits=4,
        decimal_places=3,
        default=0,
        help_text="0–1: odsetek odpowiedzi na zapytania.",
    )

    class Meta:
        verbose_name = "Profil gospodarza"
        verbose_name_plural = "Profile gospodarzy"

    def __str__(self):
        return f"Host: {self.user.get_full_name()} ({self.user.email})"
