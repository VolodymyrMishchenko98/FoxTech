from django.contrib import admin

from .models import ChatMessage, ChatThread


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'manager', 'is_closed', 'created_at', 'message_count')
    list_filter = ('is_closed', 'created_at')
    search_fields = (
        'customer__username',
        'customer__first_name',
        'customer__last_name',
        'manager__username',
        'manager__first_name',
        'manager__last_name',
    )
    list_select_related = ('customer', 'manager')

    def message_count(self, obj):
        return obj.messages.count()

    message_count.short_description = 'messages'


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'thread', 'sender', 'thread_customer', 'thread_manager', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = (
        'text',
        'sender__username',
        'thread__customer__username',
        'thread__manager__username',
    )
    list_select_related = ('thread', 'sender', 'thread__customer', 'thread__manager')

    def thread_customer(self, obj):
        return obj.thread.customer

    def thread_manager(self, obj):
        return obj.thread.manager

    thread_customer.short_description = 'customer'
    thread_manager.short_description = 'manager'
