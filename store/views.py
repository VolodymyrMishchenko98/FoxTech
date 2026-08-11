import json
import secrets
from datetime import timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.urls import reverse_lazy
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.generic import (
    CreateView,
    DeleteView,
    DetailView,
    ListView,
    UpdateView,
)

from .forms import ProductForm
from .models import Cart, CartItem, Category, GameScore, Product, PromoCode


_CATEGORIES_CACHE_KEY = 'store:all_categories'
_CATEGORIES_CACHE_TTL = 3600
GAME_PROMO_THRESHOLD = 150
GAME_MAX_POINTS_PER_SECOND = 25
GAME_DURATION_LIMIT_MS = 120000
GAME_REPLAY_TOKEN_TTL = 86400
GAME_RATE_LIMIT_SECONDS = 10
GAME_PROMO_VALID_DAYS = 30


def _get_all_categories():
    categories = cache.get(_CATEGORIES_CACHE_KEY)
    if categories is None:
        categories = list(Category.objects.all().only('id', 'title', 'slug'))
        cache.set(_CATEGORIES_CACHE_KEY, categories, _CATEGORIES_CACHE_TTL)
    return categories


def index_view(request):
    latest_products = (
        Product.objects.filter(is_available=True)
        .select_related('category')
        .order_by('-created_at')[:8]
    )
    return render(
        request,
        'store/index.html',
        {
            'categories': _get_all_categories(),
            'latest_products': latest_products,
        },
    )


def catalog_view(request):
    queryset = (
        Product.objects.filter(is_available=True)
        .select_related('category')
        .order_by('-created_at')
    )

    query = request.GET.get('q', '').strip()
    category_slug = request.GET.get('category', '').strip()
    sort = request.GET.get('sort', '')

    if query:
        queryset = queryset.filter(
            Q(name__icontains=query) | Q(description__icontains=query),
        )

    if category_slug:
        queryset = queryset.filter(category__slug=category_slug)

    if sort == 'price_asc':
        queryset = queryset.order_by('price')
    elif sort == 'price_desc':
        queryset = queryset.order_by('-price')

    return render(
        request,
        'store/catalog.html',
        {
            'products': queryset,
            'categories': _get_all_categories(),
            'selected_category': category_slug,
            'search_query': query,
            'sort': sort,
        },
    )


def product_detail_view(request, slug):
    product = get_object_or_404(
        Product.objects.select_related('category'),
        slug=slug,
    )
    return render(
        request,
        'store/product_detail.html',
        {
            'product': product,
            'specs': product.specs or {},
        },
    )


class ProductListView(ListView):
    model = Product
    template_name = 'store/catalog.html'
    context_object_name = 'products'
    paginate_by = 12

    def get_queryset(self):
        queryset = (
            Product.objects
            .filter(is_available=True)
            .select_related('category', 'owner')
        )
        query = self.request.GET.get('q')
        category_slug = self.request.GET.get('category')

        if query:
            queryset = queryset.filter(
                Q(name__icontains=query) | Q(description__icontains=query),
            )

        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['categories'] = _get_all_categories()
        context['selected_category'] = self.request.GET.get('category', '')
        context['search_query'] = self.request.GET.get('q', '')
        context['sort'] = self.request.GET.get('sort', '')
        return context


class ProductDetailView(DetailView):
    model = Product
    template_name = 'store/product_detail.html'
    context_object_name = 'product'

    def get_queryset(self):
        return Product.objects.select_related('category', 'owner')


class ProductOwnerMixin(LoginRequiredMixin, UserPassesTestMixin):
    model = Product

    def test_func(self):
        product = self.get_object()
        return product.owner == self.request.user


class ProductCreateView(LoginRequiredMixin, CreateView):
    model = Product
    form_class = ProductForm
    template_name = 'store/product_form.html'
    success_url = reverse_lazy('store:product_list')

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated or getattr(request.user.profile, 'role', 'user') != 'manager':
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        form.instance.owner = self.request.user
        messages.success(self.request, 'Товар створено.')
        return super().form_valid(form)


class ProductUpdateView(ProductOwnerMixin, UpdateView):
    form_class = ProductForm
    template_name = 'store/product_form.html'

    def form_valid(self, form):
        messages.success(self.request, 'Product updated successfully.')
        return super().form_valid(form)


_CART_PROMO_SESSION_KEY = 'cart_promo_code_id'


def _get_cart(request):
    if request.user.is_authenticated:
        cart = Cart.objects.filter(user=request.user).first()
        if not cart:
            cart = Cart.objects.create(user=request.user, session_key='')
    else:
        if not request.session.session_key:
            request.session.save()
        cart = Cart.objects.filter(session_key=request.session.session_key, user=None).first()
        if not cart:
            cart = Cart.objects.create(session_key=request.session.session_key, user=None)
    return cart


