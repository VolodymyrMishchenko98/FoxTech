from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.paginator import Paginator
from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from django.utils import timezone
from django.views.generic import CreateView, TemplateView, View

from .forms import UserLoginForm, UserProfileForm, UserRegistrationForm, UserUpdateForm
from store.views import BONUS_PERCENT
from store.models import PromoCode


def register_view(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Реєстрація пройшла успішно.')
            return redirect('store:product_list')
    else:
        form = UserRegistrationForm()

    return render(request, 'accounts/register.html', {'form': form})


def login_view(request):
    if request.method == 'POST':
        form = UserLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, 'Ви успішно увійшли.');
            return redirect('store:product_list')
        messages.error(request, 'Невірне ім’я користувача або пароль.')
    else:
        form = UserLoginForm()

    return render(request, 'accounts/login.html', {'form': form})


def logout_view(request):
    logout(request)
    messages.success(request, 'Ви успішно вийшли.')
    return redirect('store:product_list')


class SignUpView(CreateView):
    form_class = UserRegistrationForm
    template_name = 'accounts/signup.html'
    success_url = reverse_lazy('accounts:profile')

    def form_valid(self, form):
        response = super().form_valid(form)
        login(self.request, self.object)
        messages.success(self.request, 'Account created successfully.')
        return response


class ProfileView(LoginRequiredMixin, TemplateView):
    template_name = 'accounts/profile.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        orders_qs = (
            user.orders
            .select_related('promo_code')
            .prefetch_related('items__product')
            .order_by('-created_at')
        )
        paginator = Paginator(orders_qs, 10)
        orders_page = paginator.get_page(self.request.GET.get('page'))
        order_status_labels = {
            'pending': 'Очікує обробки',
            'confirmed': 'Підтверджено',
            'paid': 'Оплачено',
            'shipped': 'Відправлено',
            'completed': 'Завершено',
            'canceled': 'Скасовано',
        }
        order_status_badges = {
            'pending': 'bg-amber-100 text-amber-700',
            'confirmed': 'bg-sky-100 text-sky-700',
            'paid': 'bg-emerald-100 text-emerald-700',
            'shipped': 'bg-cyan-100 text-cyan-700',
            'completed': 'bg-emerald-100 text-emerald-700',
            'canceled': 'bg-rose-100 text-rose-700',
        }
        orders = []
        for order in orders_page.object_list:
            orders.append(
                {
                    'order': order,
                    'status_label': order_status_labels.get(order.status, order.get_status_display()),
                    'badge_class': order_status_badges.get(order.status, 'bg-slate-100 text-slate-700'),
                    'items': list(order.items.all()),
                }
            )

        context['orders'] = orders
        context['orders_page'] = orders_page
        context['active_promo_codes'] = (
            PromoCode.objects.filter(
                game_scores__user=user,
                is_used=False,
                valid_until__gt=timezone.now(),
            )
            .distinct()
            .order_by('valid_until', 'code')
        )
        context['bonus_balance'] = user.profile.bonus_balance
        context['bonus_percent'] = BONUS_PERCENT
        context['game_promo_scores'] = (
            user.game_scores
            .select_related('promo_code_issued')
            .filter(promo_code_issued__isnull=False)
        )
        return context


class ProfileUpdateView(LoginRequiredMixin, View):
    template_name = 'accounts/profile_form.html'

    def get(self, request):
        context = {
            'user_form': UserUpdateForm(instance=request.user),
            'profile_form': UserProfileForm(instance=request.user.profile),
        }
        return render(request, self.template_name, context)

    def post(self, request):
        user_form = UserUpdateForm(request.POST, instance=request.user)
        profile_form = UserProfileForm(
            request.POST,
            instance=request.user.profile,
        )

        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Profile updated.')
            return redirect('accounts:profile')

        context = {
            'user_form': user_form,
            'profile_form': profile_form,
        }
        return render(request, self.template_name, context)
