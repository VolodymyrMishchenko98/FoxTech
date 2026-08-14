/**
 * Catalog Filter Management
 * Handles opening/closing of mobile catalog filters
 */

(function() {
    'use strict';

    function initCatalogFilters() {
        const filterToggleMobile = document.getElementById('filter-toggle-mobile');
        const filterSidebarMobile = document.getElementById('filter-sidebar-mobile');
        const filterOverlayMobile = document.getElementById('filter-overlay-mobile');

        if (!filterToggleMobile || !filterSidebarMobile || !filterOverlayMobile) {
            return;
        }

        // Close function
        function closeFilters() {
            filterSidebarMobile.style.transform = 'translateX(100%)';
            filterSidebarMobile.style.display = 'none';
            filterOverlayMobile.style.display = 'none';
            filterOverlayMobile.classList.add('hidden');
            document.body.style.overflow = '';
        }

        // Open function
        function openFilters() {
            filterSidebarMobile.style.display = 'block';
            filterSidebarMobile.style.transform = 'translateX(0)';
            filterOverlayMobile.style.display = 'block';
            filterOverlayMobile.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        // Toggle button
        if (filterToggleMobile) {
            filterToggleMobile.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openFilters();
            });
        }

        // Overlay click
        if (filterOverlayMobile) {
            filterOverlayMobile.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeFilters();
            });
        }

        // Close button in filter header
        const closeBtn = filterSidebarMobile.querySelector('button[type="button"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeFilters();
            });
        }

        // Close on category/link click
        const filterLinks = filterSidebarMobile.querySelectorAll('a');
        filterLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeFilters();
            });
        });

        // Handle form submission (submit button)
        const filterForm = filterSidebarMobile.querySelector('form');
        if (filterForm) {
            const submitBtn = filterForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => {
                    closeFilters();
                });
            }
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && filterSidebarMobile.style.display !== 'none') {
                closeFilters();
            }
        });

        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth >= 768) {
                    closeFilters();
                }
            }, 250);
        });

        // Touch swipe optimization
        let touchStartX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            
            // Свайп влево более 50px - закрыть фильтры
            if (diff > 50 && filterSidebarMobile.style.display !== 'none') {
                closeFilters();
            }
        }, { passive: true });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatalogFilters);
    } else {
        initCatalogFilters();
    }
})();
