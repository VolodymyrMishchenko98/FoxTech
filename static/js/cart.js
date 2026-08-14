function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function getCsrfToken() {
    return getCookie('csrftoken');
}

function cartHeaders() {
    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    };
    const token = getCsrfToken();
    if (token) {
        headers['X-CSRFToken'] = token;
    }
    return headers;
}

async function cartFetch(url, options) {
    options = options || {};
    options.headers = Object.assign({}, cartHeaders(), options.headers);
    options.credentials = 'same-origin';
    const response = await fetch(url, options);
    if (!response.ok) {
        let message = 'Помилка запиту';
        try {
            const data = await response.json();
            if (data.error) message = data.error;
        } catch (e) {}
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

function showCartMessage(message, type) {
    type = type || 'danger';
    const container = document.getElementById('cart-messages');
    if (container) {
        container.innerHTML = '<div class="rounded-2xl border px-4 py-3 shadow-lg ' +
            (type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800') +
            '">' + message + '</div>';
        setTimeout(function() { container.innerHTML = ''; }, 4000);
        return;
    }

    let toastHost = document.getElementById('cart-toast-host');
    if (!toastHost) {
        toastHost = document.createElement('div');
        toastHost.id = 'cart-toast-host';
        toastHost.className = 'fixed right-4 top-24 z-[60] flex flex-col gap-3';
        document.body.appendChild(toastHost);
    }

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    toast.className = [
        'max-w-sm rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-300',
        isSuccess
            ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
            : 'border-rose-200 bg-rose-50/95 text-rose-800',
    ].join(' ');
    toast.textContent = message;
    toastHost.appendChild(toast);

    setTimeout(function() {
        toast.classList.add('opacity-0', 'translate-x-2');
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            if (toastHost && !toastHost.children.length) {
                toastHost.remove();
            }
        }, 220);
    }, 3200);
}

function formatPrice(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
}

function updateCartCount(count) {
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = count;
    }
}

function pluralizeUa(n, forms) {
    const abs = Math.abs(n) % 100;
    const n10 = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (n10 > 1 && n10 < 5) return forms[1];
    if (n10 === 1) return forms[0];
    return forms[2];
}

function productWord(n) {
    return pluralizeUa(n, ['товар', 'товари', 'товарів']);
}

function updateCartTotal(total) {
    const el = document.getElementById('cart-total');
    if (el) {
        el.textContent = formatPrice(total);
    }
}

function showPromoBadge(code, percent) {
    const container = document.getElementById('promo-applied');
    if (!container) return;
    container.classList.remove('hidden');
    document.getElementById('promo-applied-code').textContent = code;
    document.getElementById('promo-applied-percent').textContent = percent;
}

function hidePromoBadge() {
    const container = document.getElementById('promo-applied');
    if (!container) return;
    container.classList.add('hidden');
}

function cartUrl(action, id) {
    const base = window.CART_API_BASE && window.CART_API_BASE[action];
    if (!base) return null;
    if (id !== undefined && id !== null) {
        return base.replace(/\/\d+\/$/, '/' + id + '/');
    }
    return base;
}

