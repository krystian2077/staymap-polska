from django.contrib.gis.measure import Distance as DistanceMeasure
from rest_framework import serializers

from apps.listings.serializers import ListingListSerializer


class ListingSearchSerializer(ListingListSerializer):
    distance_km = serializers.SerializerMethodField()

    class Meta(ListingListSerializer.Meta):
        fields = ListingListSerializer.Meta.fields + ("distance_km",)

    def get_distance_km(self, obj):
        d = getattr(obj, "distance", None)
        if d is None:
            return None
        if isinstance(d, DistanceMeasure):
            return round(d.km, 3)
        try:
            return round(float(d) / 1000.0, 3)
        except (TypeError, ValueError):
            return None
