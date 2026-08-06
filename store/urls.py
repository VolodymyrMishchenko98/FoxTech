from django.urls import path

from .views import (
    ProductCreateView,
    ProductDeleteView,
    ProductUpdateView,
    catalog_view,
    index_view,
    product_detail_view,
)

app_name = 'store'

urlpatterns = [
    path('', index_view, name='index'),
    path('catalog/', catalog_view, name='product_list'),
    path('product/<slug:slug>/', product_detail_view, name='product_detail'),
    path('products/add/', ProductCreateView.as_view(), name='product_create'),
    path('products/<slug:slug>/edit/', ProductUpdateView.as_view(), name='product_update'),
    path('products/<slug:slug>/delete/', ProductDeleteView.as_view(), name='product_delete'),
]
