from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    ROLE_USER = 'user'
    ROLE_MANAGER = 'manager'
    ROLE_CHOICES = (
        (ROLE_USER, 'Користувач'),
        (ROLE_MANAGER, 'Менеджер'),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default=ROLE_USER,
    )
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    bonus_balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
    )

    class Meta:
        ordering = ('user__username',)
        verbose_name = 'user profile'
        verbose_name_plural = 'user profiles'

    def __str__(self):
        return f'Profile for {self.user.username}'
