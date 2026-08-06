from django.contrib import admin

from .models import (
    Cart,
    CartItem,
    Category,
    GameScore,
    Order,
    OrderItem,
    Product,
    PromoCode,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'stock_quantity', 'is_available', 'created_at')
    list_filter = ('is_available', 'category')
    list_editable = ('price', 'stock_quantity', 'is_available')
    list_display_links = ('name',)
    actions = ['delete_selected_products']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name', 'description')

    def delete_selected_products(self, request, queryset):
        queryset.delete()
        self.message_user(request, f'Successfully deleted {queryset.count()} product(s).')
    delete_selected_products.short_description = 'Delete selected products'


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'session_key', 'created_at')
    search_fields = ('user__username', 'session_key')


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product', 'quantity')
    search_fields = ('cart__session_key', 'product__name')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username',)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product', 'price', 'quantity')
    search_fields = ('order__user__username', 'product__name')


@admin.register(GameScore)
class GameScoreAdmin(admin.ModelAdmin):
    list_display = ('user', 'score_points', 'created_at')
    search_fields = ('user__username',)


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percent', 'is_used', 'valid_until')
    list_filter = ('is_used', 'valid_until')
    search_fields = ('code',)
