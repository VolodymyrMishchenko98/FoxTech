from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_userprofile_role'),
    ]

    operations = [
        migrations.DeleteModel(
            name='PromoCode',
        ),
    ]
