/**
 * Mobile Menu Management
 * Handles opening/closing of mobile navigation menu
 */

(function() {
    'use strict';

    function initMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

        if (!mobileMenu || !mobileMenuBtn || !mobileMenuOverlay) {
            return;
        }

        // Close menu function
        function closeMenu() {
            mobileMenu.style.transform = 'translateX(100%)';
            mobileMenu.style.display = 'none';
            mobileMenuOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }

        // Open menu function
        function openMenu() {
            mobileMenu.style.display = 'block';
            mobileMenu.style.transform = 'translateX(0)';
            mobileMenuOverlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        // Menu button click - открытие меню
        mobileMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openMenu();
        });

        // Overlay click - закрытие меню
        mobileMenuOverlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
        });

        // Close buttons in menu header
        const closeButtons = mobileMenu.querySelectorAll('button[aria-label="Закрити меню"], button[aria-label="Закрити фільтри"]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
            });
        });

        // Close menu when clicking on menu links
        const menuLinks = mobileMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.style.display !== 'none') {
                closeMenu();
            }
        });

        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth >= 768) {
                    closeMenu();
                }
            }, 250);
        });

        // Touch optimization - close menu on swipe right
        let touchStartX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchEndX - touchStartX; // Правой рукой свайпаем вправо
            
            // Свайп вправо более 50px для меню с правой стороны
            if (diff > 50 && mobileMenu.style.display !== 'none') {
                closeMenu();
            }
        }, { passive: true });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }
})();

/**
 * Mobile Cart Count Update
 */
(function() {
    'use strict';

    function updateCartCount() {
        try {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const cartCount = document.getElementById('cart-count');
            
            if (cartCount) {
                cartCount.textContent = cart.length || '0';
                cartCount.style.display = cart.length > 0 ? 'flex' : 'none';
            }
        } catch (e) {
            console.error('Error updating cart count:', e);
        }
    }

    // Update on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateCartCount);
    } else {
        updateCartCount();
    }

    // Update on storage change (for cross-tab communication)
    window.addEventListener('storage', updateCartCount);

    // Listen for custom cart update event
    document.addEventListener('cartUpdated', updateCartCount);

})();

/**
 * Mobile Form Focus Management
 */
(function() {
    'use strict';

    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, select');

    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (window.innerWidth < 768) {
                // Delay scroll to ensure keyboard is open
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
    });

})();

/**
 * Mobile Button Ripple Effect
 */
(function() {
    'use strict';

    const buttons = document.querySelectorAll('button, a[role="button"], .btn');

    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (e.clientX === 0 && e.clientY === 0) return; // Ignore programmatic clicks

            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            // Remove existing ripple
            const existingRipple = this.querySelector('.ripple');
            if (existingRipple) existingRipple.remove();

            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });

})();

/**
 * Mobile Viewport Height Fix (for mobile browsers with address bar)
 */
(function() {
    'use strict';

    function setVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', vh + 'px');
    }

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

})();
