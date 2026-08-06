from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import Category, Product


class ProductViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='seller',
            password='StrongPass123',
        )
        self.category = Category.objects.create(
            title='Laptops',
            slug='laptops',
        )
        self.product = Product.objects.create(
            owner=self.user,
            category=self.category,
            name='ThinkPad T14',
            slug='thinkpad-t14',
            description='Business laptop in good condition.',
            price='28000.00',
            stock_quantity=1,
        )

    def test_product_list_displays_active_product(self):
        response = self.client.get(reverse('store:product_list'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.product.name)

    def test_product_detail_displays_product(self):
        response = self.client.get(self.product.get_absolute_url())

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.product.name)

    def test_product_without_image_shows_placeholder(self):
        self.product.image = None
        self.product.save(update_fields=['image'])

        response = self.client.get(self.product.get_absolute_url())
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Зображення не додане')