async function applyPromoCode() {
    const input = document.getElementById('promo-input');
    const code = input ? input.value.trim() : '';
    if (!code) {
        showCartMessage('Введіть промокод', 'danger');
        return;
    }
    try {
        const data = await cartFetch(cartUrl('apply_promo'), {
            method: 'POST',
            body: JSON.stringify({ code: code }),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        updateCartTotal(data.total);
        showPromoBadge(data.promo_code, data.discount_percent);
        showCartMessage('Промокод ' + data.promo_code + ' застосовано: -' + data.discount_percent + '%', 'success');
        if (input) input.value = '';
    } catch (error) {
        showCartMessage(error.message, 'danger');
    }
}

async function removePromoCode() {
    try {
        const data = await cartFetch(cartUrl('remove_promo'), {
            method: 'POST',
        });
        updateCartTotal(data.total);
        hidePromoBadge();
        showCartMessage('Промокод скинуто', 'success');
    } catch (error) {
        showCartMessage(error.message, 'danger');
    }
}

async function addToCart(productId) {
    try {
        const data = await cartFetch(cartUrl('add', productId), {
            method: 'POST',
            body: new URLSearchParams(),
        });
        updateCartCount(data.count);
        updateCartTotal(data.total);
        showCartMessage('Товар додано до кошика', 'success');
        return data;
    } catch (error) {
        showCartMessage(error.message, 'danger');
        throw error;
    }
}

async function updateQuantity(itemId, qty) {
    try {
        const data = await cartFetch(cartUrl('update', itemId), {
            method: 'POST',
            body: new URLSearchParams({ quantity: qty }),
        });
        updateCartCount(data.count);
        updateCartTotal(data.total);
        if (data.removed) {
            const row = document.getElementById('cart-item-' + itemId);
            if (row) row.remove();
        }
        return data;
    } catch (error) {
        showCartMessage(error.message, 'danger');
        throw error;
    }
}

async function removeItem(itemId) {
    try {
        const data = await cartFetch(cartUrl('remove', itemId), {
            method: 'POST',
        });
        updateCartCount(data.count);
        updateCartTotal(data.total);
        const row = document.getElementById('cart-item-' + itemId);
        if (row) row.remove();
        return data;
    } catch (error) {
        showCartMessage(error.message, 'danger');
        throw error;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadCart() {
    try {
        const data = await cartFetch(cartUrl('detail'));
        updateCartCount(data.count);
        updateCartTotal(data.total);

        const tbody = document.getElementById('cart-items-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (data.items.length === 0) {
            tbody.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Кошик порожній</div>';
        } else {
            data.items.forEach(function(item) {
                const card = document.createElement('article');
                card.id = 'cart-item-' + item.id;
                card.className = 'rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm';
                card.innerHTML =
                    '<div class="flex items-start justify-between gap-3">' +
                        '<div class="min-w-0 flex-1">' +
                            '<h3 class="text-base font-semibold text-slate-900">' + escapeHtml(item.product_name) + '</h3>' +
                            '<p class="mt-1 text-sm text-slate-500">' + formatPrice(item.price) + ' грн / шт</p>' +
                        '</div>' +
                        '<button type="button" onclick="removeItem(' + item.id + ')" class="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100">Видалити</button>' +
                    '</div>' +
                    '<div class="mt-4 flex items-center justify-between gap-3">' +
                        '<div class="flex items-center gap-2">' +
                            '<label class="text-xs font-medium uppercase tracking-wide text-slate-500">Кількість</label>' +
                            '<input type="number" value="' + item.quantity + '" min="0" max="' + item.stock_quantity + '" ' +
                                'class="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-orange-600" ' +
                                'onchange="updateQuantity(' + item.id + ', this.value)">' +
                        '</div>' +
                        '<div class="text-right">' +
                            '<p class="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Сума</p>' +
                            '<p class="mt-1 text-base font-bold text-slate-900">' + formatPrice(item.subtotal) + ' грн</p>' +
                        '</div>' +
                    '</div>';
                tbody.appendChild(card);
            });
        }
        const info = document.getElementById('cart-count-info');
        if (info) {
            info.textContent = data.count + ' ' + productWord(data.count);
        }

        if (data.promo_code) {
            showPromoBadge(data.promo_code, data.discount_percent);
        } else {
            hidePromoBadge();
        }
    } catch (error) {
        showCartMessage(error.message, 'danger');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadCart();

    const promoForm = document.getElementById('promo-form');
    if (promoForm) {
        promoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            applyPromoCode();
        });
    }

    const promoRemoveBtn = document.getElementById('promo-remove-btn');
    if (promoRemoveBtn) {
        promoRemoveBtn.addEventListener('click', removePromoCode);
    }
});
