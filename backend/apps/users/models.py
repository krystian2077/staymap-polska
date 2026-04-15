import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import BaseModel
from apps.users.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    google_sub = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True)
    is_host = models.BooleanField(default=False, db_index=True)
    is_admin = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()
    all_objects = models.Manager()

    class Meta:
        verbose_name = "Użytkownik"
        verbose_name_plural = "Użytkownicy"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def roles(self):
        r = ["guest"]
        if self.is_host:
            r.append("host")
        if self.is_admin:
            r.append("admin")
        return r


class WishlistItem(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.CASCADE,
        related_name="wishlisted_by",
    )

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["user", "listing"],
                condition=models.Q(deleted_at__isnull=True),
                name="users_wishlist_user_listing_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]


class SavedSearch(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_searches",
    )
    name = models.CharField(max_length=100)
    query_payload = models.JSONField(default=dict, help_text="Parametry wyszukiwania (walidowane)")
    notify_new_listings = models.BooleanField(default=False)

    class Meta:
        ordering = ("-created_at",)

    def clean(self):
        from apps.search.schemas import saved_search_payload_to_json, validate_saved_search_payload

        params, errors = validate_saved_search_payload(self.query_payload or {})
        if errors:
            raise ValidationError({"query_payload": errors})
        self.query_payload = saved_search_payload_to_json(params)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class UserProfile(BaseModel):
    """Profil konta gościa (i wspólny zasób: avatar, bio, preferencje)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_profile",
    )
    bio = models.TextField(blank=True)
    preferred_language = models.CharField(max_length=10, default="pl")
    country = models.CharField(max_length=2, blank=True, help_text="ISO 3166-1 alpha-2")
    avatar = models.ImageField(upload_to="users/profile/%Y/%m/", blank=True, null=True)

    class Meta:
        verbose_name = "Profil użytkownika"
        verbose_name_plural = "Profile użytkowników"

    def __str__(self):
        return f"Profil: {self.user.email}"
