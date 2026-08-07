from django.urls import path

from .views import (
    ProductCreateView,
    ProductDeleteView,
    ProductUpdateView,
    apply_promo_code,
    cart_add,
    cart_detail,
    cart_remove,
    cart_update,
    cart_view,
    catalog_view,
    game_view,
    index_view,
    product_detail_view,
    remove_promo_code,
    submit_game_score,
)

app_name = 'store'

urlpatterns = [
    path('', index_view, name='index'),
    path('catalog/', catalog_view, name='product_list'),
    path('product/<slug:slug>/', product_detail_view, name='product_detail'),
    path('products/add/', ProductCreateView.as_view(), name='product_create'),
    path('products/<slug:slug>/edit/', ProductUpdateView.as_view(), name='product_update'),
    path('products/<slug:slug>/delete/', ProductDeleteView.as_view(), name='product_delete'),
    path('game/', game_view, name='game'),
    path('api/game/submit-score/', submit_game_score, name='game_submit_score'),
    path('api/cart/', cart_detail, name='cart_detail'),
    path('cart/', cart_view, name='cart'),
    path('api/cart/add/<int:product_id>/', cart_add, name='cart_add'),
    path('api/cart/update/<int:item_id>/', cart_update, name='cart_update'),
    path('api/cart/remove/<int:item_id>/', cart_remove, name='cart_remove'),
    path('api/cart/promo/apply/', apply_promo_code, name='apply_promo_code'),
    path('api/cart/promo/remove/', remove_promo_code, name='remove_promo_code'),
]
