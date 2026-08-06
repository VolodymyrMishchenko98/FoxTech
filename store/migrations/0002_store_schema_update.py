from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='category',
            options={'ordering': ('title',), 'verbose_name': 'category', 'verbose_name_plural': 'categories'},
        ),
        migrations.RenameField(
            model_name='category',
            old_name='name',
            new_name='title',
        ),
        migrations.AddField(
            model_name='category',
            name='image',
            field=models.FileField(blank=True, upload_to='categories/'),
        ),
        migrations.AddField(
            model_name='category',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AlterModelOptions(
            name='product',
            options={'ordering': ('-created_at',), 'verbose_name': 'product', 'verbose_name_plural': 'products'},
        ),
        migrations.RemoveIndex(
            model_name='product',
            name='store_produ_is_acti_f9905c_idx',
        ),
        migrations.RenameField(
            model_name='product',
            old_name='title',
            new_name='name',
        ),
        migrations.RenameField(
            model_name='product',
            old_name='stock',
            new_name='stock_quantity',
        ),
        migrations.RenameField(
            model_name='product',
            old_name='is_active',
            new_name='is_available',
        ),
        migrations.AlterField(
            model_name='product',
            name='image',
            field=models.FileField(blank=True, upload_to='products/'),
        ),
        migrations.AddField(
            model_name='product',
            name='specs',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['is_available', '-created_at'], name='store_prod_is_avail_idx'),
        ),
        migrations.RemoveField(
            model_name='product',
            name='updated_at',
        ),
        migrations.CreateModel(
            name='Cart',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_key', models.CharField(blank=True, max_length=40)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='carts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-created_at',),
                'verbose_name': 'cart',
                'verbose_name_plural': 'carts',
            },
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('paid', 'Paid'), ('shipped', 'Shipped'), ('completed', 'Completed'), ('canceled', 'Canceled')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=models.CASCADE, related_name='orders', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-created_at',),
                'verbose_name': 'order',
                'verbose_name_plural': 'orders',
            },
        ),
        migrations.CreateModel(
            name='GameScore',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score_points', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=models.CASCADE, related_name='game_scores', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-score_points', '-created_at'),
                'verbose_name': 'game score',
                'verbose_name_plural': 'game scores',
            },
        ),
        migrations.CreateModel(
            name='PromoCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True)),
                ('discount_percent', models.PositiveSmallIntegerField()),
                ('is_used', models.BooleanField(default=False)),
                ('valid_until', models.DateTimeField()),
            ],
            options={
                'ordering': ('-valid_until', 'code'),
                'verbose_name': 'promo code',
                'verbose_name_plural': 'promo codes',
            },
        ),
        migrations.CreateModel(
            name='CartItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('cart', models.ForeignKey(on_delete=models.CASCADE, related_name='items', to='store.cart')),
                ('product', models.ForeignKey(on_delete=models.CASCADE, related_name='cart_items', to='store.product')),
            ],
            options={
                'ordering': ('cart', 'product'),
                'verbose_name': 'cart item',
                'verbose_name_plural': 'cart items',
                'unique_together': {('cart', 'product')},
            },
        ),
        migrations.CreateModel(
            name='OrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('order', models.ForeignKey(on_delete=models.CASCADE, related_name='items', to='store.order')),
                ('product', models.ForeignKey(on_delete=models.PROTECT, related_name='order_items', to='store.product')),
            ],
            options={
                'ordering': ('order', 'product'),
                'verbose_name': 'order item',
                'verbose_name_plural': 'order items',
            },
        ),
    ]
