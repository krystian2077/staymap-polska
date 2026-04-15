from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_userprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="google_sub",
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True, unique=True),
        ),
    ]
