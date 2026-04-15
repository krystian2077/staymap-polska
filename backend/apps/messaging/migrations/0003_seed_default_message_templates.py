from django.db import migrations

from apps.messaging.default_templates import DEFAULT_HOST_MESSAGE_TEMPLATES


def seed_defaults(apps, schema_editor):
    HostProfile = apps.get_model("host", "HostProfile")
    MessageTemplate = apps.get_model("messaging", "MessageTemplate")

    for host in HostProfile.objects.all():
        if MessageTemplate.objects.filter(host=host, deleted_at__isnull=True).exists():
            continue
        MessageTemplate.objects.bulk_create(
            [
                MessageTemplate(
                    host=host,
                    title=item["title"],
                    body=item["body"],
                    sort_order=item["sort_order"],
                )
                for item in DEFAULT_HOST_MESSAGE_TEMPLATES
            ]
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0002_message_template"),
    ]

    operations = [
        migrations.RunPython(seed_defaults, noop_reverse),
    ]
