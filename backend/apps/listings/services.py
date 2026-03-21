from django.contrib.gis.geos import Point
from django.db import transaction

from apps.host.models import HostProfile
from apps.listings.models import Listing, ListingLocation


class ListingService:
    @staticmethod
    @transaction.atomic
    def create_listing(user, *, listing_data: dict, location_data: dict) -> Listing:
        profile, _ = HostProfile.objects.get_or_create(user=user)
        if not user.is_host:
            user.is_host = True
            user.save(update_fields=["is_host", "updated_at"])

        lat = location_data["lat"]
        lng = location_data["lng"]
        point = Point(float(lng), float(lat), srid=4326)

        listing = Listing.objects.create(host=profile, **listing_data)
        ListingLocation.objects.create(
            listing=listing,
            point=point,
            city=location_data.get("city", ""),
            region=location_data.get("region", ""),
            country=location_data.get("country", "PL"),
        )
        return listing

    @staticmethod
    @transaction.atomic
    def update_listing(listing: Listing, *, listing_data: dict | None, location_data: dict | None) -> Listing:
        if listing_data:
            for k, v in listing_data.items():
                setattr(listing, k, v)
            listing.save()
        if location_data and hasattr(listing, "location"):
            loc = listing.location
            if "lat" in location_data and "lng" in location_data:
                loc.point = Point(
                    float(location_data["lng"]),
                    float(location_data["lat"]),
                    srid=4326,
                )
            if "city" in location_data:
                loc.city = location_data["city"]
            if "region" in location_data:
                loc.region = location_data["region"]
            if "country" in location_data:
                loc.country = location_data["country"]
            loc.save()
        elif location_data and not hasattr(listing, "location"):
            lat = location_data["lat"]
            lng = location_data["lng"]
            ListingLocation.objects.create(
                listing=listing,
                point=Point(float(lng), float(lat), srid=4326),
                city=location_data.get("city", ""),
                region=location_data.get("region", ""),
                country=location_data.get("country", "PL"),
            )
        return listing

    @staticmethod
    @transaction.atomic
    def soft_delete_listing(listing: Listing) -> Listing:
        listing.soft_delete()
        return listing
