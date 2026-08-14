import json

from django.db.models import Q
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_GET, require_POST

from accounts.models import UserProfile

from .models import ChatMessage, ChatThread


def _json_body(request):
    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def _current_role(user):
    try:
        return user.profile.role
    except Exception:
        return UserProfile.ROLE_USER


def _is_manager(user):
    return _current_role(user) == UserProfile.ROLE_MANAGER


def _display_name(user):
    if user is None:
        return 'Підтримка'
    return user.get_full_name() or user.get_username()


def _message_payload(message):
    return {
        'id': message.id,
        'thread_id': message.thread_id,
        'sender_id': message.sender_id,
        'sender_name': _display_name(message.sender),
        'sender_role': _current_role(message.sender),
        'sender_is_manager': _is_manager(message.sender),
        'text': message.text,
        'created_at': message.created_at.isoformat(),
        'is_read': message.is_read,
    }


def _thread_qs_for_user(user):
    return _thread_access_qs(user)


def _thread_access_qs(user):
    return ChatThread.objects.filter(Q(customer=user) | Q(manager=user))


def _get_thread_for_user(thread_id, user):
    return get_object_or_404(_thread_access_qs(user).distinct(), pk=thread_id)


def _mark_thread_read(thread, user):
    thread.messages.exclude(sender=user).filter(is_read=False).update(is_read=True)


def _thread_messages(thread, limit=30):
    return list(
        thread.messages.select_related('sender').order_by('-created_at', '-id')[:limit]
    )[::-1]


def _thread_unread_count(thread, viewer):
    return thread.messages.exclude(sender=viewer).filter(is_read=False).count()


def _thread_summary(thread, viewer):
    counterpart = thread.manager if thread.customer_id == viewer.id else thread.customer
    counterpart_name = _display_name(counterpart)
    last_message = thread.messages.select_related('sender').order_by('-created_at', '-id').first()
    return {
        'id': thread.id,
        'customer_id': thread.customer_id,
        'customer_name': _display_name(thread.customer),
        'manager_id': thread.manager_id,
        'manager_name': _display_name(thread.manager),
        'counterpart_id': counterpart.id if counterpart else None,
        'counterpart_name': counterpart_name,
        'created_at': thread.created_at.isoformat(),
        'is_closed': thread.is_closed,
        'unread_count': _thread_unread_count(thread, viewer),
        'last_message': _message_payload(last_message) if last_message else None,
    }


def _thread_detail_payload(thread, viewer):
    return {
        'thread': {
            'id': thread.id,
            'customer_id': thread.customer_id,
            'customer_name': _display_name(thread.customer),
            'manager_id': thread.manager_id,
            'manager_name': _display_name(thread.manager),
            'is_closed': thread.is_closed,
        },
        'messages': [_message_payload(message) for message in _thread_messages(thread)],
        'unread_count': _thread_unread_count(thread, viewer),
    }


@login_required
@require_GET
def manager_list(request):
    managers = User.objects.filter(profile__role=UserProfile.ROLE_MANAGER).select_related('profile').order_by('first_name', 'username')
    return JsonResponse({
        'managers': [
            {
                'id': manager.id,
                'username': manager.username,
                'first_name': manager.first_name,
                'last_name': manager.last_name,
                'display_name': _display_name(manager),
            }
            for manager in managers
        ]
    })


@login_required
@require_POST
def start_thread(request):
    if _current_role(request.user) != UserProfile.ROLE_USER:
        return JsonResponse({'error': 'Тред може створити лише користувач'}, status=403)

    payload = _json_body(request)
    if payload is None:
        return JsonResponse({'error': 'Некоректне JSON тіло'}, status=400)

    manager_id = payload.get('manager_id')
    try:
        manager_id = int(manager_id)
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Некоректний manager_id'}, status=400)

    manager = get_object_or_404(User.objects.select_related('profile'), pk=manager_id)
    if _current_role(manager) != UserProfile.ROLE_MANAGER:
        return JsonResponse({'error': 'Обраний користувач не є менеджером'}, status=400)
    if manager_id == request.user.id:
        return JsonResponse({'error': 'Не можна створити діалог із самим собою'}, status=400)

    thread, created = ChatThread.objects.get_or_create(
        customer=request.user,
        manager=manager,
        defaults={'is_closed': False},
    )
    if thread.is_closed:
        thread.is_closed = False
        thread.save(update_fields=['is_closed'])
    return JsonResponse({
        'thread_id': thread.id,
        'created': created,
        'manager': {
            'id': manager.id,
            'display_name': _display_name(manager),
        },
    }, status=201 if created else 200)


@login_required
@require_GET
def thread_detail(request, thread_id):
    thread = _get_thread_for_user(thread_id, request.user)
    _mark_thread_read(thread, request.user)
    return JsonResponse(_thread_detail_payload(thread, request.user))


@login_required
@require_POST
def send_message(request, thread_id):
    thread = _get_thread_for_user(thread_id, request.user)
    payload = _json_body(request)
    if payload is None:
        return JsonResponse({'error': 'Некоректне JSON тіло'}, status=400)

    text = (payload.get('text') or '').strip()
    if not text:
        return JsonResponse({'error': 'Повідомлення не може бути порожнім'}, status=400)

    message = ChatMessage.objects.create(
        thread=thread,
        sender=request.user,
        text=text,
        is_read=False,
    )
    return JsonResponse({
        'message': _message_payload(message),
        'thread': {
            'id': thread.id,
            'is_closed': thread.is_closed,
        },
    }, status=201)


@login_required
@require_GET
def poll_messages(request, thread_id):
    thread = _get_thread_for_user(thread_id, request.user)
    after_id = request.GET.get('after_id')
    try:
        after_id = int(after_id) if after_id not in (None, '') else 0
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Некоректний after_id'}, status=400)

    messages = list(
        thread.messages.select_related('sender')
        .filter(id__gt=after_id)
        .order_by('created_at', 'id')
    )
    if messages:
        _mark_thread_read(thread, request.user)

    return JsonResponse({
        'thread': {
            'id': thread.id,
            'is_closed': thread.is_closed,
        },
        'messages': [_message_payload(message) for message in messages],
        'unread_count': _thread_unread_count(thread, request.user),
    })


@login_required
@require_GET
def my_threads(request):
    threads = list(
        _thread_qs_for_user(request.user)
        .select_related('customer', 'manager')
        .order_by('-created_at')
    )
    payload = {
        'role': _current_role(request.user),
        'threads': [_thread_summary(thread, request.user) for thread in threads],
    }
    if request.GET.get('format') == 'json' or 'application/json' in request.headers.get('Accept', ''):
        return JsonResponse(payload)
    return render(
        request,
        'chat/my_threads.html',
        {
            'threads': threads,
            'role': _current_role(request.user),
        },
    )
