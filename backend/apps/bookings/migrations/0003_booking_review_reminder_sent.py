from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0002_booking_guest_details"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="review_reminder_sent",
            field=models.BooleanField(
                default=False,
                help_text="Czy wysłano przypomnienie o ocenie po zakończonym pobycie.",
            ),
        ),
    ]
