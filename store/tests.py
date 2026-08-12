from django.contrib.auth.models import User
from django.test import TestCase, TransactionTestCase
from django.urls import reverse

from .models import Cart, CartItem, Category, Order, Product


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
        self.assertContains(response, 'Image not added')


class CheckoutViewTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer',
            password='StrongPass123',
        )
        self.category = Category.objects.create(
            title='Phones',
            slug='phones',
        )
        self.product = Product.objects.create(
            owner=self.user,
            category=self.category,
            name='Pixel 9',
            slug='pixel-9',
            description='New phone.',
            price='32000.00',
            stock_quantity=1,
        )
        self.user.profile.address = 'Kyiv, Khreshchatyk 1'
        self.user.profile.save(update_fields=['address'])
        self.cart = Cart.objects.create(user=self.user, session_key='')
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)
        self.client.force_login(self.user)

    def test_checkout_requires_shipping_address(self):
        self.user.profile.address = ''
        self.user.profile.save(update_fields=['address'])

        response = self.client.post(reverse('store:checkout'), HTTP_ACCEPT='application/json')

        self.assertEqual(response.status_code, 400)

    def test_second_checkout_gets_conflict_after_stock_is_depleted(self):
        first_response = self.client.post(reverse('store:checkout'))

        self.assertEqual(first_response.status_code, 302)
        self.assertEqual(Order.objects.count(), 1)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 0)

        CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)
        second_response = self.client.post(
            reverse('store:checkout'),
            HTTP_ACCEPT='application/json',
        )

        self.assertEqual(second_response.status_code, 409)
        self.assertEqual(Order.objects.count(), 1)
        self.assertIn('Недостатньо товару', second_response.json()['error'])
