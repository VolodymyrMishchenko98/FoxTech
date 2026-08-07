from django.conf import settings
from django.db import models


class ChatThread(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_threads_as_customer',
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_threads_as_manager',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ('-created_at',)
        unique_together = ('customer', 'manager')
        verbose_name = 'chat thread'
        verbose_name_plural = 'chat threads'

    def __str__(self):
        return f'Thread #{self.pk}: {self.customer} -> {self.manager}'


class ChatMessage(models.Model):
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ('created_at',)
        verbose_name = 'chat message'
        verbose_name_plural = 'chat messages'

    def __str__(self):
        return f'Message #{self.pk} in thread #{self.thread_id}'
