/**
 * Fix Placeholder Timeout - Không đổi giao diện
 * Thay thế via.placeholder.com bằng local SVG (giống hệt)
 */

(function () {
    'use strict';

    // Local SVG placeholder (giống via.placeholder.com)
    const PLACEHOLDER = {
        poster: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect fill="%231e202c" width="400" height="600"/%3E%3Ctext fill="%23666" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E',
        backdrop: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360"%3E%3Crect fill="%231e202c" width="640" height="360"/%3E%3Ctext fill="%23666" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E'
    };

    // Fix tất cả images có onerror
    function fixPlaceholders() {
        document.querySelectorAll('img[onerror]').forEach(img => {
            // Detect nếu là backdrop (landscape) hay poster (portrait)
            const isBackdrop = img.classList.contains('backdrop') ||
                img.closest('.aspect-video') !== null ||
                img.width > img.height;

            const placeholder = isBackdrop ? PLACEHOLDER.backdrop : PLACEHOLDER.poster;

            // Replace onerror handler
            img.onerror = function () {
                this.src = placeholder;
                this.onerror = null; // Prevent infinite loop
            };
        });
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixPlaceholders);
    } else {
        fixPlaceholders();
    }

    // Watch for dynamically added images
    const observer = new MutationObserver(() => {
        fixPlaceholders();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('✅ Placeholder fix loaded - No more timeouts!');
})();
