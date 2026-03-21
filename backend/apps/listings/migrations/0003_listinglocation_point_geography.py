import django.contrib.gis.db.models.fields
from django.contrib.postgres.indexes import GistIndex
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0002_listingimage"),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name="listinglocation",
            name="listings_li_point_345b0a_gist",
        ),
        migrations.AlterField(
            model_name="listinglocation",
            name="point",
            field=django.contrib.gis.db.models.fields.PointField(
                geography=True, srid=4326
            ),
        ),
        migrations.AddIndex(
            model_name="listinglocation",
            index=GistIndex(fields=["point"], name="listings_li_point_345b0a_gist"),
        ),
    ]
