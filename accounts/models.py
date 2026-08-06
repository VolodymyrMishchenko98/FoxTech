from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
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
