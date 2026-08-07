from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse


class UserProfileTests(TestCase):
    def test_profile_is_created_with_user(self):
        user = User.objects.create_user(
            username='seller',
            email='seller@example.com',
            password='StrongPass123',
        )

        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.user, user)

    def test_signup_creates_user_and_logs_in(self):
        response = self.client.post(
            reverse('accounts:signup'),
            {
                'username': 'buyer',
                'email': 'buyer@example.com',
                'password1': 'StrongPass123',
                'password2': 'StrongPass123',
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(username='buyer').exists())

    def test_register_view_creates_user_and_profile(self):
        response = self.client.post(
            reverse('accounts:register'),
            {
                'username': 'newuser',
                'email': 'newuser@example.com',
                'first_name': 'New',
                'last_name': 'User',
                'role': 'user',
                'phone': '+380501112233',
                'address': 'Kyiv',
                'password1': 'StrongPass123',
                'password2': 'StrongPass123',
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(username='newuser')
        self.assertTrue(user.is_authenticated)
        self.assertEqual(user.profile.phone, '+380501112233')

    def test_login_view_authenticates_existing_user(self):
        User.objects.create_user(
            username='existing',
            email='existing@example.com',
            password='StrongPass123',
        )

        response = self.client.post(
            reverse('accounts:login'),
            {
                'username': 'existing',
                'password': 'StrongPass123',
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.wsgi_request.user.is_authenticated)