def _cart_totals(cart, discount_percent=0):
    items = list(cart.items.select_related('product'))
    total = sum(item.product.price * item.quantity for item in items)
    if discount_percent > 0:
        total = total * (100 - discount_percent) / 100
    return items, total


def _get_discount_percent(request):
    promo_code_id = request.session.get(_CART_PROMO_SESSION_KEY)
    if not promo_code_id:
        return 0
    try:
        promo = PromoCode.objects.get(pk=promo_code_id, is_used=False, valid_until__gt=timezone.now())
        return promo.discount_percent
    except PromoCode.DoesNotExist:
        request.session.pop(_CART_PROMO_SESSION_KEY, None)
        return 0


@require_POST
def cart_add(request, product_id):
    product = get_object_or_404(Product, pk=product_id)

    if not product.is_available:
        return JsonResponse({'error': 'Товар недоступний для замовлення'}, status=409)

    if product.stock_quantity <= 0:
        return JsonResponse({'error': 'Товар відсутній на складі'}, status=409)

    cart = _get_cart(request)
    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        defaults={'quantity': 0},
    )

    new_quantity = cart_item.quantity + 1
    if new_quantity > product.stock_quantity:
        return JsonResponse({'error': 'Недостатня кількість товару на складі'}, status=409)

    cart_item.quantity = new_quantity
    cart_item.save()

    discount_percent = _get_discount_percent(request)
    _, total = _cart_totals(cart, discount_percent=discount_percent)

    return JsonResponse({
        'success': True,
        'item_id': cart_item.id,
        'quantity': cart_item.quantity,
        'subtotal': str(cart_item.product.price * cart_item.quantity),
        'total': str(total),
        'count': cart.items.count(),
        'discount_percent': discount_percent,
    })


@require_POST
def cart_update(request, item_id):
    cart = _get_cart(request)
    cart_item = get_object_or_404(CartItem, pk=item_id, cart=cart)

    quantity = request.POST.get('quantity', '1')
    try:
        quantity = int(quantity)
    except ValueError:
        return JsonResponse({'error': 'Невірна кількість'}, status=400)

    if quantity < 0:
        return JsonResponse({'error': 'Кількість не може бути від’ємною'}, status=400)

    if quantity == 0:
        cart_item.delete()
        discount_percent = _get_discount_percent(request)
        _, total = _cart_totals(cart, discount_percent=discount_percent)
        return JsonResponse({
            'success': True,
            'removed': True,
            'total': str(total),
            'count': cart.items.count(),
            'discount_percent': discount_percent,
        })

    if quantity > cart_item.product.stock_quantity:
        return JsonResponse({'error': 'Недостатня кількість товару на складі'}, status=409)

    cart_item.quantity = quantity
    cart_item.save()

    discount_percent = _get_discount_percent(request)
    _, total = _cart_totals(cart, discount_percent=discount_percent)

    return JsonResponse({
        'success': True,
        'quantity': cart_item.quantity,
        'subtotal': str(cart_item.product.price * cart_item.quantity),
        'total': str(total),
        'count': cart.items.count(),
        'discount_percent': discount_percent,
    })


@require_POST
def cart_remove(request, item_id):
    cart = _get_cart(request)
    cart_item = get_object_or_404(CartItem, pk=item_id, cart=cart)
    cart_item.delete()

    discount_percent = _get_discount_percent(request)
    _, total = _cart_totals(cart, discount_percent=discount_percent)

    return JsonResponse({
        'success': True,
        'total': str(total),
        'count': cart.items.count(),
        'discount_percent': discount_percent,
    })


def cart_detail(request):
    cart = _get_cart(request)
    promo_code_id = request.session.get(_CART_PROMO_SESSION_KEY)
    discount_percent = 0
    promo_code = None
    if promo_code_id:
        try:
            promo_code = PromoCode.objects.get(pk=promo_code_id, is_used=False, valid_until__gt=timezone.now())
            discount_percent = promo_code.discount_percent
        except PromoCode.DoesNotExist:
            request.session.pop(_CART_PROMO_SESSION_KEY, None)
            promo_code_id = None

    items, total = _cart_totals(cart, discount_percent=discount_percent)

    serialized = [
        {
            'id': item.id,
            'product_id': item.product.id,
            'product_name': item.product.name,
            'price': str(item.product.price),
            'quantity': item.quantity,
            'subtotal': str(item.product.price * item.quantity),
            'stock_quantity': item.product.stock_quantity,
            'is_available': item.product.is_available,
        }
        for item in items
    ]

    return JsonResponse({
        'items': serialized,
        'total': str(total),
        'count': cart.items.count(),
        'discount_percent': discount_percent,
        'promo_code': promo_code.code if promo_code else None,
        'promo_code_id': promo_code_id,
    })


