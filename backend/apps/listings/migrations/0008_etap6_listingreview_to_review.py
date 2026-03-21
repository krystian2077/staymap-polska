# Generated manually — kopiowanie ListingReview → reviews.Review przed usunięciem starego modelu.

from django.db import migrations


def copy_listing_reviews_to_stay_reviews(apps, schema_editor):
    ListingReview = apps.get_model("listings", "ListingReview")
    Review = apps.get_model("reviews", "Review")
    for lr in ListingReview.objects.all():
        Review.objects.create(
            id=lr.id,
            listing_id=lr.listing_id,
            booking=None,
            author_id=lr.author_id,
            reviewer_role="guest",
            author_display_first=lr.author_display_first,
            author_display_last=lr.author_display_last,
            overall_rating=lr.overall_rating,
            title=lr.title,
            content=lr.content,
            subscores=lr.subscores,
            blind_release_at=None,
            is_public=True,
            is_blind_review_released=True,
            host_response="",
            created_at=lr.created_at,
            updated_at=lr.updated_at,
            deleted_at=lr.deleted_at,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0007_etap6"),
        ("reviews", "0001_etap6"),
    ]

    operations = [
        migrations.RunPython(copy_listing_reviews_to_stay_reviews, migrations.RunPython.noop),
        migrations.DeleteModel(name="ListingReview"),
    ]
