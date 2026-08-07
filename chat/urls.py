from django.urls import path

from . import views

app_name = 'chat'

urlpatterns = [
    path('managers/', views.manager_list, name='manager_list'),
    path('threads/start/', views.start_thread, name='start_thread'),
    path('threads/', views.my_threads, name='my_threads'),
    path('thread/<int:thread_id>/', views.thread_detail, name='thread_detail'),
    path('thread/<int:thread_id>/send/', views.send_message, name='send_message'),
    path('thread/<int:thread_id>/poll/', views.poll_messages, name='poll_messages'),
]