@require_POST
def apply_promo_code(request):
    try:
        data = json.loads(request.body)
        code = (data.get('code') or '').strip()
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({'error': 'Невірний формат даних'}, status=400)

    if not code:
        return JsonResponse({'error': 'Введіть промокод'}, status=400)

    promo = PromoCode.objects.filter(code=code).first()
    if not promo:
        return JsonResponse({'error': 'Промокод не знайдено'}, status=404)

    if promo.is_used:
        return JsonResponse({'error': 'Промокод вже використано'}, status=400)

    if promo.valid_until <= timezone.now():
        return JsonResponse({'error': 'Термін дії промокоду закінчився'}, status=400)

    request.session[_CART_PROMO_SESSION_KEY] = promo.id

    cart = _get_cart(request)
    _, total = _cart_totals(cart, discount_percent=promo.discount_percent)

    return JsonResponse({
        'success': True,
        'promo_code': promo.code,
        'discount_percent': promo.discount_percent,
        'total': str(total),
        'count': cart.items.count(),
    })


@require_POST
def remove_promo_code(request):
    request.session.pop(_CART_PROMO_SESSION_KEY, None)

    cart = _get_cart(request)
    _, total = _cart_totals(cart)

    return JsonResponse({
        'success': True,
        'total': str(total),
        'count': cart.items.count(),
    })


def cart_view(request):
    return render(request, 'store/cart.html')


def game_view(request):
    return render(request, 'store/game.html')


def _game_score_limit(duration_ms):
    return int((duration_ms / 1000.0) * GAME_MAX_POINTS_PER_SECOND) + 10


def _generate_unique_promo_code():
    while True:
        code = secrets.token_hex(4).upper()
        if not PromoCode.objects.filter(code=code).exists():
            return code


def _promo_discount_for_score(score_points):
    if score_points >= 600:
        return 25
    if score_points >= 400:
        return 20
    if score_points >= GAME_PROMO_THRESHOLD * 2:
        return 15
    return 10


@login_required
@require_POST
def submit_game_score(request):
    try:
        payload = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Некоректний JSON'}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({'error': 'Некоректний JSON'}, status=400)

    raw_score = payload.get('score', 0)
    client_token = str(payload.get('client_token', '')).strip()
    raw_duration = payload.get('duration_ms', 0)

    try:
        score = max(0, int(raw_score))
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Некоректний рахунок'}, status=400)

    try:
        duration_ms = int(raw_duration)
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Некоректна довжина раунду'}, status=400)

    if not client_token:
        return JsonResponse({'error': 'Відсутній client_token'}, status=400)

    if duration_ms <= 0 or duration_ms > GAME_DURATION_LIMIT_MS:
        return JsonResponse({'error': 'Непідходяща довжина раунду'}, status=422)

    score_limit = _game_score_limit(duration_ms)
    if score > score_limit:
        return JsonResponse(
            {
                'error': 'Підозрілий результат',
                'details': {
                    'score_limit': score_limit,
                    'duration_ms': duration_ms,
                },
            },
            status=422,
        )

    token_cache_key = f'game-score-token:{client_token}'
    if not cache.add(token_cache_key, request.user.pk, GAME_REPLAY_TOKEN_TTL):
        return JsonResponse({'error': 'Цей client_token уже використовувався'}, status=409)

    last_score = (
        GameScore.objects
        .filter(user=request.user)
        .order_by('-created_at')
        .only('created_at')
        .first()
    )
    if last_score is not None:
        elapsed = (timezone.now() - last_score.created_at).total_seconds()
        if elapsed < GAME_RATE_LIMIT_SECONDS:
            cache.delete(token_cache_key)
            return JsonResponse({'error': 'Занадто часто'}, status=429)

    promo_code_obj = None
    with transaction.atomic():
        if score >= GAME_PROMO_THRESHOLD:
            promo_code_obj = PromoCode.objects.create(
                code=_generate_unique_promo_code(),
                discount_percent=_promo_discount_for_score(score),
                valid_until=timezone.now() + timedelta(days=GAME_PROMO_VALID_DAYS),
            )

        GameScore.objects.create(
            user=request.user,
            score_points=score,
            promo_code_issued=promo_code_obj,
        )

    return JsonResponse({
        'score_saved': True,
        'score': score,
        'client_token': client_token,
        'promo_code': promo_code_obj.code if promo_code_obj else None,
        'discount_percent': promo_code_obj.discount_percent if promo_code_obj else None,
    })


game_submit_score = submit_game_score


class ProductDeleteView(ProductOwnerMixin, DeleteView):
    template_name = 'store/product_confirm_delete.html'
    success_url = reverse_lazy('store:product_list')

    def form_valid(self, form):
        messages.success(self.request, 'Product deleted successfully.')
        return super().form_valid(form)
