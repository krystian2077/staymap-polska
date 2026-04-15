from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0011_add_average_subscores"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="apply_pl_travel_peak_extras",
            field=models.BooleanField(
                default=True,
                help_text="Typowe polskie długie weekendy, mosty, Wigilia, Wielki Piątek itd. (poza świętami GUS). Wyłącz, jeśli chcesz tylko święta ustawowe + własne reguły cenowe.",
            ),
        ),
    ]
