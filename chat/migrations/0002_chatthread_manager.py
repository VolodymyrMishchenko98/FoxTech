from django.conf import settings
from django.db import migrations, models


def backfill_thread_managers(apps, schema_editor):
    ChatThread = apps.get_model('chat', 'ChatThread')
    User = apps.get_model(settings.AUTH_USER_MODEL)
    fallback = (
        User.objects.filter(profile__role='manager').first()
        or User.objects.filter(is_superuser=True).first()
    )
    if fallback is not None:
        ChatThread.objects.filter(manager__isnull=True).update(manager=fallback)


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0001_initial'),
        ('accounts', '0004_userprofile_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatthread',
            name='manager',
            field=models.ForeignKey(
                null=True,
                on_delete=models.CASCADE,
                related_name='chat_threads_as_manager',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(backfill_thread_managers, reverse_backfill),
        migrations.AlterField(
            model_name='chatthread',
            name='manager',
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name='chat_threads_as_manager',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='chatthread',
            name='customer',
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name='chat_threads_as_customer',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterUniqueTogether(
            name='chatthread',
            unique_together={('customer', 'manager')},
        ),
    ]
