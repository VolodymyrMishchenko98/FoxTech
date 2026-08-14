function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('input[name="q"][type="search"]');
    const searchForm = searchInput?.closest('form');
    
    if (searchInput && searchForm) {
        searchInput.addEventListener('input', debounce(() => {
            if (searchInput.value.length > 0) {
                searchForm.submit();
            }
        }, 300));
    }
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[type="submit"], .btn-primary, .btn-outline-primary');
    if (!btn || btn.disabled) return;
    if (btn.closest('[data-chat-widget], [data-chat-manager-page]')) return;

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Загружається...';

    setTimeout(() => {
        btn.disabled = false;
        btn.textContent = originalText;
    }, 5000);
});

document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || link.hostname !== window.location.hostname) return;
    
    const prefetchLink = document.createElement('link');
    prefetchLink.rel = 'prefetch';
    prefetchLink.href = link.href;
    document.head.appendChild(prefetchLink);
});

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        
        const img = entry.target;
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
        }
        observer.unobserve(img);
    });
}, { rootMargin: '50px' });

document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
});

document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || 
        link.hostname !== window.location.hostname ||
        link.getAttribute('target') === '_blank' ||
        link.download ||
        e.ctrlKey || 
        e.metaKey) return;
    
    e.preventDefault();
    document.body.style.opacity = '0.7';
    
    setTimeout(() => {
        window.location.href = link.href;
    }, 150);
});

window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.3s ease-in-out';
});

document.addEventListener('change', (e) => {
    const select = e.target.closest('select[name="category"]');
    if (select) {
        select.closest('form').submit();
    }
});
