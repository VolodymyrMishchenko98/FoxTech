from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Q
from django.core.cache import cache
from django.shortcuts import get_object_or_404, render
from django.urls import reverse_lazy
from django.views.generic import (
    CreateView,
    DeleteView,
    DetailView,
    ListView,
    UpdateView,
)

from .forms import ProductForm
from .models import Category, Product


_CATEGORIES_CACHE_KEY = 'store:all_categories'
_CATEGORIES_CACHE_TTL = 3600  # 1 hour — categories change rarely


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

    def form_valid(self, form):
        form.instance.owner = self.request.user
        messages.success(self.request, 'Product created successfully.')
        return super().form_valid(form)


class ProductUpdateView(ProductOwnerMixin, UpdateView):
    form_class = ProductForm
    template_name = 'store/product_form.html'

    def form_valid(self, form):
        messages.success(self.request, 'Product updated successfully.')
        return super().form_valid(form)


class ProductDeleteView(ProductOwnerMixin, DeleteView):
    template_name = 'store/product_confirm_delete.html'
    success_url = reverse_lazy('store:product_list')

    def form_valid(self, form):
        messages.success(self.request, 'Product deleted successfully.')
        return super().form_valid(form)
