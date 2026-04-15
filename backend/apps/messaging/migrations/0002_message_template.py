import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("host", "0003_etap3_host_profile"),
        ("messaging", "0001_etap6"),
    ]

    operations = [
        migrations.CreateModel(
            name="MessageTemplate",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("title", models.CharField(max_length=100)),
                (
                    "body",
                    models.TextField(help_text="Możesz użyć {{guest_name}} i {{listing_title}}."),
                ),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "host",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="message_templates",
                        to="host.hostprofile",
                    ),
                ),
            ],
            options={
                "verbose_name": "Szablon wiadomości",
                "verbose_name_plural": "Szablony wiadomości",
                "ordering": ["sort_order", "created_at"],
            },
        ),
    ]
