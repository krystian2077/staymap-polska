from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("host", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="hostprofile",
            name="bio",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="hostprofile",
            name="avatar_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="hostprofile",
            name="is_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="hostprofile",
            name="response_rate",
            field=models.DecimalField(
                decimal_places=3,
                default=0,
                help_text="0–1: odsetek odpowiedzi na zapytania.",
                max_digits=4,
            ),
        ),
    ]
