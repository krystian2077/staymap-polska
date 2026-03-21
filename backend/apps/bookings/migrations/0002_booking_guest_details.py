from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0001_etap3_booking_pricing"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="adults",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="booking",
            name="children",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="booking",
            name="special_requests",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="cancellation_policy_snapshot",
            field=models.CharField(blank=True, max_length=32),
        ),
    ]
