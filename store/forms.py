from django import forms

from .models import Product

TAILWIND_INPUT_CLASS = 'w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none'
TAILWIND_CHECKBOX_CLASS = 'h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500'
TAILWIND_SELECT_CLASS = 'w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none'


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = (
            'category',
            'name',
            'slug',
            'price',
            'stock_quantity',
            'description',
            'specs',
            'image',
            'is_available',
        )
        widgets = {
            'description': forms.Textarea(attrs={'rows': 5, 'class': TAILWIND_INPUT_CLASS}),
            'specs': forms.Textarea(attrs={'rows': 4, 'class': TAILWIND_INPUT_CLASS}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            if isinstance(field.widget, forms.CheckboxInput):
                field.widget.attrs.setdefault('class', TAILWIND_CHECKBOX_CLASS)
            elif isinstance(field.widget, forms.Select):
                field.widget.attrs.setdefault('class', TAILWIND_SELECT_CLASS)
            else:
                field.widget.attrs.setdefault('class', TAILWIND_INPUT_CLASS)
