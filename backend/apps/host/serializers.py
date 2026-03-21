from rest_framework import serializers

from apps.host.models import HostProfile


class HostOnboardingSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = HostProfile
        fields = ("id", "display_name", "bio", "avatar_url", "is_verified", "response_rate")
        read_only_fields = fields

    def get_display_name(self, obj):
        u = obj.user
        name = f"{u.first_name} {u.last_name}".strip()
        return name or u.email.split("@")[0]
