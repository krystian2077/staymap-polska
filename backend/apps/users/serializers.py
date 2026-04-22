from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken

from apps.host.models import HostProfile
from apps.listings.serializers import ListingListSerializer
from apps.users.models import SavedSearch, UserProfile, WishlistItem

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name", "phone_number")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserMeSerializer(serializers.ModelSerializer):
    """Profil: dane w `User` + `UserProfile` (gość); host nadal może mieć HostProfile.bio jako zapas."""

    roles = serializers.ReadOnlyField()
    bio = serializers.CharField(required=False, allow_blank=True, max_length=8000, write_only=True)
    preferred_language = serializers.CharField(required=False, allow_blank=True, max_length=10, write_only=True)
    country = serializers.CharField(required=False, allow_blank=True, max_length=2, write_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "is_host",
            "is_admin",
            "roles",
            "created_at",
            "bio",
            "preferred_language",
            "country",
            "avatar_url",
        )
        read_only_fields = (
            "id",
            "email",
            "is_host",
            "is_admin",
            "roles",
            "created_at",
            "avatar_url",
        )

    def _profile(self, obj):
        prof, _ = UserProfile.objects.get_or_create(user=obj)
        return prof

    def to_representation(self, instance):
        data = super().to_representation(instance)
        prof = self._profile(instance)
        data["bio"] = prof.bio or self._host_bio(instance)
        data["preferred_language"] = prof.preferred_language or "pl"
        data["country"] = prof.country or ""
        return data

    def _host_bio(self, obj):
        try:
            hp = obj.host_profile
        except HostProfile.DoesNotExist:
            return ""
        return hp.bio or ""

    def _host_avatar(self, obj, request):
        try:
            hp = obj.host_profile
        except HostProfile.DoesNotExist:
            return None
        if not hp.avatar_url:
            return None
        return hp.avatar_url

    def _get_clean_url(self, url: str | None) -> str | None:
        if not url:
            return None
        if url.startswith("http"):
            return url
        if not url.startswith("/"):
            url = f"/{url}"
        if not url.startswith("/media/"):
            url = f"/media{url}"
        return url

    def get_avatar_url(self, obj):
        prof = self._profile(obj)
        try:
            if prof.avatar and prof.avatar.name:
                return self._get_clean_url(prof.avatar.url)
        except Exception as e:
            print(f"Error getting avatar URL: {e}")
            pass
        return self._get_clean_url(self._host_avatar(obj, self.context.get("request")))

    def update(self, instance, validated_data):
        empty = serializers.empty
        bio = validated_data.pop("bio", empty)
        preferred_language = validated_data.pop("preferred_language", empty)
        country = validated_data.pop("country", empty)
        user = super().update(instance, validated_data)
        prof = self._profile(user)
        fields: list[str] = []
        if bio is not empty:
            prof.bio = bio
            fields.append("bio")
        if preferred_language is not empty:
            prof.preferred_language = (preferred_language or "pl")[:10]
            fields.append("preferred_language")
        if country is not empty:
            prof.country = (country or "")[:2].upper()
            fields.append("country")
        if fields:
            fields.append("updated_at")
            prof.save(update_fields=fields)
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["is_host"] = bool(user.is_host)
        return token


class GoogleAuthSerializer(serializers.Serializer):
    credential = serializers.CharField()


class StayMapTokenRefreshSerializer(TokenRefreshSerializer):
    """Nowy access token z aktualnym polem is_host (middleware Next.js)."""

    def validate(self, attrs):
        data = super().validate(attrs)
        access = AccessToken(data["access"])
        user = User.objects.get(pk=access["user_id"])
        access["is_host"] = bool(user.is_host)
        data["access"] = str(access)
        return data


class WishlistItemSerializer(serializers.ModelSerializer):
    listing = ListingListSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ("id", "listing", "created_at")
        read_only_fields = fields


class WishlistAddSerializer(serializers.Serializer):
    listing_id = serializers.UUIDField()


class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = ("id", "name", "query_payload", "notify_new_listings", "created_at")
        read_only_fields = fields


class SavedSearchCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    query_payload = serializers.JSONField()
    notify_new_listings = serializers.BooleanField(default=False, required=False)
