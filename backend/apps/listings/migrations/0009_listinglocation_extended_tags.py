from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0008_etap6_listingreview_to_review"),
    ]

    operations = [
        migrations.AddField(
            model_name="listinglocation",
            name="beach_access",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="cycling_routes_nearby",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="historic_center_nearby",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="near_protected_area",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="near_river",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="quiet_rural",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="ski_slopes_nearby",
            field=models.BooleanField(default=False),
        ),
    ]
