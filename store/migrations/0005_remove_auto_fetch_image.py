from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0004_gamescore_promo_code_issued'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE store_product DROP COLUMN auto_fetch_image',
            reverse_sql='ALTER TABLE store_product ADD COLUMN auto_fetch_image bool NOT NULL DEFAULT 0',
        ),
    ]
