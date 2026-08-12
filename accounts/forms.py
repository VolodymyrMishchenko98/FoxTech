from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import User

from .models import UserProfile

TAILWIND_INPUT_CLASS = 'w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none'


class UserRegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    role = forms.ChoiceField(
        choices=UserProfile._meta.get_field('role').choices,
        label='Хто ви?',
        required=False,
        widget=forms.RadioSelect,
    )
    phone = forms.CharField(max_length=20, required=False)
    address = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 3, 'class': TAILWIND_INPUT_CLASS}),
        required=False,
    )

    class Meta:
        model = User
        fields = (
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'phone',
            'address',
            'password1',
            'password2',
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            if name == 'role':
                continue
            field.widget.attrs.setdefault('class', TAILWIND_INPUT_CLASS)
        self.fields['role'].widget.attrs.setdefault(
            'class',
            'h-4 w-4 border-slate-300 text-orange-600 focus:ring-orange-500',
        )
        if not self.is_bound and not self.initial.get('role'):
            self.fields['role'].initial = UserProfile.ROLE_USER

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data.get('first_name', '')
        user.last_name = self.cleaned_data.get('last_name', '')
        role = self.cleaned_data.get('role') or UserProfile.ROLE_USER

        if commit:
            user.save()
            profile = user.profile
            profile.role = role
            profile.phone = self.cleaned_data.get('phone', '')
            profile.address = self.cleaned_data.get('address', '')
            profile.save()

        return user


class UserLoginForm(AuthenticationForm):
    username = forms.CharField(widget=forms.TextInput(attrs={'class': TAILWIND_INPUT_CLASS}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': TAILWIND_INPUT_CLASS}))


class UserUpdateForm(forms.ModelForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault('class', TAILWIND_INPUT_CLASS)


class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ('phone', 'address')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault('class', TAILWIND_INPUT_CLASS)
        if 'address' in self.fields:
            self.fields['address'].widget.attrs.setdefault('rows', 3)

