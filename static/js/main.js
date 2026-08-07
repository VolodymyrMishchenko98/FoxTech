/**
 * FoxTech Performance & UX Optimizations
 */

// 1. Instant Search - мгновенный поиск без submit
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('input[name="q"][type="search"]');
    const searchForm = searchInput?.closest('form');
    
    if (searchInput && searchForm) {
        searchInput.addEventListener('input', debounce(() => {
            if (searchInput.value.length > 0) {
                // Auto-submit after 300ms of typing
                searchForm.submit();
            }
        }, 300));
    }
});

// 2. Button Loading States - визуальная обратная связь
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[type="submit"], .btn-primary, .btn-outline-primary');
    if (!btn || btn.disabled) return;
    // Пропускаем кнопки чату — індикатор завантаження керується у chat.js
    if (btn.closest('[data-chat-widget], [data-chat-manager-page]')) return;

    // Добавляем loading state
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Загружається...';

    // Восстанавливаем после завершения (max 5 сек)
    setTimeout(() => {
        btn.disabled = false;
        btn.textContent = originalText;
    }, 5000);
});

// 3. Link Prefetch - предзагрузка ссылок при наведении
document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || link.hostname !== window.location.hostname) return;
    
    // Предзагружаем связанную страницу
    const prefetchLink = document.createElement('link');
    prefetchLink.rel = 'prefetch';
    prefetchLink.href = link.href;
    document.head.appendChild(prefetchLink);
});

// 4. Lazy Load Images - отложенная загрузка картинок
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
}, {
    rootMargin: '50px' // Начинаем загружать за 50px до входа в viewport
});

document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
});

// 5. Smooth Navigation - плавные переходы между страницами
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || 
        link.hostname !== window.location.hostname ||
        link.getAttribute('target') === '_blank' ||
        link.download ||
        e.ctrlKey || 
        e.metaKey) return;
    
    e.preventDefault();
    
    // Добавляем fade-out эффект
    document.body.style.opacity = '0.7';
    
    // Навигируемся
    setTimeout(() => {
        window.location.href = link.href;
    }, 150);
});

// Восстанавливаем opacity при загрузке страницы
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.3s ease-in-out';
});

// 6. Form Auto-Submit на смену категории
document.addEventListener('change', (e) => {
    const select = e.target.closest('select[name="category"]');
    if (select) {
        select.closest('form').submit();
    }
});

// 7. Debounce утилита
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

// 8. Service Worker для оффлайн поддержки (опционально)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/js/sw.js').catch(() => {});
}

// 9. Network Information API - снижаем качество на слабом соединении
if ('connection' in navigator) {
    const connection = navigator.connection;
    const speedClass = connection.effectiveType === '4g' ? 'fast' : 'slow';
    document.documentElement.classList.add(`connection-${speedClass}`);
    
    connection.addEventListener('change', () => {
        const newSpeedClass = connection.effectiveType === '4g' ? 'fast' : 'slow';
        document.documentElement.classList.remove('connection-fast', 'connection-slow');
        document.documentElement.classList.add(`connection-${newSpeedClass}`);
    });
}

// 10. Preload critical resources
function preloadCriticalResources() {
    const criticalImages = document.querySelectorAll('img[data-preload]');
    criticalImages.forEach(img => {
        if (img.complete) return;
        new Image().src = img.dataset.preload || img.src;
    });
}

document.addEventListener('DOMContentLoaded', preloadCriticalResources);
