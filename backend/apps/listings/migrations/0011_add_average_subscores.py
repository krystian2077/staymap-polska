# Generated manually for average_subscores cache

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0010_listing_guests_pricing_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="average_subscores",
            field=models.JSONField(
                blank=True,
                help_text='Cache: {"cleanliness":4.8,"location":4.9,"communication":4.7,"accuracy":4.8}',
                null=True,
            ),
        ),
    ]
