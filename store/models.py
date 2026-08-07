import re
from urllib.parse import urlparse

from django.conf import settings
from django.db import models
from django.urls import reverse


class Category(models.Model):
    title = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    image = models.FileField(upload_to='categories/', blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('title',)
        verbose_name = 'category'
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.title

    @property
    def name(self):
        return self.title

    def get_absolute_url(self):
        return f"{reverse('store:product_list')}?category={self.slug}"


class Product(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='products',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products',
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)
    description = models.TextField()
    specs = models.JSONField(default=dict, blank=True)
    image = models.FileField(upload_to='products/', blank=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'product'
        verbose_name_plural = 'products'
        indexes = [
            models.Index(fields=('slug',)),
            models.Index(fields=('is_available', '-created_at')),
        ]

    def __str__(self):
        return self.name

    @property
    def title(self):
        return self.name

    @property
    def stock(self):
        return self.stock_quantity

    @property
    def is_active(self):
        return self.is_available

    def get_absolute_url(self):
        return reverse('store:product_detail', kwargs={'slug': self.slug})

    @property
    def has_valid_image(self):
        try:
            return bool(self.image) and self.image.storage.exists(self.image.name)
        except Exception:
            return False

    @property
    def image_url(self):
        return self.image.url if self.has_valid_image else None


class Cart(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='carts',
        null=True,
        blank=True,
    )
    session_key = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'cart'
        verbose_name_plural = 'carts'

    def __str__(self):
        identifier = self.user.username if self.user else self.session_key or 'guest'
        return f'Cart {identifier}'


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ('cart', 'product')
        unique_together = (('cart', 'product'),)
        verbose_name = 'cart item'
        verbose_name_plural = 'cart items'

    def __str__(self):
        return f'{self.product} x {self.quantity}'


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        PAID = 'paid', 'Paid'
        SHIPPED = 'shipped', 'Shipped'
        COMPLETED = 'completed', 'Completed'
        CANCELED = 'canceled', 'Canceled'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'order'
        verbose_name_plural = 'orders'

    def __str__(self):
        return f'Order #{self.pk}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ('order', 'product')
        verbose_name = 'order item'
        verbose_name_plural = 'order items'

    def __str__(self):
        return f'{self.product} x {self.quantity}'


class GameScore(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='game_scores',
    )
    score_points = models.PositiveIntegerField(default=0)
    promo_code_issued = models.ForeignKey(
        'PromoCode',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='game_scores',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-score_points', '-created_at')
        verbose_name = 'game score'
        verbose_name_plural = 'game scores'

    def __str__(self):
        return f'{self.user.username}: {self.score_points}'


class PromoCode(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.PositiveSmallIntegerField()
    is_used = models.BooleanField(default=False)
    valid_until = models.DateTimeField()

    class Meta:
        ordering = ('-valid_until', 'code')
        verbose_name = 'promo code'
        verbose_name_plural = 'promo codes'

    def __str__(self):
        return self.code
