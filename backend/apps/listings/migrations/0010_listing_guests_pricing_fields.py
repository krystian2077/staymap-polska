from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0009_listinglocation_extended_tags"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="guests_included",
            field=models.PositiveSmallIntegerField(
                default=2,
                help_text="Liczba gości wliczona w cenę bazową.",
            ),
        ),
        migrations.AddField(
            model_name="listing",
            name="extra_guest_fee",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="Dodatkowa opłata za każdego gościa powyżej guests_included (za noc).",
                max_digits=10,
            ),
        ),
    ]

