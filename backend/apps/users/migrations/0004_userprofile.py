import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def forwards_userprofile(apps, schema_editor):
    User = apps.get_model("users", "User")
    UserProfile = apps.get_model("users", "UserProfile")
    for u in User.objects.all():
        UserProfile.objects.get_or_create(user=u)


def backwards_userprofile(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_rename_users_wishlist_user_created_idx_users_wishl_user_id_4d9d99_idx"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("bio", models.TextField(blank=True)),
                ("preferred_language", models.CharField(default="pl", max_length=10)),
                ("country", models.CharField(blank=True, help_text="ISO 3166-1 alpha-2", max_length=2)),
                (
                    "avatar",
                    models.ImageField(blank=True, null=True, upload_to="users/profile/%Y/%m/"),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Profil użytkownika",
                "verbose_name_plural": "Profile użytkowników",
            },
        ),
        migrations.RunPython(forwards_userprofile, backwards_userprofile),
    ]
