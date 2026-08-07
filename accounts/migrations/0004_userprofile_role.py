from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_promocode'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[('user', 'Користувач'), ('manager', 'Менеджер')],
                default='user',
                max_length=10,
            ),
        ),
    ]
